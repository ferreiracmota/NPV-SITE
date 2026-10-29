import test from 'node:test'
import assert from 'node:assert/strict'
import {verifiedMonthlyRenewalTargets,creditDifference} from './pointsSync.mjs'
function contract(id,status,cycles,paid){
 return {id,subscriber_code:id,subscriber_name:'Aluna',subscriber_email:'aluna@exemplo.com',
 plan:'mensal',status,accession_at:id==='old'?'2025-09-01':'2026-10-28',
 payment_history_complete:true,recurring_audit:'payment_recurrences_identified',
 paid_recurrences:paid,renewal_cycles:cycles,linked:true,link_status:'linked'}
}
test('retorno: 1600 antigos + 400 nova assinatura = 2000',()=>{
 const rows=[contract('old','CANCELLED_BY_CUSTOMER',4,5),contract('new','ACTIVE',0,1)]
 const [target]=verifiedMonthlyRenewalTargets(rows,400)
 assert.equal(target.total,2000);assert.equal(target.cycles,5)
 assert.equal(creditDifference(target,0),2000)
 assert.equal(creditDifference(target,1600),400)
 assert.equal(creditDifference(target,2000),0)
})
test('não duplica crédito, nem credita compra inicial isolada',()=>{
 assert.deepEqual(verifiedMonthlyRenewalTargets([contract('old','ACTIVE',0,1)],400),[])
})
test('não credita conta sem vínculo ou histórico incompleto',()=>{
 const old=contract('old','ACTIVE',4,5)
 assert.equal(verifiedMonthlyRenewalTargets([{...old,linked:false}],400).length,0)
 assert.equal(verifiedMonthlyRenewalTargets([{...old,recurring_audit:'not_verified'}],400).length,0)
 assert.equal(verifiedMonthlyRenewalTargets([{...old,plan:'trimestral'}],400).length,0)
})
test('não considera e-mails diferentes como mesma pessoa',()=>{
 const old=contract('old','CANCELLED_BY_CUSTOMER',4,5)
 const fresh={...contract('new','ACTIVE',0,1),subscriber_email:'outra@exemplo.com'}
 const rows=verifiedMonthlyRenewalTargets([old,fresh],400)
 assert.equal(rows.length,1);assert.equal(rows[0].total,1600)
})
test('diferença negativa ou inconsistência não gera crédito',()=>{
 assert.equal(creditDifference({total:2000},2200),0)
 assert.equal(creditDifference({total:2000},-1),null)
})
