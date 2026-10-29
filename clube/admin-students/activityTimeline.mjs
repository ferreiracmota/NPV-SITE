// Histórico exclusivo do administrativo. Não altera o extrato nem calcula novos créditos.
const timestamp = date => {
  const value = Date.parse(date || '')
  return Number.isFinite(value) ? value : -1
}
export function buildStudentTimeline(events = [], requests = []) {
  const entries = []
  for (const item of events) {
    entries.push({
      key: 'point:' + item.id,
      kind: 'points',
      at: item.created_at,
      points: Number(item.points) || 0,
      eventType: item.event_type,
      note: item.note || ''
    })
  }
  for (const item of requests) {
    entries.push({
      key: 'request:' + item.id,
      kind: 'request',
      at: item.created_at,
      points: Number(item.points) || 0,
      rewardName: item.reward_name || 'Recompensa',
      status: item.status,
      isTest: item.is_test === true
    })
    if (item.status === 'approved' || item.status === 'rejected') {
      // Um resgate aprovado pode gerar uma linha de débito separada no extrato.
      // A decisão é informativa, NUNCA soma ou subtrai pontos novamente.
      entries.push({
        key: 'decision:' + item.id,
        kind: 'decision',
        at: item.resolved_at || null,
        points: 0,
        requestedPoints: Number(item.points) || 0,
        rewardName: item.reward_name || 'Recompensa',
        status: item.status,
        isTest: item.is_test === true
      })
    }
  }
  return entries.sort((a, b) =>
    timestamp(b.at) - timestamp(a.at) || a.key.localeCompare(b.key))
}
export function studentPointSummary(events = [], requests = []) {
  const balance = events.reduce((sum, item) => sum + (Number(item.points) || 0), 0)
  const reserved = requests.reduce((sum, item) =>
    sum + (item.status === 'pending' ? Number(item.points) || 0 : 0), 0)
  return { balance, reserved, available: Math.max(0, balance - reserved) }
}
