import {createClient} from '@supabase/supabase-js'
import {syncVerifiedHotmartPoints} from '../../clube/hotmart-admin/pointsSyncService.mjs'
export const config={maxDuration:60}
const respond=(res,status,data)=>res.writeHead(status,{
 'Content-Type':'application/json; charset=utf-8','Cache-Control':'private, no-store',
 'X-Content-Type-Options':'nosniff','Vary':'Authorization'
}).end(JSON.stringify(data))
export default async function handler(req,res){
 if(!['GET','POST'].includes(req.method))return respond(res,405,{status:'method_not_allowed'})
 const env=process.env
 const bearer=req.headers?.authorization
 if(req.method==='GET'){
   if(!env.CRON_SECRET||env.CRON_SECRET.length<16||bearer!==`Bearer ${env.CRON_SECRET}`)
     return respond(res,401,{status:'unauthorized'})
 }else{
   if(typeof bearer!=='string'||!/^Bearer [A-Za-z0-9._~-]{16,4096}$/.test(bearer))
     return respond(res,401,{status:'unauthorized'})
   const url=env.VITE_CLUBE_SUPABASE_URL||env.SUPABASE_URL
   const key=env.VITE_CLUBE_SUPABASE_PUBLISHABLE_KEY||env.SUPABASE_PUBLISHABLE_KEY
   if(!url||!key)return respond(res,503,{status:'auth_unavailable'})
   try{
     const client=createClient(url,key,{
       auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},
       global:{headers:{Authorization:bearer}}
     })
     const {data:auth,error}=await client.auth.getUser(bearer.slice(7))
     if(error||!auth?.user?.id)return respond(res,401,{status:'unauthorized'})
     const {data:admin,error:roleError}=await client.from('clube_admins')
       .select('user_id').eq('user_id',auth.user.id).maybeSingle()
     if(roleError)return respond(res,503,{status:'admin_role_unavailable'})
     if(admin?.user_id!==auth.user.id)return respond(res,403,{status:'forbidden'})
   }catch{return respond(res,503,{status:'admin_role_unavailable'})}
 }
 if(env.HOTMART_POINTS_SYNC_ENABLED!=='true')return respond(res,200,{status:'disabled',credited:0})
 try{
  const result=await syncVerifiedHotmartPoints(env)
  return respond(res,200,result)
 }catch{
  return respond(res,503,{status:'sync_unavailable',credited:0})
 }
}
