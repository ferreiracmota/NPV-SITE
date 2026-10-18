import test from 'node:test'
import assert from 'node:assert/strict'
import { summarizeCandidateMonth } from './monthlyCandidate.mjs'

const options = { year: 2026, month: 9, pointsPerKm: 2, eligibleSportTypes: ['Run'], memberOfNpvClub: true }
const activity = (id, distance, date='2026-09-20T08:00:00Z', sport_type='Run', manual=false) =>
  ({ id, distance, start_date_local: date, sport_type, manual })

test('soma somente km do mês e aplica a taxa uma vez', () => {
  assert.deepEqual(summarizeCandidateMonth([activity(1, 5000), activity(2, 2500)], options), {
    period: '2026-09', eligibleActivities: 2, totalKm: 7.5, candidatePoints: 15, status: 'simulation_only'
  })
})
test('bloqueia duplicatas, outros meses, esportes não elegíveis e atividades manuais', () => {
  const result = summarizeCandidateMonth([
    activity(1,1000), activity(1,1000),
    activity(2,10000,'2026-10-01T00:05:00Z'),
    activity(3,10000,'2026-09-01T08:00:00Z','Ride'),
    activity(4,10000,'2026-09-01T08:00:00Z','Run',true)
  ], options)
  assert.equal(result.eligibleActivities, 1)
  assert.equal(result.candidatePoints, 2)
})
test('não libera pontuação se a participação no clube não estiver verificada', () => {
  const result = summarizeCandidateMonth([activity(1,20000)], {...options, memberOfNpvClub: false})
  assert.equal(result.candidatePoints, 0)
  assert.equal(result.status, 'club_not_verified')
})
test('arredonda só após agregar o mês', () => {
  const result = summarizeCandidateMonth([activity(1, 550),activity(2, 550)], {...options, pointsPerKm: 1})
  assert.equal(result.candidatePoints, 1)
  assert.equal(result.totalKm, 1.1)
})
test('rejeita regras inválidas e não expõe IDs individuais no resumo', () => {
  assert.throws(() => summarizeCandidateMonth([], {...options, pointsPerKm: -1}), /pointsPerKm/)
  const summary = summarizeCandidateMonth([activity(777, 1000)], options)
  assert.equal(JSON.stringify(summary).includes('777'), false)
})
