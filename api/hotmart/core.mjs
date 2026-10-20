import { createHash, timingSafeEqual } from 'node:crypto'

export const EVENTS = new Set([
 'PURCHASE_APPROVED','PURCHASE_REFUNDED','PURCHASE_CHARGEBACK',
 'PURCHASE_CANCELED','PURCHASE_DELAYED','SUBSCRIPTION_CANCELLATION'
])
const clean = (value,max=160) =>
 typeof value === 'string' && value.trim().length>0 && value.trim().length<=max ? value.trim() : ''
const idString=(value,max=160)=>
 typeof value==='number'&&Number.isSafeInteger(value)?String(value):clean(value,max)
const num=value => value===null||value===undefined||value===''?null:
 Number.isSafeInteger(Number(value))?Number(value):null
const email=value => typeof value==='string'&&value.length<=320&&
 /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value.trim())?value.trim().toLowerCase():null

export function isAuthentic(header,expected) {
 if(typeof header!=='string'||!header||typeof expected!=='string'||!expected) return false
 const a=createHash('sha256').update(header).digest()
 const b=createHash('sha256').update(expected).digest()
 return timingSafeEqual(a,b)
}
export function interpretWebhook(body) {
 if(!body||typeof body!=='object'||Array.isArray(body)) throw new Error('invalid_body')
 if(body.version!=='2.0.0'||!EVENTS.has(body.event)) throw new Error('unsupported_webhook')
 const data=body.data||{}
 const cancellation=body.event==='SUBSCRIPTION_CANCELLATION'
 const subscription=data.subscription||{}
 const purchase=data.purchase||{}
 const product=data.product||{}
 const result={
  id:idString(body.id,160),
  type:body.event,
  productId:num(product.id),
  productUcode:clean(product.ucode,160),
  subscriberCode:clean(
   (cancellation?data.subscriber?.code:subscription.subscriber?.code)||
   subscription.subscriber_code||'',128),
  transaction:idString(purchase.transaction,160),
  planId:num(subscription.plan?.id),
  recurrence:num(purchase.recurrence_number),
  approvedAt:Number.isFinite(Number(purchase.approved_date))&&Number(purchase.approved_date)>0
   ?new Date(Number(purchase.approved_date)).toISOString():null,
  buyerEmail:email(data.buyer?.email),
  subscriberEmailHint:email(data.subscriber?.email||subscription.subscriber?.email),
 }
 if(!result.id||!Number.isSafeInteger(result.productId)||result.productId<=0)
  throw new Error('missing_identifiers')
 // purchase.transaction pode faltar no cancelamento de assinatura.
 return result
}
export function isEligibleMonthlyRenewal(event,planIds,startAt) {
 if(event.type!=='PURCHASE_APPROVED')return false
 if(!event.transaction||!event.subscriberCode)return false
 if(event.recurrence===null||event.recurrence<=1)return false
 if(!event.approvedAt||!startAt||!Number.isFinite(Date.parse(startAt))||Date.parse(event.approvedAt)<Date.parse(startAt))return false
 return planIds.includes(event.planId)
}
export function matchesSubscriber(apiRow,event) {
 return Boolean(apiRow&&
  String(apiRow.subscriber_code||'')===event.subscriberCode &&
  Number(apiRow.product?.id)===event.productId &&
  (!event.planId||Number(apiRow.plan?.id)===event.planId) &&
  Number(apiRow.plan?.recurrency_period)===30 &&
  email(apiRow.subscriber?.email))
}
export function subscriberEmailFromApi(apiRow,event) {
 return matchesSubscriber(apiRow,event)?email(apiRow.subscriber.email):null
}
export async function oauthToken(env,fetcher=fetch) {
 const client=env.HOTMART_CLIENT_ID,secret=env.HOTMART_CLIENT_SECRET,basic=env.HOTMART_BASIC_TOKEN
 if(!client||!secret||!basic)return null
 const url=new URL('https://api-sec-vlc.hotmart.com/security/oauth/token')
 url.searchParams.set('grant_type','client_credentials')
 url.searchParams.set('client_id',client)
 url.searchParams.set('client_secret',secret)
 const res=await fetcher(url,{method:'POST',headers:{Authorization:'Basic '+basic},signal:AbortSignal.timeout(8000)})
 if(!res.ok)throw new Error('hotmart_oauth_unavailable')
 const data=await res.json()
 if(typeof data.access_token!=='string'||!data.access_token)throw new Error('hotmart_oauth_invalid')
 return data.access_token
}
// Evidência cruzada: associação do assinante + compra da recorrência na API Hotmart.
// Nunca classificar parcelamento como assinatura. Falha de API deixa pendente.
export async function verifyOfficialPayment(event,env,fetcher=fetch) {
 if(event.type!=='PURCHASE_APPROVED'||!event.transaction||!event.subscriberCode)return null
 const token=await oauthToken(env,fetcher)
 if(!token)return null
 const head={Authorization:'Bearer '+token,Accept:'application/json'}
 const subscriptionUrl=new URL('https://developers.hotmart.com/payments/api/v1/subscriptions')
 subscriptionUrl.searchParams.set('subscriber_code',event.subscriberCode)
 subscriptionUrl.searchParams.set('product_id',String(event.productId))
 subscriptionUrl.searchParams.set('max_results','20')
 const s=await fetcher(subscriptionUrl,{headers:head,signal:AbortSignal.timeout(9000)})
 if(!s.ok)throw new Error('official_subscription_unavailable')
 const sBody=await s.json()
 const subs=(Array.isArray(sBody.items)?sBody.items:[]).filter(row=>matchesSubscriber(row,event))
 if(subs.length!==1)return null
 const subscription=subs[0]
 // API documenta recurrency_period 30 para recorrência mensal.
 if(Number(subscription.plan?.recurrency_period)!==30)return null
 const purchaseUrl=new URL('https://developers.hotmart.com/payments/api/v1/subscriptions/'+encodeURIComponent(event.subscriberCode)+'/purchases')
 const p=await fetcher(purchaseUrl,{headers:head,signal:AbortSignal.timeout(9000)})
 if(!p.ok)throw new Error('official_purchase_unavailable')
 const pBody=await p.json()
 const purchases=Array.isArray(pBody)?pBody:Array.isArray(pBody.items)?pBody.items:[]
 const rows=purchases.filter(item=>String(item.transaction)===event.transaction)
 if(rows.length!==1)return null
 const purchase=rows[0]
 const recurrence=num(purchase.recurrency_number)
 const approvedAt=num(purchase.approved_date)
 if(!['APPROVED','COMPLETE'].includes(purchase.status)||purchase.purchase_subscription!==true||
    purchase.payment_type==='FINANCED_INSTALLMENT'||
    recurrence===null||recurrence<2||!approvedAt||!Number.isFinite(approvedAt)||
    (event.recurrence!==null&&recurrence!==event.recurrence))return null
 return {
  email:subscriberEmailFromApi(subscription,event),
  recurrence,
  approvedAt:new Date(approvedAt).toISOString(),
  planId:Number(subscription.plan.id),
  productUcode:clean(subscription.product?.ucode)
 }
}
