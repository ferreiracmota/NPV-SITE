// Recuperação automática de DMs quando o webhook da Meta atrasa ou falha.
// Somente o código válido de uma aluna aprovada autoriza a vinculação.
// Conteúdo de Direct, identificadores e tokens NÃO são persistidos nem logados.
import {hashCode} from './common.mjs'
import {oauthConfig,officialRow,decryptToken} from './_oauth.mjs'

const ID=/^\d{5,40}$/
const CODE=/^NPV-[A-F0-9]{12}$/
const GRAPH='https://graph.instagram.com/v26.0/'
const MAX_CONVERSATIONS=6

export function matchingSender(messages,expectedHash,businessId,issuedAt,now=Date.now()){
  const entries=Array.isArray(messages?.data)?messages.data:Array.isArray(messages)?messages:[]
  const issueTime=Date.parse(issuedAt)
  if(!/^[a-f0-9]{64}$/.test(String(expectedHash||''))||!Number.isFinite(issueTime))return null
  for(const item of entries){
    const sender=String(item?.from?.id||'')
    const text=typeof item?.message==='string'?item.message.trim().toUpperCase():''
    const sentAt=Date.parse(item?.created_time||'')
    if(!ID.test(sender)||sender===String(businessId)||!CODE.test(text))continue
    // Não reutilizar mensagens de ciclos anteriores, nem mensagens sem data confiável.
    if(!Number.isFinite(sentAt)||sentAt<issueTime-60000||sentAt>now+60000)continue
    if(hashCode(text)===expectedHash)return sender
  }
  return null
}

export async function graphRead(url,token){
  let response
  try{
    response=await fetch(url,{
      headers:{Authorization:'Bearer '+token},
      signal:AbortSignal.timeout(6000)
    })
  }catch{
    throw new Error('meta_network_unavailable')
  }
  const payload=await response.json().catch(()=>null)
  const code=Number(payload?.error?.code||0)
  // Apenas categorias técnicas sem texto de erros, conteúdo de DMs ou credenciais.
  if(response.status===401||response.status===403||[10,190,200].includes(code))
    throw new Error('meta_permissions_required')
  if(response.status===429||code===4||code===17)
    throw new Error('meta_rate_limited')
  if(!response.ok||payload?.error)
    throw new Error(code===100?'meta_invalid_query':'meta_http_'+response.status)
  if(!payload)throw new Error('meta_invalid_response')
  return payload
}

function urlFor(id,edge,params){
  const url=new URL(GRAPH+encodeURIComponent(id)+'/'+edge)
  for(const [key,value] of Object.entries(params))url.searchParams.set(key,String(value))
  return url.toString()
}

// Chamada pelo GET de status que a própria tela já faz enquanto o código é válido.
// O banco impõe intervalo entre consultas, inclusive entre instâncias da Vercel.
export async function recoverPendingInstagramLink({db,studentId,code,cfg,now=Date.now(),read=graphRead}){
  const created=Date.parse(code?.created_at||'')
  const expires=Date.parse(code?.expires_at||'')
  if(!cfg||!ID.test(String(cfg.businessId||''))||
     !/^[a-f0-9]{64}$/.test(String(code?.code_hash||''))||
     !Number.isFinite(created)||!Number.isFinite(expires)||
     now-created<20000||now>=expires)return 'skipped'

  // Reserva atômica de uma consulta a cada 60 segundos; evita bombardear a Meta
  // a cada atualização de 8 segundos do navegador.
  const {data:reserved,error:reserveError}=await db.from('clube_instagram_link_codes')
    .update({last_meta_checked_at:new Date(now).toISOString()})
    .eq('student_id',studentId).eq('code_hash',code.code_hash)
    .gt('expires_at',new Date(now).toISOString())
    .or('last_meta_checked_at.is.null,last_meta_checked_at.lt.'+
      new Date(now-60000).toISOString())
    .select('student_id')
  if(reserveError||!reserved?.length)return 'skipped'

  try{
    const auth=oauthConfig()
    if(!auth)return 'meta_oauth_not_configured'
    const {data:official,error:authError}=await officialRow(auth)
    if(authError||!official||Date.parse(official.expires_at)<=now||
       String(official.instagram_user_id)!==String(cfg.businessId))return 'meta_official_auth_unavailable'
    const token=decryptToken(official.token_ciphertext,auth)
    const headersToken=token
    // Endpoint oficial do Instagram Login: plataforma explícita para conversas.
    const inbox=await read(urlFor('me','conversations',{
      platform:'instagram',fields:'id,updated_time',limit:25
    }),headersToken)
    const conversations=(Array.isArray(inbox?.data)?inbox.data:[])
      .filter(entry=>typeof entry?.id==='string'&&/^[a-zA-Z0-9_.:-]{5,256}$/.test(entry.id))
      .filter(entry=>{
        const updated=Date.parse(entry.updated_time||'')
        return !Number.isFinite(updated)||updated>=created-60000
      })
      .slice(0,MAX_CONVERSATIONS)
    // Não guardar nem expor o texto recebido. Examina apenas mensagens recentes.
    const candidates=await Promise.allSettled(conversations.map(async item=>{
      const messages=await read(urlFor(item.id,'messages',{
        fields:'id,message,created_time,from',limit:12
      }),headersToken)
      return matchingSender(messages,code.code_hash,cfg.businessId,code.created_at,now)
    }))
    if(candidates.length>0&&candidates.every(candidate=>candidate.status==='rejected'))
      return 'meta_messages_unavailable'
    for(const candidate of candidates){
      if(candidate.status!=='fulfilled'||!candidate.value)continue
      const {data:claim,error:claimError}=await db.rpc('clube_instagram_claim_link',{
        p_code_hash:code.code_hash,p_instagram_scoped_id:candidate.value
      })
      if(claimError)return 'meta_unavailable'
      if(claim==='linked')return 'linked'
      if(claim==='already_linked')return 'already_linked'
    }
    return 'pending'
  }catch(error){
    const known=['meta_permissions_required','meta_rate_limited','meta_invalid_query',
      'meta_network_unavailable','meta_invalid_response','meta_messages_unavailable']
    const reason=String(error?.message||'')
    return known.includes(reason)?reason:'meta_unavailable'
  }
}
