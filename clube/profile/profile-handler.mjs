// Atualização de nome, telefone e dia/mês do aniversário. Aprovação, e-mail e pontos permanecem imutáveis.
import {createClient} from '@supabase/supabase-js'
import {validBirthday,validOptionalPhone} from './birthday.mjs'
const reply=(res,code,body)=>res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}).end(JSON.stringify(body))
const nameValid=s=>typeof s==='string'&&s.trim().replace(/\s+/g,' ').length>=3&&s.trim().length<=80&&!/[<>\x00-\x1f\x7f]/.test(s)
export async function handleClubeProfileUpdate(req,res){
  if(req.method!=='PATCH')return reply(res,405,{error:'method_not_allowed'})
  const token=(req.headers.authorization||'').match(/^Bearer\s+([^\s]+)$/i)?.[1]
  if(!token)return reply(res,401,{error:'authentication_required'})
  const url=process.env.VITE_CLUBE_SUPABASE_URL||process.env.SUPABASE_URL
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY
  if(!url||!key)return reply(res,503,{error:'server_unavailable'})
  const {full_name,phone,birthday_mmdd}=req.body||{}
  if(!nameValid(full_name)||!validOptionalPhone(phone)||(birthday_mmdd!==undefined&&!validBirthday(birthday_mmdd)))return reply(res,400,{error:'invalid_profile_data'})
  try{
    const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}})
    const {data:{user},error:userError}=await db.auth.getUser(token)
    if(userError||!user?.id)return reply(res,401,{error:'invalid_session'})
    const updates={full_name:full_name.trim().replace(/\s+/g,' '),phone:phone.trim()||null}
    if(birthday_mmdd!==undefined)updates.birthday_mmdd=birthday_mmdd
    const {data,error}=await db.from('clube_profiles')
      .update(updates)
      .eq('id',user.id).eq('approved',true)
      .select('id,full_name,phone,birthday_mmdd').maybeSingle()
    if(error)return reply(res,503,{error:'profile_update_failed'})
    if(!data)return reply(res,403,{error:'profile_not_approved'})
    return reply(res,200,{status:'updated',profile:data})
  }catch{return reply(res,503,{error:'profile_update_unavailable'})}
}
