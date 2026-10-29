import React, { useEffect, useMemo, useState } from 'react'
import { Check, Footprints, Info, Save, SlidersHorizontal } from 'lucide-react'
import { clubeSupabase as supabase } from './clubeSupabase.js'
import { summarizeCandidateMonth } from '../clube/strava/monthlyCandidate.mjs'
import './ClubeKmSetup.css'

const SPORTS = [
  { id: 'Run', label: 'Corrida' },
  { id: 'Walk', label: 'Caminhada' },
  { id: 'Ride', label: 'Bicicleta' }
]
const DEFAULT = { points_per_km: '1', eligible_sports: ['Run', 'Walk', 'Ride'] }
const EXAMPLE = [
  { id: 'exemplo-1', start_date_local: '2026-09-08T07:30:00Z', sport_type: 'Run', distance: 5000, manual: false },
  { id: 'exemplo-2', start_date_local: '2026-09-18T06:30:00Z', sport_type: 'Run', distance: 7500, manual: false },
  { id: 'exemplo-3', start_date_local: '2026-09-21T17:30:00Z', sport_type: 'Walk', distance: 2500, manual: false }
]
const numberPt = n => Number(n || 0).toLocaleString('pt-BR', { maximumFractionDigits: 3 })

export default function ClubeKmSetup() {
  const [config, setConfig] = useState(DEFAULT)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [available, setAvailable] = useState(false)

  useEffect(() => {
    let live = true
    supabase.from('clube_km_settings')
      .select('points_per_km,eligible_sports')
      .eq('singleton', true)
      .maybeSingle()
      .then(({ data, error: dbError }) => {
        if (!live) return
        if (dbError || !data) {
          setError('Configuração ainda não disponível neste ambiente. Nenhum ponto foi alterado.')
        } else {
          setConfig({ points_per_km: String(data.points_per_km), eligible_sports: data.eligible_sports })
          setAvailable(true)
        }
      })
      .catch(() => {
        if (live) setError('Não foi possível consultar a configuração de quilômetros.')
      })
      .finally(() => { if (live) setIsLoading(false) })
    return () => { live = false }
  }, [])

  const rate = Number(config.points_per_km)
  const valid = config.points_per_km.trim() !== '' && Number.isFinite(rate)
    && rate >= 0 && rate <= 10000 && config.eligible_sports.length > 0
  const summary = useMemo(() => {
    if (!valid) return null
    return summarizeCandidateMonth(EXAMPLE, {
      year: 2026, month: 9, pointsPerKm: rate,
      eligibleSportTypes: config.eligible_sports, memberOfNpvClub: true
    })
  }, [valid, rate, config.eligible_sports])

  function toggleSport(id) {
    setSuccess('')
    setConfig(prev => ({
      ...prev,
      eligible_sports: prev.eligible_sports.includes(id)
        ? prev.eligible_sports.filter(x => x !== id)
        : [...prev.eligible_sports, id]
    }))
  }

  async function save(event) {
    event.preventDefault()
    if (!valid || !available || isSaving) return
    setIsSaving(true)
    setError('')
    setSuccess('')
    try {
      const { data, error: dbError } = await supabase.from('clube_km_settings')
        .update({
          points_per_km: rate, eligible_sports: config.eligible_sports,
          updated_at: new Date().toISOString()
        })
        .eq('singleton', true)
        .select('points_per_km,eligible_sports')
        .single()
      if (dbError) throw dbError
      setConfig({ points_per_km: String(data.points_per_km), eligible_sports: data.eligible_sports })
      setSuccess('Regra salva. A nova taxa valerá nas próximas conciliações de quilômetros, respeitando o limite mensal.')
    } catch {
      setError('Não foi possível salvar. Confira sua permissão de administrador e tente novamente.')
    } finally {
      setIsSaving(false)
    }
  }

  return <section className="npv-km-card" aria-labelledby="npv-km-heading">
    <div className="npv-km-head">
      <span className="npv-km-icon"><Footprints size={20}/></span>
      <div>
        <span className="npv-km-overline">REGRAS DO CLUBE NPV</span>
        <h2 id="npv-km-heading">Pontos por quilômetro</h2>
        <p>Configure a pontuação automática para corrida, caminhada e bicicleta verificadas no Strava.</p>
      </div>
    </div>
    <form onSubmit={save} className="npv-km-form">
      <label className="npv-km-rate">
        <span>Pontos por km</span>
        <input type="number" min="0" max="10000" step="0.001" inputMode="decimal"
          value={config.points_per_km}
          disabled={isLoading || !available || isSaving}
          onChange={e => { setSuccess(''); setConfig(p => ({ ...p, points_per_km: e.target.value })) }}/>
      </label>
      <fieldset className="npv-km-sports" disabled={isLoading || !available || isSaving}>
        <legend>Modalidades que geram pontos</legend>
        {SPORTS.map(sport => <label key={sport.id}>
          <input type="checkbox" checked={config.eligible_sports.includes(sport.id)}
            onChange={() => toggleSport(sport.id)}/> {sport.label}
        </label>)}
      </fieldset>
      <div className="npv-km-preview">
        <div><SlidersHorizontal size={17}/><strong>Exemplo fictício de setembro de 2026</strong></div>
        <p>5 km de corrida + 7,5 km de corrida + 2,5 km de caminhada</p>
        <div className="npv-km-result">
          <span>{summary ? numberPt(summary.totalKm) : '—'} km elegíveis</span>
          <strong>{summary ? '+' + numberPt(Math.min(200,summary.candidatePoints)) : '—'} pontos</strong>
        </div>
        <small>Simulação (sem lançamentos): pontos inteiros por mês, limitados a 200 pts/mês. Não são dados de alunos.</small>
      </div>
      {error && <p className="npv-km-error" role="alert">{error}</p>}
      {success && <p className="npv-km-success" role="status"><Check size={15}/> {success}</p>}
      <div className="npv-km-foot">
        <span><Info size={16}/> Este editor não consulta o Strava nem altera saldos. O crédito ocorre após a consulta real da conta da aluna.</span>
        <button type="submit" className="clube-btn clube-btn-primary" disabled={!valid || !available || isSaving}>
          <Save size={16}/> {isSaving ? 'Salvando...' : 'Salvar regra'}
        </button>
      </div>
    </form>
  </section>
}
