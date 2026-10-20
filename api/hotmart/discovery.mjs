// Descoberta paginada de recorrências sem webhook. Somente após início explícito
// e habilitação revisada. Duas assinaturas por execução para proteger quota API.
import { createHash } from 'node:crypto'
import { oauthToken } from './core.mjs'
const tokenId=(product,subscriber,transaction)=>
 'npv-discovery:'+createHash('sha256')
  .update([product,subscriber,transaction].join(':')).digest('hex')

async function getJson(url,token,fetcher) {
 const r=await fetcher(url,{headers:{Authorization:'Bearer '+token,Accept:'application/json'},signal:AbortSignal.timeout(9000)})
 if(!r.ok)throw new Error('hotmart_discovery_unavailable')
 return r.json()
}
export async function discoverMissingPayments(db,env,startsAt,fetcher=fetch) {
 const start=Date.parse(startsAt)
 if(!Number.isFinite(start))return {processed:0,skipped:'missing_start'}
 const {data:products,error:pError}=await db.from('clube_hotmart_products')
  .select('product_id,product_ucode,monthly_plan_ids').eq('enabled',true)
 if(pError)throw new Error('products_query_failed')
 if(!products?.length)return {processed:0,skipped:'no_products'}
 const {data:checkpoints,error:cError}=await db.from('clube_hotmart_sync_state')
  .select('product_id,page_token,last_checked_at')
 if(cError)throw new Error('sync_state_query_failed')
 const states=new Map((checkpoints||[]).map(x=>[String(x.product_id),x]))
 const product=[...products].sort((a,b)=>Date.parse(states.get(String(a.product_id))?.last_checked_at||0)
   -Date.parse(states.get(String(b.product_id))?.last_checked_at||0))[0]
 const checkpoint=states.get(String(product.product_id))
 const token=await oauthToken(env,fetcher)
 if(!token)throw new Error('oauth_not_configured')
 const url=new URL('https://developers.hotmart.com/payments/api/v1/subscriptions')
 url.searchParams.set('product_id',String(product.product_id))
 url.searchParams.set('accession_date','1') // inclui assinaturas antigas; só créditos APÓS startsAt
 url.searchParams.set('max_results','2')
 if(checkpoint?.page_token)url.searchParams.set('page_token',checkpoint.page_token)
 const batch=await getJson(url,token,fetcher)
 if(!Array.isArray(batch.items))throw new Error('unexpected_subscription_payload')
 let count=0
 for(const subscriber of batch.items) {
  if(Number(subscriber.product?.id)!==Number(product.product_id)||
     subscriber.product?.ucode!==product.product_ucode||
     !subscriber.subscriber_code||!subscriber.subscriber?.email||
     Number(subscriber.plan?.recurrency_period)!==30||
     !(product.monthly_plan_ids||[]).some(id=>Number(id)===Number(subscriber.plan?.id)))
   continue
  const purchaserUrl=new URL('https://developers.hotmart.com/payments/api/v1/subscriptions/'
    +encodeURIComponent(subscriber.subscriber_code)+'/purchases')
  const payments=await getJson(purchaserUrl,token,fetcher)
  const items=Array.isArray(payments)?payments:Array.isArray(payments.items)?payments.items:[]
  // Desde o marco autorizado, preservando TODAS as recorrências do período.
  for(const payment of items) {
   const recurrence=Number(payment.recurrency_number),ms=Number(payment.approved_date)
   if(payment.purchase_subscription!==true||!Number.isSafeInteger(recurrence)||
      recurrence<2||!Number.isFinite(ms)||ms<start||!payment.transaction)continue
   const eventType={
    APPROVED:'PURCHASE_APPROVED',REFUNDED:'PURCHASE_REFUNDED',
    CHARGEBACK:'PURCHASE_CHARGEBACK',CANCELLED:'PURCHASE_CANCELED'
   }[payment.status]
   if(!eventType)continue
   const {error}=await db.rpc('clube_hotmart_ingest',{
    p_event_id:tokenId(product.product_id,subscriber.subscriber_code,payment.transaction),
    p_event_type:eventType,p_product_id:Number(product.product_id),
    p_product_ucode:product.product_ucode,p_transaction:payment.transaction,
    p_subscriber_code:subscriber.subscriber_code,
    p_verified_subscriber_email:subscriber.subscriber.email,
    p_plan_id:Number(subscriber.plan.id),p_recurrence:recurrence,
    p_approved_at:new Date(ms).toISOString(),
    p_purchase_verified:eventType==='PURCHASE_APPROVED'
   })
   if(error)throw new Error('discovery_sql_failed')
   count++
  }
 }
 const {error:updateError}=await db.from('clube_hotmart_sync_state')
  .upsert({product_id:product.product_id,page_token:batch.page_info?.next_page_token||null,
    last_checked_at:new Date().toISOString(),last_error:null,updated_at:new Date().toISOString()})
 if(updateError)throw new Error('discovery_checkpoint_failed')
 return {processed:count,subscribers_checked:batch.items.length,product_checked:true}
}
