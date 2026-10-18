import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from 'node:crypto'

// Criptografia autenticada apenas no servidor. Nenhum token ou segredo vai ao frontend.
const getKey = secret => {
  if (typeof secret !== 'string' || secret.length < 20) throw new Error('missing encryption key')
  return Buffer.from(hkdfSync('sha256', Buffer.from(secret), Buffer.from('clube-npv-strava-browser-session-v1'),
    Buffer.from('OAuth credentials; encrypted browser-local session'), 32))
}
export function seal(data, secret) {
  const nonce = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', getKey(secret), nonce)
  const plain = Buffer.from(JSON.stringify(data), 'utf8')
  const encrypted = Buffer.concat([cipher.update(plain), cipher.final()])
  return Buffer.concat([nonce, cipher.getAuthTag(), encrypted]).toString('base64url')
}
export function unseal(encoded, secret) {
  if (typeof encoded !== 'string' || encoded.length > 3800) return null
  try {
    const raw = Buffer.from(encoded, 'base64url')
    if (raw.length < 30) return null
    const decipher = createDecipheriv('aes-256-gcm', getKey(secret), raw.subarray(0,12))
    decipher.setAuthTag(raw.subarray(12,28))
    const data = JSON.parse(Buffer.concat([decipher.update(raw.subarray(28)),decipher.final()]).toString('utf8'))
    return data && typeof data === 'object' && !Array.isArray(data) ? data : null
  } catch { return null }
}
export const COOKIE_STATE = 'npv_strava_oauth_state'
export const COOKIE_LINK = 'npv_strava_browser_link'
export const cookie = (name,value,age) =>
  `${name}=${value}; Path=/api/strava; HttpOnly; Secure; SameSite=Lax; Max-Age=${age}`
export function readCookie(req, name) {
  const found = String(req?.headers?.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(name+'='))
  return found ? found.slice(name.length+1) : ''
}
export const privateHeaders = {
  'Cache-Control':'private, no-store, max-age=0',
  'Pragma':'no-cache',
  'Referrer-Policy':'no-referrer',
  'X-Content-Type-Options':'nosniff',
  'X-Frame-Options':'DENY'
}
export function writeJson(res,status,data) {
  res.writeHead(status,{...privateHeaders,'Content-Type':'application/json; charset=utf-8'})
  res.end(JSON.stringify(data))
}
export function settings() {
  const id=process.env.STRAVA_CLIENT_ID
  const secret=process.env.STRAVA_CLIENT_SECRET
  const pilot=process.env.STRAVA_PILOT_CALLBACK_URL
  const sbUrl=process.env.VITE_CLUBE_SUPABASE_URL
  const sbKey=process.env.VITE_CLUBE_SUPABASE_PUBLISHABLE_KEY
  try {
    if(!/^\d+$/.test(id||'')||!secret||!pilot||!sbUrl||!sbKey) return null
    const endpoint=new URL(pilot),supabase=new URL(sbUrl)
    if(endpoint.protocol!=='https:'||endpoint.pathname!=='/api/strava/pilot'
       ||endpoint.search||endpoint.hash||supabase.protocol!=='https:'
       ||!supabase.hostname.endsWith('.supabase.co')) return null
    endpoint.pathname='/api/strava/connect'
    return {id,secret,callback:endpoint.toString(),origin:endpoint.origin,sbUrl:supabase.origin,sbKey}
  }catch{return null}
}

export async function clubUser(req,cfg) {
  const auth=String(req?.headers?.authorization||'')
  if(!/^Bearer [\w.-]+$/.test(auth)||auth.length>5000) return null
  const resp=await fetch(cfg.sbUrl+'/auth/v1/user',{
    headers:{'apikey':cfg.sbKey,'Authorization':auth},
    signal:AbortSignal.timeout(8000)
  })
  if(!resp.ok) return null
  const data=await resp.json()
  return typeof data?.id==='string' && /^[0-9a-f-]{36}$/i.test(data.id) ? data.id:null
}
export function checkOrigin(req,cfg) {
  // Same-origin AJAX POST only (OAuth callback is GET from Strava).
  return req.headers?.origin===cfg.origin
}
export async function stravaToken(cfg,body){
  const resp=await fetch('https://www.strava.com/oauth/token',{
    method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},
    body:new URLSearchParams({client_id:cfg.id,client_secret:cfg.secret,...body}),
    signal:AbortSignal.timeout(14000)
  })
  if(!resp.ok) throw new Error('strava token exchange error')
  const data=await resp.json()
  if(typeof data.access_token!=='string'||typeof data.refresh_token!=='string'
     ||!Number.isFinite(data.expires_at))throw new Error('incomplete strava credentials')
  return data
}
