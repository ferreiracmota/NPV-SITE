import {createClient} from '@supabase/supabase-js'
import {readBirthdaySubscriptionSnapshot} from '../hotmart-admin/reader.mjs'
import {chooseOwnSubscription} from './memberCardIdentity.mjs'
export const config={maxDuration:60}
const respond=(res,code,data)=>res.writeHead(code,{
 'Content-Type':'application/json; charset=utf-8','Cache-Control':'private, no-store, max-age=0',
 'Vary':'Authorization','X-Content-Type-Options':'nosniff','Cross-Origin-Resource-Policy':'same-origin'
}).end(JSON.stringify(data))
export async function handleMemberCard(req,res,{env=process.env,createClientFn=createClient,loadSnapshot=readBirthdaySubscriptionSnapshot}={}){
 if(req.method!=='GET')return respond(res,405,{status:'method_not_allowed'})
 const bearer=req.headers?.authorization
 if(typeof bearer!=='string'||!/^Bearer [A-Za-z0-9._~-]{16,4096}$/.test(bearer))
  return respond(res,401,{status:'unauthorized'})
 const url=env.VITE_CLUBE_SUPABASE_URL||env.SUPABASE_URL
 const key=env.VITE_CLUBE_SUPABASE_PUBLISHABLE_KEY||env.SUPABASE_PUBLISHABLE_KEY
 if(!url||!key)return respond(res,503,{status:'configuration_unavailable'})
 try{
  const client=createClientFn(url,key,{
   auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},
   global:{headers:{Authorization:bearer}}
  })
  const {data:auth,error:authError}=await client.auth.getUser(bearer.slice(7))
  const user=auth?.user
  if(authError||!user?.id||!user.email)return respond(res,401,{status:'unauthorized'})
  const {data:profile,error:profileError}=await client.from('clube_profiles')
   .select('id,email,approved').eq('id',user.id).maybeSingle()
  if(profileError)return respond(res,503,{status:'profile_unavailable'})
  // A consulta só é autorizada quando a identidade do Auth coincide com o próprio Clube.
  if(!profile?.approved||String(profile.email||'').trim().toLowerCase()!==user.email.trim().toLowerCase())
   return respond(res,403,{status:'profile_not_verified'})
  try{
   const snap=await loadSnapshot(env)
   if(!snap?.complete||!Array.isArray(snap.subscriptions))throw Error('incomplete_subscription_snapshot')
   const own=chooseOwnSubscription(snap.subscriptions,user.email)
   return respond(res,200,{...own,checked_at:snap.synced_at||new Date().toISOString()})
  }catch{
   return respond(res,200,{status:'unavailable',next_charge_at:null,checked_at:null})
  }
 }catch{return respond(res,503,{status:'member_card_unavailable'})}
}
export default function handler(req,res){return handleMemberCard(req,res)}
