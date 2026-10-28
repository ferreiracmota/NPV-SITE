import crypto from 'node:crypto'
import {adminDb,authorizedMember,safeEqual} from '../../api/instagram/_common.mjs'

const APP_ID='1670483874468146'
const CALLBACK='https://www.naopensevai.com/api/instagram/oauth-callback'

export function baseConfig(env=process.env){
  const url=env.VITE_CLUBE_SUPABASE_URL||env.SUPABASE_URL
  const publicKey=env.VITE_CLUBE_SUPABASE_PUBLISHABLE_KEY||env.SUPABASE_PUBLISHABLE_KEY
  const serviceKey=env.SUPABASE_SERVICE_ROLE_KEY
  if(!url||!publicKey||!serviceKey)return null
  return {url,publicKey,serviceKey}
}

export function oauthConfig(env=process.env){
  const base=baseConfig(env)
  if(!base||env.INSTAGRAM_APP_ID!==APP_ID)return null
  const clientId=env.INSTAGRAM_OAUTH_CLIENT_ID
  const clientSecret=env.INSTAGRAM_OAUTH_CLIENT_SECRET
  const stateSecret=env.INSTAGRAM_OAUTH_STATE_SECRET
  const key=Buffer.from(env.INSTAGRAM_TOKEN_ENCRYPTION_KEY||'','base64')
  if(!/^\d{5,40}$/.test(clientId||'')||!clientSecret||!stateSecret
    ||stateSecret.length<32||key.length!==32
    ||env.INSTAGRAM_OAUTH_REDIRECT_URI!==CALLBACK)return null
  return {...base,clientId,clientSecret,stateSecret,key,redirectUri:CALLBACK}
}

export function createOAuthState(adminId,nonce,now=Date.now(),secret){
  const payload=Buffer.from(JSON.stringify({adminId,nonce,created:now})).toString('base64url')
  const mac=crypto.createHmac('sha256',secret).update(payload).digest('hex')
  return payload+'.'+mac
}

export function checkOAuthState(state,cookie,secret,now=Date.now()){
  if(typeof state!=='string'||state.length>1500||!/^[\w-]+\.[0-9a-f]{64}$/i.test(state))return null
  const [payload,mac]=state.split('.')
  const expected=crypto.createHmac('sha256',secret).update(payload).digest('hex')
  if(!safeEqual(mac,expected))return null
  let data
  try{data=JSON.parse(Buffer.from(payload,'base64url').toString('utf8'))}catch{return null}
  if(!/^[a-f0-9-]{36}$/i.test(data?.adminId||'')||
     !/^[a-f0-9]{48}$/.test(data?.nonce||'')||!safeEqual(cookie||'',data.nonce)||
     !Number.isSafeInteger(data?.created)||now<data.created||
     now-data.created>10*60*1000)return null
  return data
}

export const randomNonce=()=>crypto.randomBytes(24).toString('hex')

export function cookieNonce(req){
  const all=String(req.headers.cookie||'').split(';').map(x=>x.trim())
  const hit=all.find(x=>x.startsWith('npv_ig_oauth_nonce='))
  return hit?hit.slice('npv_ig_oauth_nonce='.length):''
}

export function encryptToken(token,cfg){
  const iv=crypto.randomBytes(12)
  const cipher=crypto.createCipheriv('aes-256-gcm',cfg.key,iv)
  const payload=Buffer.concat([cipher.update(token,'utf8'),cipher.final()])
  return [iv.toString('base64url'),cipher.getAuthTag().toString('base64url'),payload.toString('base64url')].join('.')
}

export function decryptToken(record,cfg){
  const [nonce,tag,data]=String(record||'').split('.')
  if(!nonce||!tag||!data)throw new Error('invalid_token_format')
  const decipher=crypto.createDecipheriv('aes-256-gcm',cfg.key,Buffer.from(nonce,'base64url'))
  decipher.setAuthTag(Buffer.from(tag,'base64url'))
  return Buffer.concat([decipher.update(Buffer.from(data,'base64url')),decipher.final()]).toString('utf8')
}

export async function adminFromRequest(req,cfg){
  const member=await authorizedMember(req,cfg)
  return member?.isAdmin?member:null
}

export const officialRow=cfg=>adminDb(cfg).from('clube_instagram_business_auth').select(
  'instagram_user_id,username,connected_at,expires_at,token_ciphertext'
).eq('slot','official').maybeSingle()

export async function metaJson(url,options={}){
  const response=await fetch(url,{...options,signal:AbortSignal.timeout(15000)})
  const data=await response.json().catch(()=>null)
  if(!response.ok||!data||data.error)throw new Error('meta_api_failed')
  return data
}

export async function exchangeProfessionalCode(code,cfg){
  const form=new URLSearchParams({
    client_id:cfg.clientId,client_secret:cfg.clientSecret,grant_type:'authorization_code',
    redirect_uri:cfg.redirectUri,code
  })
  const short=await metaJson('https://api.instagram.com/oauth/access_token',{
    method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:form.toString()
  })
  if(!short.access_token)throw new Error('missing_short_token')
  const longParams=new URLSearchParams({
    grant_type:'ig_exchange_token',client_secret:cfg.clientSecret,access_token:short.access_token
  })
  const long=await metaJson('https://graph.instagram.com/access_token?'+longParams.toString())
  if(!long.access_token||!Number.isFinite(Number(long.expires_in))||Number(long.expires_in)<3600)
    throw new Error('missing_long_token')
  const profile=await metaJson('https://graph.instagram.com/me?fields=user_id,username,account_type',{
    headers:{Authorization:'Bearer '+long.access_token}
  })
  return {profile,token:long.access_token,expiresIn:Number(long.expires_in)}
}
