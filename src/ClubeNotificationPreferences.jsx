import { useEffect, useState } from 'react'
import { clubeSupabase as supabase } from './clubeSupabase.js'

// O consentimento é individual e começa DESLIGADO; nenhuma opção é pré-marcada.
export default function ClubeNotificationPreferences({ userId }) {
  const [p, setP] = useState({ reward_ready: false, new_reward: false, opted_in_at: null })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  useEffect(() => {
    let alive = true
    setLoading(true)
    supabase.from('clube_notification_preferences')
      .select('reward_ready,new_reward,opted_in_at').eq('student_id', userId).maybeSingle()
      .then(({data,error}) => {
        if (!alive) return
        if (error) setMessage('Não foi possível consultar suas preferências.')
        else if (data) setP(data)
      }).catch(() => { if (alive) setMessage('Preferências temporariamente indisponíveis.') })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [userId])
  async function change(key, value) {
    if (saving || loading) return
    setSaving(true); setMessage('')
    const next = { ...p, [key]: value }
    const now = new Date().toISOString()
    // Sempre que aceitar uma nova categoria, iniciar a partir do momento do aceite.
    const opted = value ? now : next.opted_in_at
    const row = {
      student_id: userId, reward_ready: Boolean(next.reward_ready),
      new_reward: Boolean(next.new_reward), opted_in_at: opted, updated_at: now
    }
    try {
      const {error} = await supabase.from('clube_notification_preferences').upsert(row, {onConflict:'student_id'})
      if (error) throw error
      setP({reward_ready:row.reward_ready,new_reward:row.new_reward,opted_in_at:row.opted_in_at})
      setMessage('Preferências salvas.')
    } catch { setMessage('Não foi possível salvar. Tente novamente.') }
    finally { setSaving(false) }
  }
  return <section className="clube-card" id="avisos-email-npv" style={{marginTop:22}}>
    <div className="clube-card-head"><div>
      <h2>Novidades por e-mail ✦</h2>
      <p>Escolha os avisos que quer receber do Clube. Você pode desativá-los a qualquer momento.</p>
    </div></div>
    <div style={{display:'grid',gap:14,paddingTop:12}}>
      <label style={{display:'flex',alignItems:'flex-start',gap:12,cursor:'pointer'}}>
        <input type="checkbox" checked={Boolean(p.reward_ready)} disabled={loading||saving}
          onChange={e=>change('reward_ready',e.target.checked)} style={{marginTop:5}}/>
        <span><strong>Prêmio pronto para resgatar</strong><small style={{display:'block',opacity:.75}}>Quando meus novos pontos liberarem um prêmio real e disponível.</small></span>
      </label>
      <label style={{display:'flex',alignItems:'flex-start',gap:12,cursor:'pointer'}}>
        <input type="checkbox" checked={Boolean(p.new_reward)} disabled={loading||saving}
          onChange={e=>change('new_reward',e.target.checked)} style={{marginTop:5}}/>
        <span><strong>Prêmio novo na lojinha</strong><small style={{display:'block',opacity:.75}}>Quando uma recompensa real e disponível for adicionada.</small></span>
      </label>
    </div>
    <small style={{display:'block',marginTop:14,opacity:.72}}>Apenas prêmios ativos, com estoque e fora do modo teste. Os avisos não são retroativos.</small>
    {message && <p role="status" style={{marginTop:8,fontSize:13}}>{message}</p>}
  </section>
}
