import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
 interpretWebhook,isAuthentic,isEligibleMonthlyRenewal,
 matchesSubscriber,verifyOfficialPayment
} from './core.mjs'
const ROOT=new URL('../migrations/20261020_hotmart_integracao_pendente.sql',import.meta.url)
const SQL=readFileSync(ROOT,'utf8')
const seed=(type='PURCHASE_APPROVED',recurrence=2)=>({
 id:'hotmart-event-12345',version:'2.0.0',event:type,
 data:{product:{id:1234567,ucode:'product-test-ucode'},
  purchase:{transaction:'HP-TEST-0002',recurrence_number:recurrence,approved_date:1760000000000},
  subscription:{subscriber:{code:'SUB-TEST-101'},plan:{id:101}},
  buyer:{email:'pagador@example.com'}}
})
const official=(period=30,status='APPROVED',recurrence=2)=>({
 token:{access_token:'mock-token'},
 subscriptions:{items:[{subscriber_code:'SUB-TEST-101',product:{id:1234567,ucode:'product-test-ucode'},plan:{id:101,recurrency_period:period},subscriber:{email:'aluno@example.com'}}]},
 purchases:[{transaction:'HP-TEST-0002',approved_date:1760000000000,status,recurrency_number:recurrence,purchase_subscription:true}]
})
const transport=(mock)=>async (url,opts)=>{
 const href=String(url)
 const body=href.includes('oauth/token')?mock.token:href.endsWith('/purchases')?mock.purchases:mock.subscriptions
 return {ok:true,json:async()=>body}
}
const ENV={HOTMART_CLIENT_ID:'example-id',HOTMART_CLIENT_SECRET:'example-secret',HOTMART_BASIC_TOKEN:'example-basic'}
test('1 mensalidade aprovada, recorrência comprovada pela API oficial',async()=>{
 const data=interpretWebhook(seed())
 const e=await verifyOfficialPayment(data,ENV,transport(official()))
 assert.equal(e.email,'aluno@example.com')
 assert.equal(e.recurrence,2)
 assert.equal(e.planId,101)
 assert.ok(isEligibleMonthlyRenewal({...data,approvedAt:e.approvedAt},[101],'2025-01-01T00:00:00Z'))
})
test('2 compra inicial não gera bônus de renovação',async()=>{
 const e=interpretWebhook(seed('PURCHASE_APPROVED',1))
 assert.equal(await verifyOfficialPayment(e,ENV,transport(official(30,'APPROVED',1))),null)
 assert.equal(isEligibleMonthlyRenewal(e,[101],'2025-01-01'),false)
})
test('3 repetição da mesma transação protegida por UNIQUE e chave de extrato',()=>{
 assert.match(SQL,/UNIQUE\(product_id,subscriber_code,transaction_id\)/)
 assert.match(SQL,/ON CONFLICT\(reference_id\)/)
 assert.match(SQL,/event_id text PRIMARY KEY/)
})
test('4 evento atrasado/recusado nunca classifica como pagamento aprovado',async()=>{
 const e=interpretWebhook(seed('PURCHASE_DELAYED'))
 assert.equal(await verifyOfficialPayment(e,ENV,transport(official())),null)
 assert.equal(isEligibleMonthlyRenewal(e,[101],'2025-01-01'),false)
})
test('5 cancelamento de assinatura não estorna uma cobrança passada',()=>{
 const payload=seed('SUBSCRIPTION_CANCELLATION')
 payload.data={product:{id:1234567},subscriber:{code:'SUB-TEST-101'},subscription:{plan:{id:101}}}
 const e=interpretWebhook(payload)
 assert.equal(e.type,'SUBSCRIPTION_CANCELLATION')
 assert.match(SQL,/subscription_cancelled_no_reversal/)
})
test('6 reembolso e chargeback geram um único ajuste negativo auditável',()=>{
 assert.match(SQL,/PURCHASE_REFUNDED.*PURCHASE_CHARGEBACK/s)
 assert.match(SQL,/v_payment\.reversal_event_id IS NULL/)
 assert.match(SQL,/'hotmart:reversal:'/)
 assert.match(SQL,/VALUES\(v_student,'ajuste',-v_points/)
})
test('7 cadastro após evento mantém vinculação pendente até conta aprovada e email confirmado',()=>{
 assert.match(SQL,/u\.email_confirmed_at IS NOT NULL/)
 assert.match(SQL,/p\.approved AND u\.email_confirmed_at/)
 assert.match(SQL,/RETURN 'pending_identity'/)
})
test('8 e-mail diferente entre comprador e assinante: só a API define titular',async()=>{
 const e=interpretWebhook(seed())
 assert.equal(e.buyerEmail,'pagador@example.com')
 const receipt=await verifyOfficialPayment(e,ENV,transport(official()))
 assert.equal(receipt.email,'aluno@example.com')
 assert.notEqual(receipt.email,e.buyerEmail)
})
test('9 plano trimestral e compra parcelada não geram bonificação mensal',async()=>{
 const e=interpretWebhook(seed())
 assert.equal(await verifyOfficialPayment(e,ENV,transport(official(90))),null)
 const model=official()
 model.purchases[0].purchase_subscription=false
 assert.equal(await verifyOfficialPayment(e,ENV,transport(model)),null)
})
test('10 corrida de eventos: chave única e lock por transação',()=>{
 assert.match(SQL,/pg_advisory_xact_lock/)
 assert.match(SQL,/FOR UPDATE/)
 assert.match(SQL,/UNIQUE\(product_id,subscriber_code,transaction_id\)/)
})
test('11 falha da API mantém evento não verificado',async()=>{
 const e=interpretWebhook(seed())
 await assert.rejects(()=>verifyOfficialPayment(e,ENV,async()=>({ok:false})),/hotmart_oauth_unavailable/)
})
test('12 recuperar pagamento sem perder históricos: configuração desligada por padrão',()=>{
 assert.match(SQL,/live_credit_enabled boolean NOT NULL DEFAULT false/)
 assert.match(SQL,/starts_at timestamptz/)
 assert.match(SQL,/IF NOT v_config\.live_credit_enabled/)
 assert.doesNotMatch(SQL,/DELETE FROM public\.clube_point_events/i)
})
test('Hottok obrigatório e comparado em tempo constante',()=>{
 assert.equal(isAuthentic('segredo-correto','segredo-correto'),true)
 assert.equal(isAuthentic('segredo-errado','segredo-correto'),false)
 assert.equal(isAuthentic('','segredo-correto'),false)
})
test('produto de outra conta e assinatura conflitante não vinculam',()=>{
 const e=interpretWebhook(seed())
 const r=official()
 r.subscriptions.items[0].product.id=2222222
 assert.equal(matchesSubscriber(r.subscriptions.items[0],e),false)
 assert.match(SQL,/link_status='conflict'/)
})
test('webhook sem dados válidos ou versão antiga rejeitado',()=>{
 assert.throws(()=>interpretWebhook({...seed(),version:'1.0.0'}),/unsupported_webhook/)
 assert.throws(()=>interpretWebhook({...seed(),id:''}),/missing_identifiers/)
})
