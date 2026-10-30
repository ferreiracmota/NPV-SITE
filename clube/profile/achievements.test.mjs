import test from 'node:test'
import assert from 'node:assert/strict'
import {memberAchievements,firstNameOf} from './achievements.mjs'
const student='student-A'
const paid=(points,overrides={})=>({student_id:student,points,event_type:'renovacao',is_test:false,...overrides})
test('nome usa primeiro nome e possui fallback',()=>{
 assert.equal(firstNameOf('  Yasmin Albuquerque  '),'Yasmin')
 assert.equal(firstNameOf(''),'Aluna')
})
test('nivel inicial e marcos de pontos acumulados, independentemente de resgates',()=>{
 const empty=memberAchievements([],student)
 assert.equal(empty.level,1);assert.equal(empty.earned,0);assert.equal(empty.challenges,0)
 const points=[paid(1600),paid(400),paid(-500,{event_type:'resgate'}),paid(1000,{event_type:'ajuste',is_test:true})]
 const p=memberAchievements(points,student)
 assert.equal(p.earned,2000);assert.equal(p.level,2);assert.equal(p.levelName,'Constância')
 assert.equal(p.remaining,3000);assert.equal(p.progress,0)
 assert.equal(p.trophies,2)
})
test('somente desafios concluídos de fato e do titular geram contagem',()=>{
 const one=paid(300,{event_type:'desafio',reference_id:'strava:challenge:student-A:out'})
 const twice={...one,id:'different-row'}
 const partial=paid(300,{event_type:'desafio',reference_id:'manual-only'})
 const other=paid(300,{event_type:'desafio',student_id:'student-B',reference_id:'strava:challenge:other'})
 const testEvent=paid(300,{event_type:'desafio',is_test:true,reference_id:'strava:challenge:fake'})
 const p=memberAchievements([one,twice,partial,other,testEvent],student)
 assert.equal(p.challenges,1)
 assert.equal(p.earned,900)
 assert.equal(p.trophies,2)
})
test('resgates nao reduzem nivel; ajustes corretivos alteram progresso e nivel maximo',()=>{
 const corrected=memberAchievements([paid(12000),paid(-4000,{event_type:'ajuste'}),paid(-9000,{event_type:'resgate'})],student)
 assert.equal(corrected.earned,8000);assert.equal(corrected.level,3);assert.equal(corrected.remaining,2000)
 const max=memberAchievements([paid(12000),paid(-9000,{event_type:'resgate'})],student)
 assert.equal(max.earned,12000);assert.equal(max.level,4);assert.equal(max.next,null);assert.equal(max.progress,100)
})
