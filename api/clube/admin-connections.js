// Visao administrativa SOMENTE leitura. Identidades e status de integracoes sem tokens.
import {createClient} from '@supabase/supabase-js'
import {instagramAdminStatus,stravaAdminStatus} from '../../clube/admin/connectionStatus.mjs'
export const config={maxDuration:30}
const respond=(res,status,body)=>res.writeHead(status,{
 'Content-Type':'application/json; charset=utf-8',
 'Cache-Control':'private, no-store, max-age=0',
 'Vary':'Authorization','X-Content-Type-Options':'nosniff',
 'Cross-Origin-Resource-Policy':'same-origin'
}).end(JSON.stringify(body))
async function readAll(client,table,cols,orderKey){
 const rows=[]
 for(let offset=0;offset<10000;offset+=500){
  const {data,error}=await client.from(table).select(cols).order(orderKey,{ascending:true}).range(offset,offset+499)
  if(error)throw new Error('read_unavailable')
  rows.push(...(data||[]))
  if((data||[]).length<500)return rows
 }
 throw new Error('too_many_rows')
}
export async function handleAdminConnections(req,res,{env=process.env,clientFn=createClient}={}){
 if(req.method!=='GET')return respond(res,405,{status:'method_not_allowed'})
 const bearer=req.headers?.authorization
 if(typeof bearer!=='string'||!/^Bearer [A-Za-z0-9._~-]{16,4096}$/.test(bearer))
  return respond(res,401,{status:'unauthorized'})
 const url=env.VITE_CLUBE_SUPABASE_URL||env.SUPABASE_URL
 const pub=env.VITE_CLUBE_SUPABASE_PUBLISHABLE_KEY||env.SUPABASE_PUBLISHABLE_KEY
 const secret=env.SUPABASE_SERVICE_ROLE_KEY
 if(!url||!pub||!secret)return respond(res,503,{status:'configuration_unavailable'})
 try{
  const auth=clientFn(url,pub,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}})
  const {data:user,error:authError}=await auth.auth.getUser(bearer.slice(7))
  if(authError||!user?.user?.id)return respond(res,401,{status:'unauthorized'})
  const svc=clientFn(url,secret,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}})
  const {data:admin,error:roleError}=await svc.from('clube_admins')
    .select('user_id').eq('user_id',user.user.id).maybeSingle()
  if(roleError)return respond(res,503,{status:'authorization_unavailable'})
  if(admin?.user_id!==user.user.id)return respond(res,403,{status:'forbidden'})
  const [ig,st,global]=await Promise.all([
   readAll(svc,'clube_instagram_links','student_id,verified_at','student_id'),
   readAll(svc,'clube_strava_connection_status','student_id,connected,verified_at','student_id'),
   svc.from('clube_instagram_business_auth').select('slot,expires_at')
      .eq('slot','official').maybeSingle()
  ])
  if(global.error)throw Error('integration_status_unavailable')
  const statusByStudent={}
  for(const v of ig)statusByStudent[v.student_id]={
   instagram:instagramAdminStatus(v,global.data,{configured:env.NPV_INSTAGRAM_ENABLED==='true'})
  }
  for(const v of st){
   statusByStudent[v.student_id]={
     ...statusByStudent[v.student_id],strava:stravaAdminStatus(v)
   }
  }
  return respond(res,200,{status:'ok',students:statusByStudent,checked_at:new Date().toISOString(),
    note:'Strava: status recente deriva do uso individual autorizado; sem registro antigo nao implica desconexao.'})
 }catch{return respond(res,503,{status:'integration_status_unavailable'})}
}
export default function handler(req,res){return handleAdminConnections(req,res)}
