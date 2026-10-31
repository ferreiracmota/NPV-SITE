import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const fromRoot=file=>readFileSync(new URL('../../'+file,import.meta.url),'utf8')
test('Início premium apresenta artes originais por nível e fotografia real do catálogo',()=>{
 const code=fromRoot('src/ClubeStudentMomentum.jsx')
 assert.match(code,/\/clube\/cards\/bronze\.webp/)
 assert.match(code,/\/clube\/cards\/black\.webp/)
 assert.match(code,/rewardImageUrl\(reward\.image_path\)/)
 assert.match(code,/alt=\{'Foto de '\+reward\.name\}/)
 assert.match(code,/selectNextAvailableReward/)
 assert.match(code,/memberAchievements\(events,studentId\)/)
 assert.match(code,/showJourney&&/)
 assert.doesNotMatch(code,/\.upsert\(|\.insert\(|\.update\(|fetch\(/)
})
test('Página Inicial preserva desafio real, parceiros, extrato e conexões',()=>{
 const app=fromRoot('src/ClubeNPVOnline.jsx')
 const home=app.split("{tab==='inicio'&&!isAdmin&&<>")[1]?.split("{tab==='perfil'&&!isAdmin&&")[0]||''
 for(const name of ['<ClubeStudentMomentum','<ClubeRegisteredActivities','<ClubeConnectionGuide','<PartnerCards','rewardsGrid(4,featuredReward?.id)','<BenefitNotice'])assert.ok(home.includes(name),name)
 assert.ok(home.indexOf('<ClubeStudentMomentum')<home.indexOf('<ClubeRegisteredActivities'))
 assert.ok(home.indexOf('<ClubeRegisteredActivities')<home.indexOf('<ClubeConnectionGuide'))
 assert.match(home,/rewardImageUrl=\{rewardImageUrl\}/)
 assert.match(home,/availablePoints=\{Math\.max\(0,balance\(user\.id\)-reserved\(user\.id\)\)\}/)
})
test('Consulta inicial Strava pode reiniciar após efeito interrompido, sem alterar regras',()=>{
 const code=fromRoot('src/ClubeRegisteredActivities.jsx')
 assert.match(code,/checkedOnce\.current=false/)
 assert.match(code,/return\(\)=>\{controller\.abort\(\);checkedOnce\.current=false\}/)
 assert.match(code,/fetch\('\/api\/strava\/status'/)
})
test('Acabamento isolado à área do aluno respeita modo escuro e responsividade',()=>{
 const css=fromRoot('src/ClubeStudentMomentum.css')
 assert.match(css,/\.clube-shell\.clube-live-student/)
 assert.match(css,/\.npv-theme-dark/)
 assert.match(css,/@media\(max-width:780px\)/)
 assert.doesNotMatch(css,/\.clube-live-admin/)
})
