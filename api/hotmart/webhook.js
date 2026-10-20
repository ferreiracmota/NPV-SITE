// Webhook Hotmart 2.0.0 — backend exclusivo; sem alteração no frontend.
// Bloqueado até credenciais e política de ativação aprovadas.
import { createClient } from '@supabase/supabase-js'
import { interpretWebhook, isAuthentic, lookupSubscriber } from './core.mjs'

const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}
const send=(res,code,message)=>res.writeHead(code,{'Content-Type':'application/json; charset=utf-8',...headers}).end(JSON.stringify({status:message}))
async function readBody(req) {
 if(req.body!==undefined&&req.body!==null) {
  const text=typeof req.body==='string'?req.body:JSON.stringify(req.body)
  if(Buffer.byteLength(text)>65536)throw new Error('body_too_large')
  return typeof req.body==='string'?JSON.parse(req.body):req.body
 }
 let size=0,chunks=[]
 for await(const chunk of req) {
  size+=chunk.length
  if(size>65536)throw new Error('body_too_large')
  chunks.push(chunk)
 }
 return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

export default async function handler(req,res) {
 if(req.method!=='POST')return send(res,405,'method_not_allowed')
 const env=process.env
 const hottok=env.HOTMART_HOTTOK
 const supabaseUrl=env.SUPABASE_URL
 const serviceKey=env.SUPABASE_SERVICE_ROLE_KEY
 const ids=String(env.HOTMART_ALLOWED_PRODUCT_IDS||'').split(',').map(x=>x.trim()).filter(Boolean)
 if(!hottok||!supabaseUrl||!serviceKey||!ids.length)return send(res,503,'integration_not_configured')
 if(!isAuthentic(req.headers['x-hotmart-hottok'],hottok))return send(res,401,'unauthorized')
 let event
 try {event=interpretWebhook(await readBody(req))}
 catch {return send(res,400,'invalid_event')}
 if(!ids.includes(String(event.productId)))return send(res,200,'ignored_product')
 if(!event.subscriberCode)return send(res,422,'missing_subscriber')
 if(event.type!=='SUBSCRIPTION_CANCELLATION'&&!event.transaction)return send(res,422,'missing_transaction')

 // Devolve sucesso somente depois da persistência transacional no Supabase.
 // Sem credenciais de API, persiste evento em espera: não afirma identidade.
 let verifiedEmail=null,lookupError=false
 if(event.type==='PURCHASE_APPROVED') {
  try{verifiedEmail=await lookupSubscriber(event,env)}
  catch {lookupError=true}
 }
 try {
  const db=createClient(supabaseUrl,serviceKey,{
    auth:{persistSession:false,autoRefreshToken:false},
    global:{headers:{'X-Client-Info':'npv-hotmart-webhook/1'}}
  })
  const {data,error}=await db.rpc('clube_hotmart_ingest',{
   p_event_id:event.id,
   p_event_type:event.type,
   p_product_id:event.productId,
   p_product_ucode:event.productUcode,
   p_transaction:event.transaction||null,
   p_subscriber_code:event.subscriberCode,
   p_verified_subscriber_email:verifiedEmail,
   p_plan_id:event.planId,
   p_recurrence:event.recurrence,
   p_approved_at:event.approvedAt
  })
  if(error) {
   // Nunca devolve detalhes de credenciais, endereços ou SQL ao emissor.
   return send(res,503,'processing_temporarily_unavailable')
  }
  // Reprocessamento de validação pendente ocorre pela reconciliação.
  if(lookupError&&data==='pending_identity')return send(res,503,'identity_lookup_retry')
  return send(res,200,data||'recorded')
 }catch {
  return send(res,503,'processing_temporarily_unavailable')
 }
}
