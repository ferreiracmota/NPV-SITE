import test from 'node:test'
import assert from 'node:assert/strict'
import { listSubscriptionPurchases,hotmartDate,verifyOfficialPayment } from './core.mjs'
import { simulateCompetencies,addMonthsClamped } from './competencies.mjs'
import { discoverMissingPayments } from './discovery.mjs'

const TOKEN='fictitious-test-token'
const ENV={HOTMART_CLIENT_ID:'test-only',HOTMART_CLIENT_SECRET:'test-only',
 HOTMART_BASIC_TOKEN:'test-only',HOTMART_ALLOWED_PRODUCT_IDS:'1111111'}
const event={type:'PURCHASE_APPROVED',subscriberCode:'SUB-TEST',
 transaction:'HP-TEST',productId:1111111,planId:20,recurrence:2}
const q=(rest={})=>simulateCompetencies({
 productId:1111111,subscriberCode:'SUB-TEST',transactionId:'HP-TEST',
 recurrence:2,periodDays:90,paymentStatus:'APPROVED',subscriptionPayment:true,
 installment:false,paidAt:'2026-10-31T12:00:00Z',
 baselineAt:'2026-10-01T00:00:00Z',startsAt:'2026-10-01T00:00:00Z',
 at:'2026-10-31T12:00:00Z',rulePoints:400,...rest
})
function paged(){
 let cursor=null, calls=0
 const fetcher=async url=>{
  calls++
  const next=new URL(url).searchParams.get('page_token')
  if(next==='page-2')return {ok:true,json:async()=>({
    items:[{transaction:'HP-TEST',approved_date:1793448000,recurrency_number:2,
      status:'APPROVED',purchase_subscription:true}],
    page_info:{next_page_token:null}
  })}
  return {ok:true,json:async()=>({
    items:[{transaction:'HP-OLD',status:'APPROVED'}],
    page_info:{next_page_token:'page-2'}
  })}
 }
 return {fetcher,calls:()=>calls}
}
test('paginação das compras percorre todas as páginas e não omite pagamento elegível',async()=>{
 const f=paged()
 const res=await listSubscriptionPurchases('SUB-TEST',TOKEN,f.fetcher)
 assert.equal(res.length,2)
 assert.equal(res[1].transaction,'HP-TEST')
 assert.equal(f.calls(),2)
})
test('paginação repetida falha fechada em vez de entrar em loop',async()=>{
 const get=async()=>({ok:true,json:async()=>({items:[],page_info:{next_page_token:'A'}})})
 await assert.rejects(()=>listSubscriptionPurchases('SUB-TEST',TOKEN,get),/purchase_page_cycle/)
})
test('página incompleta falha fechada, sem atestar uma compra omitida',async()=>{
 let count=0
 const get=async()=>({ok:true,json:async()=>({items:[],page_info:{next_page_token:'page-'+(++count)}})})
 await assert.rejects(()=>listSubscriptionPurchases('SUB-TEST',TOKEN,get,{maxPages:2}),/purchase_pages_incomplete/)
})
test('429 em qualquer página falha e permite tentar mais tarde',async()=>{
 const get=async()=>({ok:false,status:429})
 await assert.rejects(()=>listSubscriptionPurchases('SUB-TEST',TOKEN,get),/official_purchase_unavailable_429/)
})
test('datas Hotmart em segundos e milissegundos são equivalentes',()=>{
 assert.equal(hotmartDate(1793448000),hotmartDate(1793448000000))
 assert.equal(hotmartDate('INVALID'),null)
})
test('trimestral confirmado por assinatura e compra oficial, nunca cobrança prevista',async()=>{
 const get=async url=>{
  const u=String(url)
  let body
  if(u.includes('oauth/token'))body={access_token:TOKEN}
  else if(u.endsWith('/purchases'))body=[{transaction:'HP-TEST',approved_date:1793448000000,
   recurrency_number:2,status:'APPROVED',purchase_subscription:true}]
  else body={items:[{subscriber_code:'SUB-TEST',
   product:{id:1111111,ucode:'TEST-ONLY'},plan:{id:20,recurrency_period:90},
   subscriber:{email:'aluno@example.invalid'},date_next_charge:1999999999999}]}
  return {ok:true,json:async()=>body}
 }
 const receipt=await verifyOfficialPayment(event,ENV,get)
 assert.equal(receipt.periodDays,90)
 assert.equal(receipt.recurrence,2)
 assert.equal(receipt.approvedAt,'2026-10-31T12:00:00.000Z')
})
test('fim de mês e transição de ano seguem três competências sem antecipação',()=>{
 assert.equal(addMonthsClamped('2026-12-31T12:00:00Z',1),'2027-01-31T12:00:00.000Z')
 assert.equal(addMonthsClamped('2027-01-31T12:00:00Z',1),'2027-02-28T12:00:00.000Z')
 assert.deepEqual(q().competencies.map(x=>x.dueAt),[
 '2026-10-31T12:00:00.000Z','2026-11-30T12:00:00.000Z','2026-12-31T12:00:00.000Z'])
 assert.equal(q({at:'2026-11-29T11:59:59Z'}).totalDue,400)
 assert.equal(q({at:'2026-11-30T12:00:00Z'}).totalDue,800)
 assert.equal(q({at:'2026-12-31T12:00:00Z'}).totalDue,1200)
})
test('a renovação trimestral seguinte gera outro conjunto de referências únicas',()=>{
 const a=q()
 const b=q({transactionId:'HP-NEXT',paidAt:'2027-01-31T12:00:00Z',at:'2027-01-31T12:00:00Z'})
 assert.equal(new Set([...a.competencies,...b.competencies].map(x=>x.key)).size,6)
 assert.equal(b.totalDue,400)
})
test('valor de cada competência segue regra dinâmica, sem teto global',()=>{
 assert.deepEqual(q({rulePoints:550}).competencies.map(x=>x.points),[550,550,550])
 assert.equal(q({rulePoints:550,at:'2026-12-31T12:00:00Z'}).totalDue,1650)
})
test('bloqueio por inicial, assinante sem baseline, atraso e parcelamento',()=>{
 assert.equal(q({recurrence:1}).eligible,false)
 assert.equal(q({baselineAt:null}).eligible,false)
 assert.equal(q({paymentStatus:'WAITING_PAYMENT'}).eligible,false)
 assert.equal(q({installment:true}).eligible,false)
 assert.equal(q({periodDays:60}).eligible,false)
})
function dbMock(){
 const calls=[],saves=[]
 const product={product_id:1111111,product_ucode:'TEST-ONLY',
  monthly_plan_ids:[10],quarterly_plan_ids:[20],enabled:true}
 const db={
  rpc:async(_name,data)=>{calls.push(data);return {error:null}},
  from(table) {
   if(table==='clube_hotmart_products')return {
    select(){return {eq:async()=>({data:[product],error:null})}}
   }
   if(table==='clube_hotmart_sync_state')return {
    select:async()=>({data:[],error:null}),
    upsert:async value=>{saves.push(value);return {error:null}}
   }
   throw Error('wrong table '+table)
  }
 }
 return {db,calls,saves}
}
test('conciliação trimestral consulta compra, normaliza segundos e registra apenas pagamento',async()=>{
 const d=dbMock()
 const fetcher=async url=>{
  const u=String(url)
  const body=u.includes('oauth/token')?{access_token:TOKEN}:
   u.includes('/purchases')?[{transaction:'HP-TEST',recurrency_number:2,
    approved_date:1793448000,purchase_subscription:true,status:'APPROVED'}]:
   {items:[{subscriber_code:'SUB-TEST',subscriber:{email:'aluno@example.invalid'},
    product:{id:1111111,ucode:'TEST-ONLY'},plan:{id:20,recurrency_period:90}}],page_info:{}}
  return {ok:true,json:async()=>body}
 }
 const result=await discoverMissingPayments(d.db,ENV,'2026-10-01T00:00:00Z',fetcher)
 assert.equal(result.processed,1)
 assert.equal(d.calls[0].p_plan_id,20)
 assert.equal(d.calls[0].p_approved_at,'2026-10-31T12:00:00.000Z')
 assert.equal(d.saves.length,1)
})
test('falha no meio de paginação preserva cursor; retentativa é idempotente',async()=>{
 const d=dbMock()
 let page=0
 const broken=async url=>{
  const u=String(url)
  if(u.includes('oauth/token'))return {ok:true,json:async()=>({access_token:TOKEN})}
  if(u.includes('/purchases'))return {ok:false,status:503}
  page++
  return {ok:true,json:async()=>({
   items:[{subscriber_code:'SUB-TEST',subscriber:{email:'aluno@example.invalid'},
    product:{id:1111111,ucode:'TEST-ONLY'},plan:{id:10,recurrency_period:30}}],
   page_info:{next_page_token:'p-next'}})}
 }
 await assert.rejects(()=>discoverMissingPayments(d.db,ENV,'2026-10-01T00:00:00Z',broken),
  /official_purchase_unavailable_503/)
 assert.equal(d.saves.length,0)
 assert.equal(d.calls.length,0)
})
