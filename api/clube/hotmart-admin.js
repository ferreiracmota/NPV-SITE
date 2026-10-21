// Somente status da futura integração. Nenhuma leitura Hotmart, nenhuma escrita Supabase.
// O endpoint protege QUALQUER dado administrativo futuro com JWT validado e RLS.
import { createClient } from '@supabase/supabase-js'

const respond=(res,status,body)=>res.writeHead(status,{
  'Content-Type':'application/json; charset=utf-8',
  'Cache-Control':'no-store, private',
  'Vary':'Authorization',
  'X-Content-Type-Options':'nosniff'
}).end(JSON.stringify(body))

export async function handleHotmartAdminStatus(req,res,{
  env=process.env,createClientFn=createClient
}={}){
  if(req.method!=='GET')return respond(res,405,{status:'method_not_allowed'})
  const bearer=req.headers?.authorization
  if(typeof bearer!=='string'||!/^Bearer [A-Za-z0-9._~-]{16,4096}$/.test(bearer)){
    return respond(res,401,{status:'unauthorized'})
  }
  const url=env.VITE_CLUBE_SUPABASE_URL||env.SUPABASE_URL
  const key=env.VITE_CLUBE_SUPABASE_PUBLISHABLE_KEY||env.SUPABASE_PUBLISHABLE_KEY
  if(!url||!key)return respond(res,503,{status:'admin_service_unavailable'})
  try{
    const token=bearer.slice(7)
    // Usamos somente chave PUBLICÁVEL com JWT do solicitante; jamais service_role.
    const client=createClientFn(url,key,{
      auth:{persistSession:false,autoRefreshToken:false},
      global:{headers:{Authorization:bearer}}
    })
    const {data:auth,error:authError}=await client.auth.getUser(token)
    const user=auth?.user
    if(authError||!user?.id)return respond(res,401,{status:'unauthorized'})
    const {data:administrator,error:roleError}=await client.from('clube_admins')
      .select('user_id').eq('user_id',user.id).maybeSingle()
    if(roleError)return respond(res,503,{status:'admin_authorization_unavailable'})
    if(administrator?.user_id!==user.id)return respond(res,403,{status:'forbidden'})
    // Sem sync real, NÃO exibir zeros como se fossem estatísticas.
    return respond(res,200,{
      status:'awaiting_integration',
      message:'Aguardando integração com a Hotmart',
      metrics:null,
      subscriptions:[],
      synced_at:null
    })
  }catch{
    return respond(res,503,{status:'admin_service_unavailable'})
  }
}

export default function handler(req,res){
  return handleHotmartAdminStatus(req,res)
}
