// Webhook autenticado da Meta. A assinatura HMAC é verificada ANTES de ler os eventos.
// Sem app Meta + migration aprovada: endpoint fica desativado e nenhum ponto é criado.
import {
  json,settings,adminDb,hashCode,safeEqual,readRawBody,signatureValid,extractEvents
} from './_common.mjs'

export const config={api:{bodyParser:false}}

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
  const cfg=settings()
  if(!cfg)return json(res,503,{status:'meta_configuration_required'})
  if(req.method!=='POST'){
    res.setHeader('Allow','GET, POST')
    return json(res,405,{status:'method_not_allowed'})
  }
  let raw
  try{raw=await readRawBody(req)}catch{return json(res,413,{status:'payload_too_large'})}
  if(!signatureValid(raw,req.headers['x-hub-signature-256'],cfg.secret))
    return json(res,403,{status:'invalid_signature'})
  let payload
  try{payload=JSON.parse(raw.toString('utf8'))}
  catch{return json(res,400,{status:'invalid_json'})}
  if(!['instagram','page'].includes(payload?.object)||!Array.isArray(payload.entry))
    return json(res,400,{status:'invalid_payload'})
  const events=extractEvents(payload).filter(x=>x.recipient===cfg.businessId)
  const db=adminDb(cfg)
  try{
    for(const event of events){
      if(event.kind==='code'){
        const {error}=await db.rpc('clube_instagram_claim_link',{
          p_code_hash:hashCode(event.code),p_instagram_scoped_id:event.sender
        })
        if(error)throw error
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
    return json(res,200,{status:'received'})
  }catch{
    // Retornar 5xx permite retry de um webhook temporariamente indisponível.
    return json(res,503,{status:'processing_unavailable'})
  }
}
