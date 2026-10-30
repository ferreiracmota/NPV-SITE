import test from 'node:test'
import assert from 'node:assert/strict'
import {EMAIL_PRESETS,defaultFor,validateTemplate,renderTemplateEmail} from './templateEngine.mjs'
import {eligibleClubeEmails} from './notificationCandidates.mjs'
import {readFileSync} from 'node:fs'
test('templates permitem apenas variáveis conhecidas e escapam HTML',()=>{
 const t=defaultFor('birthday')
 t.body='Oi, {{primeiro_nome}}! {{pontos_evento}} <script>alert(1)</script>'
 assert.equal(validateTemplate(t),'')
 const mail=renderTemplateEmail({firstName:'Marta',eventPoints:100,available:200}, {template:t})
 assert.match(mail.html,/Marta/)
 assert.match(mail.html,/100/)
 assert.doesNotMatch(mail.html,/<script>/)
 assert.match(mail.html,/&lt;script&gt;/)
 t.body='Olá {{token_secreto}}'
 assert.match(validateTemplate(t),/Variável desconhecida/)
})
const now=Date.parse('2026-11-02T14:00:00Z')
const settings={enabled:true,catalog_since:'2026-11-01T00:00:00Z'}
const member={id:'u1',email:'aluna@example.com',full_name:'Aluna NPV',approved:true}
const event={id:'e1',student_id:'u1',event_type:'aniversario',points:100,is_test:false,created_at:'2026-11-02T12:00:00Z'}
const base={profiles:[member],preferences:[],admins:[],rewards:[],events:[event],redemptions:[],dispatches:[],settings}
test('sem evento elegível ou com modelo desativado, nenhum aviso é enviado',()=>{
 assert.deepEqual(eligibleClubeEmails({...base,events:[],templates:[]},now),[])
 assert.deepEqual(eligibleClubeEmails({...base,templates:[{key:'birthday',enabled:false}]},now),[])
})
test('novo aviso só usa evento posterior à ativação e é deduplicado',()=>{
 const template={key:'birthday',enabled:true,active_since:'2026-11-02T10:00:00Z'}
 const authorized={...base,birthdayContext:{activeIds:['u1'],inactive:[],year:2026}}
 assert.equal(eligibleClubeEmails({...base,templates:[template]},now).length,0)
 const matches=eligibleClubeEmails({...authorized,templates:[template]},now)
 assert.equal(matches.length,1)
 assert.equal(matches[0].kind,'birthday')
 assert.equal(matches[0].duplicateKey,'event:birthday:e1')
 assert.equal(matches[0].reward.id,null)
 assert.equal(eligibleClubeEmails({...authorized,templates:[template],dispatches:[{dedupe_key:matches[0].duplicateKey}]},now).length,0)
 assert.equal(eligibleClubeEmails({...authorized,templates:[{...template,active_since:'2026-11-02T13:00:00Z'}]},now).length,0)
 assert.equal(eligibleClubeEmails({...authorized,templates:[template],events:[{...event,is_test:true}]},now).length,0)
})
test('desafio exige confirmação real strava:challenge:',()=>{
 const template={key:'challenge_completed',enabled:true,active_since:'2026-11-02T10:00:00Z'}
 const e={...event,event_type:'desafio',reference_id:'manually_added'}
 assert.equal(eligibleClubeEmails({...base,templates:[template],events:[e]},now).length,0)
 assert.equal(eligibleClubeEmails({...base,templates:[template],events:[{...e,reference_id:'strava:challenge:2026-11'}]},now).length,1)
})
test('tipos adicionais são suportados com gatilhos fixos e não criam novas funções',()=>{
 assert.deepEqual(Object.keys(EMAIL_PRESETS).sort(),['birthday','birthday_inactive','challenge_completed','new_reward','referral','renewal','reward_unlocked'].sort())
 const cfg=JSON.parse(readFileSync(new URL('../../vercel.json',import.meta.url),'utf8'))
 assert.ok(cfg.rewrites.some(r=>r.source==='/api/clube/email-admin'&&r.destination==='/api/clube/student-connections?npv_admin_route=email'))
})

test('aniversário de ex-aluna nunca concede pontos nem dispara como aniversário ativo',()=>{
 const template=defaultFor('birthday_inactive')
 assert.equal(template.enabled,false)
 assert.equal(validateTemplate(template),'')
 const rendered=renderTemplateEmail({firstName:'Maria',eventPoints:100,available:0},{template})
 assert.match(rendered.html,/Maria/)
 assert.match(rendered.html,/https:\/\/www\.naopensevai\.com\//)
 assert.doesNotMatch(rendered.text,/100 pontos|recebeu .* pontos/i)
 assert.doesNotMatch(rendered.html,/Prêmios sujeitos à disponibilidade/)
 const adminRecords=eligibleClubeEmails({...base,templates:[{...template,enabled:true,active_since:'2026-11-01T00:00:00Z'}]},now)
 assert.equal(adminRecords.some(x=>x.kind==='birthday_inactive'),false)
})
