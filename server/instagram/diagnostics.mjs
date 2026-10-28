// Diagnóstico protegido da assinatura do Instagram Login.
// Não expõe tokens, IDs pessoais ou conteúdos de Direct.
import {json,settings,authorizedMember,checkOrigin} from '../../api/instagram/_common.mjs'
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
  if(!found.length)return {registered:false,messages:false,callback:null}
  const callbacks=found.map(x=>x?.callback_url).filter(x=>typeof x==='string')
  return {
    registered:true,
    messages:hasMessageSubscription(source,'instagram'),
    callback:callbacks.length===0?null:callbacks.some(s=>s==='https://www.naopensevai.com/api/instagram/webhook')
  }
}

export default async function handler(req,res){
  if(!['GET','POST'].includes(req.method)){
    res.setHeader('Allow','GET, POST')
    return json(res,405,{status:'method_not_allowed'})
  }
  if(req.method==='POST'&&!checkOrigin(req))
    return json(res,403,{status:'invalid_origin'})
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
    const accountUrl='https://graph.instagram.com/v26.0/me/subscribed_apps'
    const appUrl='https://graph.facebook.com/v26.0/'+encodeURIComponent(cfg.appId)+'/subscriptions'
    const userAuth={'Authorization':'Bearer '+token}
    const appAuth={'Authorization':'Bearer '+cfg.appId+'|'+cfg.secret}
    const getBoth=()=>Promise.allSettled([
      metaJson(accountUrl,{headers:userAuth}),
      metaJson(appUrl,{headers:appAuth})
    ])
    let [account,app]=await getBoth()
    // Corrige apenas o objeto Instagram do aplicativo e a conta profissional
    // consentida. Nunca aceita URL, token, campos ou destino do navegador.
    if(req.method==='POST'){
      if(app.status!=='fulfilled')
        return json(res,503,{status:'meta_app_subscription_check_unavailable'})
      const insta=(Array.isArray(app.value?.data)?app.value.data:[])
        .find(x=>String(x?.object||'').toLowerCase()==='instagram')
      const exists=Boolean(insta)
      if(exists&&typeof insta?.callback_url==='string'
         &&insta.callback_url!=='https://www.naopensevai.com/api/instagram/webhook')
        return json(res,409,{status:'existing_callback_conflict'})
      const registered=findInstagramSubscription(app.value)
      if(!registered.messages||!registered.registered||registered.callback===false){
        // Preservar outros campos já cadastrados no objeto Instagram.
        const currentFields=Array.isArray(insta?.fields)?insta.fields.map(x=>typeof x==='string'?x:x?.name).filter(x=>/^[a-z_]{3,50}$/.test(x||'')):[]
        const fields=[...new Set(['messages',...currentFields])].join(',')
        const payload=new URLSearchParams({
          object:'instagram',fields,callback_url:'https://www.naopensevai.com/api/instagram/webhook',
          verify_token:cfg.verifyToken
        })
        try{
          await metaJson(appUrl,{
            method:'POST',
            headers:{...appAuth,'Content-Type':'application/x-www-form-urlencoded'},
            body:payload.toString()
          })
        }catch{return json(res,503,{status:'meta_app_subscription_failed'})}
      }
      if(account.status==='rejected'||!hasMessageSubscription(account.value)){
        try{
          const payload=new URLSearchParams({subscribed_fields:'messages'})
          const confirmed=await metaJson(accountUrl,{
            method:'POST',
            headers:{...userAuth,'Content-Type':'application/x-www-form-urlencoded'},
            body:payload.toString()
          })
          if(confirmed?.success!==true)
            return json(res,503,{status:'account_subscription_not_confirmed'})
        }catch{return json(res,503,{status:'meta_account_subscription_failed'})}
      }
      ;[account,app]=await getBoth()
    }
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
