import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {eligibleReconciliationItem,reconciliationEventId} from './reconcile-core.mjs'

const start='2026-10-20T00:00:00Z'
const paidAt=Date.parse('2026-10-21T10:00:00Z')
const sale=(status='APPROVED',n=2)=>({
 transaction:'HP12345678910111',approved_date:paidAt,
 recurrency_number:n,purchase_subscription:true,
 payment_type:'CREDIT_CARD',status
})
test('conciliação aprovada valida data, assinatura e recorrência',()=>{
 const item=eligibleReconciliationItem(sale(),start)
 assert.equal(item.type,'PURCHASE_APPROVED')
 assert.equal(item.recurrence,2)
})
test('pagamento inicial e evento anterior ao marco não concedem pontos',()=>{
 assert.equal(eligibleReconciliationItem(sale('APPROVED',1),start),null)
 assert.equal(eligibleReconciliationItem({...sale(),approved_date:Date.parse('2026-10-19T00:00:00Z')},start),null)
})
test('atrasos, recusas e transações não pagas não concedem pontos',()=>{
 for(const status of ['OVERDUE','NO_FUNDS','WAITING_PAYMENT','STARTED'])
  assert.equal(eligibleReconciliationItem(sale(status),start),null)
})
test('parcelamento e compra avulsa são excluídos',()=>{
 assert.equal(eligibleReconciliationItem({...sale(),purchase_subscription:false},start),null)
 assert.equal(eligibleReconciliationItem({...sale(),payment_type:'FINANCED_INSTALLMENT'},start),null)
})
test('refundo, estorno e cancelamento de compra são distintos',()=>{
 assert.equal(eligibleReconciliationItem(sale('REFUNDED'),start).type,'PURCHASE_REFUNDED')
 assert.equal(eligibleReconciliationItem(sale('CHARGEBACK'),start).type,'PURCHASE_CHARGEBACK')
 assert.equal(eligibleReconciliationItem(sale('CANCELLED'),start).type,'PURCHASE_CANCELED')
 assert.equal(eligibleReconciliationItem(sale('DELAYED'),start),null)
})
test('identificador determinístico independe de reenvios',()=>{
 const a=reconciliationEventId(1234567,'SUB101','HP123','PURCHASE_APPROVED')
 assert.equal(a,reconciliationEventId(1234567,'SUB101','HP123','PURCHASE_APPROVED'))
 assert.notEqual(a,reconciliationEventId(1234567,'SUB101','HP123','PURCHASE_REFUNDED'))
 assert.notEqual(a,reconciliationEventId(1234567,'SUB102','HP123','PURCHASE_APPROVED'))
 assert.ok(a.length<160)
})
test('rotina varre assinaturas paginadas e salva cursor sem credenciais em JS',()=>{
 const s=readFileSync(new URL('./reconcile.js',import.meta.url),'utf8')
 assert.match(s,/page_token/)
 assert.match(s,/next_page_token/)
 assert.match(s,/max_results','10'/)
 assert.match(s,/enabled',true/)
 assert.match(s,/recurrency_period/)
 assert.match(s,/subscriber\.subscriber\?\.email/)
 assert.match(s,/p_purchase_verified/)
})
test('tabelas de checkpoint e proteção de transações cruzadas',()=>{
 const s=readFileSync(new URL('../../clube/migrations/20261020_hotmart_integracao_pendente.sql',import.meta.url),'utf8')
 assert.match(s,/clube_hotmart_reconciliation_state/)
 assert.match(s,/UNIQUE\(product_id,transaction_id\)/)
 assert.match(s,/pg_advisory_xact_lock/)
 assert.match(s,/live_credit_enabled boolean NOT NULL DEFAULT false/)
})
