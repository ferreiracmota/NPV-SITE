import test from 'node:test'
import assert from 'node:assert/strict'
import {
 fromHotmartDate,normalizeSubscription,resolveClubeIdentity,
 baselineForFirstSync,readCatalog,readSubscriptions,readPurchaseHistory
} from './identify-core.mjs'
import {simulateCompetencies,addMonthsClamped} from './competencies.mjs'
const env={HOTMART_CLIENT_ID:'test',HOTMART_CLIENT_SECRET:'secret',HOTMART_BASIC_TOKEN:'basic'}
const paid=Date.parse('2026-11-20T12:00:00Z')
const product={id:2222222,ucode:'npv-produto-confirmado',name:'Não Pense, Vai!'}
const sub=(period=30)=>({
 subscriber_code:'SUB-VALID',subscriber:{email:'aluno@teste.com'},
 product,plan:{id:period===30?10:20,name:'Plano',recurrency_period:period},
 status:'ACTIVE',date_next_charge:Date.parse('2026-12-20T12:00:00Z'),
 accession_date:Date.parse('2025-10-20T12:00:00Z')
})
const fn=(payload)=>async url=>({ok:true,json:async()=>
 String(url).includes('/security/oauth/token')?{access_token:'fake'}:
 String(url).includes('/products/api/v1/products')?payload.catalog:
 String(url).includes('/purchases')?payload.purchases:payload.subscriptions
})
const examples=()=>({
 catalog:{items:[{...product,is_subscription:true,status:'ACTIVE'},
 {id:888,is_subscription:false,name:'Outro produto'}],page_info:{}},
 subscriptions:{items:[sub(30),sub(90)],page_info:{}},
 purchases:[{transaction:'HP-LAST',recurrency_number:3,approved_date:paid,
  purchase_subscription:true,status:'APPROVED'}]
})
const calc=overrides=>simulateCompetencies({
 productId:2222222,subscriberCode:'SUB-VALID',transactionId:'HP-NEW',
 recurrence:4,periodDays:90,paymentStatus:'APPROVED',
 subscriptionPayment:true,installment:false,
 paidAt:'2026-11-20T12:00:00Z',baselineAt:'2026-10-20T12:00:00Z',
 startsAt:'2026-10-21T00:00:00Z',at:'2026-11-21T00:00:00Z',
 rulePoints:400,...overrides
})
test('1 catálogo oficial identifica IDs sem presumir nomes ou permitir outros produtos',async()=>{
 const d=await readCatalog(env,fn(examples()))
 assert.deepEqual(d.products.map(p=>p.id),[2222222])
 assert.equal(d.complete,true)
})
test('2 assinatura ativa mensal ou trimestral sem confundir próxima cobrança com pagamento',async()=>{
 const d=await readSubscriptions(env,[2222222],fn(examples()))
 assert.equal(d.subscriptions.length,2)
 assert.equal(d.subscriptions[0].plan,'mensal')
 assert.equal(d.subscriptions[1].plan,'trimestral')
 assert.equal(d.subscriptions[0].nextChargeAt,'2026-12-20T12:00:00.000Z')
 assert.equal(d.subscriptions[0].active,true)
})
test('3 identifica assinante com perfil aprovado e email Auth confirmado',()=>{
 const s=normalizeSubscription(sub(),[2222222])
 const p={id:'npv-user',email:'aluno@teste.com',approved:true}
 assert.deepEqual(resolveClubeIdentity(s,[p],[{id:'npv-user',email:'ALUNO@teste.com',
  email_confirmed_at:'2026-10-20T00:00:00Z'}]),{status:'linked',studentId:'npv-user'})
})
test('4 compra por email de pagador diferente não vincula nem autoriza',()=>{
 const s=normalizeSubscription(sub(),[2222222])
 const p={id:'pagador',email:'pagador@teste.com',approved:true}
 assert.equal(resolveClubeIdentity(s,[p],[]).status,'pending_no_clube_profile')
})
test('5 email pendente, perfil não aprovado e conflito ficam pendentes',()=>{
 const s=normalizeSubscription(sub(),[2222222])
 const p={id:'npv-user',email:'aluno@teste.com',approved:false}
 assert.equal(resolveClubeIdentity(s,[p],[{id:'npv-user',email:p.email,
 email_confirmed_at:'2026-10-20T00:00:00Z'}]).status,'pending_clube_approval')
 p.approved=true
 assert.equal(resolveClubeIdentity(s,[p],[{id:'npv-user',email:p.email}]).status,'pending_email_confirmation')
 assert.equal(resolveClubeIdentity(s,[p,{...p,id:'outro'}],[{id:'npv-user',email:p.email}]).status,'conflict_multiple_profiles')
})
test('6 primeira sincronização captura pagamento-base sem crédito',async()=>{
 const s=normalizeSubscription(sub(),[2222222])
 const history=await readPurchaseHistory(env,s.subscriberCode,fn(examples()))
 const b=baselineForFirstSync(s,history,'2026-12-01T00:00:00Z')
 assert.equal(b.baselineTransaction,'HP-LAST')
 assert.equal(b.baselinePaidAt,'2026-11-20T12:00:00.000Z')
 assert.equal(b.grantEnabled,false)
})
test('7 rejeita produto de terceiros e frequência não autorizada',()=>{
 assert.equal(normalizeSubscription(sub(),[88888]),null)
 assert.equal(normalizeSubscription(sub(180),[2222222]),null)
})
test('8 Hotmart pode retornar timestamp em segundos e milissegundos',()=>{
 assert.equal(fromHotmartDate(1795185600),fromHotmartDate(1795185600000))
})
test('9 renovação trimestral aprovada cria 3 competências de 400',()=>{
 const r=calc()
 assert.equal(r.eligible,true)
 assert.deepEqual(r.competencies.map(c=>c.points),[400,400,400])
 assert.equal(r.totalScheduled,1200)
 assert.equal(r.totalDue,400)
})
test('10 libera a competência no vencimento relativo, não antecipa',()=>{
 assert.equal(calc({at:'2026-12-19T00:00:00Z'}).totalDue,400)
 assert.equal(calc({at:'2026-12-20T12:00:00Z'}).totalDue,800)
 assert.equal(calc({at:'2027-01-20T12:00:00Z'}).totalDue,1200)
})
test('11 mensal paga gera apenas 400 e sem teto global',()=>{
 const r=calc({periodDays:30})
 assert.equal(r.totalScheduled,400)
 assert.equal(r.totalDue,400)
})
test('12 primeira compra e pagamentos anteriores à sincronização não dão pontos',()=>{
 assert.equal(calc({recurrence:1}).totalScheduled,0)
 assert.equal(calc({paidAt:'2026-10-20T11:59:59Z'}).totalScheduled,0)
})
test('13 atraso e pagamento não comprovado não dão pontos',()=>{
 for(const paymentStatus of ['DELAYED','WAITING_PAYMENT','STARTED','REFUNDED'])
  assert.equal(calc({paymentStatus}).eligible,false)
})
test('14 parcelamento, venda avulsa ou frequência desconhecida não dão pontos',()=>{
 assert.equal(calc({installment:true}).eligible,false)
 assert.equal(calc({subscriptionPayment:false}).eligible,false)
 assert.equal(calc({periodDays:60}).eligible,false)
})
test('15 competências têm referências determinísticas por transação e mês',()=>{
 const a=calc(),b=calc()
 assert.deepEqual(a.competencies.map(c=>c.key),b.competencies.map(c=>c.key))
 assert.equal(new Set(a.competencies.map(c=>c.key)).size,3)
 assert.notEqual(a.competencies[0].key,calc({transactionId:'HP-OUTRO'}).competencies[0].key)
})
test('16 datas mensais não ultrapassam fevereiro',()=>{
 assert.equal(addMonthsClamped('2026-01-31T10:00:00Z',1),'2026-02-28T10:00:00.000Z')
 assert.equal(addMonthsClamped('2028-01-31T10:00:00Z',1),'2028-02-29T10:00:00.000Z')
})
