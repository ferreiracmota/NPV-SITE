import test from 'node:test'
import assert from 'node:assert/strict'
import {groupSubscriberHistory} from '../../clube/hotmart-admin/subscriberHistory.mjs'

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
