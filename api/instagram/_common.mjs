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
  if(env.NPV_INSTAGRAM_ENABLED!=='true'||!url||!publicKey||!serviceKey||!secret||!verifyToken
     ||!/^\d{5,40}$/.test(businessId||''))return null
  return {
    url,publicKey,serviceKey,secret,verifyToken,businessId,
    award:env.NPV_INSTAGRAM_AWARD_ENABLED==='true',
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
      if(attachment&&id.length>=4&&id.length<=320){
        const claimedStoryId=attachment.payload?.id||attachment.payload?.story_id||message.story?.id
        const storyKey=claimedStoryId&&/^[\w.:-]{3,250}$/.test(String(claimedStoryId))
          ?'story:'+claimedStoryId:'event:'+id
        result.push({kind:'story',sender,recipient,id,storyKey})
      }
    }
  }
  return result
}
