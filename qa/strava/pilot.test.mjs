import test from 'node:test'
import assert from 'node:assert/strict'
import { newOAuthState, verifyOAuthState, sanitizeActivityList, escapeHtml } from '../../api/strava/pilot-core.mjs'
import pilot from '../../api/strava/pilot.js'

test('state OAuth válido expira e nunca aceita cookie de outro navegador', () => {
  const secret = 'uma-chave-de-teste-grande-e-privada'
  const { state, nonce } = newOAuthState(secret, 1790000000)
  assert.equal(verifyOAuthState(state, nonce, secret, 1790000300), true)
  assert.equal(verifyOAuthState(state, nonce, secret, 1790000900), false)
  assert.equal(verifyOAuthState(state, 'outra-sessao', secret, 1790000300), false)
  assert.equal(verifyOAuthState(state + 'X', nonce, secret, 1790000300), false)
  assert.equal(verifyOAuthState(state, nonce, 'segredo-errado', 1790000300), false)
})

test('a lista expõe somente data, esporte e distância, sem IDs, mapas ou fotos', () => {
  const list = sanitizeActivityList([
    { id: 987, start_date_local: '2026-10-18T09:00:00', sport_type: 'Run', distance: 12345, map: { polyline: 'secret' }, photos: 'privada' },
    { id: 988, start_date_local: '2026-10-18T08:00:00', sport_type: 'Ride', distance: NaN }
  ])
  assert.deepEqual(list, [{ date: '2026-10-18', sport: 'Run', km: 12.35 }])
  assert.equal(JSON.stringify(list).includes('987'), false)
  assert.equal(JSON.stringify(list).includes('polyline'), false)
})

test('proteção contra HTML malicioso', () => {
  assert.equal(escapeHtml('<script>'), '&lt;script&gt;')
})

test('sem credenciais no servidor não ocorre qualquer consulta externa', async () => {
  const prev = [process.env.STRAVA_CLIENT_ID,process.env.STRAVA_CLIENT_SECRET,process.env.STRAVA_PILOT_CALLBACK_URL]
  delete process.env.STRAVA_CLIENT_ID
  delete process.env.STRAVA_CLIENT_SECRET
  delete process.env.STRAVA_PILOT_CALLBACK_URL
  let httpStatus = 0
  let html = ''
  const res = { writeHead(status) { httpStatus = status }, end(s) { html = s } }
  try {
    await pilot({ method: 'GET', url: '/api/strava/pilot', headers: {} }, res)
    assert.equal(httpStatus, 503)
    assert.match(html, /não configurada/i)
  } finally {
    const vars = ['STRAVA_CLIENT_ID','STRAVA_CLIENT_SECRET','STRAVA_PILOT_CALLBACK_URL']
    vars.forEach((key,i) => { if (prev[i] === undefined) delete process.env[key]; else process.env[key] = prev[i] })
  }
})
