// Painel Hotmart NPV: somente leituras, sem webhook, conciliação, RPC ou pontos.
// Adaptado das rotinas de identificação testadas no PR #14.
// Nunca registrar respostas das APIs: elas contêm PII.
const HOTMART_API='https://developers.hotmart.com'
const AUTH_URL='https://api-sec-vlc.hotmart.com/security/oauth/token'
export const PRODUCT_ID=6304828
export const PRODUCT_UCODE='588a8af3-ca54-4745-9420-47e5d45d51e0'
const ALLOWED_NUMERIC_PLAN_IDS=new Map([[1155921,'mensal'],[1155920,'trimestral']])
const MAX_SUBSCRIPTION_PAGES=20
const MAX_SUBSCRIPTIONS=2000
const MAX_PURCHASE_PAGES=15
const CONCURRENCY=5

const str=(value,max=350)=>typeof value==='string'?value.trim().slice(0,max):''
const safeEmail=value=>{
 const s=str(value,320).toLowerCase()
 return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)?s:null
}
export function hotmartDate(value){
 if(value===undefined||value===null||value==='')return null
 const date=typeof value==='string'&&!/^\d+$/.test(value)
   ?new Date(value):new Date(Number(value)<1e11?Number(value)*1000:Number(value))
 return Number.isFinite(date.getTime())?date.toISOString():null
}
export function normalizeSubscription(row){
 if(Number(row?.product?.id)!==PRODUCT_ID)return null
 // O ID é do plano de assinatura efetivamente observado; não usar código do catálogo
 const planId=Number(row?.plan?.id)
 const days=Number(row?.plan?.recurrency_period)
 const plan=ALLOWED_NUMERIC_PLAN_IDS.get(planId)
 if(!plan||days!==(plan==='mensal'?30:90))return null
 const subscriberCode=str(row.subscriber_code,128)
 if(!subscriberCode)return null
 return {
  id:subscriberCode,subscriber_code:subscriberCode,
  subscriber_name:str(row.subscriber?.name||row.subscriber?.full_name||row.buyer?.name,180)||null,
  subscriber_email:safeEmail(row.subscriber?.email),
  product_name:str(row.product?.name,180)||'Não Pense, Vai!',
  product_id:PRODUCT_ID,
  plan,plan_id:planId,plan_label:plan==='mensal'?'Mensal':'Trimestral',
  status:str(row.status,64).toUpperCase()||'UNKNOWN',
  next_charge_at:hotmartDate(row.date_next_charge),
  accession_at:hotmartDate(row.accession_date),
  link_status:'verification_unavailable',
  linked:false,
  last_paid_at:null,last_payment_status:null,
  confirmed_payments:0,refunded_payments:0,chargebacks:0,
  points_status:'not_verified',payment_history_complete:false
 }
}
export function summarizePayments(rawRows){
 let confirmed=0,refunded=0,chargebacks=0,lastPaidAt=null,lastStatus=null
 for(const item of rawRows){
  const status=str(item?.status,60).toUpperCase()
  if(status==='REFUNDED')refunded++
  if(status==='CHARGEBACK')chargebacks++
  // A Hotmart usa COMPLETE e APPROVED. Compra paga NÃO significa renovação elegível.
  if(status!=='COMPLETE'&&status!=='APPROVED')continue
  const paidAt=hotmartDate(item.approved_date)
  if(!paidAt)continue
  confirmed++
  if(!lastPaidAt||paidAt>lastPaidAt){lastPaidAt=paidAt;lastStatus=status}
 }
 return {confirmed_payments:confirmed,refunded_payments:refunded,
  chargebacks,last_paid_at:lastPaidAt,last_payment_status:lastStatus,
  points_status:'not_verified'}
}
// Auditoria de competências pagas por ASSINATURA, sem conceder pontos.
// Uma cobrança paga pode ser a primeira compra ou uma tentativa repetida.
// Sem número de recorrência em TODOS os pagamentos aprovados, não estimar meses.
export function auditPaidRecurrences(rawRows,plan){
 const paidStatuses=new Set(['APPROVED','COMPLETE'])
 const reversedStatuses=new Set(['REFUNDED','CHARGEBACK','PARTIALLY_REFUNDED'])
 const successful=rawRows.filter(row=>paidStatuses.has(str(row?.status,60).toUpperCase())&&hotmartDate(row.approved_date))
 const recurrenceNumber=row=>{
  const n=Number(row?.recurrency_number)
  return Number.isSafeInteger(n)&&n>=1&&n<=10000?n:null
 }
 const byNumber=new Map(),ambiguous=new Set()
 let complete=successful.length>0
 for(const row of rawRows){
  const state=str(row?.status,60).toUpperCase()
  const num=recurrenceNumber(row)
  if((paidStatuses.has(state)&&hotmartDate(row.approved_date))||reversedStatuses.has(state)){
   if(num===null){complete=false;continue}
   const entry=byNumber.get(num)||{paid:new Set(),reversed:false}
   if(reversedStatuses.has(state))entry.reversed=true
   else{
    const transaction=str(row?.transaction,128)
    if(!transaction)complete=false
    else entry.paid.add(transaction)
   }
   byNumber.set(num,entry)
  }
 }
 const paidNumbers=[]
 for(const [num,entry] of byNumber){
  if(entry.paid.size>1)ambiguous.add(num)
  if(!entry.reversed&&entry.paid.size===1)paidNumbers.push(num)
 }
 if(ambiguous.size)complete=false
 if(!complete)return {
  paid_recurrences:null,paid_months:null,renewal_cycles:null,
  recurring_audit:'not_verified'
 }
 const cycleMonths=plan==='trimestral'?3:plan==='mensal'?1:null
 if(!cycleMonths)return {paid_recurrences:null,paid_months:null,renewal_cycles:null,recurring_audit:'not_verified'}
 return {
  paid_recurrences:paidNumbers.length,
  // Trimestral: meses cobertos financeiramente, não pontos liberados hoje.
  paid_months:paidNumbers.length*cycleMonths,
  // A primeira compra (recorrência 1) nunca é contada como renovação.
  renewal_cycles:paidNumbers.filter(n=>n>1).length,
  recurring_audit:'payment_recurrences_identified'
 }
}

function safeNetworkError(response){
 // Não incluir URL, cabeçalhos ou corpo da Hotmart: podem conter credenciais ou PII.
 if(response.status===429)return new Error('hotmart_rate_limited')
 if(response.status===401||response.status===403)return new Error('hotmart_api_permission_denied')
 return new Error('hotmart_api_unavailable')
}
async function getJson(url,token,fetcher){
 const response=await fetcher(url,{headers:{Authorization:'Bearer '+token,Accept:'application/json'},
  signal:AbortSignal.timeout(12000)})
 if(!response.ok)throw safeNetworkError(response)
 const json=await response.json()
 if(json===null||typeof json!=='object')throw new Error('hotmart_invalid_response')
 return json
}
async function oauth(env,fetcher){
 const url=new URL(AUTH_URL)
 url.searchParams.set('grant_type','client_credentials')
 url.searchParams.set('client_id',env.HOTMART_CLIENT_ID)
 url.searchParams.set('client_secret',env.HOTMART_CLIENT_SECRET)
 const response=await fetcher(url,{method:'POST',headers:{Authorization:'Basic '+env.HOTMART_BASIC_TOKEN},
  signal:AbortSignal.timeout(12000)})
 if(!response.ok)throw new Error('hotmart_oauth_unavailable')
 const d=await response.json()
 if(typeof d?.access_token!=='string'||!d.access_token)throw new Error('hotmart_oauth_invalid')
 return d.access_token
}
export async function pageAll(url,token,fetcher=fetch,{maxPages=MAX_SUBSCRIPTION_PAGES,pageSize=20}={}){
 const seen=new Set(),items=[]
 let cursor=null
 for(let page=0;page<maxPages;page++){
  const u=new URL(url)
  u.searchParams.set('max_results',String(pageSize))
  if(cursor)u.searchParams.set('page_token',cursor)
  const body=await getJson(u,token,fetcher)
  if(!Array.isArray(body.items))throw new Error('hotmart_page_invalid')
  items.push(...body.items)
  if(items.length>MAX_SUBSCRIPTIONS)throw new Error('hotmart_max_records_exceeded')
  const next=body.page_info?.next_page_token
  if(!next)return items
  if(typeof next!=='string'||seen.has(next))throw new Error('hotmart_pagination_cycle')
  seen.add(next);cursor=next
 }
 throw new Error('hotmart_pagination_incomplete')
}
async function purchases(subscriberCode,token,fetcher){
 const url=HOTMART_API+'/payments/api/v1/subscriptions/'+encodeURIComponent(subscriberCode)+'/purchases'
 // A API oficial pode devolver array simples; resposta paginada também é suportada.
 let response=await getJson(url,token,fetcher)
 if(Array.isArray(response))return response
 if(!Array.isArray(response.items))throw new Error('hotmart_purchase_shape_unknown')
 const rows=[...response.items],seen=new Set()
 let next=response.page_info?.next_page_token
 for(let page=1;next&&page<MAX_PURCHASE_PAGES;page++){
  if(typeof next!=='string'||seen.has(next))throw new Error('hotmart_purchase_pagination_cycle')
  seen.add(next)
  const u=new URL(url);u.searchParams.set('page_token',next)
  response=await getJson(u,token,fetcher)
  if(!Array.isArray(response.items))throw new Error('hotmart_purchase_shape_unknown')
  rows.push(...response.items)
  next=response.page_info?.next_page_token
 }
 if(next)throw new Error('hotmart_purchase_pagination_incomplete')
 return rows
}
async function mapLimited(items,mapper,limit=CONCURRENCY){
 const result=new Array(items.length)
 let index=0
 async function worker(){
  while(index<items.length){
   const at=index++
   result[at]=await mapper(items[at],at)
  }
 }
 await Promise.all(Array.from({length:Math.min(items.length,limit)},worker))
 return result
}
export async function resolveVerifiedLinks(subscriptions,{env,createClientFn,adminClient}){
 if(!env.SUPABASE_SERVICE_ROLE_KEY)return {complete:false,reason:'identity_verification_not_configured'}
 const svc=createClientFn(env.VITE_CLUBE_SUPABASE_URL||env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}})
 // Um snapshot parcial de perfis jamais permite declarar "sem vínculo".
 const profiles=[]
 for(let page=0;page<10;page++){
  const {data,error}=await svc.from('clube_profiles')
   .select('id,email,approved').range(page*500,page*500+499)
  if(error)throw new Error('clube_profile_read_failed')
  profiles.push(...(data||[]))
  if((data||[]).length<500)break
  if(page===9)throw new Error('clube_profiles_incomplete')
 }
 const byEmail=new Map()
 for(const profile of profiles){
  const email=safeEmail(profile.email)
  if(!email)continue
  byEmail.set(email,[...(byEmail.get(email)||[]),profile])
 }
 const confirmed=new Map()
 for(const record of subscriptions){
  const email=record.subscriber_email
  const matched=email?byEmail.get(email)||[]:[]
  if(matched.length===0){record.link_status=email?'pending_no_clube_profile':'pending_missing_email';continue}
  if(matched.length>1){record.link_status='conflict_multiple_profiles';continue}
  const profile=matched[0]
  if(!profile.approved){record.link_status='pending_clube_approval';continue}
  if(!confirmed.has(profile.id)){
   const {data,error}=await svc.auth.admin.getUserById(profile.id)
   if(error)throw new Error('clube_auth_verification_failed')
   confirmed.set(profile.id,data?.user||null)
  }
  const user=confirmed.get(profile.id)
  if(!user||safeEmail(user.email)!==email){record.link_status='conflict_auth_email';continue}
  if(!user.email_confirmed_at&&!user.confirmed_at){
   record.link_status='pending_email_confirmation';continue
  }
  record.link_status='linked';record.linked=true
 }
 return {complete:true}
}
export function buildMetrics(subscriptions,{identityComplete}){
 const counts={ACTIVE:0,DELAYED:0,CANCELLED_BY_ADMIN:0,CANCELLED_BY_CUSTOMER:0,INACTIVE:0,OTHER:0}
 for(const s of subscriptions){if(Object.hasOwn(counts,s.status))counts[s.status]++;else counts.OTHER++}
 return {
  active:counts.ACTIVE,
  linked:identityComplete?subscriptions.filter(s=>s.linked).length:null,
  pending:identityComplete?subscriptions.filter(s=>s.status==='ACTIVE'&&!s.linked).length:null,
  renewed:null,
  total:subscriptions.length,
  statuses:counts
 }
}
export async function readLiveSnapshot(env,{fetcher=fetch,createClientFn,adminClient}={}){
 if(env.HOTMART_ALLOWED_PRODUCT_IDS!=='6304828')throw new Error('hotmart_product_allowlist_missing')
 if(!env.HOTMART_CLIENT_ID||!env.HOTMART_CLIENT_SECRET||!env.HOTMART_BASIC_TOKEN)
  throw new Error('hotmart_credentials_missing')
 const token=await oauth(env,fetcher)
 // O filtro date_next_charge não deve ser usado: na auditoria ele omitiu históricos.
 const url=HOTMART_API+'/payments/api/v1/subscriptions?product_id=6304828&accession_date=1'
 const source=await pageAll(url,token,fetcher)
 const rows=source.map(normalizeSubscription).filter(Boolean)
 if(rows.length!==source.length)throw new Error('hotmart_unknown_subscription_or_plan')
 const unique=new Set(rows.map(x=>x.id))
 if(unique.size!==rows.length)throw new Error('hotmart_duplicate_subscriptions')
 rows.sort((a,b)=>Number(b.status==='ACTIVE')-Number(a.status==='ACTIVE')
   ||(b.accession_at||'').localeCompare(a.accession_at||''))
 // Qualquer falha de página/assinante impede considerar a sincronização completa.
 const summaries=await mapLimited(rows,async row=>{
  const history=await purchases(row.subscriber_code,token,fetcher)
  return {...summarizePayments(history),...auditPaidRecurrences(history,row.plan)}
 })
 rows.forEach((row,i)=>Object.assign(row,summaries[i],{payment_history_complete:true}))
 let identity={complete:false,reason:'identity_verification_not_configured'}
 if(createClientFn){
  identity=await resolveVerifiedLinks(rows,{env,createClientFn,adminClient})
 }
 return {
  status:'synced',synced_at:new Date().toISOString(),source:'hotmart_official',
  metrics:buildMetrics(rows,{identityComplete:identity.complete}),
  identity_complete:identity.complete,
  identity_notice:identity.complete?null:identity.reason,
  subscriptions:rows,
  renewed_verification:'pending',
  complete:true
 }
}
