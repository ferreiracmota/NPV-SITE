// Fase 1: endpoint PRIVADO, sem writes no Supabase, sem concessão de pontos.
// Usar GET /api/hotmart/identify?mode=catalog para obter IDs oficiais,
// depois configurar HOTMART_ALLOWED_PRODUCT_IDS no servidor e usar mode=assinantes.
// Nunca habilitar este endpoint em produção antes de homologar o controle de acesso.
import { createClient } from '@supabase/supabase-js'
import { isAuthentic } from '../../clube/hotmart/core.mjs'
import { readCatalog,readSubscriptions,readPurchaseHistory,resolveClubeIdentity,
 baselineForFirstSync } from '../../clube/hotmart/identify-core.mjs'

const respond=(res,code,payload)=>res.writeHead(code,{
 'Cache-Control':'no-store','Content-Type':'application/json; charset=utf-8',
 'X-Content-Type-Options':'nosniff'
}).end(JSON.stringify(payload))
const mask=value=>value?value.slice(0,2)+'***@'+value.split('@')[1]:null
export default async function handler(req,res){
 if(req.method!=='GET')return respond(res,405,{status:'method_not_allowed'})
 const env=process.env
 if(!env.HOTMART_IDENTIFY_SECRET||
    !isAuthentic(req.headers.authorization,'Bearer '+env.HOTMART_IDENTIFY_SECRET))
  return respond(res,401,{status:'unauthorized'})
 if(!env.HOTMART_CLIENT_ID||!env.HOTMART_CLIENT_SECRET||!env.HOTMART_BASIC_TOKEN)
  return respond(res,503,{status:'hotmart_connection_required'})
 const url=new URL(req.url,'https://npv.local')
 const mode=url.searchParams.get('mode')||'catalog'
 try{
  if(mode==='catalog'){
   const result=await readCatalog(env)
   return respond(res,200,{status:'read_only',mode,generatedAt:new Date().toISOString(),...result})
  }
  if(mode!=='assinantes')return respond(res,400,{status:'invalid_mode'})
  const ids=String(env.HOTMART_ALLOWED_PRODUCT_IDS||'').split(',')
   .map(s=>Number(s.trim())).filter(n=>Number.isSafeInteger(n)&&n>0)
  if(ids.length===0)return respond(res,409,{status:'approve_product_ids_first'})
  if(!env.SUPABASE_URL||!env.SUPABASE_SERVICE_ROLE_KEY)
   return respond(res,503,{status:'supabase_server_connection_required'})
  const db=createClient(env.SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,
   {auth:{persistSession:false,autoRefreshToken:false}})
  const info=await readSubscriptions(env,ids)
  const observedAt=new Date().toISOString()
  const items=[]
  for(const subscription of info.subscriptions.slice(0,30)){
   let identity={status:'pending_missing_email'}
   if(subscription.subscriberEmail){
    const {data:profiles,error}=await db.from('clube_profiles')
     .select('id,email,approved').ilike('email',subscription.subscriberEmail).limit(3)
    if(error)throw new Error('clube_profiles_read_unavailable')
    const users=[]
    for(const p of profiles||[]){
     const {data,error:userError}=await db.auth.admin.getUserById(p.id)
     if(userError)throw new Error('clube_auth_read_unavailable')
     if(data.user)users.push(data.user)
    }
    identity=resolveClubeIdentity(subscription,profiles||[],users)
   }
   let purchases=[]
   let historyStatus='not_checked'
   try{
    purchases=await readPurchaseHistory(env,subscription.subscriberCode)
    historyStatus='checked'
   }catch{historyStatus='unavailable'}
   const baseline=baselineForFirstSync(subscription,purchases,observedAt)
   items.push({
    subscriberCodeMasked:subscription.subscriberCode.slice(0,2)+'***',
    subscriberEmailMasked:mask(subscription.subscriberEmail),
    productId:subscription.productId,productName:subscription.productName,
    plan:subscription.plan,planId:subscription.planId,status:subscription.status,
    active:subscription.active,nextChargeAt:subscription.nextChargeAt,
    matchedClubeProfile:identity.status==='linked',
    identityStatus:identity.status,
    lastConfirmedPaymentAt:baseline.baselinePaidAt,
    historicalPaymentRead:historyStatus,
    pointsAwarded:0,
    initialSyncOnly:true
   })
  }
  return respond(res,200,{
   status:'read_only',mode,generatedAt:observedAt,
   complete:info.complete&&info.subscriptions.length<=30,
   scannedSubscriptions:info.subscriptions.length,
   activeSubscriptions:info.subscriptions.filter(x=>x.active).length,
   linkedCandidates:items.filter(x=>x.matchedClubeProfile).length,
   pending:items.filter(x=>!x.matchedClubeProfile).length,
   results:items,
   explanation:'Simulação da primeira sincronização; vínculo não persistido e pontos não lançados.'
  })
 }catch{
  return respond(res,503,{status:'official_read_unavailable_or_incomplete'})
 }
}
