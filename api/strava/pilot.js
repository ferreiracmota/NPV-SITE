// Teste individual Strava: 1 OAuth -> 1 consulta efêmera -> HTML privado do atleta.
// NÃO calcula crédito, não grava tokens, não cruza Strava com aluno NPV e não executa cron.
import { newOAuthState, verifyOAuthState, sanitizeActivityList, escapeHtml } from '../../clube/strava/pilot-core.mjs'

const OAUTH_AUTHORIZE = 'https://www.strava.com/oauth/authorize'
const OAUTH_TOKEN = 'https://www.strava.com/oauth/token'
const ACTIVITY_API = 'https://www.strava.com/api/v3/athlete/activities'
const COOKIE_NAME = 'npv_strava_pilot_nonce'
const headers = {
  'Cache-Control': 'private, no-store, max-age=0',
  'Pragma': 'no-cache',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"
}
const cookieHeader = (value, maxAge) =>
  `${COOKIE_NAME}=${value}; Path=/api/strava/pilot; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`

function render(res, statusCode, heading, body) {
  res.writeHead(statusCode, { ...headers, 'Content-Type': 'text/html; charset=utf-8' })
  res.end(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(heading)} — NPV</title>
  <style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#101810;color:#f5f7f0;font:16px system-ui;padding:16px;box-sizing:border-box}main{width:min(100%,600px);background:#1b291b;border:1px solid #3c5337;border-radius:18px;padding:26px;box-sizing:border-box}h1{margin-top:0;font-size:25px}p{line-height:1.55;color:#d1dec9}table{border-collapse:collapse;width:100%;margin:18px 0}th,td{text-align:left;padding:10px 6px;border-bottom:1px solid #466039;font-size:13px}a{color:#d3ee8a}small{display:block;color:#c0cdb8;line-height:1.5}</style></head><body><main><h1>${escapeHtml(heading)}</h1>${body}<p><a href="/clube">Voltar ao Clube NPV</a></p><small>Teste individual. Nenhum saldo, resgate ou banco de dados do Clube NPV é alterado.</small></main></body></html>`)
}

function config() {
  const id = process.env.STRAVA_CLIENT_ID
  const secret = process.env.STRAVA_CLIENT_SECRET
  const callback = process.env.STRAVA_PILOT_CALLBACK_URL
  if (!/^\d+$/.test(id || '') || !secret || !callback) return null
  try {
    const u = new URL(callback)
    if (u.protocol !== 'https:' || u.pathname !== '/api/strava/pilot'
      || u.search || u.hash) return null
    return { id, secret, callback }
  } catch { return null }
}

function getNonce(req) {
  const cookies = String(req.headers.cookie || '').split(';').map(x => x.trim())
  const cookie = cookies.find(x => x.startsWith(COOKIE_NAME + '='))
  return cookie ? cookie.slice(COOKIE_NAME.length + 1) : ''
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.writeHead(405, { ...headers, Allow: 'GET' }); res.end('Method Not Allowed'); return
  }
  const cfg = config()
  if (!cfg) {
    return render(res, 503, 'Conexão de teste não configurada',
      '<p>O NPV ainda precisa registrar seu aplicativo de testes Strava e guardar as credenciais de API no servidor. Nenhum dado foi consultado.</p>')
  }
  let url
  try {
    url = new URL(req.url, cfg.callback)
  } catch {
    return render(res, 400, 'Endereço inválido', '<p>Não foi possível ler esta solicitação.</p>')
  }
  const action = url.searchParams.get('action')

  if (action !== 'callback' && !url.searchParams.has('code') && !url.searchParams.has('error')) {
    const { state, nonce } = newOAuthState(cfg.secret)
    res.setHeader('Set-Cookie', cookieHeader(nonce, 600))
    const authorize = new URL(OAUTH_AUTHORIZE)
    authorize.searchParams.set('client_id', cfg.id)
    authorize.searchParams.set('response_type', 'code')
    authorize.searchParams.set('redirect_uri', cfg.callback)
    authorize.searchParams.set('approval_prompt', 'auto')
    authorize.searchParams.set('scope', 'activity:read')
    authorize.searchParams.set('state', state)
    res.writeHead(302, { ...headers, Location: authorize.toString() })
    res.end()
    return
  }

  // O cookie evita forjar uma sessão usando apenas o code da URL e é limpo após um callback.
  const nonce = getNonce(req)
  res.setHeader('Set-Cookie', cookieHeader('', 0))
  if (!verifyOAuthState(url.searchParams.get('state'), nonce, cfg.secret)) {
    return render(res, 403, 'Verificação de segurança', '<p>O teste expirou ou foi aberto em outro navegador. Recomece a autorização neste mesmo navegador.</p>')
  }
  if (url.searchParams.has('error')) {
    return render(res, 400, 'Autorização não concluída', '<p>O Strava não autorizou a leitura. Nenhum dado foi consultado.</p>')
  }
  const code = url.searchParams.get('code')
  const scopes = String(url.searchParams.get('scope') || '').split(/[\s,]+/)
  if (!code || code.length > 2048 || !scopes.includes('activity:read')) {
    return render(res, 403, 'Permissão insuficiente', '<p>Para este teste, autorize a leitura de atividades no Strava.</p>')
  }

  try {
    const exchange = await fetch(OAUTH_TOKEN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: cfg.id, client_secret: cfg.secret, code, grant_type: 'authorization_code'
      }),
      signal: AbortSignal.timeout(14000)
    })
    if (!exchange.ok) throw new Error('token exchange failed')
    const token = await exchange.json()
    if (typeof token.access_token !== 'string' || !token.access_token) throw new Error('missing token')
    // Consulta pontual dos últimos sete dias, uma página, apenas atividades da própria conta autorizada.
    const after = Math.floor(Date.now() / 1000) - 7 * 86400
    const endpoint = new URL(ACTIVITY_API)
    endpoint.searchParams.set('after', String(after))
    endpoint.searchParams.set('before', String(Math.floor(Date.now() / 1000)))
    endpoint.searchParams.set('page', '1')
    endpoint.searchParams.set('per_page', '30')
    const result = await fetch(endpoint, {
      headers: { Authorization: `Bearer ${token.access_token}` },
      signal: AbortSignal.timeout(14000)
    })
    if (!result.ok) throw new Error('activity fetch failed')
    const list = sanitizeActivityList(await result.json())
    const rows = list.map(a => `<tr><td>${escapeHtml(a.date)}</td><td>${escapeHtml(a.sport)}</td><td>${escapeHtml(a.km.toLocaleString('pt-BR'))} km</td></tr>`).join('')
    // Não há gravação em banco, logging, retenção de eventos, cálculo de pontos ou compartilhamento.
    return render(res, 200, 'Teste de leitura concluído',
      `<p>Atividades que você autorizou a consultar nos últimos 7 dias: <strong>${list.length}</strong>.</p>` +
      (list.length
        ? `<table><thead><tr><th>Data</th><th>Modalidade</th><th>Distância</th></tr></thead><tbody>${rows}</tbody></table>`
        : '<p>Nenhuma atividade disponível para esta permissão e período.</p>') +
      '<p><strong>Privacidade:</strong> resultados exibidos apenas nesta página. Não ficam salvos no NPV e não geram pontos.</p>')
  } catch {
    return render(res, 502, 'Consulta não concluída',
      '<p>O Strava não respondeu como esperado. O sistema não registrou atividade nem mudou sua pontuação.</p>')
  }
}
