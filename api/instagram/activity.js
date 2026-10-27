// Consulta individual dos eventos de Instagram recebidos oficialmente.
import {json,settings,authorizedMember} from './_common.mjs'

export default async function handler(req,res){
  if(req.method!=='GET')return json(res,405,{status:'method_not_allowed'})
  const cfg=settings()
  if(!cfg)return json(res,200,{available:false,events:[]})
  let member
  try{member=await authorizedMember(req,cfg)}
  catch{return json(res,503,{status:'club_auth_unavailable'})}
  if(!member)return json(res,401,{status:'club_login_required'})
  try{
    const {data,error}=await member.db.from('clube_instagram_story_events')
      .select('event_id,created_at,status,points')
      .eq('student_id',member.id).order('created_at',{ascending:false}).limit(30)
    if(error)return json(res,503,{status:'instagram_database_setup_required'})
    return json(res,200,{available:true,events:data||[]})
  }catch{return json(res,503,{status:'integration_unavailable'})}
}
