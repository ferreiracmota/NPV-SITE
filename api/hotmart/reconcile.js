// Conciliação restrita aos pagamentos já identificados pelo webhook.
// Não descobre assinaturas antigas nem gera pontos antes do marco aprovado.
// Agendar na Vercel somente após homologação e autorização.
import { createClient } from '@supabase/supabase-js'
import { isAuthentic, oauthToken, verifyOfficialPayment } from './core.mjs'

const reply=(res,code,data)=>res.writeHead(code,{
 'Content-Type':'application/json; charset=utf-8',
 'Cache-Control':'no-store'
}).end(JSON.stringify(data))

async function transactionStatus(subscriberCode,transaction,env) {
 const token=await oauthToken(env)
 if(!token)return null
 const url=new URL('https://developers.hotmart.com/payments/api/v1/subscriptions/'+encodeURIComponent(subscriberCode)+'/purchases')
 const res=await fetch(url,{headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(9000)})
 if(!res.ok)throw new Error('purchase_api_unavailable')
 const data=await res.json()
 const rows=Array.isArray(data)?data:Array.isArray(data.items)?data.items:[]
 const found=rows.filter(x=>String(x.transaction)===transaction)
 return found.length===1?found[0]:null
}
export default async function handler(req,res) {
 if(req.method!=='GET')return reply(res,405,{status:'method_not_allowed'})
 const env=process.env
 const header=String(req.headers.authorization||'')
 if(!env.CRON_SECRET||!isAuthentic(header,'Bearer '+env.CRON_SECRET))
  return reply(res,401,{status:'unauthorized'})
 if(!env.SUPABASE_URL||!env.SUPABASE_SERVICE_ROLE_KEY||
    !env.HOTMART_CLIENT_ID||!env.HOTMART_CLIENT_SECRET||!env.HOTMART_BASIC_TOKEN)
  return reply(res,503,{status:'not_configured'})
 const db=createClient(env.SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{
  auth:{persistSession:false,autoRefreshToken:false}
 })
 const {data:settings,error:settingError}=await db.from('clube_hotmart_config')
  .select('live_credit_enabled,starts_at').eq('singleton',true).single()
 if(settingError)return reply(res,503,{status:'db_unavailable'})
 if(!settings.live_credit_enabled||!settings.starts_at)
  return reply(res,200,{status:'disabled',checked:0})
 const {data:rows,error}=await db.from('clube_hotmart_payments')
  .select('id,product_id,subscriber_code,transaction_id,plan_id,recurrence_number,state,approved_at,processing_status,reconciliation_checked_at')
  .in('state',['approved','pending','delayed'])
  .order('reconciliation_checked_at',{ascending:true,nullsFirst:true})
  .limit(5)
 if(error)return reply(res,503,{status:'db_unavailable'})
 let checked=0,failed=0
 for(const payment of rows||[]) {
  try {
   const {data:product,error:perror}=await db.from('clube_hotmart_products')
    .select('product_ucode,enabled').eq('product_id',payment.product_id).maybeSingle()
   if(perror)throw new Error('product_unavailable')
   if(!product?.enabled)continue
   const event={
    type:'PURCHASE_APPROVED',transaction:payment.transaction_id,
    subscriberCode:payment.subscriber_code,productId:payment.product_id,
    planId:payment.plan_id,recurrence:payment.recurrence_number
   }
   const purchase=await transactionStatus(payment.subscriber_code,payment.transaction_id,env)
   if(!purchase)throw new Error('purchase_not_found')
   const terminal={
    REFUNDED:'PURCHASE_REFUNDED',CHARGEBACK:'PURCHASE_CHARGEBACK',
    CANCELLED:'PURCHASE_CANCELED'
   }[purchase.status]
   let kind=terminal,verified=null
   if(!terminal&&purchase.status==='APPROVED') {
    verified=await verifyOfficialPayment(event,env)
    if(verified)kind='PURCHASE_APPROVED'
   }
   if(kind) {
    const {error:rpcError}=await db.rpc('clube_hotmart_ingest',{
     p_event_id:'npv-reconcile:'+payment.id,
     p_event_type:kind,p_product_id:payment.product_id,
     p_product_ucode:product.product_ucode,p_transaction:payment.transaction_id,
     p_subscriber_code:payment.subscriber_code,
     p_verified_subscriber_email:verified?.email||null,
     p_plan_id:payment.plan_id,
     p_recurrence:verified?.recurrence??payment.recurrence_number,
     p_approved_at:verified?.approvedAt||payment.approved_at,
     p_purchase_verified:Boolean(verified)
    })
    if(rpcError)throw new Error('db_reconciliation_failed')
   }
   const {error:updateError}=await db.from('clube_hotmart_payments')
    .update({reconciliation_checked_at:new Date().toISOString()}).eq('id',payment.id)
   if(updateError)throw new Error('checkpoint_failed')
   checked++
  }catch {failed++}
 }
 return reply(res,failed?503:200,{status:failed?'partial_failure':'ok',checked,failed})
}
