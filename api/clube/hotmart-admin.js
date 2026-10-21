// Endpoint existente do Clube NPV, estendido apenas para leitura oficial.
// Jamais persistir PII em storage, frontend compilado, banco ou logs.
import {createClient} from '@supabase/supabase-js'
import {PRODUCT,subscriptionSnapshot,subscriberPayments,matchIdentity,metricsFor,canonicalEmail} from '../../clube/hotmart-admin/reader.mjs'

const respond=(res,status,body)=>res.writeHead(status,{
  'Content-Type':'application/json; charset=utf-8',
  'Cache-Control':'no-store, private','Vary':'Authorization',
  'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'
}).end(JSON.stringify(body))
const EMPTY={status:'awaiting_integration',message:'Aguardando integração com a Hotmart',
 metrics:null,subscriptions:[],synced_at:null,identity_verified:false}
let cache=null
const cacheLife=90*1000
const linkDisabledReason='Vínculos não verificados: configuração de consulta Auth segura pendente'
async function linkedRows(rows,env,createClientFn){
 const adminKey=env.SUPABASE_SERVICE_ROLE_KEY
 const url=env.SUPABASE_URL||env.VITE_CLUBE_SUPABASE_URL
 if(!adminKey||!url)return {rows:rows.map(x=>({...x,link_status:'not_verified'})),verified:false}
 const db=createClientFn(url,adminKey,{auth:{persistSession:false,autoRefreshToken:false}})
 const {data:profiles,error,count}=await db.from('clube_profiles')
  .select('id,email,approved',{count:'exact'}).limit(1000)
 if(error||!Array.isArray(profiles)||(Number.isFinite(count)&&count>profiles.length))
  throw new Error('clube_profiles_incomplete')
 const emails=new Set(rows.map(x=>x.subscriber_email).filter(Boolean))
 const candidates=profiles.filter(p=>emails.has(canonicalEmail(p.email)))
 const userInfo=[]
 for(const profile of candidates){
  const {data,error:authError}=await db.auth.admin.getUserById(profile.id)
  if(authError)throw new Error('clube_auth_unavailable')
  if(data?.user)userInfo.push(data.user)
 }
 return {rows:matchIdentity(rows,profiles,userInfo),verified:true}
}
async function loadSnapshot(env,reader,identity,createClientFn){
 const source=await reader(env)
 if(!source?.complete||!Array.isArray(source.subscriptions))
  throw new Error('hotmart_incomplete')
 const match=identity?await identity(source.subscriptions,env,createClientFn):
  await linkedRows(source.subscriptions,env,createClientFn)
 const result={
  status:'ready',source:'hotmart_official',product_id:PRODUCT.id,
  subscriptions:match.rows,identity_verified:match.verified,
  identity_notice:match.verified?null:linkDisabledReason,
  metrics:metricsFor(match.rows,{identityVerified:match.verified}),
  synced_at:source.synced_at
 }
 cache={expiresAt:Date.now()+cacheLife,result}
 return result
}
export async function handleHotmartAdminStatus(req,res,{
 env=process.env,createClientFn=createClient,
 reader=subscriptionSnapshot,paymentReader=subscriberPayments,
 identity=null,now=()=>Date.now()
}={}){
 if(req.method!=='GET')return respond(res,405,{status:'method_not_allowed'})
 const bearer=req.headers?.authorization
 if(typeof bearer!=='string'||!/^Bearer [A-Za-z0-9._~-]{16,4096}$/.test(bearer))
  return respond(res,401,{status:'unauthorized'})
 const url=env.VITE_CLUBE_SUPABASE_URL||env.SUPABASE_URL
 const publicKey=env.VITE_CLUBE_SUPABASE_PUBLISHABLE_KEY||env.SUPABASE_PUBLISHABLE_KEY
 if(!url||!publicKey)return respond(res,503,{status:'admin_service_unavailable'})
 try{
  const client=createClientFn(url,publicKey,{
   auth:{persistSession:false,autoRefreshToken:false},
   global:{headers:{Authorization:bearer}}
  })
  const {data:auth,error:authError}=await client.auth.getUser(bearer.slice(7))
  if(authError||!auth?.user?.id)return respond(res,401,{status:'unauthorized'})
  const {data:administrator,error:roleError}=await client.from('clube_admins')
   .select('user_id').eq('user_id',auth.user.id).maybeSingle()
  if(roleError)return respond(res,503,{status:'admin_authorization_unavailable'})
  if(administrator?.user_id!==auth.user.id)return respond(res,403,{status:'forbidden'})
  // Administração autenticada acima ANTES de qualquer consulta Hotmart ou service_role.
  if(!env.HOTMART_CLIENT_ID||!env.HOTMART_CLIENT_SECRET||
     !env.HOTMART_BASIC_TOKEN||String(env.HOTMART_ALLOWED_PRODUCT_IDS||'').trim()!=='6304828')
   return respond(res,200,EMPTY)
  const requestUrl=new URL(req.url||'/api/clube/hotmart-admin','https://npv.local')
  const action=requestUrl.searchParams.get('action')||'subscriptions'
  if(!['subscriptions','payments'].includes(action))
   return respond(res,400,{status:'invalid_action'})
  const fresh=requestUrl.searchParams.get('refresh')==='1'
  let snapshot=cache&&cache.expiresAt>now()&&!fresh?cache.result:null
  if(!snapshot){
   try{snapshot=await loadSnapshot(env,reader,identity,createClientFn)}
   catch{
    if(action==='subscriptions'&&cache?.result)return respond(res,200,{
      ...cache.result,status:'stale',warning:'Falha na leitura oficial. Exibindo última sincronização concluída.'})
    return respond(res,503,{status:'sync_unavailable',warning:'Falha na consulta oficial. Tente novamente.'})
   }
  }
  if(action==='subscriptions')return respond(res,200,snapshot)
  const code=requestUrl.searchParams.get('subscriber_code')||''
  if(!/^[A-Za-z0-9_-]{2,160}$/.test(code)||
    !snapshot.subscriptions.some(x=>x.subscriber_code===code))
   return respond(res,404,{status:'subscription_not_found'})
  try{
   const payment=await paymentReader(env,code)
   return respond(res,200,{status:'read_only',subscriber_code:code,...payment,
     // Nenhuma quantidade definitiva de renovação é retornada.
     confirmed_renewals:null,points_awarded:null})
  }catch{
   return respond(res,503,{status:'payment_history_unavailable'})
  }
 }catch{
  return respond(res,503,{status:'admin_service_unavailable'})
 }
}
export default function handler(req,res){return handleHotmartAdminStatus(req,res)}
