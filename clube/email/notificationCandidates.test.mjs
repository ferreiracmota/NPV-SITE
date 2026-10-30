import test from 'node:test'
import assert from 'node:assert/strict'
import {eligibleClubeEmails,emailContent} from './notificationCandidates.mjs'
const student={id:'s',email:'aluna@example.com',full_name:'Ana Maria',approved:true}
const reward={id:'r',name:'Camiseta',points:2000,stock:2,active:true,test_only:false,created_at:'2026-10-30T12:00:00Z'}
const pref={student_id:'s',notify_unlocks:true,notify_new_rewards:true,created_at:'2026-10-29T12:00:00Z',updated_at:'2026-10-29T12:00:00Z'}
const settings={enabled:true,catalog_since:'2026-10-29T12:00:00Z'}
const dataset={profiles:[student],preferences:[],admins:[],rewards:[reward],events:[{id:'e',student_id:'s',points:2200,is_test:false,created_at:'2026-10-30T13:00:00Z'}],redemptions:[],dispatches:[],settings}
const now=Date.parse('2026-11-01T14:00:00Z')
test('a chave geral desligada nunca envia e-mails',()=>{
  assert.equal(eligibleClubeEmails({...dataset,settings:{...settings,enabled:false}},now).length,0)
})
test('novos prêmios geram avisos automáticos sem cadastro de preferências, apenas uma vez',()=>{
  const c=eligibleClubeEmails(dataset,now)
  assert.equal(c.length,1)
  assert.equal(c[0].kind,'new_reward')
  assert.equal(eligibleClubeEmails({...dataset,dispatches:[{dedupe_key:c[0].duplicateKey}]},now).length,0)
})
test('o marco de ativação bloqueia e-mails de prêmios anteriores',()=>{
  const older={...dataset,rewards:[{...reward,created_at:'2026-10-28T00:00:00Z'}]}
  assert.equal(eligibleClubeEmails(older,now)[0].kind,'reward_unlocked')
  assert.equal(eligibleClubeEmails({...older,events:[{...dataset.events[0],created_at:'2026-10-28T00:00:00Z'}]},now).length,0)
  assert.equal(eligibleClubeEmails({...older,events:[{...dataset.events[0],is_test:true}]},now).length,0)
})
test('desativação explícita é sempre respeitada',()=>{
  assert.equal(eligibleClubeEmails({...dataset,preferences:[{...pref,notify_unlocks:false,notify_new_rewards:false}]},now).length,0)
  assert.equal(eligibleClubeEmails({...dataset,preferences:[{...pref,notify_unlocks:false}]},now).map(x=>x.kind).join(','),'new_reward')
  const oldReward={...dataset,rewards:[{...reward,created_at:'2026-10-28T00:00:00Z'}]}
  assert.equal(eligibleClubeEmails({...oldReward,preferences:[{...pref,notify_new_rewards:false}]},now).map(x=>x.kind).join(','),'reward_unlocked')
})
test('reserva, inativos, estoque e prêmio teste nunca enviam',()=>{
 const pre={...dataset,rewards:[{...reward,created_at:'2026-10-28T00:00:00Z'}]}
 assert.equal(eligibleClubeEmails({...pre,redemptions:[{student_id:'s',points:1000,status:'pending',is_test:false}]},now).length,0)
 assert.equal(eligibleClubeEmails({...pre,rewards:[{...reward,stock:0}]},now).length,0)
 assert.equal(eligibleClubeEmails({...pre,rewards:[{...reward,test_only:true}]},now).length,0)
 assert.equal(eligibleClubeEmails({...pre,profiles:[{...student,approved:false}]},now).length,0)
 assert.equal(eligibleClubeEmails({...pre,admins:[{user_id:'s'}]},now).length,0)
})
test('mensagem escapa nomes e inclui link de cancelamento quando fornecido',()=>{
 const url='https://www.naopensevai.com/api/clube/email-unsubscribe?student=a&token=b'
 const mail=emailContent({kind:'new_reward',firstName:'Ana',available:3000,reward:{...reward,name:'<script>'}},{unsubscribeUrl:url})
 assert.ok(mail.html.includes('&lt;script&gt;'))
 assert.ok(!mail.html.includes('<script>'))
 assert.ok(mail.html.includes('Cancelar avisos por e-mail'))
 assert.ok(mail.html.includes('&amp;token=b'))
 assert.ok(mail.text.includes(url))
 assert.ok(!mail.html.includes('porque optou por notificações'))
})
