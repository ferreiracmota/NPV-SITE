import test from 'node:test'
import assert from 'node:assert/strict'
import {birthdayDateParts,classifyBirthdayMembers} from './birthdayEligibility.mjs'
import {eligibleClubeEmails} from './notificationCandidates.mjs'
const today=new Date('2026-10-30T13:00:00.000Z')
const member={id:'u1',email:'maria@example.com',full_name:'Maria',approved:true,birthday_mmdd:'30-10',birthday_exstudent_opt_in:false}
const history={subscriber_email:'maria@example.com',status:'CANCELLED_BY_CUSTOMER'}
const live={subscriber_email:'maria@example.com',status:'ACTIVE'}
const sample=(extras={})=>classifyBirthdayMembers({profiles:[member],subscriptions:[history],freeAccess:[],admins:[],preferences:[],...extras},today).choices
test('data de aniversário no fuso de São Paulo e dia 29/02',()=>{
 assert.deepEqual(birthdayDateParts(today),{year:2026,mmdd:'30-10',alsoFeb29:false})
 assert.equal(birthdayDateParts(new Date('2027-02-28T13:00:00Z')).alsoFeb29,true)
 assert.equal(classifyBirthdayMembers({profiles:[{...member,birthday_mmdd:'29-02'}],subscriptions:[live]},new Date('2027-02-28T13:00:00Z')).choices[0].kind,'active')
 assert.equal(classifyBirthdayMembers({profiles:[{...member,birthday_mmdd:'29-02'}],subscriptions:[live]},new Date('2028-02-28T13:00:00Z')).choices.length,0)
})
test('assinatura ATIVA ganha presente e não vira ex-aluna',()=>{
 assert.equal(sample({subscriptions:[history,live]})[0].kind,'active')
 assert.equal(sample({subscriptions:[live],profiles:[{...member,birthday_exstudent_opt_in:true}]})[0].kind,'active')
})
test('cadastro aprovado sem assinatura nunca significa assinatura ativa',()=>{
 assert.equal(sample({subscriptions:[]}).length,0)
 assert.equal(sample({subscriptions:[{...history,status:'DELAYED'}]}).length,0)
 assert.equal(sample({subscriptions:[{...history,status:'UNKNOWN'}]}).length,0)
})
test('ex-aluna exige histórico elegível, consentimento e optout permitido',()=>{
 assert.equal(sample().length,0)
 const opted={...member,birthday_exstudent_opt_in:true}
 assert.equal(sample({profiles:[opted]})[0].kind,'inactive')
 assert.equal(sample({profiles:[opted],preferences:[{student_id:'u1',notify_unlocks:false,notify_new_rewards:false}]}).length,0)
 assert.equal(sample({profiles:[opted],subscriptions:[history,{status:'ACTIVE',subscriber_email:null}]}).length,0)
 assert.equal(sample({profiles:[opted],subscriptions:[history,live]}).at(0).kind,'active')
})
test('acesso gratuito só vale após indicação explícita pelo administrador',()=>{
 assert.equal(sample({subscriptions:[],freeAccess:[{student_id:'u1',enabled:true}]}).at(0).kind,'active')
 assert.equal(sample({subscriptions:[],freeAccess:[{student_id:'u1',enabled:false}]}).length,0)
 assert.equal(sample({subscriptions:[history],admins:[{user_id:'u1'}]}).length,0)
 assert.equal(sample({subscriptions:[history],profiles:[{...member,approved:false}]}).length,0)
})
test('só um aviso anual de ex-aluna e nenhum ponto na mensagem',()=>{
 const base={profiles:[member],preferences:[],admins:[],rewards:[],events:[],redemptions:[],
  dispatches:[],settings:{enabled:true,catalog_since:'2026-10-01T00:00:00Z'},
  templates:[{key:'birthday_inactive',enabled:true,active_since:'2026-10-01T00:00:00Z'}],
  birthdayContext:{year:2026,activeIds:[],inactive:['u1']}}
 const candidates=eligibleClubeEmails(base,today.getTime())
 assert.equal(candidates.length,1)
 assert.equal(candidates[0].eventPoints,0)
 assert.equal(candidates[0].kind,'birthday_inactive')
 assert.equal(eligibleClubeEmails({...base,dispatches:[{dedupe_key:candidates[0].duplicateKey}]},today.getTime()).length,0)
 assert.equal(eligibleClubeEmails({...base,birthdayContext:{year:2026,activeIds:[],inactive:[]}},today.getTime()).length,0)
})
