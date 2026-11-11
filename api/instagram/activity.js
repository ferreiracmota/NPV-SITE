// Consulta pessoal de Stories e avisos, com reconhecimento individual de leitura.
import {json,settings,authorizedMember,checkOrigin} from '../../server/instagram/common.mjs'

export default async function handler(req,res){
  if(!['GET','POST'].includes(req.method)){
    res.setHeader('Allow','GET, POST')
    return json(res,405,{status:'method_not_allowed'})
  }
  if(req.method==='POST'&&!checkOrigin(req))return json(res,403,{status:'invalid_origin'})
  const cfg=settings()
  if(!cfg)return req.method==='GET'
    ?json(res,200,{available:false,events:[],notices:[]})
    :json(res,503,{status:'meta_configuration_required'})
  let member
  try{member=await authorizedMember(req,cfg)}
  catch{return json(res,503,{status:'club_auth_unavailable'})}
  if(!member)return json(res,401,{status:'club_login_required'})
  if(cfg.testOnly&&member.id!==cfg.testStudentId&&!member.isAdmin)
    return req.method==='GET'
      ?json(res,200,{available:false,events:[],notices:[]})
      :json(res,403,{status:'test_account_only'})
  try{
    if(req.method==='POST'){
      if(Number(req.headers['content-length']||0)>2048)
        return json(res,413,{status:'payload_too_large'})
      let input
      try{input=typeof req.body==='string'?JSON.parse(req.body):req.body}
      catch{return json(res,400,{status:'invalid_json'})}
      const eventId=input?.event_id
      if(typeof eventId!=='string'||eventId.length<4||eventId.length>320
         ||input?.action!=='acknowledge_hidden_mention')
        return json(res,400,{status:'invalid_request'})
      // O id do aluno vem exclusivamente do token Supabase, nunca do navegador.
      const {data,error}=await member.db.from('clube_instagram_story_notices')
        .update({acknowledged_at:new Date().toISOString()})
        .eq('event_id',eventId).eq('student_id',member.id)
        .eq('notice_type','hidden_mention').is('acknowledged_at',null)
        .select('event_id')
      if(error)return json(res,503,{status:'story_notice_unavailable'})
      if(!data?.length){
        // Repeticoes do mesmo clique nao podem visualizar dados de outra conta.
        const existing=await member.db.from('clube_instagram_story_notices')
          .select('event_id').eq('event_id',eventId)
          .eq('student_id',member.id).eq('notice_type','hidden_mention').maybeSingle()
        if(existing.error)return json(res,503,{status:'story_notice_unavailable'})
        return json(res,existing.data?200:404,{status:existing.data?'already_acknowledged':'notice_not_found'})
      }
      return json(res,200,{status:'acknowledged'})
    }
    const [events,notices]=await Promise.all([
      member.db.from('clube_instagram_story_events')
        .select('event_id,created_at,status,points')
        .eq('student_id',member.id).order('created_at',{ascending:false}).limit(30),
      member.db.from('clube_instagram_story_notices')
        .select('event_id,notice_type,sent_at,acknowledged_at')
        .eq('student_id',member.id).eq('notice_type','hidden_mention')
        .is('acknowledged_at',null)
        .order('sent_at',{ascending:false}).limit(15)
    ])
    if(events.error||notices.error)return json(res,503,{status:'instagram_database_setup_required'})
    // Aviso deixa de aparecer se a revisao ja foi concluida.
    const statusMap=new Map((events.data||[]).map(e=>[e.event_id,e.status]))
    return json(res,200,{
      available:true,
      events:events.data||[],
      notices:(notices.data||[]).filter(n=>statusMap.get(n.event_id)==='review')
    })
  }catch{return json(res,503,{status:'integration_unavailable'})}
}
