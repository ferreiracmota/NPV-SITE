import {createClient} from '@supabase/supabase-js'
export const config={maxDuration:30}
const respond=(res,status,data)=>res.writeHead(status,{
 'Content-Type':'application/json; charset=utf-8','Cache-Control':'private, no-store',
 'X-Content-Type-Options':'nosniff','Vary':'Authorization'
}).end(JSON.stringify(data))
export default async function handler(req,res){
 if(req.method!=='GET')return respond(res,405,{status:'method_not_allowed'})
 const bearer=req.headers?.authorization
 if(typeof bearer!=='string'||!/^Bearer [A-Za-z0-9._~-]{16,4096}$/.test(bearer))
  return respond(res,401,{status:'unauthorized'})
 const env=process.env,url=env.VITE_CLUBE_SUPABASE_URL||env.SUPABASE_URL
 const key=env.VITE_CLUBE_SUPABASE_PUBLISHABLE_KEY||env.SUPABASE_PUBLISHABLE_KEY
 if(!url||!key||!env.SUPABASE_SERVICE_ROLE_KEY)return respond(res,503,{status:'unavailable'})
 try{
  const authClient=createClient(url,key,{
   auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},
   global:{headers:{Authorization:bearer}}
  })
  const {data:auth,error:e}=await authClient.auth.getUser(bearer.slice(7))
  if(e||!auth?.user?.id)return respond(res,401,{status:'unauthorized'})
  const {data:admin,error:roleError}=await authClient.from('clube_admins')
   .select('user_id').eq('user_id',auth.user.id).maybeSingle()
  if(roleError)return respond(res,503,{status:'role_unavailable'})
  if(!admin)return respond(res,403,{status:'forbidden'})
  const svc=createClient(url,env.SUPABASE_SERVICE_ROLE_KEY,{
   auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}})
  const ids=[]
  for(let offset=0;offset<10000;offset+=250){
   const {data,error}=await svc.from('clube_profiles').select('id,email')
     .eq('approved',false).order('id',{ascending:true}).range(offset,offset+249)
   if(error)throw Error('profile_lookup_unavailable')
   for(const p of data||[]){
    const {data:record,error:lookupError}=await svc.auth.admin.getUserById(p.id)
    if(lookupError)throw Error('confirmation_lookup_unavailable')
    const user=record?.user
    if(user?.email?.trim().toLowerCase()===p.email?.trim().toLowerCase()
      &&Boolean(user.email_confirmed_at||user.confirmed_at))ids.push(p.id)
   }
   if((data||[]).length<250)return respond(res,200,{status:'ok',verified_pending_ids:ids})
  }
  throw Error('too_many_profiles')
 }catch{return respond(res,503,{status:'unavailable'})}
}
