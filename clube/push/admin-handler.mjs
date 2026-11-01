// Web Push gratuito e exclusivo do administrador do Clube NPV.
// A chave privada VAPID, tokens e endpoints de assinaturas nunca chegam ao navegador.
import {createClient} from '@supabase/supabase-js'
import {sendWebPush,allowedPushEndpoint} from './web-push.mjs'
import {isActionableRegistration,countActionableRegistrations} from './pending-registrations.mjs'
import {timingSafeEqual} from 'node:crypto'

export const config={maxDuration:30}
const reply=(res,status,data)=>res.writeHead(status,{
 'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store, private, max-age=0',
 'Vary':'Authorization','X-Content-Type-Options':'nosniff','Cross-Origin-Resource-Policy':'same-origin'
}).end(JSON.stringify(data))
const url=()=>process.env.VITE_CLUBE_SUPABASE_URL||process.env.SUPABASE_URL
const pubKey=()=>process.env.VITE_CLUBE_SUPABASE_PUBLISHABLE_KEY||process.env.SUPABASE_PUBLISHABLE_KEY
const service=()=>process.env.SUPABASE_SERVICE_ROLE_KEY
const pushConfigured=()=>Boolean(process.env.NPV_VAPID_PUBLIC_KEY&&process.env.NPV_VAPID_PRIVATE_KEY)
const safeMatch=(left,right)=>{
 const a=Buffer.from(String(left||'')),b=Buffer.from(String(right||''))
 return a.length===b.length&&a.length>=24&&timingSafeEqual(a,b)
}
const client=()=>createClient(url(),service(),{auth:{persistSession:false,autoRefreshToken:false}})
async function adminFromRequest(req,svc){
 const bearer=req.headers?.authorization
 if(typeof bearer!=='string'||!/^Bearer [A-Za-z0-9._~-]{16,4096}$/.test(bearer))return null
 const {data:{user},error}=await svc.auth.getUser(bearer.slice(7))
 if(error||!user)return null
 const role=await svc.from('clube_admins').select('user_id').eq('user_id',user.id).maybeSingle()
 return role.error||!role.data?null:user
}
const pageFor={registration:'alunos',redemption:'recompensas',story:'conexoes',test:'inicio'}
const titleFor={registration:'Novo cadastro para aprovação',redemption:'Novo pedido de resgate',story:'Story aguardando análise',test:'Notificação de teste NPV'}
const bodyFor={
 registration:'Há uma solicitação de acesso para você conferir.',
 redemption:'Uma recompensa está aguardando sua decisão.',
 story:'Uma atividade do Instagram precisa da sua análise.',
 test:'Funcionou! As notificações do NPV estão ativas neste aparelho.'
}
function pushMessage(kind){
 const tab=pageFor[kind]
 return JSON.stringify({title:titleFor[kind],body:bodyFor[kind],
  url:'/clube?npv_admin_tab='+encodeURIComponent(tab),tag:'npv-admin-'+kind})
}
async function sendToSubscriptions(svc,kind,adminId=null){
 if(!pushConfigured())return {success:false,reason:'push_not_configured',sent:0}
 let query=svc.from('clube_admin_push_subscriptions')
   .select('id,admin_id,endpoint,p256dh,auth').eq('enabled',true).limit(30)
 if(adminId)query=query.eq('admin_id',adminId)
 const {data, error}=await query
 if(error)return {success:false,reason:'subscriptions_unavailable',sent:0}
 const results=await Promise.all((data||[]).map(async(row)=>{
   try{
     await sendWebPush({endpoint:row.endpoint,keys:{p256dh:row.p256dh,auth:row.auth}},
       pushMessage(kind),{publicKey:process.env.NPV_VAPID_PUBLIC_KEY,privateKey:process.env.NPV_VAPID_PRIVATE_KEY})
     return true
   }catch(err){
     if([404,410].includes(Number(err.statusCode)))
       await svc.from('clube_admin_push_subscriptions').update({enabled:false}).eq('id',row.id)
     return false
   }
 }))
 return {success:true,sent:results.filter(Boolean).length,devices:(data||[]).length}
}
async function isStillPending(svc,kind,id){
 if(kind==='registration')return isActionableRegistration(svc,id)
 if(kind==='redemption'){
  const {data,error}=await svc.from('clube_redemptions').select('id,status,is_test').eq('id',id).maybeSingle()
  return !error&&data?.status==='pending'&&data.is_test!==true
 }
 if(kind==='story'){
  const {data,error}=await svc.from('clube_instagram_story_events').select('event_id,status').eq('event_id',id).maybeSingle()
  return !error&&data?.status==='review'
 }
 return false
}
async function pendingCounts(svc){
 const [registration,redemption,story]=await Promise.all([
  countActionableRegistrations(svc),
  svc.from('clube_redemptions').select('id',{count:'exact',head:true}).eq('status','pending').eq('is_test',false),
  svc.from('clube_instagram_story_events').select('event_id',{count:'exact',head:true}).eq('status','review')
 ])
 return {registration,
  redemption:redemption.error?null:redemption.count,
  story:story.error?null:story.count}
}
export async function handleAdminPush(req,res){
 if(!url()||!service())return reply(res,503,{status:'service_not_configured'})
 const svc=client()
 const query=new URL(req.url||'','https://npv.local').searchParams
 if(req.method==='POST'&&query.get('action')==='dispatch'){
  if(!safeMatch(req.headers?.['x-npv-push-secret'],process.env.NPV_PUSH_WEBHOOK_SECRET))
   return reply(res,403,{status:'forbidden'})
  const kind=req.body?.kind,id=String(req.body?.id||'')
  if(!['registration','redemption','story'].includes(kind)||(id.length<4||id.length>320||/[\x00-\x1f\x7f]/.test(id)))
   return reply(res,400,{status:'invalid_event'})
  if(!(await isStillPending(svc,kind,id)))return reply(res,200,{status:'not_pending'})
  const {error:insertError}=await svc.from('clube_admin_push_events')
    .insert({kind,source_id:id,status:'processing'})
  if(insertError?.code==='23505')return reply(res,200,{status:'duplicate'})
  if(insertError)return reply(res,503,{status:'event_store_unavailable'})
  const result=await sendToSubscriptions(svc,kind)
  await svc.from('clube_admin_push_events').update({
   status:result.success&&result.sent>0?'sent':'not_delivered',
   delivered_count:result.sent||0
  }).eq('kind',kind).eq('source_id',id)
  return reply(res,200,{status:result.sent>0?'sent':'not_delivered',delivered:result.sent||0})
 }
 const admin=await adminFromRequest(req,svc)
 if(!admin)return reply(res,403,{status:'admin_required'})
 if(req.method==='GET'){
  const [counts,devices]=await Promise.all([pendingCounts(svc),
   svc.from('clube_admin_push_subscriptions').select('id',{head:true,count:'exact'})
    .eq('admin_id',admin.id).eq('enabled',true)])
  return reply(res,200,{status:'ok',configured:pushConfigured(),
   publicKey:process.env.NPV_VAPID_PUBLIC_KEY||null,
   devices:devices.error?0:devices.count||0,counts})
 }
 if(req.method!=='POST')return reply(res,405,{status:'method_not_allowed'})
 const action=req.body?.action
 if(action==='subscribe'){
  const subscription=req.body?.subscription
  const endpoint=subscription?.endpoint,keys=subscription?.keys
  if(!pushConfigured())return reply(res,503,{status:'push_not_configured'})
  if(typeof endpoint!=='string'||endpoint.length>2048||!allowedPushEndpoint(endpoint)||
     typeof keys?.p256dh!=='string'||typeof keys?.auth!=='string'||
     keys.p256dh.length>256||keys.auth.length>256)
    return reply(res,400,{status:'invalid_subscription'})
  const {error}=await svc.from('clube_admin_push_subscriptions')
    .upsert({admin_id:admin.id,endpoint,p256dh:keys.p256dh,auth:keys.auth,
      enabled:true,updated_at:new Date().toISOString()},{onConflict:'endpoint'})
  return reply(res,error?503:200,{status:error?'subscription_failed':'subscribed'})
 }
 if(action==='unsubscribe'){
  const endpoint=req.body?.endpoint
  if(typeof endpoint!=='string'||endpoint.length>2048)return reply(res,400,{status:'invalid_subscription'})
  const {error}=await svc.from('clube_admin_push_subscriptions').update({enabled:false})
     .eq('admin_id',admin.id).eq('endpoint',endpoint)
  return reply(res,error?503:200,{status:error?'subscription_failed':'unsubscribed'})
 }
 if(action==='test'){
  const result=await sendToSubscriptions(svc,'test',admin.id)
  return reply(res,result.success?200:503,{
    status:result.sent>0?'sent':'no_active_device',sent:result.sent||0})
 }
 return reply(res,400,{status:'invalid_action'})
}
