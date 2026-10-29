import test from 'node:test'
import assert from 'node:assert/strict'
import {groupSubscriberHistory,calculateReturningSubscriberPoints} from '../../clube/hotmart-admin/subscriberHistory.mjs'

test('Duas assinaturas de mesmo e-mail são agrupadas sem duplicar a pessoa',()=>{
  const rows=[
    {id:'old',subscriber_code:'old',subscriber_name:'Pessoa de teste',subscriber_email:'pessoa@teste.com',
     status:'CANCELLED_BY_CUSTOMER',accession_at:'2025-10-01',clube_balance:null},
    {id:'new',subscriber_code:'new',subscriber_name:'Pessoa de teste',subscriber_email:'PESSOA@TESTE.COM',
     status:'ACTIVE',accession_at:'2026-10-28',linked:true,link_status:'linked',clube_balance:870}
  ]
  const grouped=groupSubscriberHistory(rows)
  assert.equal(grouped.length,1)
  assert.equal(grouped[0].subscriptions.length,2)
  assert.equal(grouped[0].returning,true)
  assert.equal(grouped[0].active,true)
  assert.equal(grouped[0].linked,true)
  assert.equal(grouped[0].clube_balance,870)
  assert.equal(grouped[0].subscriptions[0].id,'new')
})

test('Nome igual não une cadastros com e-mail diferente ou ausente',()=>{
  const rows=[
    {id:'a',subscriber_code:'a',subscriber_name:'Nome igual',subscriber_email:'a@teste.com',status:'ACTIVE'},
    {id:'b',subscriber_code:'b',subscriber_name:'Nome igual',subscriber_email:'b@teste.com',status:'ACTIVE'},
    {id:'c',subscriber_code:'c',subscriber_name:'Nome igual',subscriber_email:null,status:'ACTIVE'}
  ]
  assert.equal(groupSubscriberHistory(rows).length,3)
})

test('Sem vínculo comprovado, saldo real não é inferido por cálculo de renovações',()=>{
  const [person]=groupSubscriberHistory([{id:'x',subscriber_code:'x',subscriber_email:'x@teste.com',
    status:'ACTIVE',renewal_cycles:4,linked:false,link_status:'pending_no_clube_profile'}])
  assert.equal(person.clube_balance,null)
  assert.equal(person.linked,false)
  assert.equal(person.returning,false)
})

test('Iasmin: mesmo e-mail, quatro renovações anteriores e nova compra paga = 2.000 pontos calculados',()=>{
  const old={id:'antigo',subscriber_code:'antigo',subscriber_name:'Aluna de exemplo',
    subscriber_email:'exemplo@dominio.com',status:'CANCELLED_BY_CUSTOMER',
    accession_at:'2025-10-01T00:00:00Z',plan:'mensal',renewal_cycles:4,
    paid_recurrences:5,payment_history_complete:true,recurring_audit:'payment_recurrences_identified'}
  const current={id:'novo',subscriber_code:'novo',subscriber_name:'Aluna de exemplo',
    subscriber_email:'EXEMPLO@DOMINIO.COM',status:'ACTIVE',
    accession_at:'2026-10-28T12:00:00Z',plan:'mensal',renewal_cycles:0,
    paid_recurrences:1,payment_history_complete:true,recurring_audit:'payment_recurrences_identified'}
  const [group]=groupSubscriberHistory([current,old])
  const calc=calculateReturningSubscriberPoints(group,400)
  assert.equal(calc.previousPoints,1600)
  assert.equal(calc.returnBonus,400)
  assert.equal(calc.total,2000)
  assert.equal(calc.renewals,5)
  assert.equal(calc.currentSubscriptionId,'novo')
  assert.equal(calc.credited,false)
  const [sameGroup]=groupSubscriberHistory([current,old])
  assert.deepEqual(calculateReturningSubscriberPoints(sameGroup,400),calc)
})

test('Não concede novo bônus sem pagamento, sem auditoria, ou se dois contratos estiverem ativos',()=>{
  const old={id:'a',subscriber_code:'a',subscriber_email:'a@teste.com',status:'CANCELLED_BY_ADMIN',
    plan:'mensal',accession_at:'2025-01-01',paid_recurrences:5,renewal_cycles:4,
    payment_history_complete:true,recurring_audit:'payment_recurrences_identified'}
  const current={...old,id:'b',subscriber_code:'b',status:'ACTIVE',accession_at:'2026-01-01',
    paid_recurrences:1,renewal_cycles:0}
  const calculate=(a,b)=>calculateReturningSubscriberPoints(groupSubscriberHistory([a,b])[0],400)
  assert.equal(calculate(old,{...current,paid_recurrences:0}),null)
  assert.equal(calculate(old,{...current,payment_history_complete:false}),null)
  assert.equal(calculate({...old,status:'ACTIVE'},current),null)
  assert.equal(calculate({...old,subscriber_email:'outro@teste.com'},current),null)
  assert.equal(calculate({...old,plan:'trimestral'},current),null)
  assert.equal(calculate(old,{...current,accession_at:'2024-01-01'}),null)
})
