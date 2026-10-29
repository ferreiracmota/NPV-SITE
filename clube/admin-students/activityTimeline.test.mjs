import test from 'node:test'
import assert from 'node:assert/strict'
import {buildStudentTimeline, studentPointSummary} from './activityTimeline.mjs'

test('saldo é soma do livro de pontos: histórico 1600 + renovação 400', () => {
  const events = [
    {id:'old',points:1600,event_type:'renovacao',created_at:'2026-10-20T10:00:00Z'},
    {id:'new',points:400,event_type:'renovacao',created_at:'2026-10-29T10:00:00Z'}
  ]
  assert.deepEqual(studentPointSummary(events,[]),{balance:2000,reserved:0,available:2000})
  assert.equal(buildStudentTimeline(events,[])[0].key,'point:new')
})
test('resgate pendente reserva pontos; aprovado só desconta no evento do extrato', () => {
  const events=[{id:'credit',points:2000,created_at:'2026-10-20T00:00:00Z'}]
  const request={id:'r1',reward_name:'Camiseta',points:700,status:'pending',created_at:'2026-10-21T00:00:00Z'}
  assert.deepEqual(studentPointSummary(events,[request]),{balance:2000,reserved:700,available:1300})
  const approved={...request,status:'approved',resolved_at:'2026-10-23T00:00:00Z'}
  const debited=[...events,{id:'debit',points:-700,event_type:'resgate',created_at:'2026-10-23T00:00:01Z'}]
  assert.deepEqual(studentPointSummary(debited,[approved]),{balance:1300,reserved:0,available:1300})
  const timeline=buildStudentTimeline(debited,[approved])
  assert.deepEqual(timeline.map(x=>x.kind),['points','decision','request','points'])
  assert.equal(timeline.find(x=>x.kind==='decision').points,0)
})
test('recusa é registrada com data da decisão sem descontar pontos', () => {
  const request={id:'r2',points:300,status:'rejected',created_at:'2026-10-22T00:00:00Z',resolved_at:'2026-10-24T00:00:00Z'}
  const timeline=buildStudentTimeline([],[request])
  assert.equal(timeline.length,2)
  assert.equal(timeline[0].kind,'decision')
  assert.equal(timeline[0].status,'rejected')
  assert.deepEqual(studentPointSummary([], [request]),{balance:0,reserved:0,available:0})
})
test('decisão sem data mantém o status mas não inventa horário', () => {
  const timeline=buildStudentTimeline([],[{id:'r3',status:'approved',points:100,created_at:'2026-10-22T00:00:00Z'}])
  assert.equal(timeline[1].kind,'decision')
  assert.equal(timeline[1].at,null)
})
