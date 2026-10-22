import test from 'node:test'
import assert from 'node:assert/strict'
import { auditPaidRecurrences } from '../../clube/hotmart-admin/reader.mjs'

const paid=(cycle,id='HP-FAKE-'+cycle)=>({
 transaction:id, status:'COMPLETE', approved_date:1790000000000+cycle*86400000, recurrency_number:cycle
})
test('mensal cancelada depois de três cobranças tem 3 meses pagos, 2 recorrências após adesão',()=>{
 const result=auditPaidRecurrences([paid(1),paid(2),paid(3)],'mensal')
 assert.equal(result.paid_recurrences,3)
 assert.equal(result.paid_months,3)
 assert.equal(result.renewal_cycles,2)
})
test('primeira compra paga não equivale a uma renovação',()=>{
 const result=auditPaidRecurrences([paid(1)],'mensal')
 assert.equal(result.paid_months,1)
 assert.equal(result.renewal_cycles,0)
})
test('um ciclo trimestral cobre 3 meses e não tem renovação de cobrança',()=>{
 const result=auditPaidRecurrences([paid(1)],'trimestral')
 assert.equal(result.paid_months,3)
 assert.equal(result.renewal_cycles,0)
})
test('estorno da renovação exclui esse ciclo dos meses quitados',()=>{
 const result=auditPaidRecurrences([paid(1),paid(2),
  {status:'REFUNDED',recurrency_number:2,transaction:'HP-FAKE-2'}],'mensal')
 assert.equal(result.paid_months,1)
 assert.equal(result.renewal_cycles,0)
})
test('ausência de números de recorrência impede estimar meses',()=>{
 const result=auditPaidRecurrences([{transaction:'FAKE',status:'COMPLETE',approved_date:1790000000000}], 'mensal')
 assert.equal(result.paid_months,null)
 assert.equal(result.renewal_cycles,null)
 assert.equal(result.recurring_audit,'not_verified')
})
test('dois pagamentos diferentes para a mesma recorrência exigem revisão',()=>{
 const result=auditPaidRecurrences([paid(1),paid(2,'HP-TEST-2A'),paid(2,'HP-TEST-2B')],'mensal')
 assert.equal(result.paid_months,null)
 assert.equal(result.recurring_audit,'not_verified')
})
test('repetições idênticas de uma transação não multiplicam meses',()=>{
 const result=auditPaidRecurrences([paid(1),paid(1),paid(2)],'mensal')
 assert.equal(result.paid_months,2)
})
test('ausência de pagamentos confirmados não é interpretada como meses verificados',()=>{
 const result=auditPaidRecurrences([{status:'OVERDUE',recurrency_number:1}],'mensal')
 assert.equal(result.paid_months,null)
})
