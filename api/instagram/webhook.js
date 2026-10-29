// Webhook autenticado da Meta. A assinatura HMAC é verificada ANTES de ler os eventos.
// Sem app Meta + migration aprovada: endpoint fica desativado e nenhum ponto é criado.
import {
  json,settings,adminDb,hashCode,safeEqual,readRawBody,validInstagramWebhookSignature,extractEvents
} from '../../server/instagram/common.mjs'

export const config={api:{bodyParser:false}}

// Logs somente de estado e contagens, sem conteúdo de mensagens, códigos,
// identificadores de usuários, tokens ou payloads da Meta.
const audit=(status,counts={})=>console.info('npv_instagram_webhook',JSON.stringify({status,...counts}))

export default async function handler(req,res){
  // A Meta pode verificar a propriedade do callback antes de ativarmos a
  // ingestão de mensagens. A verificação não grava eventos nem lança pontos.
  if(req.method==='GET'){
    const url=new URL(req.url||'/api/instagram/webhook','https://npv.local')
    const mode=url.searchParams.get('hub.mode')
    const token=url.searchParams.get('hub.verify_token')
    const challenge=url.searchParams.get('hub.challenge')
    if(mode!=='subscribe'||!token||!process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN
       ||!safeEqual(token,process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN)
       ||!challenge||challenge.length>256)return json(res,403,{status:'invalid_verification'})
    return res.writeHead(200,{'Content-Type':'text/plain','Cache-Control':'no-store'})
      .end(challenge)
  }
  // Sem configuração completa, POSTs permanecem bloqueados.
  audit('request_received',{method:req.method==='POST'?'POST':'OTHER',hasSignature:Boolean(req.headers['x-hub-signature-256'])})
  const cfg=settings()
  if(!cfg){
    audit('configuration_missing')
    return json(res,503,{status:'meta_configuration_required'})
  }
  if(req.method!=='POST'){
    res.setHeader('Allow','GET, POST')
    return json(res,405,{status:'method_not_allowed'})
  }
  let raw
  try{raw=await readRawBody(req)}catch{
    audit('payload_too_large')
    return json(res,413,{status:'payload_too_large'})
  }
  if(!validInstagramWebhookSignature(
    raw,req.headers['x-hub-signature-256'],
    cfg.secret,process.env.INSTAGRAM_OAUTH_CLIENT_SECRET
  )){
    audit('invalid_signature')
    return json(res,403,{status:'invalid_signature'})
  }
  let payload
  try{payload=JSON.parse(raw.toString('utf8'))}
  catch{
    audit('invalid_json')
    return json(res,400,{status:'invalid_json'})
  }
  if(!['instagram','page'].includes(payload?.object)||!Array.isArray(payload.entry)){
    audit('invalid_payload')
    return json(res,400,{status:'invalid_payload'})
  }
  const parsed=extractEvents(payload)
  const events=parsed.filter(x=>x.recipient===cfg.businessId)
  audit('signature_verified',{object:payload.object,entries:payload.entry.length,parsedEvents:parsed.length,recipientMatchedEvents:events.length})
  const db=adminDb(cfg)
  try{
    let eligible=0,linked=0
    for(const event of events){
      if(cfg.testOnly){
        // Não registrar mensagens nem Stories de outras contas durante o piloto.
        const table=event.kind==='code'?'clube_instagram_link_codes':'clube_instagram_links'
        const key=event.kind==='code'?'code_hash':'instagram_scoped_id'
        const value=event.kind==='code'?hashCode(event.code):event.sender
        const {data,error}=await db.from(table).select('student_id').eq(key,value).maybeSingle()
        if(error)throw error
        if(data?.student_id!==cfg.testStudentId)continue
      }
      eligible++
      if(event.kind==='code'){
        const {error}=await db.rpc('clube_instagram_claim_link',{
          p_code_hash:hashCode(event.code),p_instagram_scoped_id:event.sender
        })
        if(error)throw error
        linked++
      }
      if(event.kind==='story'){
        const {error}=await db.rpc('clube_instagram_receive_story',{
          p_event_id:event.id,p_instagram_scoped_id:event.sender,
          p_story_key:event.storyKey,p_actor_id:cfg.actor,
          p_award_enabled:cfg.award && event.verifiedStory === true
        })
        if(error)throw error
      }
    }
    audit('processed',{eligibleEvents:eligible,linkCodeClaims:linked})
    return json(res,200,{status:'received'})
  }catch{
    // Não registrar detalhes de falhas internas para evitar vazamento de dados.
    audit('processing_unavailable')
    // Retornar 5xx permite retry de um webhook temporariamente indisponível.
    return json(res,503,{status:'processing_unavailable'})
  }
}
