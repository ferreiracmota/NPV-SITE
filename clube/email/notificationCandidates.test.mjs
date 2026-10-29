import test from 'node:test'
import assert from 'node:assert/strict'
import {eligibleClubeEmails,emailContent} from './notificationCandidates.mjs'
const student={id:'s',email:'aluna@example.com',full_name:'Ana Maria',approved:true}
const reward={id:'r',name:'Camiseta',points:2000,stock:2,active:true,test_only:false,created_at:'2026-10-30T12:00:00Z'}
const pref={student_id:'s',notify_unlocks:true,notify_new_rewards:true,created_at:'2026-10-29T12:00:00Z',updated_at:'2026-10-29T12:00:00Z'}
const dataset={profiles:[student],preferences:[pref],admins:[],rewards:[reward],events:[{id:'e',student_id:'s',points:2200,is_test:false,created_at:'2026-10-30T13:00:00Z'}],redemptions:[],dispatches:[],settings:{enabled:true,catalog_since:'2026-10-29T12:00:00Z'}}
test('desligado por padrão, sem avisos',()=>assert.equal(eligibleClubeEmails({...dataset,settings:{enabled:false}}).length,0))
test('notifica novo prêmio uma vez, suprime duplicata',()=>{
  const c=eligibleClubeEmails(dataset);assert.equal(c.length,1);assert.equal(c[0].kind,'new_reward')
  assert.equal(eligibleClubeEmails({...dataset,dispatches:[{dedupe_key:c[0].duplicateKey}]}).filter(x=>x.kind==='new_reward').length,0)
})
test('só pontuação real após opt-in pode desbloquear',()=>{
  const pre={...dataset,rewards:[{...reward,created_at:'2026-10-28T00:00:00Z'}]}
  assert.equal(eligibleClubeEmails(pre)[0].kind,'reward_unlocked')
  assert.equal(eligibleClubeEmails({...pre,events:[{...dataset.events[0],is_test:true}]}).length,0)
  assert.equal(eligibleClubeEmails({...pre,events:[{...dataset.events[0],created_at:'2026-10-28T00:00:00Z'}]}).length,0)
})
test('reserva, inativos, estoque e prêmio teste nunca enviam',()=>{
  const pre={...dataset,rewards:[{...reward,created_at:'2026-10-28T00:00:00Z'}]}
  assert.equal(eligibleClubeEmails({...pre,redemptions:[{student_id:'s',points:1000,status:'pending',is_test:false}]}).length,0)
  assert.equal(eligibleClubeEmails({...pre,rewards:[{...reward,stock:0}]}).length,0)
  assert.equal(eligibleClubeEmails({...pre,rewards:[{...reward,test_only:true}]}).length,0)
  assert.equal(eligibleClubeEmails({...pre,profiles:[{...student,approved:false}]}).length,0)
})
test('nunca envia sem opt-in, administrador fora; HTML escapado',()=>{
  assert.equal(eligibleClubeEmails({...dataset,preferences:[]}).length,0)
  assert.equal(eligibleClubeEmails({...dataset,admins:[{user_id:'s'}]}).length,0)
  const mail=emailContent({...dataset,kind:'new_reward',firstName:'Ana',available:3000,reward:{...reward,name:'<script>'}})
  assert.ok(mail.html.includes('&lt;script&gt;'));assert.ok(!mail.html.includes('<script>'))
})
