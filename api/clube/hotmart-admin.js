// Painel já publicado: preserva JWT/admin e acrescenta somente leitura Hotmart.
// Credenciais nunca entram no navegador e nenhuma resposta é logada/persistida.
// Não importa o PR #14 (webhook/reconcile/SQL); só o leitor independente.
import { createClient } from '@supabase/supabase-js'
import { readLiveSnapshot } from '../../clube/hotmart-admin/reader.mjs'

export const config={maxDuration:60}
const CACHE_TTL=5*60*1000
const STALE_TTL=60*60*1000
let lastGood=null,lastGoodAt=0,loading=null

const respond=(res,status,body)=>res.writeHead(status,{
 'Content-Type':'application/json; charset=utf-8',
 'Cache-Control':'private, no-store, max-age=0',
 'Vary':'Authorization',
 'X-Content-Type-Options':'nosniff',
 'Cross-Origin-Resource-Policy':'same-origin'
}).end(JSON.stringify(body))

const waiting=()=>({
 status:'awaiting_integration',message:'Aguardando integração com a Hotmart',
 metrics:null,subscriptions:[],synced_at:null,identity_complete:false,complete:false
})
export async function handleHotmartAdminStatus(req,res,{
 env=process.env,createClientFn=createClient,loadSnapshot=readLiveSnapshot,
 clock=()=>Date.now()
}={}){
 if(req.method!=='GET')return respond(res,405,{status:'method_not_allowed'})
 const bearer=req.headers?.authorization
 if(typeof bearer!=='string'||!/^Bearer [A-Za-z0-9._~-]{16,4096}$/.test(bearer))
  return respond(res,401,{status:'unauthorized'})
 const url=env.VITE_CLUBE_SUPABASE_URL||env.SUPABASE_URL
 const key=env.VITE_CLUBE_SUPABASE_PUBLISHABLE_KEY||env.SUPABASE_PUBLISHABLE_KEY
 if(!url||!key)return respond(res,503,{status:'admin_service_unavailable'})
 try{
  const token=bearer.slice(7)
  const client=createClientFn(url,key,{
   auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},
   global:{headers:{Authorization:bearer}}
  })
  // Apenas JWT validado no servidor; jamais confiar em isAdmin fornecido pelo cliente.
  const {data:auth,error:authError}=await client.auth.getUser(token)
  const user=auth?.user
  if(authError||!user?.id)return respond(res,401,{status:'unauthorized'})
  const {data:admin,error:roleError}=await client.from('clube_admins')
   .select('user_id').eq('user_id',user.id).maybeSingle()
  if(roleError)return respond(res,503,{status:'admin_authorization_unavailable'})
  if(admin?.user_id!==user.id)return respond(res,403,{status:'forbidden'})
  const requestUrl=new URL(req.url||'/api/clube/hotmart-admin','https://npv.local')
  if(requestUrl.searchParams.get('pending')==='1'){
   if(!env.SUPABASE_SERVICE_ROLE_KEY)return respond(res,503,{status:'verification_unavailable'})
   try{
    const verified=[]
    const svc=createClientFn(url,env.SUPABASE_SERVICE_ROLE_KEY,{
      auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}})
    for(let offset=0;offset<10000;offset+=250){
      const {data,error}=await svc.from('clube_profiles').select('id,email')
       .eq('approved',false).order('id',{ascending:true}).range(offset,offset+249)
      if(error)throw Error('pending_query_failed')
      for(const p of data||[]){
       const {data:authUser,error:lookupError}=await svc.auth.admin.getUserById(p.id)
       if(lookupError)throw Error('pending_user_unavailable')
       const row=authUser?.user
       if(row?.email?.trim().toLowerCase()===p.email?.trim().toLowerCase()
        &&Boolean(row.email_confirmed_at||row.confirmed_at))verified.push(p.id)
      }
      if((data||[]).length<250)return respond(res,200,{status:'ok',verified_pending_ids:verified})
    }
    return respond(res,503,{status:'verification_too_many_profiles'})
   }catch{return respond(res,503,{status:'verification_unavailable'})}
  }
  // A feature nunca é ligada por ausência de variável, nem lê credenciais na main.
  if(env.HOTMART_ADMIN_READONLY_ENABLED!=='true')return respond(res,200,waiting())
  if(env.HOTMART_ALLOWED_PRODUCT_IDS!=='6304828')
   return respond(res,503,{status:'hotmart_allowlist_not_configured',metrics:null,subscriptions:[]})
  const reqUrl=new URL(req.url||'/api/clube/hotmart-admin','https://npv.local')
  const refresh=reqUrl.searchParams.get('refresh')==='1'
  const now=clock()
  if(!refresh&&lastGood&&now-lastGoodAt<CACHE_TTL)
   return respond(res,200,{...lastGood,cache_status:'fresh'})
  try{
   if(!loading)loading=Promise.resolve().then(()=>loadSnapshot(env,{createClientFn,adminClient:client}))
    .finally(()=>{loading=null})
   const current=await loading
   if(current?.status!=='synced'||!current?.complete||!Array.isArray(current.subscriptions))
    throw new Error('incomplete_snapshot')
   lastGood=current;lastGoodAt=clock()
   return respond(res,200,{...current,cache_status:'fresh'})
  }catch{
   // Quando a API falhar: não declarar "0", nem sobrescrever sucesso anterior.
   if(lastGood&&clock()-lastGoodAt<STALE_TTL)
    return respond(res,200,{...lastGood,status:'stale',cache_status:'stale',
     warning:'Consulta Hotmart indisponível: exibindo última sincronização bem-sucedida.'})
   return respond(res,503,{status:'sync_unavailable',metrics:null,subscriptions:[],
    synced_at:lastGood?.synced_at||null,
    warning:'Não foi possível consultar a Hotmart. Nenhum total foi confirmado nesta tentativa.'})
  }
 }catch{
  return respond(res,503,{status:'admin_service_unavailable'})
 }
}
export default function handler(req,res){return handleHotmartAdminStatus(req,res)}
