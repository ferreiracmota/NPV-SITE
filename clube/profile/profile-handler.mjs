// Atualização de identidade limitada a nome/telefone. Aprovação, e-mail e pontos são imutáveis nesta rota.
import {createClient} from '@supabase/supabase-js'
const reply=(res,code,body)=>res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}).end(JSON.stringify(body))
const nameValid=s=>typeof s==='string'&&s.trim().replace(/\s+/g,' ').length>=3&&s.trim().length<=80&&!/[<>\x00-\x1f\x7f]/.test(s)
const phoneValid=s=>typeof s==='string'&&s.length<=24&&(!s.trim()||(/^[+()0-9\s-]+$/.test(s)&&s.replace(/\D/g,'').length>=10&&s.replace(/\D/g,'').length<=15))
export default async function handleClubeProfileUpdate(req,res){
  if(req.method!=='PATCH')return reply(res,405,{error:'method_not_allowed'})
  const token=(req.headers.authorization||'').match(/^Bearer\s+([^\s]+)$/i)?.[1]
  if(!token)return reply(res,401,{error:'authentication_required'})
  const url=process.env.VITE_CLUBE_SUPABASE_URL||process.env.SUPABASE_URL
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY
  if(!url||!key)return reply(res,503,{error:'server_unavailable'})
  const {full_name,phone}=req.body||{}
  if(!nameValid(full_name)||!phoneValid(phone))return reply(res,400,{error:'invalid_profile_data'})
  try{
    const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}})
    const {data:{user},error:userError}=await db.auth.getUser(token)
    if(userError||!user?.id)return reply(res,401,{error:'invalid_session'})
    const {data,error}=await db.from('clube_profiles')
      .update({full_name:full_name.trim().replace(/\s+/g,' '),phone:phone.trim()||null})
      .eq('id',user.id).eq('approved',true)
      .select('id,full_name,phone').maybeSingle()
    if(error)return reply(res,503,{error:'profile_update_failed'})
    if(!data)return reply(res,403,{error:'profile_not_approved'})
    return reply(res,200,{status:'updated',profile:data})
  }catch{return reply(res,503,{error:'profile_update_unavailable'})}
}
