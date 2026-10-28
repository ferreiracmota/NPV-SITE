// Resposta de demonstração oficial, restrita a um único aluno já vinculado.
// Não aceita destinatário ou texto arbitrário enviados pelo navegador.
import {json,settings,checkOrigin,authorizedMember} from './_common.mjs'
import {oauthConfig,officialRow,decryptToken,metaJson} from './_oauth.mjs'

export default async function handler(req,res){
  if(req.method!=='POST'){
    res.setHeader('Allow','POST')
    return json(res,405,{status:'method_not_allowed'})
  }
  if(!checkOrigin(req))return json(res,403,{status:'invalid_origin'})
  const cfg=settings()
  const oauth=oauthConfig()
  if(!cfg||!oauth||!cfg.testOnly||cfg.award)
    return json(res,409,{status:'pilot_not_configured'})
  let member
  try{member=await authorizedMember(req,cfg)}
  catch{return json(res,503,{status:'club_auth_unavailable'})}
  if(!member?.isAdmin)return json(res,403,{status:'admin_required'})
  const db=member.db
  try{
    const [link,official,previous]=await Promise.all([
      db.from('clube_instagram_links').select('instagram_scoped_id')
        .eq('student_id',cfg.testStudentId).maybeSingle(),
      officialRow(oauth),
      db.from('clube_instagram_demo_messages').select('created_at')
        .eq('student_id',cfg.testStudentId).order('created_at',{ascending:false}).limit(1)
    ])
    if(link.error||official.error||previous.error)return json(res,503,{status:'instagram_database_setup_required'})
    if(!link.data?.instagram_scoped_id)return json(res,409,{status:'student_not_linked'})
    if(!official.data||Date.parse(official.data.expires_at)<Date.now())
      return json(res,409,{status:'official_instagram_not_authorized'})
    if(previous.data?.[0]?.created_at &&
       Date.now()-Date.parse(previous.data[0].created_at)<60000)
      return json(res,429,{status:'too_soon'})
    const token=decryptToken(official.data.token_ciphertext,oauth)
    const result=await metaJson(
      'https://graph.instagram.com/v25.0/'+encodeURIComponent(official.data.instagram_user_id)+'/messages',{
        method:'POST',
        headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
        body:JSON.stringify({
          recipient:{id:link.data.instagram_scoped_id},
          message:{text:'Não Pense, Vai! 💚 Seu Instagram foi vinculado ao Clube. Esta mensagem confirma a integração oficial; nenhum ponto foi lançado no teste.'}
        })
      })
    if(!result.message_id)return json(res,502,{status:'meta_send_unconfirmed'})
    const {error}=await db.from('clube_instagram_demo_messages').insert({
      student_id:cfg.testStudentId,meta_message_id:String(result.message_id).slice(0,500)
    })
    if(error)return json(res,503,{status:'message_sent_audit_unavailable'})
    return json(res,200,{sent:true,status:'message_sent',message_id:String(result.message_id).slice(0,500)})
  }catch{return json(res,503,{status:'meta_message_not_sent'})}
}
