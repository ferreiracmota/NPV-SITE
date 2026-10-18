// OAuth do próprio aluno, restrito ao mesmo navegador onde está autenticado no Clube NPV.
// O piloto de leitura antiga em /api/strava/pilot continua independente.
import { newOAuthState, verifyOAuthState } from './pilot-core.mjs'
import {
  settings,clubUser,seal,unseal,readCookie,cookie,COOKIE_STATE,COOKIE_LINK,
  checkOrigin,privateHeaders,writeJson,stravaToken
} from './link-core.mjs'

const redirect=(res,location,extraCookies=[])=>{
  res.writeHead(303,{...privateHeaders,Location:location,...(extraCookies.length?{'Set-Cookie':extraCookies}:{})})
  res.end()
}
const endState = cookie(COOKIE_STATE,'',0)

export default async function handler(req,res) {
  const cfg=settings()
  if(!cfg)return writeJson(res,503,{error:'Integração de teste indisponível.'})
  if(req.method==='POST') {
    if(!checkOrigin(req,cfg))return writeJson(res,403,{error:'Origem não autorizada.'})
    let user
    try {user=await clubUser(req,cfg)}catch{return writeJson(res,503,{error:'Autenticação temporariamente indisponível.'})}
    if(!user)return writeJson(res,401,{error:'Entre no Clube NPV antes de conectar o Strava.'})
    const {state,nonce}=newOAuthState(cfg.secret)
    res.setHeader('Set-Cookie',cookie(COOKIE_STATE,seal({user,nonce,expires:Date.now()+600000},cfg.secret),600))
    const authorize=new URL('https://www.strava.com/oauth/authorize')
    authorize.searchParams.set('client_id',cfg.id)
    authorize.searchParams.set('response_type','code')
    authorize.searchParams.set('redirect_uri',cfg.callback)
    authorize.searchParams.set('scope','activity:read')
    authorize.searchParams.set('approval_prompt','auto')
    authorize.searchParams.set('state',state)
    return writeJson(res,200,{authorize_url:authorize.toString()})
  }
  if(req.method!=='GET'){
    res.writeHead(405,{...privateHeaders,Allow:'GET, POST'});return res.end()
  }
  let url
  try{url=new URL(req.url,cfg.callback)}catch{return writeJson(res,400,{error:'URL inválida.'})}
  if(!url.searchParams.has('state')){
    return redirect(res,'/clube?strava=not-started')
  }
  const encrypted=readCookie(req,COOKIE_STATE)
  const stateCookie=unseal(encrypted,cfg.secret)
  const valid=Boolean(stateCookie?.user&&stateCookie.expires>Date.now()
    &&verifyOAuthState(url.searchParams.get('state'),stateCookie.nonce,cfg.secret))
  if(!valid)return redirect(res,'/clube?strava=expired',[endState])
  if(url.searchParams.get('error'))return redirect(res,'/clube?strava=denied',[endState])
  const code=url.searchParams.get('code')
  const scopes=String(url.searchParams.get('scope')||'').split(/[\s,]+/)
  if(typeof code!=='string'||code.length<3||code.length>2048||!scopes.includes('activity:read')){
    return redirect(res,'/clube?strava=denied',[endState])
  }
  try{
    const token=await stravaToken(cfg,{code,grant_type:'authorization_code'})
    // A credencial é vinculada ao usuário NPV validado no início. Não sai do servidor.
    const link=seal({
      user:stateCookie.user,refresh:token.refresh_token,
      access:token.access_token,expires:token.expires_at,
      athlete:typeof token.athlete?.id==='number'?token.athlete.id:null,
      connected:Date.now()
    },cfg.secret)
    res.setHeader('Set-Cookie',[endState,cookie(COOKIE_LINK,link,2592000)])
    return redirect(res,'/clube?strava=connected')
  }catch{
    return redirect(res,'/clube?strava=failed',[endState])
  }
}
