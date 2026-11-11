// Histórico individual + avisos de marcação não visível recebidos no Clube.
// Leitura e confirmação estritamente vinculadas à sessão da própria aluna.
import {json,settings,authorizedMember,checkOrigin} from '../../server/instagram/common.mjs'

export default async function handler(req,res){
  if(!['GET','POST'].includes(req.method)){
    res.setHeader('Allow','GET, POST')
    return json(res,405,{status:'method_not_allowed'})
  }
  if(req.method==='POST'&&!checkOrigin(req))
    return json(res,403,{status:'invalid_origin'})
  const cfg=settings()
  if(!cfg)return json(res,req.method==='GET'?200:503,
    req.method==='GET'?{available:false,events:[],notices:[]}:{status:'integration_unavailable'})
  let member
  try{member=await authorizedMember(req,cfg)}
  catch{return json(res,503,{status:'club_auth_unavailable'})}
  if(!member)return json(res,401,{status:'club_login_required'})
  if(cfg.testOnly&&member.id!==cfg.testStudentId&&!member.isAdmin)
    return json(res,req.method==='GET'?200:403,
      req.method==='GET'?{available:false,events:[],notices:[]}:{status:'test_account_only'})

  if(req.method==='POST'){
    let body
    try{
      if(Number(req.headers['content-length']||0)>2048)
        return json(res,413,{status:'payload_too_large'})
      body=typeof req.body==='string'?JSON.parse(req.body):req.body
    }catch{return json(res,400,{status:'invalid_json'})}
    if(body?.action!=='acknowledge_notice'||typeof body?.event_id!=='string'
       ||body.event_id.length<4||body.event_id.length>320)
      return json(res,400,{status:'invalid_request'})
    try{
      const {error}=await member.db.from('clube_instagram_story_notices')
        .update({acknowledged_at:new Date().toISOString()})
        .eq('student_id',member.id).eq('event_id',body.event_id)
        .is('acknowledged_at',null)
      if(error)return json(res,503,{status:'notice_unavailable'})
      // Idempotente e sem revelar a existência de avisos de outras alunas.
      return json(res,200,{status:'acknowledged'})
    }catch{return json(res,503,{status:'notice_unavailable'})}
  }

  try{
    const [stories,notices]=await Promise.all([
      member.db.from('clube_instagram_story_events')
        .select('event_id,created_at,status,points')
        .eq('student_id',member.id).order('created_at',{ascending:false}).limit(30),
      member.db.from('clube_instagram_story_notices')
        .select('event_id,notice_type,sent_at,acknowledged_at')
        .eq('student_id',member.id).is('acknowledged_at',null)
        .order('sent_at',{ascending:false}).limit(10)
    ])
    if(stories.error||notices.error)
      return json(res,503,{status:'instagram_database_setup_required'})
    return json(res,200,{available:true,events:stories.data||[],notices:notices.data||[]})
  }catch{return json(res,503,{status:'integration_unavailable'})}
}
