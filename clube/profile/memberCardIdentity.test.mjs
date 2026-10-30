import test from 'node:test'
import assert from 'node:assert/strict'
import {chooseOwnSubscription,MEMBER_LEVELS} from './memberCardIdentity.mjs'
test('seis níveis publicados, sem liberar benefícios prematuramente',()=>{
 assert.deepEqual(MEMBER_LEVELS.map(x=>x.minimum),[2000,5000,10000,15000,20000,25000])
 assert.equal(MEMBER_LEVELS.length,6)
})
test('retorna somente assinatura do e-mail autenticado, sem vazar dados de terceiros',()=>{
 const subscriptions=[
  {subscriber_email:'OUTRA@EXAMPLE.COM',status:'ACTIVE',next_charge_at:'2027-01-01T00:00:00Z'},
  {subscriber_email:'maria@example.com',status:'CANCELLED_BY_CUSTOMER',accession_at:'2024-01-01'},
  {subscriber_email:'Maria@Example.com',status:'ACTIVE',next_charge_at:'2026-11-21T12:00:00Z',accession_at:'2026-09-20'},
  {subscriber_email:'maria@example.com',status:'ACTIVE',next_charge_at:'2026-12-21T12:00:00Z',accession_at:'2026-10-20'}
 ]
 assert.deepEqual(chooseOwnSubscription(subscriptions,' MARIA@example.com '),{status:'active',next_charge_at:'2026-12-21T12:00:00Z'})
 assert.deepEqual(chooseOwnSubscription(subscriptions,'desconhecida@example.com'),{status:'unlinked',next_charge_at:null})
})
test('cancelada, atrasada e dados incompletos não viram assinatura ativa',()=>{
 const row=s=>[{subscriber_email:'a@b.com',status:s,next_charge_at:'2026-11-21T12:00:00Z'}]
 assert.deepEqual(chooseOwnSubscription(row('DELAYED'),'a@b.com'),{status:'delayed',next_charge_at:null})
 assert.deepEqual(chooseOwnSubscription(row('INACTIVE'),'a@b.com'),{status:'inactive',next_charge_at:null})
 assert.deepEqual(chooseOwnSubscription(row('UNKNOWN'),'a@b.com'),{status:'unavailable',next_charge_at:null})
 assert.deepEqual(chooseOwnSubscription([],''),{status:'unavailable',next_charge_at:null})
})
