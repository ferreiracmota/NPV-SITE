import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {memberAchievements} from '../../clube/profile/achievements.mjs'
import {selectNextAvailableReward} from '../../clube/profile/nextReward.mjs'

const read=path=>readFileSync(new URL('../../'+path,import.meta.url),'utf8')
const id='test-student'
const event=(points,type='renovacao',is_test=false)=>({student_id:id,points,event_type:type,is_test})

test('Evolução ignora eventos marcados como teste, enquanto resgates não diminuem nível',()=>{
 const p=memberAchievements([event(400),event(1600),event(-300,'resgate'),event(25000,'renovacao',true)],id)
 assert.equal(p.level,1)
 assert.equal(p.earned,2000)
 assert.equal(p.remaining,3000)
})
test('A primeira conquista é Bronze aos 2000 pontos',()=>{
 const p=memberAchievements([event(400)],id)
 assert.equal(p.level,0)
 assert.equal(p.remaining,1600)
})
test('Escolha de prêmio não usa item indisponível, inativo ou de teste',()=>{
 const rewards=[
 {name:'Inativo',points:1000,stock:4,active:false},
 {name:'Esgotado',points:1000,stock:0,active:true},
 {name:'Teste',points:2000,stock:5,active:true,test_only:true},
 {name:'Primeiro',points:6500,stock:1,active:true},
 {name:'Segundo',points:10000,stock:2,active:true},
 ]
 assert.equal(selectNextAvailableReward(rewards,1200)?.name,'Primeiro')
 assert.equal(selectNextAvailableReward(rewards,7500)?.name,'Primeiro')
 assert.equal(selectNextAvailableReward(rewards,11000)?.name,'Segundo')
 assert.equal(selectNextAvailableReward([],1200),null)
 assert.equal(selectNextAvailableReward([{points:1000,stock:2,active:false}],2000),null)
})
test('O componente é somente visual, calcula dados e respeita ocultação da trajetória',()=>{
 const component=read('src/ClubeStudentMomentum.jsx')
 const page=read('src/ClubeNPVOnline.jsx')
 assert.match(component,/memberAchievements\(events,studentId\)/)
 assert.match(component,/showJourney&&/)
 assert.match(component,/onClick=\{onProfile\}/)
 assert.match(component,/onClick=\{onRewards\}/)
 assert.match(page,/showJourney=\{displaySettings\.show_journey\}/)
 assert.match(page,/events=\{mine\}/)
 assert.match(page,/availablePoints=\{Math\.max\(0,balance\(user\.id\)-reserved\(user\.id\)\)\}/)
 assert.ok(page.indexOf('<ClubeStudentMomentum')>page.indexOf('aria-label="Seus pontos e extrato"'))
 assert.ok(page.indexOf('<ClubeStudentMomentum')<page.indexOf('<ClubeRegisteredActivities'))
 assert.ok(page.indexOf('<ClubeConnectionGuide')>page.indexOf('<ClubeRegisteredActivities'))
 assert.doesNotMatch(component,/\.insert\(|\.upsert\(|\.update\(|fetch\(/)
})
test('Cards limitados ao aluno e temas originais preservados',()=>{
 const css=read('src/ClubeStudentMomentum.css')
 assert.match(css,/\.clube-shell\.clube-live-student/)
 assert.match(css,/\.npv-theme-dark/)
 assert.doesNotMatch(css,/\.clube-live-admin/)
})
