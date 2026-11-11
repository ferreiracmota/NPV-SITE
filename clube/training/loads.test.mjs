import test from 'node:test'
import assert from 'node:assert/strict'
import {
  MAX_TRAINING_LOAD_KG,parseTrainingLoad,parseTrainingRepetitions,
  trainingToday,trainingHistory,trainingChartData,entryOnDay,
  lastEntryOnOrBefore,formatTrainingLoad
} from './loads.mjs'

const fixtures=[
  {exercise_slug:'agachamento-livre',recorded_on:'2026-09-01',load_kg:40,repetitions:12},
  {exercise_slug:'leg-press',recorded_on:'2026-09-10',load_kg:180},
  {exercise_slug:'agachamento-livre',recorded_on:'2026-10-01',load_kg:52.5,repetitions:10},
  {exercise_slug:'agachamento-livre',recorded_on:'2026-11-11',load_kg:70,repetitions:8}
]
test('datas de registro respeitam o dia do Brasil, inclusive perto de meia-noite UTC',()=>{
  assert.equal(trainingToday(new Date('2026-11-12T01:00:00Z')),'2026-11-11')
})
test('cargas aceitam zero, 500 e decimais, rejeitam entrada inválida',()=>{
  assert.equal(MAX_TRAINING_LOAD_KG,500)
  assert.equal(parseTrainingLoad('0'),0)
  assert.equal(parseTrainingLoad('500'),500)
  assert.equal(parseTrainingLoad('52,5'),52.5)
  assert.equal(parseTrainingLoad('52.25'),52.25)
  for(const bad of ['',null,'-1','500.01','1.123','xx','Infinity','1e2']){
    assert.equal(parseTrainingLoad(bad),null)
  }
})
test('repetições opcionais são inteiros entre 1 e 100',()=>{
  assert.equal(parseTrainingRepetitions(''),null)
  assert.equal(parseTrainingRepetitions('10'),10)
  for(const bad of [-2,0,1.5,101,'dez'])assert.equal(parseTrainingRepetitions(bad),null)
})
test('evolução usa sempre primeiro e último registros reais do exercício selecionado',()=>{
  const data=trainingHistory(fixtures,'agachamento-livre')
  assert.equal(data.rows.length,3)
  assert.equal(data.initial.load_kg,40)
  assert.equal(data.latest.load_kg,70)
  assert.equal(data.record.load_kg,70)
  assert.equal(data.changeKg,30)
  assert.equal(data.changePercent,75)
  assert.equal(trainingChartData(fixtures,'agachamento-livre')[2].label,'11/11')
})
test('cargas de outros exercícios não contaminam gráfico nem histórico',()=>{
  assert.equal(trainingHistory(fixtures,'leg-press').rows.length,1)
  assert.equal(trainingHistory(fixtures,'leg-press').changePercent,0)
  assert.equal(trainingHistory(fixtures,'stiff').initial,null)
  assert.deepEqual(trainingChartData(fixtures,'stiff'),[])
  assert.equal(entryOnDay(fixtures,'agachamento-livre','2026-10-01').load_kg,52.5)
  assert.equal(lastEntryOnOrBefore(fixtures,'agachamento-livre','2026-09-15').load_kg,40)
  assert.equal(formatTrainingLoad(52.5),'52,5 kg')
})
test('uma carga inicial de zero não gera percentual infinito',()=>{
  const data=trainingHistory([
    {exercise_slug:'stiff',recorded_on:'2026-10-01',load_kg:0},
    {exercise_slug:'stiff',recorded_on:'2026-11-01',load_kg:10}
  ],'stiff')
  assert.equal(data.changeKg,10)
  assert.equal(data.changePercent,null)
})
