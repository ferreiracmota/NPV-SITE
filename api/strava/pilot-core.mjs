import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

export const STATE_MAX_AGE_SECONDS = 600

export function newOAuthState(secret, nowSeconds = Math.floor(Date.now() / 1000)) {
  if (!secret || String(secret).length < 12) throw new Error('missing signing secret')
  const nonce = randomBytes(24).toString('base64url')
  const payload = `${nonce}.${nowSeconds}`
  const signature = createHmac('sha256', secret).update(payload).digest('base64url')
  return { state: `${payload}.${signature}`, nonce }
}

export function verifyOAuthState(state, cookieNonce, secret, nowSeconds = Math.floor(Date.now() / 1000)) {
  if (!secret || typeof state !== 'string' || typeof cookieNonce !== 'string') return false
  const parts = state.split('.')
  if (parts.length !== 3) return false
  const [nonce, issuedText, receivedSignature] = parts
  if (!/^[A-Za-z0-9_-]{32}$/.test(nonce) || !/^\d{10}$/.test(issuedText)
    || !/^[A-Za-z0-9_-]{43}$/.test(receivedSignature)) return false
  const issuedAt = Number(issuedText)
  if (nonce !== cookieNonce || !Number.isSafeInteger(issuedAt) || issuedAt > nowSeconds + 15
    || nowSeconds - issuedAt > STATE_MAX_AGE_SECONDS) return false
  const expectedSignature = createHmac('sha256', secret).update(`${nonce}.${issuedText}`).digest('base64url')
  const a = Buffer.from(expectedSignature)
  const b = Buffer.from(receivedSignature)
  return a.length === b.length && timingSafeEqual(a, b)
}

export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[c])

export function sanitizeActivityList(raw) {
  if (!Array.isArray(raw)) throw new TypeError('Invalid Strava response')
  return raw.slice(0, 50).flatMap(item => {
    if (typeof item?.distance !== 'number' || !Number.isFinite(item.distance)
      || item.distance < 0 || typeof item.start_date_local !== 'string') return []
    // Entrega apenas os dados mínimos ao próprio atleta. Sem GPS, IDs, fotos, outras contas ou armazenamento.
    return [{
      date: item.start_date_local.slice(0, 10),
      sport: typeof item.sport_type === 'string' ? item.sport_type.slice(0, 32) : 'Atividade',
      km: Math.round(item.distance / 10) / 100
    }]
  })
}
