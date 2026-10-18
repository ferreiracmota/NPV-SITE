// Somente o aluno autenticado consegue consultar a própria conexão / atividade.
import { sanitizeActivityList } from './pilot-core.mjs'
import {
  settings,clubUser,seal,unseal,readCookie,cookie,COOKIE_LINK,
  checkOrigin,privateHeaders,writeJson,stravaToken
} from './link-core.mjs'

export default async function handler(req,res){
  const cfg=settings()
  if(!cfg)return writeJson(res,503,{connected:false,error:'Conexão indisponível.'})
  if(req.method!=='GET'&&req.method!=='POST'){
    res.writeHead(405,{...privateHeaders,Allow:'GET, POST'});return res.end()
  }
  if(req.method==='POST'&&!checkOrigin(req,cfg)){
    return writeJson(res,403,{error:'Origem não autorizada.'})
  }
  let user
  try{user=await clubUser(req,cfg)}catch{
    return writeJson(res,503,{connected:false,error:'Não foi possível verificar o cadastro do Clube.'})
  }
  if(!user)return writeJson(res,401,{connected:false,error:'Acesse sua conta do Clube NPV.'})
  let credential=unseal(readCookie(req,COOKIE_LINK),cfg.secret)
  if(!credential||credential.user!==user||!credential.refresh||!credential.access){
    return writeJson(res,200,{connected:false,activities:[]})
  }
  if(req.method==='POST'){
    const revokeToken=credential.refresh
    let revoked=false
    try {
      const request=await fetch('https://www.strava.com/oauth/revoke',{
        method:'POST',
        headers:{
          'Authorization':'Basic '+Buffer.from(cfg.id+':'+cfg.secret).toString('base64'),
          'Content-Type':'application/x-www-form-urlencoded'
        },
        body:new URLSearchParams({token:revokeToken,token_type_hint:'refresh_token'}),
        signal:AbortSignal.timeout(12000)
      })
      revoked=request.ok
    }catch{}
    res.setHeader('Set-Cookie',cookie(COOKIE_LINK,'',0))
    return writeJson(res,200,{connected:false,revoked,activities:[]})
  }
  const expiresAt=Number(credential.expires||0)
  if(!Number.isFinite(expiresAt))return writeJson(res,200,{connected:false,activities:[]})
  try{
    if(expiresAt<=Math.floor(Date.now()/1000)+3600){
      const refreshed=await stravaToken(cfg,{
        grant_type:'refresh_token',refresh_token:credential.refresh
      })
      credential={...credential,access:refreshed.access_token,refresh:refreshed.refresh_token,expires:refreshed.expires_at}
      res.setHeader('Set-Cookie',cookie(COOKIE_LINK,seal(credential,cfg.secret),2592000))
    }
    const now=Math.floor(Date.now()/1000)
    const endpoint=new URL('https://www.strava.com/api/v3/athlete/activities')
    endpoint.searchParams.set('after',String(now-7*86400))
    endpoint.searchParams.set('before',String(now))
    endpoint.searchParams.set('per_page','30')
    endpoint.searchParams.set('page','1')
    const result=await fetch(endpoint,{
      headers:{Authorization:'Bearer '+credential.access},
      signal:AbortSignal.timeout(14000)
    })
    if(result.status===401){
      res.setHeader('Set-Cookie',cookie(COOKIE_LINK,'',0))
      return writeJson(res,200,{connected:false,activities:[],error:'A autorização do Strava expirou ou foi revogada.'})
    }
    if(!result.ok) throw new Error('strava request failed')
    const activities=sanitizeActivityList(await result.json())
    return writeJson(res,200,{
      connected:true,
      activities,
      rangeDays:7,
      note:'Apenas consulta individual: não há crédito automático de pontos nem arquivo de atividades.'
    })
  }catch{
    return writeJson(res,200,{connected:true,activities:[],error:'Conectado, mas a consulta de atividades está temporariamente indisponível.'})
  }
}
