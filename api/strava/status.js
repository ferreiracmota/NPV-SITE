// Somente o aluno autenticado consegue consultar a própria conexão / atividade.
import { sanitizeActivityList } from '../../clube/strava/pilot-core.mjs'
import { activityWindow, recentActivities } from '../../clube/strava/challengeProgress.mjs'
import {eligibleMonthMetrics} from '../../clube/strava/auto-credit.mjs'
import {reconcileStravaPoints} from '../../clube/strava/credit-server.mjs'
import {
  settings,clubUser,seal,unseal,readCookie,cookie,COOKIE_LINK,
  checkOrigin,privateHeaders,writeJson,stravaToken
} from '../../clube/strava/link-core.mjs'
import {recordStravaConnectionStatus} from '../../clube/strava/connection-status.mjs'

export default async function handler(req,res){
  const cfg=settings()
  // Sem credenciais no ambiente oficial: a interface informa a indisponibilidade
  // sem aparentar uma conexão real e sem enviar dados ao Strava.
  if(!cfg)return writeJson(res,200,{connected:false,disabled:true,activities:[]})
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
    await recordStravaConnectionStatus(user,false)
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
    // Uma consulta cobre o mês inteiro e os últimos 7 dias; paginação evita perder
    // quilômetros dos alunos mais ativos. O resultado não é armazenado.
    const now=new Date();
    const window=activityWindow(now);
    const all=[];
    const PER_PAGE=200,MAX_PAGES=6;
    for(let page=1;page<=MAX_PAGES;page++){
      const endpoint=new URL('https://www.strava.com/api/v3/athlete/activities')
      endpoint.searchParams.set('after',String(window.after))
      endpoint.searchParams.set('before',String(window.before))
      endpoint.searchParams.set('per_page',String(PER_PAGE))
      endpoint.searchParams.set('page',String(page))
      const result=await fetch(endpoint,{
        headers:{Authorization:'Bearer '+credential.access},
        signal:AbortSignal.timeout(14000)
      })
      if(result.status===401){
        res.setHeader('Set-Cookie',cookie(COOKIE_LINK,'',0))
        await recordStravaConnectionStatus(user,false)
        return writeJson(res,200,{connected:false,activities:[],error:'A autorização do Strava expirou ou foi revogada.'})
      }
      if(!result.ok)throw new Error('strava request failed')
      const part=await result.json()
      if(!Array.isArray(part))throw new Error('invalid activities response')
      all.push(...part)
      if(part.length<PER_PAGE)break
      if(page===MAX_PAGES)throw new Error('incomplete Strava pagination')
    }
    const activities=sanitizeActivityList(recentActivities(all,now))
    // A mesma lista de atividades alimenta barra de progresso e creditos auditaveis.
    // Falhas na conciliacao nunca ocultam os treinos: a aluna podera tentar novamente.
    let monthly=eligibleMonthMetrics(all,window.monthKey)
    const connectionRecorded=await recordStravaConnectionStatus(user,true)
    let credit={status:'retry',credited_now:0,challenge_credited_now:0}
    try{
      const reconciled=await reconcileStravaPoints(user,all,window.monthKey)
      monthly=reconciled.monthly
      credit=reconciled.credit
    }catch(error){
      console.error('[strava] monthly credit not synchronized',error?.message||'unknown')
    }
    return writeJson(res,200,{
      connected:true,connectionRecorded,activities,rangeDays:7,
      monthly:{monthKey:monthly.monthKey,km:monthly.km,activityCount:monthly.activityCount},
      credit,note:'Apenas corrida, caminhada e bicicleta validas. Credito de pontos auditado pelo Clube.'
    })
  }catch{
    return writeJson(res,200,{connected:true,activities:[],error:'Conectado, mas a consulta de atividades está temporariamente indisponível.'})
  }
}
