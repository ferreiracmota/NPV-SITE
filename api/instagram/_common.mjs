import crypto from 'node:crypto'
import {createClient} from '@supabase/supabase-js'

export const json = (res,status,body) => res.writeHead(status,{
  'Content-Type':'application/json; charset=utf-8',
  'Cache-Control':'private, no-store, max-age=0',
  'X-Content-Type-Options':'nosniff',
  'Cross-Origin-Resource-Policy':'same-origin'
}).end(JSON.stringify(body))

export const settings = (env=process.env) => {
  const url=env.VITE_CLUBE_SUPABASE_URL||env.SUPABASE_URL
  const publicKey=env.VITE_CLUBE_SUPABASE_PUBLISHABLE_KEY||env.SUPABASE_PUBLISHABLE_KEY
  const serviceKey=env.SUPABASE_SERVICE_ROLE_KEY
  const secret=env.INSTAGRAM_APP_SECRET
  const verifyToken=env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN
  const businessId=env.INSTAGRAM_BUSINESS_ID
  // Evita autorizar por acidente a integração com o App ID legado.
  const appId=env.INSTAGRAM_APP_ID
  const testOnly=env.NPV_INSTAGRAM_TEST_MODE==='true'
  const testStudentId=env.NPV_INSTAGRAM_TEST_STUDENT_ID||''
  if(env.NPV_INSTAGRAM_ENABLED!=='true'||!url||!publicKey||!serviceKey||!secret||!verifyToken
     ||appId!=='1670483874468146'||!/^\d{5,40}$/.test(businessId||'')
     ||(testOnly&&!/^[0-9a-f-]{36}$/i.test(testStudentId)))return null
  return {
    url,publicKey,serviceKey,secret,verifyToken,businessId,appId,testOnly,
    testStudentId:testOnly?testStudentId:null,
    // Modo de homologação impossibilita lançamento de pontos, mesmo se
    // NPV_INSTAGRAM_AWARD_ENABLED for alterada equivocadamente.
    award:env.NPV_INSTAGRAM_AWARD_ENABLED==='true'&&!testOnly,
    actor:/^[0-9a-f-]{36}$/i.test(env.NPV_INSTAGRAM_ACTOR_ID||'')?env.NPV_INSTAGRAM_ACTOR_ID:null
  }
}

export const adminDb=cfg=>createClient(cfg.url,cfg.serviceKey,{
  auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}
})

export const checkOrigin=req=>{
  const origin=req.headers.origin
  const host=req.headers.host
  if(!origin||!host||!/^[-.a-z0-9:]+$/i.test(host))return false
  try{return new URL(origin).origin===('https://'+host)}catch{return false}
}

export async function authorizedMember(req,cfg){
  const bearer=req.headers.authorization||''
  if(!/^Bearer [A-Za-z0-9._~-]{16,4096}$/.test(bearer))return null
  const token=bearer.slice(7)
  const auth=createClient(cfg.url,cfg.publicKey,{
    auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}
  })
  const {data,error}=await auth.auth.getUser(token)
  if(error||!data?.user?.id)return null
  const db=adminDb(cfg)
  const [profileResult,adminResult]=await Promise.all([
    db.from('clube_profiles').select('id,approved').eq('id',data.user.id).maybeSingle(),
    db.from('clube_admins').select('user_id').eq('user_id',data.user.id).maybeSingle()
  ])
  if(profileResult.error||adminResult.error||!profileResult.data)return null
  const isAdmin=Boolean(adminResult.data?.user_id===data.user.id)
  const approved=Boolean(profileResult.data.approved)
  if(!approved&&!isAdmin)return null
  return {id:data.user.id,db,approved,isAdmin}
}

// Mês civil brasileiro: a Vercel pode rodar em UTC, mas o limite de Stories
// sempre acompanha o calendário de São Paulo (inclusive na virada do mês).
const monthFormatter=new Intl.DateTimeFormat('en-US',{
  timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit'
})
export const brazilMonthKey=(instant=new Date())=>{
  const date=instant instanceof Date?instant:new Date(instant)
  const parts=monthFormatter.formatToParts(date)
  return parts.find(x=>x.type==='year').value+'-'+parts.find(x=>x.type==='month').value
}

// Limites do mês no fuso de São Paulo, convertidos a UTC para consultas
// timestamptz do Supabase. Calculamos o deslocamento por Intl em vez de
// presumir que o fuso sempre terá UTC-3 (também cobre meses com DST histórico).
const saoPauloClock=new Intl.DateTimeFormat('en-GB',{
  timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit',
  hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'
})
const saoPauloMonthStartUtc=(year,month)=>{
  const localMidnightAsUtc=Date.UTC(year,month-1,1)
  let utc=localMidnightAsUtc
  for(let attempt=0;attempt<3;attempt++){
    const parts=Object.fromEntries(saoPauloClock.formatToParts(new Date(utc))
      .filter(x=>x.type!=='literal').map(x=>[x.type,Number(x.value)]))
    const localClockAsUtc=Date.UTC(
      parts.year,parts.month-1,parts.day,parts.hour,parts.minute,parts.second)
    utc+=localMidnightAsUtc-localClockAsUtc
  }
  return new Date(utc).toISOString()
}
export const brazilMonthBounds=(instant=new Date())=>{
  const [year,month]=brazilMonthKey(instant).split('-').map(Number)
  return {
    start:saoPauloMonthStartUtc(year,month),
    end:saoPauloMonthStartUtc(year,month+1)
  }
}

export const hashCode=code=>crypto.createHash('sha256').update(code).digest('hex')
export const makeCode=()=>('NPV-'+crypto.randomBytes(6).toString('hex').toUpperCase())
export const safeEqual=(a,b)=>{
  const x=Buffer.from(String(a)),y=Buffer.from(String(b))
  return x.length===y.length&&crypto.timingSafeEqual(x,y)
}

export async function readRawBody(req,limit=256*1024){
  let size=0
  const chunks=[]
  for await(const chunk of req){
    size+=chunk.length
    if(size>limit)throw new Error('payload_too_large')
    chunks.push(chunk)
  }
  return Buffer.concat(chunks)
}

export const signatureValid=(raw,header,secret)=>{
  if(typeof header!=='string'||!/^sha256=[a-f0-9]{64}$/i.test(header))return false
  const digest='sha256='+crypto.createHmac('sha256',secret).update(raw).digest('hex')
  return safeEqual(header.toLowerCase(),digest)
}

// Extraído de eventos de mensageria de Story Mention, não de marcações genéricas.
// O produto Instagram Login possui credenciais próprias, distintas das do Meta App.
// Valide a assinatura HMAC do corpo bruto contra APENAS as duas chaves oficiais
// configuradas no servidor. A Meta pode usar qualquer uma das duas no webhook.
// Nunca aceita segredo/campo indicado por mensagem, query ou navegador.
export const webhookSignatureSource=(raw,header,metaSecret,instagramSecret)=>{
  if(signatureValid(raw,header,metaSecret))return 'meta_app'
  if(typeof instagramSecret==='string'&&instagramSecret.length>=16
     &&instagramSecret!==metaSecret&&signatureValid(raw,header,instagramSecret))
    return 'instagram_login'
  return null
}

// Webhook Instagram Login pode ser assinado pela chave do produto Instagram.
// Aceitar somente as duas chaves configuradas no backend e exigir HMAC válido.
export const validInstagramWebhookSignature=(raw,header,appKey,loginKey)=>
  signatureValid(raw,header,appKey)
  || (typeof loginKey==='string'&&loginKey.length>=16&&signatureValid(raw,header,loginKey))

export const extractEvents=payload=>{
  if(!payload||!['instagram','page'].includes(payload.object)||!Array.isArray(payload.entry))
    return []
  const result=[]
  for(const entry of payload.entry.slice(0,30)){
    for(const item of (Array.isArray(entry?.messaging)?entry.messaging:[]).slice(0,60)){
      const sender=String(item?.sender?.id||'')
      const recipient=String(item?.recipient?.id||'')
      if(!/^\d{5,40}$/.test(sender)||!/^\d{5,40}$/.test(recipient)||item?.message?.is_echo)continue
      const message=item?.message||{}
      const id=String(message.mid||'')
      const text=typeof message.text==='string'?message.text.trim().toUpperCase():''
      if(/^NPV-[A-F0-9]{12}$/.test(text)){
        result.push({kind:'code',sender,recipient,code:text})
        continue
      }
      const attachment=Array.isArray(message.attachments)
        ?message.attachments.find(a=>a?.type==='story_mention'):null
      const referral=item?.referral?.source==='STORY_MENTION'?item.referral:null
      if((!attachment&&!referral)||id.length<4||id.length>320)continue
      const declared=attachment?.payload?.id||attachment?.payload?.story_id
        ||referral?.story?.id||message.story?.id
      let storyKey='',verifiedStory=false
      if(declared&&/^[\w.:-]{5,250}$/.test(String(declared))){
        storyKey='story:'+declared
        verifiedStory=true
      }else{
        const url=attachment?.payload?.url||referral?.story?.url
        try{
          if(typeof url==='string'&&url.length<3000){
            const asset=new URL(url).searchParams.get('asset_id')
            if(asset&&/^\d{5,40}$/.test(asset)){
              storyKey='asset:'+asset
              verifiedStory=true
            }
          }
        }catch{}
      }
      // Um message.mid identifica a entrega da notificação, mas não prova que
      // duas notificações diferentes são Stories diferentes. Sem chave estável,
      // a menção fica em análise e JAMAIS gera crédito automático.
      result.push({kind:'story',sender,recipient,id,
        storyKey:storyKey||'event:'+id,verifiedStory})
    }
  }
  return result
}
