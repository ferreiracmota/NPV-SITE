// OAuth de Instagram da conta PROFISSIONAL. Nunca retorna tokens ao browser.
import {adminDb} from './_common.mjs'
import {
  oauthConfig,cookieNonce,checkOAuthState,exchangeProfessionalCode,encryptToken,metaJson
} from './_oauth.mjs'

const finish=(res,status)=>{
  const outcome=status==='connected'?'connected':'error'
  return res.writeHead(302,{
    Location:'https://www.naopensevai.com/clube?ig_meta_status='+outcome,
    'Cache-Control':'private, no-store',
    'Referrer-Policy':'no-referrer',
    'Set-Cookie':'npv_ig_oauth_nonce=; Path=/api/instagram/oauth-callback; Max-Age=0; HttpOnly; Secure; SameSite=Lax'
  }).end()
}

export default async function handler(req,res){
  if(req.method!=='GET')return res.writeHead(405,{'Allow':'GET'}).end()
  const cfg=oauthConfig()
  if(!cfg)return finish(res,'error')
  const url=new URL(req.url||'/', 'https://www.naopensevai.com')
  const code=url.searchParams.get('code')
  const state=url.searchParams.get('state')
  const adminState=checkOAuthState(state,cookieNonce(req),cfg.stateSecret)
  if(!adminState||!code||code.length>2000||/\s/.test(code))return finish(res,'error')
  try{
    const db=adminDb(cfg)
    const {data:admin,error:adminError}=await db.from('clube_admins')
      .select('user_id').eq('user_id',adminState.adminId).maybeSingle()
    if(adminError||!admin)return finish(res,'error')
    const {profile,token,expiresIn}=await exchangeProfessionalCode(code,cfg)
    const businessId=String(process.env.INSTAGRAM_BUSINESS_ID||'')
    const userId=String(profile.user_id||profile.id||'')
    if(profile.username?.toLowerCase()!=='naopensevai'||userId!==businessId
      ||profile.account_type==='PERSONAL')return finish(res,'error')
    // O callback validado NÃO garante entrega de DMs: a conta profissional
    // também precisa inscrever-se no campo messages usando o token OAuth.
    const subscription=await metaJson('https://graph.instagram.com/v26.0/me/subscribed_apps',{
      method:'POST',
      headers:{Authorization:'Bearer '+token,'Content-Type':'application/x-www-form-urlencoded'},
      body:new URLSearchParams({subscribed_fields:'messages'}).toString()
    })
    if(subscription.success!==true)return finish(res,'error')
    const {error}=await db.from('clube_instagram_business_auth').upsert({
      slot:'official',instagram_user_id:userId,
      username:profile.username,token_ciphertext:encryptToken(token,cfg),
      connected_at:new Date().toISOString(),
      expires_at:new Date(Date.now()+expiresIn*1000).toISOString()
    },{onConflict:'slot'})
    if(error)throw error
    return finish(res,'connected')
  }catch{return finish(res,'error')}
}
