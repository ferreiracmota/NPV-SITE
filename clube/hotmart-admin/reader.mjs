// Leitura oficial Hotmart para administração do Clube NPV.
// APENAS GET e memória efêmera no servidor. Sem banco de pagamentos, cron ou pontos.
// Não registrar corpo HTTP, cabeçalhos, tokens, emails nem assinantes em logs.
export const PRODUCT={id:6304828,ucode:'588a8af3-ca54-4745-9420-47e5d45d51e0'}
export const PLAN_IDS={1155921:'mensal',1155920:'trimestral'}
export const SUBSCRIPTION_STATUS=['ACTIVE','DELAYED','INACTIVE','CANCELLED_BY_ADMIN','CANCELLED_BY_CUSTOMER']
const PAYMENT_GOOD=new Set(['APPROVED','COMPLETE'])
// Cache efêmero do token OAuth apenas na função serverless. Nunca persistir em storage.
let oauthCache=null
const safeText=(x,max=240)=>typeof x==='string'?x.slice(0,max):''
export const canonicalEmail=v=>typeof v==='string'&&v.trim().length<=320&&
 /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())?v.trim().toLowerCase():null
export function hotmartDate(value){
 if(value===null||value===undefined||value==='')return null
 let time
 if(typeof value==='string'&&Number.isNaN(Number(value)))time=Date.parse(value)
 else{const n=Number(value);time=n<1e11?n*1000:n}
 if(!Number.isFinite(time)||time<=0)return null
 const d=new Date(time)
 return Number.isFinite(d.getTime())?d.toISOString():null
}
async function jsonRequest(url,token,fetcher,method='GET'){
 const options={method,headers:{Authorization:method==='POST'?'Basic '+token:'Bearer '+token,Accept:'application/json'},signal:AbortSignal.timeout(12000)}
 let response
 try{response=await fetcher(url,options)}
 catch{throw new Error('hotmart_transport_unavailable')}
 if(!response?.ok){if(response?.status===401)oauthCache=null;throw new Error('hotmart_http_'+String(response?.status||'unknown'))}
 try{return await response.json()}catch{throw new Error('hotmart_payload_invalid')}
}
export async function hotmartToken(env,fetcher=fetch){
 if(fetcher===fetch&&oauthCache?.clientId===env.HOTMART_CLIENT_ID&&oauthCache.expires>Date.now())
  return oauthCache.token
 if(!env.HOTMART_CLIENT_ID||!env.HOTMART_CLIENT_SECRET||!env.HOTMART_BASIC_TOKEN)
  throw new Error('hotmart_not_configured')
 const u=new URL('https://api-sec-vlc.hotmart.com/security/oauth/token')
 u.searchParams.set('grant_type','client_credentials')
 u.searchParams.set('client_id',env.HOTMART_CLIENT_ID)
 u.searchParams.set('client_secret',env.HOTMART_CLIENT_SECRET)
 const body=await jsonRequest(u,env.HOTMART_BASIC_TOKEN,fetcher,'POST')
 if(typeof body.access_token!=='string'||!body.access_token)throw new Error('hotmart_oauth_invalid')
 if(fetcher===fetch)oauthCache={clientId:env.HOTMART_CLIENT_ID,token:body.access_token,
  expires:Date.now()+Math.min(180000,Math.max(30000,Number(body.expires_in||180)*1000-30000))}
 return body.access_token
}
export async function pages(url,token,fetcher=fetch,{limit=12,perPage=50}={}){
 const all=[],seen=new Set()
 let page=null
 for(let n=0;n<limit;n++){
  const next=new URL(url)
  next.searchParams.set('max_results',String(perPage))
  if(page)next.searchParams.set('page_token',page)
  const result=await jsonRequest(next,token,fetcher)
  if(!Array.isArray(result?.items))throw new Error('hotmart_page_invalid')
  all.push(...result.items)
  const cursor=result.page_info?.next_page_token
  if(!cursor)return all
  if(typeof cursor!=='string'||seen.has(cursor))throw new Error('hotmart_page_repeated')
  seen.add(cursor);page=cursor
 }
 throw new Error('hotmart_pages_incomplete')
}
export function normalizeSubscriber(row){
 if(!row||Number(row.product?.id)!==PRODUCT.id||
  String(row.product?.ucode||'').toLowerCase()!==PRODUCT.ucode||
  !row.subscriber_code)return null
 const id=Number(row.plan?.id)
 const period=Number(row.plan?.recurrency_period)
 const expected=PLAN_IDS[id]
 // O plano atual pode mudar; este rótulo nunca decide elegibilidade retroativa.
 const plan=expected&&((expected==='mensal'&&period===30)||(expected==='trimestral'&&period===90))?expected:'desconhecido'
 return {
  id:safeText(String(row.subscriber_code),160),
  subscriber_code:safeText(String(row.subscriber_code),160),
  subscriber_name:safeText(row.subscriber?.name||row.buyer?.name,160),
  subscriber_email:canonicalEmail(row.subscriber?.email),
  product_id:PRODUCT.id,product_name:safeText(row.product?.name,220),
  plan,plan_id:Number.isSafeInteger(id)?id:null,plan_label:plan==='mensal'?'Mensal':plan==='trimestral'?'Trimestral':'Plano não verificado',
  status:SUBSCRIPTION_STATUS.includes(row.status)?row.status:'UNKNOWN',
  next_charge_at:hotmartDate(row.date_next_charge),
  joined_at:hotmartDate(row.accession_date),
  link_status:'not_verified',
  last_paid_at:null,payment_status:'not_checked',
  renewal_status:'not_verified',points:null
 }
}
export function sortedSubscriptions(rows){
 const seen=new Set(),out=[]
 for(const row of rows){
  const x=normalizeSubscriber(row)
  if(!x)continue
  if(seen.has(x.id))throw new Error('duplicate_subscriber_code')
  seen.add(x.id);out.push(x)
 }
 return out.sort((a,b)=>(
  (a.status==='ACTIVE'?0:1)-(b.status==='ACTIVE'?0:1)||
  (a.subscriber_name||a.subscriber_email||a.id).localeCompare(b.subscriber_name||b.subscriber_email||b.id,'pt-BR')
 ))
}
export async function subscriptionSnapshot(env,fetcher=fetch){
 const token=await hotmartToken(env,fetcher)
 const url=new URL('https://developers.hotmart.com/payments/api/v1/subscriptions')
 url.searchParams.set('product_id',String(PRODUCT.id))
 // Validado na auditoria real: filtrar date_next_charge omite assinaturas históricas.
 url.searchParams.set('accession_date','1')
 const rows=await pages(url,token,fetcher)
 const subscriptions=sortedSubscriptions(rows)
 return {subscriptions,synced_at:new Date().toISOString(),complete:true}
}
export function paymentOverview(body){
 const entries=Array.isArray(body)?body:Array.isArray(body?.items)?body.items:null
 if(!entries)throw new Error('hotmart_purchase_payload_invalid')
 const statuses={}
 let last=null,confirmed=0
 const history=entries.map(p=>{
  const status=safeText(p.status,48)||'UNKNOWN',date=hotmartDate(p.approved_date)
  statuses[status]=(statuses[status]||0)+1
  const paid=PAYMENT_GOOD.has(status)&&!!date
  if(paid){confirmed++;if(!last||date>last)last=date}
  return {status,approved_at:paid?date:null,transaction:safeText(String(p.transaction||''),120),
   payment_type:safeText(p.payment_type,60),recurrence_number:Number.isSafeInteger(Number(p.recurrency_number))?Number(p.recurrency_number):null}
 })
 return {last_paid_at:last,confirmed_payments:confirmed,payment_status:confirmed?'confirmed':'no_confirmed_payment',
  // Não deduzir renovação quando a API não diferencia parcela de mensalidade.
  renewal_status:'not_verified',history,history_complete:true,by_status:statuses}
}
export async function subscriberPayments(env,subscriberCode,fetcher=fetch){
 const token=await hotmartToken(env,fetcher)
 if(!subscriberCode||!/^[\w-]{2,160}$/.test(subscriberCode))throw new Error('invalid_subscriber')
 const base='https://developers.hotmart.com/payments/api/v1/subscriptions/'+encodeURIComponent(subscriberCode)+'/purchases'
 const body=await jsonRequest(base,token,fetcher)
 // A API de histórico retorna array na versão atual: preservar essa diferença
 // em vez de tratar parcela como nova assinatura.
 if(Array.isArray(body))return paymentOverview(body)
 if(Array.isArray(body?.items)&&!body?.page_info?.next_page_token)return paymentOverview(body)
 // Paginação inesperada deve falhar fechada até leitura completa.
 if(Array.isArray(body?.items)){
   const token2=await hotmartToken(env,fetcher)
   return paymentOverview(await pages(base,token2,fetcher,{limit:15,perPage:50}))
 }
 throw new Error('hotmart_purchase_payload_invalid')
}
export function matchIdentity(rows,profiles,authUsers){
 const candidates=new Map()
 for(const p of profiles||[]){
  const email=canonicalEmail(p.email)
  if(!email)continue
  if(!candidates.has(email))candidates.set(email,[])
  candidates.get(email).push(p)
 }
 const authMap=new Map((authUsers||[]).map(x=>[x.id,x]))
 return rows.map(row=>{
  const email=row.subscriber_email
  const matches=email?(candidates.get(email)||[]):[]
  let link_status
  if(!email)link_status='missing_email'
  else if(matches.length>1)link_status='conflict'
  else if(!matches.length)link_status='not_linked'
  else{
   const profile=matches[0],account=authMap.get(profile.id)
   if(!account||canonicalEmail(account.email)!==email)link_status='identity_mismatch'
   else if(!account.email_confirmed_at&&!account.confirmed_at)link_status='email_unconfirmed'
   else if(!profile.approved)link_status='awaiting_approval'
   else link_status='linked'
  }
  return {...row,link_status}
 })
}
export function metricsFor(rows,{identityVerified=false}={}){
 const active=rows.filter(x=>x.status==='ACTIVE')
 return {active:active.length,linked:identityVerified?rows.filter(x=>x.link_status==='linked').length:null,
  pending:identityVerified?active.filter(x=>x.link_status!=='linked').length:null,
  renewed:null,historical:rows.length,status_counts:Object.fromEntries(
    SUBSCRIPTION_STATUS.map(key=>[key,rows.filter(row=>row.status===key).length]))}
}
