// Fase 1: endpoint PRIVADO, sem writes no Supabase, sem concessão de pontos.
// Usar GET /api/hotmart/identify?mode=catalog para obter IDs oficiais,
// depois configurar HOTMART_ALLOWED_PRODUCT_IDS no servidor e usar mode=assinantes.
// Nunca habilitar este endpoint em produção antes de homologar o controle de acesso.
import { createClient } from '@supabase/supabase-js'
import { createHash } from 'node:crypto'
import { isAuthentic,oauthToken } from '../../clube/hotmart/core.mjs'
import { officialGet,fromHotmartDate,readCatalog,readProductPlans,readSubscriptions,readPurchaseHistory,resolveClubeIdentity,
 baselineForFirstSync } from '../../clube/hotmart/identify-core.mjs'

const respond=(res,code,payload)=>res.writeHead(code,{
 'Cache-Control':'no-store','Content-Type':'application/json; charset=utf-8',
 'X-Content-Type-Options':'nosniff'
}).end(JSON.stringify(payload))
const mask=value=>value?value.slice(0,2)+'***@'+value.split('@')[1]:null

// AUDITORIA TRANSITÓRIA: somente Preview SSO, expira em 21/10, não mesclar.
// Não acessa Supabase, não escreve, não revela email/código de assinante.
const auditSaltedHash=(salt,email)=>email?
  createHash('sha256').update(salt+':'+email.trim().toLowerCase()).digest('hex'):null
async function auditPreview(req,res){
 const env=process.env
 if(env.VERCEL_ENV!=='preview' ||
    env.VERCEL_GIT_COMMIT_REF!=='feature/hotmart-renovacoes-seguro-20261020')
  return respond(res,404,{status:'not_found'})
 if(Date.now()>Date.parse('2026-10-21T20:00:00Z'))
  return respond(res,410,{status:'audit_expired'})
 if(!env.HOTMART_CLIENT_ID||!env.HOTMART_CLIENT_SECRET||!env.HOTMART_BASIC_TOKEN)
  return respond(res,503,{status:'missing_hotmart_credentials'})
 try {
  const body=typeof req.body==='object' && req.body!==null?req.body:{}
  const salt=String(body.salt||'')
  const phase=body.phase
  const pageToken=body.pageToken===null||body.pageToken===undefined?'':String(body.pageToken)
  const offset=Number(body.offset||0)
  if(!/^[a-f0-9]{40}$/.test(salt) ||
    (phase!=='subscriptions'&&phase!=='payments') ||
    pageToken.length>512||!Number.isInteger(offset)||offset<0||offset>50)
   return respond(res,400,{status:'invalid_audit_request'})
  const token=await oauthToken(env)
  if(!token)return respond(res,503,{status:'oauth_unavailable'})
  const url=new URL('https://developers.hotmart.com/payments/api/v1/subscriptions')
  url.searchParams.set('product_id','6304828')
  url.searchParams.set('accession_date','1')
  if(body.compareFilter!=='without_date_next_charge')
   url.searchParams.set('date_next_charge','1')
  url.searchParams.set('max_results','20')
  if(pageToken)url.searchParams.set('page_token',pageToken)
  const response=await officialGet(url,token)
  if(!response||!Array.isArray(response.items))
   return respond(res,502,{status:'subscriptions_payload_invalid'})
  const allowed=response.items.filter(x=>Number(x?.product?.id)===6304828 &&
    x?.product?.ucode==='588a8af3-ca54-4745-9420-47e5d45d51e0' &&
    !!x.subscriber_code)
  const details=allowed.map((raw,i)=>({
   index:i,identityHash:auditSaltedHash(salt,raw.subscriber?.email),
   productId:6304828,status:String(raw.status||'UNKNOWN'),
   planId:Number.isSafeInteger(Number(raw.plan?.id))?Number(raw.plan.id):null,
   periodDays:Number.isSafeInteger(Number(raw.plan?.recurrency_period))?Number(raw.plan.recurrency_period):null,
   planName:String(raw.plan?.name||'').slice(0,140),
   nextChargeAt:fromHotmartDate(raw.date_next_charge),
   nextChargeIsOnlyForecast:true
  }))
  const paging={complete:!response.page_info?.next_page_token,
   nextPageToken:response.page_info?.next_page_token||null,
   pageCount:allowed.length,rawPageCount:response.items.length,
   totalResults:Number.isSafeInteger(Number(response.page_info?.total_results))?
     Number(response.page_info.total_results):null}
  if(phase==='subscriptions')return respond(res,200,{status:'read_only',phase,...paging,items:details})
  const sampled=allowed.slice(offset,offset+3)
  const purchaseRows=[]
  for(let i=0;i<sampled.length;i++){
   const s=sampled[i],row=details[offset+i]
   const purchaseUrl='https://developers.hotmart.com/payments/api/v1/subscriptions/'+
     encodeURIComponent(s.subscriber_code)+'/purchases'
   let complete=true,payments=[]
   try{
    const body=await officialGet(purchaseUrl,token)
    if(Array.isArray(body))payments=body
    else if(Array.isArray(body?.items)){
     payments=body.items
     if(body.page_info?.next_page_token)complete=false
    }else complete=false
   }catch{complete=false}
   const stats={total:payments.length,statuses:{},paymentTypes:{},
    approvedDatePresent:0,subscriptionTrue:0,subscriptionFalse:0,subscriptionMissing:0,
    completeOrApprovedWithDate:0,recurrenceOne:0,recurrenceMultiple:0,recurrenceMissing:0,
    approved:0,confirmedRenewals:0,installmentAmbiguous:0,
    initial:0,lastConfirmedPaidAt:null,hasPaymentHistory:complete}
   for(const p of payments){
    const state=String(p.status||'UNKNOWN')
    stats.statuses[state]=(stats.statuses[state]||0)+1
    const paymentType=String(p.payment_type||'MISSING').slice(0,60)
    stats.paymentTypes[paymentType]=(stats.paymentTypes[paymentType]||0)+1
    const paidDate=fromHotmartDate(p.approved_date)
    if(paidDate)stats.approvedDatePresent++
    if(p.purchase_subscription===true)stats.subscriptionTrue++
    else if(p.purchase_subscription===false)stats.subscriptionFalse++
    else stats.subscriptionMissing++
    const rec=Number(p.recurrency_number)
    if(!Number.isSafeInteger(rec)||rec<1)stats.recurrenceMissing++
    else if(rec===1)stats.recurrenceOne++
    else stats.recurrenceMultiple++
    if(['APPROVED','COMPLETE'].includes(state)&&paidDate)stats.completeOrApprovedWithDate++
    const approved=['APPROVED','COMPLETE'].includes(state) &&
      p.purchase_subscription===true && !!fromHotmartDate(p.approved_date)
    if(approved){
     stats.approved++
     const t=fromHotmartDate(p.approved_date)
     if(!stats.lastConfirmedPaidAt||t>stats.lastConfirmedPaidAt)
      stats.lastConfirmedPaidAt=t
     const recurring=Number.isSafeInteger(Number(p.recurrency_number)) &&
       Number(p.recurrency_number)>1
     if(!recurring)stats.initial++
     else if(row.periodDays===30 && p.payment_type!=='FINANCED_INSTALLMENT')
      stats.confirmedRenewals++
     else stats.installmentAmbiguous++
    }
   }
   purchaseRows.push({...row,payments:stats})
  }
  return respond(res,200,{status:'read_only',phase,...paging,
   offset,processed:purchaseRows.length,items:purchaseRows})
 }catch(err){
  const msg=String(err?.message||'')
  const safe=/^(hotmart_read_unavailable_[0-9]{3}|hotmart_oauth_unavailable|hotmart_oauth_invalid)$/.test(msg)
   ?msg:'audit_read_unavailable'
  return respond(res,503,{status:'official_api_failure',reason:safe})
 }
}

export default async function handler(req,res){
 if(req.method==='POST' && new URL(req.url,'https://npv.local').searchParams.get('mode')==='audit-subscriptions-20261021')
  return auditPreview(req,res)
 if(req.method!=='GET')return respond(res,405,{status:'method_not_allowed'})
 const env=process.env
 if(!env.HOTMART_IDENTIFY_SECRET||
    !isAuthentic(req.headers.authorization,'Bearer '+env.HOTMART_IDENTIFY_SECRET))
  return respond(res,401,{status:'unauthorized'})
 if(!env.HOTMART_CLIENT_ID||!env.HOTMART_CLIENT_SECRET||!env.HOTMART_BASIC_TOKEN)
  return respond(res,503,{status:'hotmart_connection_required'})
 const url=new URL(req.url,'https://npv.local')
 const mode=url.searchParams.get('mode')||'catalog'
 try{
  if(mode==='catalog'){
   const result=await readCatalog(env)
   return respond(res,200,{status:'read_only',mode,generatedAt:new Date().toISOString(),...result})
  }
  if(mode==='plans'){
   const ucode=url.searchParams.get('ucode')||''
   if(!/^[a-f0-9-]{36}$/i.test(ucode))return respond(res,400,{status:'invalid_product_ucode'})
   // Não consulta assinantes nem outros produtos: exige que o UCODE exista no catálogo desta conta.
   const catalog=await readCatalog(env)
   const product=catalog.products.find(p=>p.ucode.toLowerCase()===ucode.toLowerCase())
   if(!product)return respond(res,catalog.complete?404:409,{status:catalog.complete?'product_not_found':'catalog_incomplete'})
   const result=await readProductPlans(env,product.ucode)
   return respond(res,200,{status:'read_only',mode,generatedAt:new Date().toISOString(),
    product:{id:product.id,ucode:product.ucode,name:product.name,status:product.status},...result})
  }
  if(mode!=='assinantes')return respond(res,400,{status:'invalid_mode'})
  const ids=String(env.HOTMART_ALLOWED_PRODUCT_IDS||'').split(',')
   .map(s=>Number(s.trim())).filter(n=>Number.isSafeInteger(n)&&n>0)
  if(ids.length===0)return respond(res,409,{status:'approve_product_ids_first'})
  if(!env.SUPABASE_URL||!env.SUPABASE_SERVICE_ROLE_KEY)
   return respond(res,503,{status:'supabase_server_connection_required'})
  const db=createClient(env.SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,
   {auth:{persistSession:false,autoRefreshToken:false}})
  const info=await readSubscriptions(env,ids)
  const observedAt=new Date().toISOString()
  const items=[]
  for(const subscription of info.subscriptions.slice(0,30)){
   let identity={status:'pending_missing_email'}
   if(subscription.subscriberEmail){
    const {data:profiles,error}=await db.from('clube_profiles')
     .select('id,email,approved').ilike('email',subscription.subscriberEmail).limit(3)
    if(error)throw new Error('clube_profiles_read_unavailable')
    const users=[]
    for(const p of profiles||[]){
     const {data,error:userError}=await db.auth.admin.getUserById(p.id)
     if(userError)throw new Error('clube_auth_read_unavailable')
     if(data.user)users.push(data.user)
    }
    identity=resolveClubeIdentity(subscription,profiles||[],users)
   }
   let purchases=[]
   let historyStatus='not_checked'
   try{
    purchases=await readPurchaseHistory(env,subscription.subscriberCode)
    historyStatus='checked'
   }catch{historyStatus='unavailable'}
   const baseline=baselineForFirstSync(subscription,purchases,observedAt)
   items.push({
    subscriberCodeMasked:subscription.subscriberCode.slice(0,2)+'***',
    subscriberEmailMasked:mask(subscription.subscriberEmail),
    productId:subscription.productId,productName:subscription.productName,
    plan:subscription.plan,planId:subscription.planId,status:subscription.status,
    active:subscription.active,nextChargeAt:subscription.nextChargeAt,
    matchedClubeProfile:identity.status==='linked',
    identityStatus:identity.status,
    lastConfirmedPaymentAt:baseline.baselinePaidAt,
    historicalPaymentRead:historyStatus,
    pointsAwarded:0,
    initialSyncOnly:true
   })
  }
  return respond(res,200,{
   status:'read_only',mode,generatedAt:observedAt,
   complete:info.complete&&info.subscriptions.length<=30,
   scannedSubscriptions:info.subscriptions.length,
   activeSubscriptions:info.subscriptions.filter(x=>x.active).length,
   linkedCandidates:items.filter(x=>x.matchedClubeProfile).length,
   pending:items.filter(x=>!x.matchedClubeProfile).length,
   results:items,
   explanation:'Simulação da primeira sincronização; vínculo não persistido e pontos não lançados.'
  })
 }catch{
  return respond(res,503,{status:'official_read_unavailable_or_incomplete'})
 }
}
