// Conciliação diária protegida. Descobre assinaturas cujos webhooks não chegaram.
// Sem ativação em produção até credenciais, homologação e aprovação da política.
import { createClient } from '@supabase/supabase-js'
import { isAuthentic } from './core.mjs'
import { discoverMissingPayments } from './discovery.mjs'

const reply=(res,code,data)=>res.writeHead(code,{
 'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'
}).end(JSON.stringify(data))

export default async function handler(req,res){
 if(req.method!=='GET')return reply(res,405,{status:'method_not_allowed'})
 const env=process.env
 if(!env.CRON_SECRET||!isAuthentic(req.headers.authorization,'Bearer '+env.CRON_SECRET))
  return reply(res,401,{status:'unauthorized'})
 if(!env.SUPABASE_URL||!env.SUPABASE_SERVICE_ROLE_KEY||
  !env.HOTMART_CLIENT_ID||!env.HOTMART_CLIENT_SECRET||
  !env.HOTMART_BASIC_TOKEN||!env.HOTMART_ALLOWED_PRODUCT_IDS)
  return reply(res,503,{status:'not_configured'})
 const db=createClient(env.SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{
  auth:{persistSession:false,autoRefreshToken:false}
 })
 const {data:config,error}=await db.from('clube_hotmart_config')
  .select('live_credit_enabled,starts_at').eq('singleton',true).single()
 if(error)return reply(res,503,{status:'database_unavailable'})
 if(!config?.live_credit_enabled||!config.starts_at)
  return reply(res,200,{status:'disabled'})
 try{
  const found=await discoverMissingPayments(db,env,config.starts_at)
  return reply(res,200,{status:'ok',...found})
 }catch{
  return reply(res,503,{status:'reconciliation_retry_later'})
 }
}
