import {createClient} from '@supabase/supabase-js'
import {readLiveSnapshot} from './reader.mjs'
import {verifiedMonthlyRenewalTargets,creditDifference} from './pointsSync.mjs'

const EMAIL_RX=/^[^\s@]+@[^\s@]+\.[^\s@]+$/
const trimmedEmail=e=>typeof e==='string'&&EMAIL_RX.test(e.trim().toLowerCase())?e.trim().toLowerCase():null
const normalizeName=x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase().replace(/\s+/g,' ')

async function allRows(client,table,columns){
  const rows=[]
  for(let start=0;start<20000;start+=500){
    const {data,error}=await client.from(table).select(columns).order('id',{ascending:true}).range(start,start+499)
    if(error)throw new Error('sync_db_read_unavailable_'+table)
    rows.push(...(data||[]))
    if((data||[]).length<500)return rows
  }
  throw new Error('sync_pagination_incomplete')
}
async function buildVerifiedProfileMap(svc){
 const profiles=await allRows(svc,'clube_profiles','id,email,full_name,approved')
 const byEmail=new Map()
 for(const p of profiles){
  const email=trimmedEmail(p.email)
  if(!email)continue
  byEmail.set(email,[...(byEmail.get(email)||[]),p])
 }
 return {byEmail,profiles}
}
async function verifyAccount(svc,profile,email){
 if(!profile?.approved)return false
 const {data,error}=await svc.auth.admin.getUserById(profile.id)
 if(error)return false
 const user=data?.user
 return user?.id===profile.id&&trimmedEmail(user.email)===email
    &&Boolean(user.email_confirmed_at||user.confirmed_at)
}
function targetReference(profileId,targetTotal){
 return 'hotmart:renewal-sync:v1:'+profileId+':'+targetTotal
}
async function reconcileOne(svc,profile,target,adminId){
 // Trava a conciliação por aluno em uma função transacional no PostgreSQL;
 // verificação da situação efetiva antes do INSERT feita pelo banco.
 const {data,error}=await svc.rpc('clube_reconcile_hotmart_renewals',{
  p_student_id:profile.id,p_admin_id:adminId,p_target_points:target.total,
  p_reference:targetReference(profile.id,target.total),
  p_note:'Hotmart verificada: '+target.cycles+' renovações, '+target.contractCount+
    ' contrato(s), incluindo retorno após cancelamento quando aplicável.'
 })
 if(error)throw new Error('sync_credit_write_unavailable')
 return data==='credited'?'credited':data==='already_current'?'already_current':'skipped'
}
async function deleteInvalidTypoDuplicate(svc,profiles,byEmail){
 let removed=0
 for(const candidate of profiles){
  const email=trimmedEmail(candidate.email)
  if(!email||!email.endsWith('@gmsil.com')||candidate.approved)continue
  const corrected=email.slice(0,-'@gmsil.com'.length)+'@gmail.com'
  const pairs=byEmail.get(corrected)||[]
  if(pairs.length!==1||normalizeName(pairs[0].full_name)!==normalizeName(candidate.full_name))continue
  if(!(await verifyAccount(svc,pairs[0],corrected)))continue
  const {data:auth,error}=await svc.auth.admin.getUserById(candidate.id)
  if(error||!auth?.user||trimmedEmail(auth.user.email)!==email
    ||auth.user.email_confirmed_at||auth.user.confirmed_at||auth.user.last_sign_in_at)continue
  // Não remover uma conta que tenha qualquer atividade ou vínculo.
  const tables=['clube_point_events','clube_redemptions','clube_instagram_links',
    'clube_instagram_link_codes','clube_instagram_story_events','clube_pilot_testers',
    'clube_notification_preferences','clube_notification_deliveries','clube_email_preferences',
    'clube_email_dispatches']
  let clean=true
  for(const table of tables){
    const col=table==='clube_pilot_testers'?'user_id':'student_id'
    const {data,error:e}=await svc.from(table).select(col).eq(col,candidate.id).limit(1)
    if(e||data?.length){clean=false;break}
  }
  if(!clean)continue
  const {error:deletionError}=await svc.auth.admin.deleteUser(candidate.id)
  if(deletionError)throw new Error('typo_cleanup_unavailable')
  removed++
 }
 return removed
}
export async function syncVerifiedHotmartPoints(env,{loadSnapshot=readLiveSnapshot,createClientFn=createClient,performCleanup=true}={}){
 if(env.HOTMART_POINTS_SYNC_ENABLED!=='true')return {status:'disabled',credited:0}
 if(env.HOTMART_ALLOWED_PRODUCT_IDS!=='6304828')throw new Error('product_not_allowed')
 const url=env.VITE_CLUBE_SUPABASE_URL||env.SUPABASE_URL
 if(!url||!env.SUPABASE_SERVICE_ROLE_KEY)throw new Error('service_not_configured')
 const svc=createClientFn(url,env.SUPABASE_SERVICE_ROLE_KEY,{
  auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}
 })
 const [{data:rule,error:ruleError},{data:admins,error:adminError}]=await Promise.all([
  svc.from('clube_point_rules').select('points').eq('event_type','renovacao').maybeSingle(),
  svc.from('clube_admins').select('user_id').limit(2)
 ])
 if(ruleError||!rule||Number(rule.points)!==400||adminError||admins?.length!==1)
  throw new Error('rule_or_admin_not_verified')
 const snapshot=await loadSnapshot(env,{createClientFn,adminClient:svc})
 if(snapshot?.status!=='synced'||!snapshot.complete||snapshot.identity_complete!==true)
  throw new Error('incomplete_hotmart_snapshot')
 const targets=verifiedMonthlyRenewalTargets(snapshot.subscriptions,400)
 const {byEmail,profiles}=await buildVerifiedProfileMap(svc)
 let credited=0,alreadyCurrent=0,unmatched=0
 for(const target of targets){
  const matches=byEmail.get(target.email)||[]
  if(matches.length!==1||!await verifyAccount(svc,matches[0],target.email)){unmatched++;continue}
  const result=await reconcileOne(svc,matches[0],target,admins[0].user_id)
  if(result==='credited')credited++
  if(result==='already_current')alreadyCurrent++
 }
 const removed=performCleanup?await deleteInvalidTypoDuplicate(svc,profiles,byEmail):0
 return {status:'synced',verified_targets:targets.length,credited,already_current:alreadyCurrent,
  unmatched,removed_invalid:removed}
}
