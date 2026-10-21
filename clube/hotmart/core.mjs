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
  [30,90].includes(Number(apiRow.plan?.recurrency_period)) &&
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
// A API de compras retorna array; tolera páginas caso Hotmart amplie o formato.
// Jamais dá crédito após lista truncada, token repetido ou falha 429/5xx.
export function hotmartDate(value) {
 const n=Number(value)
 if(!Number.isFinite(n)||n<=0)return null
 const milliseconds=n<1e11?n*1000:n
 const date=new Date(milliseconds)
 return Number.isFinite(date.getTime())?date.toISOString():null
}
export async function listSubscriptionPurchases(subscriberCode,token,fetcher=fetch,{maxPages=8}={}) {
 if(!subscriberCode||!token)throw new Error('purchase_credentials_missing')
 const base='https://developers.hotmart.com/payments/api/v1/subscriptions/'+encodeURIComponent(subscriberCode)+'/purchases'
 let next=null
 const rows=[],seen=new Set()
 for(let page=0;page<maxPages;page++){
  const url=new URL(base)
  if(next)url.searchParams.set('page_token',next)
  const response=await fetcher(url,{headers:{Authorization:'Bearer '+token,Accept:'application/json'},signal:AbortSignal.timeout(9000)})
  if(!response.ok)throw new Error('official_purchase_unavailable_'+response.status)
  const payload=await response.json()
  if(Array.isArray(payload))return rows.concat(payload)
  if(!payload||!Array.isArray(payload.items))throw new Error('purchase_response_invalid')
  rows.push(...payload.items)
  const candidate=payload.page_info?.next_page_token
  if(!candidate)return rows
  if(seen.has(candidate))throw new Error('purchase_page_cycle')
  seen.add(candidate);next=candidate
 }
 throw new Error('purchase_pages_incomplete')
}
// Evidência cruzada: identidade do assinante da API + cobrança da MESMA transação.
// Um vencimento previsto ou uma parcela jamais equivalem a pagamento confirmado.
export async function verifyOfficialPayment(event,env,fetcher=fetch) {
 if(event.type!=='PURCHASE_APPROVED'||!event.transaction||!event.subscriberCode)return null
 const token=await oauthToken(env,fetcher)
 if(!token)return null
 const head={Authorization:'Bearer '+token,Accept:'application/json'}
 const url=new URL('https://developers.hotmart.com/payments/api/v1/subscriptions')
 url.searchParams.set('subscriber_code',event.subscriberCode)
 url.searchParams.set('product_id',String(event.productId))
 url.searchParams.set('max_results','20')
 const response=await fetcher(url,{headers:head,signal:AbortSignal.timeout(9000)})
 if(!response.ok)throw new Error('official_subscription_unavailable')
 const body=await response.json()
 const filtered=(Array.isArray(body.items)?body.items:[]).filter(row=>matchesSubscriber(row,event))
 if(filtered.length!==1) return null
 // Listagem parcial não prova que só há uma assinatura coincidente.
 if(body.page_info?.next_page_token)throw new Error('subscription_page_incomplete')
 const subscription=filtered[0]
 const periodDays=Number(subscription.plan?.recurrency_period)
 if(![30,90].includes(periodDays))return null
 const purchases=await listSubscriptionPurchases(event.subscriberCode,token,fetcher)
 const matches=purchases.filter(item=>String(item.transaction)===event.transaction)
 if(matches.length!==1)return null
 const purchase=matches[0]
 const recurrence=Number(purchase.recurrency_number)
 const paidAt=hotmartDate(purchase.approved_date)
 if(!['APPROVED','COMPLETE'].includes(purchase.status)||
  purchase.purchase_subscription!==true||
  purchase.payment_type==='FINANCED_INSTALLMENT'||
  !Number.isSafeInteger(recurrence)||recurrence<=1||!paidAt||
  (event.recurrence!==null&&recurrence!==event.recurrence))return null
 return {
  email:subscriberEmailFromApi(subscription,event),
  recurrence,approvedAt:paidAt,
  periodDays,planId:Number(subscription.plan.id),
  productUcode:clean(subscription.product?.ucode)
 }
}
