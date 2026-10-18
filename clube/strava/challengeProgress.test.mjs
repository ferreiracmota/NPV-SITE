import test from 'node:test'
import assert from 'node:assert/strict'
import {currentNpvMonth,activityWindow,monthlyActivitySummary,recentActivities,challengeBar} from './challengeProgress.mjs'

test('fuso NPV define o mês em horário de Brasília',()=>{
  assert.equal(currentNpvMonth(new Date('2026-11-01T02:59:00Z')),'2026-10')
  assert.equal(currentNpvMonth(new Date('2026-11-01T03:01:00Z')),'2026-11')
  const w=activityWindow(new Date('2026-10-18T14:00:00Z'))
  assert.equal(w.monthKey,'2026-10')
  assert.ok(w.after<w.before)
})
test('desafio mensal soma km válidos, sem duplicar atividades nem cruzar meses',()=>{
  const list=[
    {id:1,start_date_local:'2026-10-14T07:00:00',start_date:'2026-10-14T10:00:00Z',sport_type:'Run',distance:7090},
    {id:1,start_date_local:'2026-10-14T07:00:00',sport_type:'Run',distance:7090},
    {id:2,start_date_local:'2026-10-11T09:00:00',sport_type:'Ride',distance:11000},
    {id:3,start_date_local:'2026-10-18T06:00:00',sport_type:'Walk',distance:4500},
    {id:4,start_date_local:'2026-09-30T23:30:00',sport_type:'Run',distance:100000},
    {id:5,start_date_local:'2026-10-16T07:00:00',sport_type:'Swim',distance:1000},
    {id:6,start_date_local:'2026-10-10T07:00:00',sport_type:'Run',distance:-10}
  ]
  assert.deepEqual(monthlyActivitySummary(list,'2026-10'),{monthKey:'2026-10',km:22.59,activityCount:3})
  assert.deepEqual(recentActivities(list,new Date('2026-10-18T12:00:00Z')).map(x=>x.id),[1,3,5])
})
test('meta indefinida não inventa porcentagem nem concede pontos',()=>{
  assert.equal(challengeBar(7.09,null).valid,false)
  assert.deepEqual(challengeBar(7.09,50),{valid:true,ratio:0.1418,percentage:14,completed:false})
  assert.deepEqual(challengeBar(54,50),{valid:true,ratio:1,percentage:100,completed:true})
  assert.equal(challengeBar(-1,50).valid,false)
})
