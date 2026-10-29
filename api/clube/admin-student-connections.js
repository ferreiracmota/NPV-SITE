// Somente o administrador autenticado pode consultar os estados de conexão.
// Nunca retorna tokens OAuth, scoped IDs do Instagram ou e-mails de terceiros.
import {createClient} from '@supabase/supabase-js'
const respond=(res,status,payload)=>res.writeHead(status,{
  'Content-Type':'application/json; charset=utf-8',
  'Cache-Control':'private, no-store, max-age=0',
  'Vary':'Authorization','X-Content-Type-Options':'nosniff',
  'Cross-Origin-Resource-Policy':'same-origin'
}).end(JSON.stringify(payload))
async function readAll(db,table,fields,sort){
  const rows=[]
  for(let from=0;from<15000;from+=500){
    const {data,error}=await db.from(table).select(fields).order(sort,{ascending:true}).range(from,from+499)
    if(error)throw new Error('read_unavailable')
    rows.push(...(data||[]))
    if((data||[]).length<500)return rows
  }
  throw new Error('result_limit')
}
export default async function handler(req,res){
  if(req.method!=='GET')return respond(res,405,{status:'method_not_allowed'})
  const bearer=req.headers?.authorization
  if(typeof bearer!=='string'||!/^Bearer [\w.~-]{16,4096}$/.test(bearer))
    return respond(res,401,{status:'unauthorized'})
  const env=process.env
  const url=env.VITE_CLUBE_SUPABASE_URL||env.SUPABASE_URL
  const pub=env.VITE_CLUBE_SUPABASE_PUBLISHABLE_KEY||env.SUPABASE_PUBLISHABLE_KEY
  if(!url||!pub||!env.SUPABASE_SERVICE_ROLE_KEY)return respond(res,503,{status:'unavailable'})
  try{
    const userDb=createClient(url,pub,{
      auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},
      global:{headers:{Authorization:bearer}}
    })
    const {data:auth,error:authError}=await userDb.auth.getUser(bearer.slice(7))
    if(authError||!auth?.user?.id)return respond(res,401,{status:'unauthorized'})
    const {data:admin,error:adminError}=await userDb.from('clube_admins')
      .select('user_id').eq('user_id',auth.user.id).maybeSingle()
    if(adminError)return respond(res,503,{status:'authorization_unavailable'})
    if(admin?.user_id!==auth.user.id)return respond(res,403,{status:'forbidden'})
    const db=createClient(url,env.SUPABASE_SERVICE_ROLE_KEY,{
      auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}
    })
    const [instagram,strava]=await Promise.all([
      readAll(db,'clube_instagram_links','student_id,verified_at','student_id'),
      readAll(db,'clube_strava_connection_status','student_id,connected,verified_at,updated_at','student_id')
    ])
    return respond(res,200,{status:'ok',instagram,strava,checked_at:new Date().toISOString()})
  }catch{return respond(res,503,{status:'unavailable'})}
}
