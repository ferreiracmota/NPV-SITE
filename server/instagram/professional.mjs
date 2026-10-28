// A conta profissional @naopensevai é autorizada por Instagram Login.
// O aluno usa código por DM; seu Instagram pessoal não precisa ser profissional.
import {json,checkOrigin} from '../../api/instagram/_common.mjs'
import {
 baseConfig,oauthConfig,adminFromRequest,officialRow,
 randomNonce,createOAuthState
} from './_oauth.mjs'

export default async function handler(req,res){
  if(!['GET','POST'].includes(req.method)){
    res.setHeader('Allow','GET, POST')
    return json(res,405,{status:'method_not_allowed'})
  }
  const base=baseConfig()
  if(!base)return json(res,503,{status:'club_config_required'})
  let admin
  try{admin=await adminFromRequest(req,base)}
  catch{return json(res,503,{status:'club_auth_unavailable'})}
  if(!admin)return json(res,403,{status:'admin_required'})
  const cfg=oauthConfig()
  if(req.method==='GET'){
    if(!cfg)return json(res,200,{ready:false,connected:false,status:'meta_oauth_config_required'})
    try{
      const {data,error}=await officialRow(cfg)
      if(error)throw error
      return json(res,200,{
        ready:true,connected:Boolean(data&&Date.parse(data.expires_at)>Date.now()),
        username:data?.username||null,
        connected_at:data?.connected_at||null,
        expires_at:data?.expires_at||null
      })
    }catch{return json(res,503,{status:'instagram_database_setup_required'})}
  }
  if(!checkOrigin(req))return json(res,403,{status:'invalid_origin'})
  if(!cfg)return json(res,409,{status:'meta_oauth_config_required'})
  const nonce=randomNonce()
  const state=createOAuthState(admin.id,nonce,Date.now(),cfg.stateSecret)
  const params=new URLSearchParams({
    client_id:cfg.clientId,redirect_uri:cfg.redirectUri,
    scope:'instagram_business_basic,instagram_business_manage_messages',
    response_type:'code',enable_fb_login:'0',state
  })
  res.setHeader('Set-Cookie',
    'npv_ig_oauth_nonce='+nonce+'; Path=/api/instagram/oauth-callback; Max-Age=600; HttpOnly; Secure; SameSite=Lax')
  return json(res,200,{
    authorization_url:'https://www.instagram.com/oauth/authorize?'+params.toString()
  })
}
