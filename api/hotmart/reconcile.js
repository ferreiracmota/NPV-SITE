// Conciliação Hotmart: também encontra renovações cujo webhook NÃO chegou.
// Agendamento NÃO ativado; exige CRON_SECRET, credenciais e flag live_credit_enabled.
import { createHash } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { isAuthentic, oauthToken } from './core.mjs'

const response=(res,status,body)=>res.writeHead(status,{
 'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'
}).end(JSON.stringify(body))
const PURCHASE_EVENTS={
 APPROVED:'PURCHASE_APPROVED', COMPLETE:'PURCHASE_APPROVED',
 REFUNDED:'PURCHASE_REFUNDED', CHARGEBACK:'PURCHASE_CHARGEBACK',
 CANCELLED:'PURCHASE_CANCELED'
}
async function fetchHotmart(url,token){
 const r=await fetch(url,{headers:{Authorization:'Bearer '+token,Accept:'application/json'},signal:AbortSignal.timeout(9000)})
 if(!r.ok)throw new Error('hotmart_api_retry')
 return r.json()
}
export function eligibleReconciliationItem(item,startAt){
 const recurrence=Number(item?.recurrency_number)
 const approval=Number(item?.approved_date)
 const type=PURCHASE_EVENTS[item?.status]
 if(!type||item?.purchase_subscription!==true||!item?.transaction||
  !Number.isSafeInteger(recurrence)||recurrence<2||
  !Number.isSafeInteger(approval)||approval<Date.parse(startAt)||
  item?.payment_type==='FINANCED_INSTALLMENT')return null
 return {type,recurrence,approvedAt:new Date(approval).toISOString()}
}
export function reconciliationEventId(productId,subscriberCode,transaction,type){
 const key=[productId,subscriberCode,transaction,type].join(':')
 return 'npv-reconcile:'+createHash('sha256').update(key).digest('hex')
}
export default async function handler(req,res) {
 if(req.method!=='GET')return response(res,405,{status:'method_not_allowed'})
 const env=process.env
 if(!env.CRON_SECRET||!isAuthentic(req.headers.authorization,'Bearer '+env.CRON_SECRET))
  return response(res,401,{status:'unauthorized'})
 if(!env.SUPABASE_URL||!env.SUPABASE_SERVICE_ROLE_KEY||
  !env.HOTMART_CLIENT_ID||!env.HOTMART_CLIENT_SECRET||!env.HOTMART_BASIC_TOKEN)
  return response(res,503,{status:'not_configured'})
 const db=createClient(env.SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{
  auth:{persistSession:false,autoRefreshToken:false}
 })
 const {data:policy,error:policyError}=await db.from('clube_hotmart_config')
  .select('live_credit_enabled,starts_at').eq('singleton',true).single()
 if(policyError)return response(res,503,{status:'db_unavailable'})
 if(!policy?.live_credit_enabled||!policy.starts_at)return response(res,200,{status:'disabled'})
 const {data:products,error:productsError}=await db.from('clube_hotmart_products')
  .select('product_id,product_ucode,monthly_plan_ids').eq('enabled',true).limit(5)
 if(productsError)return response(res,503,{status:'db_unavailable'})
 if(!products?.length)return response(res,200,{status:'no_products'})
 try{
  const token=await oauthToken(env)
  if(!token)return response(res,503,{status:'hotmart_auth_pending'})
  let subscribers=0,payments=0
  // Uma página (até 10 assinaturas) por produto e por execução: limita uso da API.
  // O token de paginação é persistido, sem perder o progresso de uma rotina falha.
  for(const product of products){
   const {data:checkpoint,error:checkpointError}=await db.from('clube_hotmart_reconciliation_state')
    .select('next_page_token').eq('product_id',product.product_id).maybeSingle()
   if(checkpointError)throw new Error('checkpoint_unavailable')
   const url=new URL('https://developers.hotmart.com/payments/api/v1/subscriptions')
   url.searchParams.set('product_id',String(product.product_id))
   url.searchParams.set('max_results','10')
   if(checkpoint?.next_page_token)url.searchParams.set('page_token',checkpoint.next_page_token)
   const page=await fetchHotmart(url,token)
   if(!Array.isArray(page.items))throw new Error('invalid_subscriptions_page')
   for(const subscriber of page.items){
    if(Number(subscriber.product?.id)!==Number(product.product_id)||
      subscriber.product?.ucode!==product.product_ucode||
      Number(subscriber.plan?.recurrency_period)!==30||
      !product.monthly_plan_ids.includes(Number(subscriber.plan?.id))||
      !subscriber.subscriber_code||!subscriber.subscriber?.email)continue
    subscribers++
    const purchaseUrl=new URL('https://developers.hotmart.com/payments/api/v1/subscriptions/'+
     encodeURIComponent(subscriber.subscriber_code)+'/purchases')
    const history=await fetchHotmart(purchaseUrl,token)
    const entries=Array.isArray(history)?history:Array.isArray(history.items)?history.items:[]
    for(const row of entries){
     const e=eligibleReconciliationItem(row,policy.starts_at)
     if(!e)continue
     const {error}=await db.rpc('clube_hotmart_ingest',{
      p_event_id:reconciliationEventId(product.product_id,subscriber.subscriber_code,row.transaction,e.type),
      p_event_type:e.type,p_product_id:product.product_id,
      p_product_ucode:product.product_ucode,
      p_transaction:String(row.transaction),
      p_subscriber_code:String(subscriber.subscriber_code),
      p_verified_subscriber_email:subscriber.subscriber.email,
      p_plan_id:Number(subscriber.plan.id),
      p_recurrence:e.recurrence,p_approved_at:e.approvedAt,
      p_purchase_verified:e.type==='PURCHASE_APPROVED'
     })
     if(error)throw new Error('ingest_retry')
     payments++
    }
   }
   const {error}=await db.from('clube_hotmart_reconciliation_state')
    .upsert({
      product_id:product.product_id,
      next_page_token:page.page_info?.next_page_token||null,
      updated_at:new Date().toISOString()
    },{onConflict:'product_id'})
   if(error)throw new Error('checkpoint_write_retry')
  }
  return response(res,200,{status:'ok',subscribers,payments})
 }catch{
  return response(res,503,{status:'retry_later'})
 }
}
