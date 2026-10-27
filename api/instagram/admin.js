// Dados operacionais acessíveis somente ao administrador autenticado.
// Nunca inclui segredos da Meta, códigos temporários ou dados de outras contas ao aluno.
import {json,settings,authorizedMember} from './_common.mjs'

export default async function handler(req,res){
  if(req.method!=='GET'){
    res.setHeader('Allow','GET')
    return json(res,405,{status:'method_not_allowed'})
  }
  const cfg=settings()
  if(!cfg)return json(res,200,{available:false,total_events:0,pending_events:0,events:[]})
  let member
  try{member=await authorizedMember(req,cfg)}
  catch{return json(res,503,{status:'club_auth_unavailable'})}
  if(!member)return json(res,401,{status:'club_login_required'})
  if(!member.isAdmin)return json(res,403,{status:'admin_required'})
  try{
    const [all,pending]=await Promise.all([
      member.db.from('clube_instagram_story_events')
        .select('event_id,student_id,created_at,status,points',{count:'exact'})
        .order('created_at',{ascending:false}).limit(50),
      member.db.from('clube_instagram_story_events')
        .select('event_id',{count:'exact',head:true})
        .in('status',['unlinked','review'])
    ])
    if(all.error||pending.error)return json(res,503,{status:'instagram_database_setup_required'})
    const events=all.data||[]
    const ids=[...new Set(events.map(e=>e.student_id).filter(Boolean))]
    let names=new Map()
    if(ids.length){
      const response=await member.db.from('clube_profiles').select('id,full_name').in('id',ids)
      if(response.error)return json(res,503,{status:'club_members_unavailable'})
      names=new Map((response.data||[]).map(p=>[p.id,p.full_name]))
    }
    return json(res,200,{
      available:true,
      total_events:all.count??events.length,
      pending_events:pending.count??0,
      events:events.map(e=>({
        event_id:e.event_id,created_at:e.created_at,status:e.status,points:e.points,
        student_name:names.get(e.student_id)||null
      }))
    })
  }catch{return json(res,503,{status:'admin_unavailable'})}
}
