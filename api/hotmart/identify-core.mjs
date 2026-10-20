// Leitura Hotmart -> Clube NPV (sem gravação e sem pontos).
// Fonte oficial: GET /products/api/v1/products,
// GET /payments/api/v1/subscriptions e histórico /:subscriber_code/purchases.
import { oauthToken } from './core.mjs'

export function fromHotmartDate(value) {
 if(value===undefined||value===null||value==='')return null
 const n=Number(value)
 if(!Number.isFinite(n)||n<=0)return null
 const millis=n<1e11?n*1000:n
 const parsed=new Date(millis)
 return Number.isFinite(parsed.getTime())?parsed.toISOString():null
}
export const canonicalEmail=value=>typeof value==='string'&&
 value.length<=320&&/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value.trim())?
 value.trim().toLowerCase():null
export function normalizeSubscription(raw,productIds=[]) {
 if(!raw||!raw.subscriber_code||!raw.product?.id||!raw.product?.ucode)return null
 const productId=Number(raw.product.id)
 if(!Number.isSafeInteger(productId)||!productIds.includes(productId))return null
 const planId=Number(raw.plan?.id)
 const period=Number(raw.plan?.recurrency_period)
 if(!Number.isSafeInteger(planId)||![30,90].includes(period))return null
 const email=canonicalEmail(raw.subscriber?.email)
 return {
  subscriberCode:String(raw.subscriber_code),subscriberEmail:email,
  productId,productUcode:String(raw.product.ucode),
  productName:String(raw.product.name||''),
  planId,planName:String(raw.plan?.name||''),periodDays:period,
  plan:period===30?'mensal':'trimestral',
  status:String(raw.status||'UNKNOWN'),
  active:raw.status==='ACTIVE',
  nextChargeAt:fromHotmartDate(raw.date_next_charge),
  joinedAt:fromHotmartDate(raw.accession_date),
  lastTransaction:raw.transaction?String(raw.transaction):null
 }
}
export function resolveClubeIdentity(subscription,profiles,authUsers) {
 if(!subscription?.subscriberEmail)return {status:'pending_missing_email'}
 const matched=(profiles||[]).filter(p=>canonicalEmail(p.email)===subscription.subscriberEmail)
 if(matched.length!==1)return {status:matched.length>1?'conflict_multiple_profiles':'pending_no_clube_profile'}
 const profile=matched[0]
 const auth=(authUsers||[]).find(u=>u.id===profile.id)
 if(!auth||canonicalEmail(auth.email)!==subscription.subscriberEmail)return {status:'pending_auth_mismatch'}
 if(!auth.email_confirmed_at&&!auth.confirmed_at)return {status:'pending_email_confirmation'}
 if(!profile.approved)return {status:'pending_clube_approval'}
 return {status:'linked',studentId:profile.id}
}
export function normalizePurchases(rows){
 return (Array.isArray(rows)?rows:[]).filter(x=>x&&x.transaction)
 .map(x=>({
  transaction:String(x.transaction),
  status:String(x.status||'UNKNOWN'),
  paidAt:fromHotmartDate(x.approved_date),
  recurrence:Number.isSafeInteger(Number(x.recurrency_number))?Number(x.recurrency_number):null,
  isSubscription:x.purchase_subscription===true,
  paymentType:String(x.payment_type||'')
 }))
}
export function lastConfirmedPayment(purchases) {
 return normalizePurchases(purchases)
 .filter(x=>['APPROVED','COMPLETE'].includes(x.status)&&x.isSubscription&&x.paidAt)
 .sort((a,b)=>Date.parse(b.paidAt)-Date.parse(a.paidAt))[0]||null
}
export function baselineForFirstSync(subscription,purchases,at) {
 const last=lastConfirmedPayment(purchases)
 return {subscriberCode:subscription.subscriberCode,
   firstSeenAt:at,baselineTransaction:last?.transaction||null,
   baselinePaidAt:last?.paidAt||null,
   nextChargeAt:subscription.nextChargeAt,
   grantEnabled:false}
}
export async function officialGet(url,token,fetcher=fetch){
 const result=await fetcher(url,{headers:{Authorization:'Bearer '+token,Accept:'application/json'},
  signal:AbortSignal.timeout(10000)})
 if(!result.ok)throw new Error('hotmart_read_unavailable_'+result.status)
 return result.json()
}
export async function readPages({baseUrl,token,pageLimit=3,pageSize=20,fetcher=fetch}){
 const items=[]
 let pageToken=null
 let complete=false
 for(let n=0;n<pageLimit;n++){
  const url=new URL(baseUrl)
  url.searchParams.set('max_results',String(pageSize))
  if(pageToken)url.searchParams.set('page_token',pageToken)
  const body=await officialGet(url,token,fetcher)
  if(!Array.isArray(body.items))throw new Error('invalid_hotmart_page')
  items.push(...body.items)
  const next=body.page_info?.next_page_token||null
  if(!next){complete=true;break}
  if(next===pageToken)throw new Error('repeated_hotmart_page_token')
  pageToken=next
 }
 return {items,complete,nextPageToken:complete?null:pageToken}
}
export async function readCatalog(env,fetcher=fetch){
 const token=await oauthToken(env,fetcher)
 if(!token)throw new Error('hotmart_credentials_missing')
 const found=await readPages({baseUrl:'https://developers.hotmart.com/products/api/v1/products',
  token,pageLimit:3,pageSize:50,fetcher})
 return {
  products:found.items.filter(x=>x.is_subscription===true)
   .map(x=>({id:Number(x.id),name:String(x.name||''),
    ucode:String(x.ucode||''),status:String(x.status||'')})),
  complete:found.complete,hasMore:!found.complete
 }
}
export async function readSubscriptions(env,authorizedIds,fetcher=fetch){
 if(!Array.isArray(authorizedIds)||!authorizedIds.length)throw new Error('authorized_products_required')
 const token=await oauthToken(env,fetcher)
 if(!token)throw new Error('hotmart_credentials_missing')
 const result=[]
 let complete=true
 for(const id of authorizedIds){
  const url=new URL('https://developers.hotmart.com/payments/api/v1/subscriptions')
  url.searchParams.set('product_id',String(id))
  url.searchParams.set('accession_date','1') // sem janela padrão de apenas 30 dias
  const page=await readPages({baseUrl:url,token,pageLimit:3,pageSize:20,fetcher})
  complete&&=page.complete
  for(const raw of page.items){
   const row=normalizeSubscription(raw,authorizedIds)
   if(row)result.push(row)
  }
 }
 return {subscriptions:result,complete}
}
export async function readPurchaseHistory(env,subscriberCode,fetcher=fetch){
 const token=await oauthToken(env,fetcher)
 if(!token)throw new Error('hotmart_credentials_missing')
 const url='https://developers.hotmart.com/payments/api/v1/subscriptions/'+
  encodeURIComponent(subscriberCode)+'/purchases'
 const body=await officialGet(url,token,fetcher)
 return normalizePurchases(Array.isArray(body)?body:body.items)
}
