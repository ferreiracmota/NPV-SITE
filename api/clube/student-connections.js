// Consulta exclusivamente administrativa dos vínculos do Clube NPV.
// Não retorna tokens, identificadores externos ou dados do Strava.
import {createClient} from '@supabase/supabase-js'
import {handleClubeEmailAdmin} from '../../clube/email/admin-handler.mjs'
import {handleClubeProfileUpdate} from '../../clube/profile/profile-handler.mjs'
import {handleMemberCard} from '../../clube/profile/member-card-handler.mjs'
export const config={maxDuration:30}
const reply=(res,status,data)=>res.writeHead(status,{
 'Content-Type':'application/json; charset=utf-8',
 'Cache-Control':'private, no-store, max-age=0','Vary':'Authorization',
 'X-Content-Type-Options':'nosniff'
}).end(JSON.stringify(data))
async function rows(db,table,columns){
 const result=[]
 for(let start=0;start<20000;start+=500){
  const {data,error}=await db.from(table).select(columns)
   .order('student_id',{ascending:true}).range(start,start+499)
  if(error)throw new Error('source_unavailable')
  result.push(...(data||[]))
  if((data||[]).length<500)return result
 }
 throw new Error('source_incomplete')
}
export default async function handler(req,res){
 const params=new URL(req.url||'/api/clube/student-connections','https://npv.local').searchParams
 if(params.get('npv_admin_route')==='email')return handleClubeEmailAdmin(req,res)
 if(params.get('npv_profile_route')==='update')return handleClubeProfileUpdate(req,res)
 if(params.get('npv_profile_route')==='card')return handleMemberCard(req,res)
 if(req.method!=='GET')return reply(res,405,{status:'method_not_allowed'})
 const bearer=req.headers?.authorization||''
 if(typeof bearer!=='string'||!/^Bearer [A-Za-z0-9._~-]{16,4096}$/.test(bearer))
  return reply(res,401,{status:'unauthorized'})
 const url=process.env.VITE_CLUBE_SUPABASE_URL||process.env.SUPABASE_URL
 const key=process.env.VITE_CLUBE_SUPABASE_PUBLISHABLE_KEY||process.env.SUPABASE_PUBLISHABLE_KEY
 const svcKey=process.env.SUPABASE_SERVICE_ROLE_KEY
 if(!url||!key||!svcKey)return reply(res,503,{status:'configuration_unavailable'})
 try{
  const client=createClient(url,key,{
   auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},
   global:{headers:{Authorization:bearer}}
  })
  const {data:auth,error:authError}=await client.auth.getUser(bearer.slice(7))
  if(authError||!auth?.user?.id)return reply(res,401,{status:'unauthorized'})
  const {data:admin,error:roleError}=await client.from('clube_admins')
   .select('user_id').eq('user_id',auth.user.id).maybeSingle()
  if(roleError)return reply(res,503,{status:'authorization_unavailable'})
  if(admin?.user_id!==auth.user.id)return reply(res,403,{status:'forbidden'})
  const db=createClient(url,svcKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}})
  const [instagram,strava,birthdayFreeAccess]=await Promise.all([
   rows(db,'clube_instagram_links','student_id,verified_at'),
   rows(db,'clube_strava_connection_status','student_id,connected,verified_at'),
   rows(db,'clube_birthday_free_access','student_id,enabled')
  ])
  return reply(res,200,{
   status:'ok',
   instagram:instagram.map(x=>({student_id:x.student_id,verified_at:x.verified_at})),
   birthday_free_access:birthdayFreeAccess.map(x=>({student_id:x.student_id,enabled:x.enabled===true})),
   strava:strava.map(x=>({student_id:x.student_id,connected:x.connected===true,verified_at:x.verified_at}))
  })
 }catch{
  return reply(res,503,{status:'connection_lookup_unavailable'})
 }
}
