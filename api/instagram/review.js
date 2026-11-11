// Decisão manual e auditável sobre menções recebidas pelo Instagram.
// Protegida por autenticação de administrador, verificação de origem e RPC transacional.
import {json,settings,authorizedMember,checkOrigin} from '../../server/instagram/common.mjs'

export default async function handler(req,res){
  if(req.method!=='POST'){
    res.setHeader('Allow','POST')
    return json(res,405,{status:'method_not_allowed'})
  }
  if(!checkOrigin(req))return json(res,403,{status:'invalid_origin'})
  const cfg=settings()
  if(!cfg)return json(res,503,{status:'meta_configuration_required'})
  let member
  try{member=await authorizedMember(req,cfg)}
  catch{return json(res,503,{status:'club_auth_unavailable'})}
  if(!member)return json(res,401,{status:'club_login_required'})
  if(!member.isAdmin)return json(res,403,{status:'admin_required'})

  let input
  try{
    if(Number(req.headers['content-length']||0)>4096)
      return json(res,413,{status:'payload_too_large'})
    input=typeof req.body==='string'?JSON.parse(req.body):req.body
  }catch{return json(res,400,{status:'invalid_json'})}
  const eventId=input?.event_id
  const decision=input?.decision
  if(typeof eventId!=='string'||eventId.length<4||eventId.length>320
     ||!['approve','reject','notify_hidden_mention'].includes(decision))
    return json(res,400,{status:'invalid_request'})

  // O piloto só permite decisões sobre a aluna de teste, mesmo para administradores.
  if(cfg.testOnly){
    const {data,error}=await member.db.from('clube_instagram_story_events')
      .select('student_id').eq('event_id',eventId).maybeSingle()
    if(error)return json(res,503,{status:'review_unavailable'})
    if(!data||data.student_id!==cfg.testStudentId)
      return json(res,403,{status:'test_account_only'})
  }

  try{
    if(decision==='notify_hidden_mention'){
      // Aviso visual dentro do Clube: nao recusa Story nem concede pontos.
      // A funcao SQL exige evento em analise, aluna vinculada e admin, com lock.
      const {data,error}=await member.db.rpc('clube_instagram_notify_hidden_mention',{
        p_event_id:eventId,p_admin_id:member.id
      })
      if(error)return json(res,503,{status:'story_notice_unavailable'})
      if(data==='notice_sent'||data==='already_notified')
        return json(res,200,{status:data,notice_sent:true,points:0})
      const codes={
        invalid_request:400,admin_required:403,not_found:404,
        unlinked:409,student_unavailable:409,already_reviewed:409
      }
      return json(res,codes[data]||409,{status:data||'notice_not_sent'})
    }
    const {data,error}=await member.db.rpc('clube_instagram_review_story',{
      p_event_id:eventId,p_decision:decision,p_admin_id:member.id,
      p_is_test:cfg.testOnly
    })
    if(error)return json(res,503,{status:'review_unavailable'})
    if(data==='credited'||data==='rejected'||data==='limit_reached')
      return json(res,200,{status:data,points:data==='credited'?200:0})
    const codes={
      already_reviewed:409,not_found:404,unlinked:409,story_unverified:409,
      student_unavailable:409,rule_mismatch:409,admin_required:403
    }
    return json(res,codes[data]||400,{status:data||'invalid_request'})
  }catch{return json(res,503,{status:'review_unavailable'})}
}
