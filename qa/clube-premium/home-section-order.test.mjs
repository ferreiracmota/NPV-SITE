import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const read=path=>readFileSync(new URL('../../'+path,import.meta.url),'utf8')
const source=read('src/ClubeNPVOnline.jsx')
const home=source.split("{tab==='inicio'&&!isAdmin&&<>")[1]?.split("{tab==='perfil'&&!isAdmin&&")[0]||''
test('Ordem da Home: saldo, trajetória, metas e desafios, loja, parceiros, pontos, conexões',()=>{
  const sections=[
    'clube-student-summary clube-student-summary-statement',
    '<ClubeStudentMomentum',
    '<ClubeRegisteredActivities',
    'npv-shop npv-shop-featured',
    'npv-partners-section',
    'clube-next clube-earn-bottom',
    '<ClubeConnectionGuide'
  ]
  let last=-1
  for (const item of sections){
    const at=home.indexOf(item)
    assert.ok(at>last,`Seção ausente ou fora da ordem: ${item}`)
    last=at
  }
})
test('Trajetória e recompensa usam o mesmo componente real sem duplicar bloco no topo',()=>{
  const comp=read('src/ClubeStudentMomentum.jsx')
  assert.match(home,/showReward=\{false\}/)
  assert.match(home,/showJourney=\{false\} showLevel=\{false\}/)
  assert.match(home,/rewardsGrid\(4,featuredReward\?\.id\)/)
  assert.match(source,/selectNextAvailableReward\(data\.rewards,Math\.max/)
  assert.match(comp,/const levelVisible=showJourney&&showLevel/)
  assert.match(comp,/const rewardVisible=showReward&&Boolean\(reward\)/)
  assert.match(comp,/rewardImageUrl\(reward\.image_path\)/)
})
test('Espaço de Performance muda nome para Metas e desafios sem remover desafio Strava',()=>{
 const strava=read('src/ClubeRegisteredActivities.jsx')
 assert.match(strava,/aria-label="Metas e desafios"/)
 assert.match(strava,/<strong>Metas e desafios<\/strong>/)
 assert.match(strava,/SEU ESPAÇO DE PERFORMANCE/)
 assert.match(strava,/Desafio do mês/)
 assert.match(strava,/clube-activities-toggle/)
})
test('Conexões ficam no final do início, conservando os handlers originais',()=>{
 assert.match(home,/<ClubeConnectionGuide instagram=\{instagramConnection\} strava=\{stravaConnection\}/)
 assert.match(home,/onStrava=\{openStravaFromGuide\}/)
 assert.match(home,/setTab\('instagram'\)/)
 assert.equal((home.match(/<ClubeConnectionGuide/g)||[]).length,1)
})
