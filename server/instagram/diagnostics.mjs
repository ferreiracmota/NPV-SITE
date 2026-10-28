// Diagnóstico protegido da assinatura do Instagram Login.
// Não expõe tokens, IDs pessoais ou conteúdos de Direct.
import {json,settings,authorizedMember} from '../../api/instagram/_common.mjs'
import {oauthConfig,officialRow,decryptToken,metaJson} from './_oauth.mjs'

export function hasMessageSubscription(source,objectType=null){
  const entries=Array.isArray(source?.data)?source.data:[]
  const relevant=objectType?entries.filter(e=>String(e?.object||'').toLowerCase()===objectType):entries
  const normalized=relevant.flatMap(e=>{
    const fields=[...(Array.isArray(e?.fields)?e.fields:[]),...(Array.isArray(e?.subscribed_fields)?e.subscribed_fields:[])]
    return fields.map(f=>String(typeof f==='string'?f:f?.name||'').toLowerCase())
  })
  return normalized.includes('messages')
}

export function findInstagramSubscription(source){
  const found=(Array.isArray(source?.data)?source.data:[])
    .filter(x=>String(x?.object||'').toLowerCase()==='instagram')
  if(!found.length)return {registered:false,messages:false,callback:false}
  const callbacks=found.map(x=>x?.callback_url).filter(x=>typeof x==='string')
  return {
    registered:true,
    messages:hasMessageSubscription(source,'instagram'),
    callback:callbacks.some(s=>s==='https://www.naopensevai.com/api/instagram/webhook')
  }
}

export default async function handler(req,res){
  if(req.method!=='GET'){
    res.setHeader('Allow','GET')
    return json(res,405,{status:'method_not_allowed'})
  }
  const cfg=settings()
  const oauth=oauthConfig()
  if(!cfg||!oauth)return json(res,503,{status:'instagram_configuration_required'})
  let member
  try{member=await authorizedMember(req,cfg)}
  catch{return json(res,503,{status:'club_auth_unavailable'})}
  if(!member)return json(res,401,{status:'club_login_required'})
  if(!member.isAdmin)return json(res,403,{status:'admin_required'})
  const answer={
    configured:true,
    officialAuthorized:false,
    officialTokenValid:false,
    accountMessagesSubscribed:null,
    appSubscriptionRegistered:null,
    appMessagesSubscribed:null,
    callbackConfigured:null
  }
  try{
    const {data,error}=await officialRow(oauth)
    if(error)throw error
    if(!data||Date.parse(data.expires_at)<=Date.now())
      return json(res,200,{...answer,status:'official_oauth_required'})
    answer.officialAuthorized=true
    const token=decryptToken(data.token_ciphertext,oauth)
    // As consultas são somente leitura. Falha em uma não mascara a outra.
    const [account,app]=await Promise.allSettled([
      metaJson('https://graph.instagram.com/v26.0/me/subscribed_apps',{
        headers:{Authorization:'Bearer '+token}
      }),
      metaJson('https://graph.facebook.com/v26.0/'+encodeURIComponent(cfg.appId)+'/subscriptions',{
        headers:{Authorization:'Bearer '+cfg.appId+'|'+cfg.secret}
      })
    ])
    if(account.status==='fulfilled'){
      answer.officialTokenValid=true
      answer.accountMessagesSubscribed=hasMessageSubscription(account.value)
    }
    if(app.status==='fulfilled'){
      const result=findInstagramSubscription(app.value)
      answer.appSubscriptionRegistered=result.registered
      answer.appMessagesSubscribed=result.messages
      answer.callbackConfigured=result.callback
    }
    answer.status=answer.accountMessagesSubscribed===false?'account_messages_not_subscribed'
      :answer.appSubscriptionRegistered===false?'app_webhook_not_registered'
      :answer.appMessagesSubscribed===false?'app_messages_not_subscribed'
      :answer.callbackConfigured===false?'callback_url_incorrect'
      :answer.accountMessagesSubscribed===true&&answer.appMessagesSubscribed===true
        &&answer.callbackConfigured===true?'subscriptions_verified':'meta_subscription_unverified'
    return json(res,200,answer)
  }catch{
    return json(res,503,{status:'instagram_diagnostic_unavailable'})
  }
}
