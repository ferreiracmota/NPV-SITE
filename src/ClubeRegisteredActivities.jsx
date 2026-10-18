import React, { useState } from 'react'
import { ChevronDown, ChevronUp, Footprints, LockKeyhole, Eye, EyeOff } from 'lucide-react'
import './ClubeRegisteredActivities.css'

// Prévia de interface no Clube NPV: nenhum dado fictício entra no banco ou nos pontos.
const SAMPLE = [
  { id: 1, label: 'Corrida', when: '04 de outubro', km: 8.0, symbol: '🏃' },
  { id: 2, label: 'Pedalada', when: '09 de outubro', km: 13.5, symbol: '🚴' },
  { id: 3, label: 'Caminhada', when: '14 de outubro', km: 8.0, symbol: '🚶' }
]

const format = v => v.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

export default function ClubeRegisteredActivities() {
  const [expanded, setExpanded] = useState(false)
  const [preview, setPreview] = useState(false)
  return <section className="clube-card clube-activities-card npv-strava-activities" aria-label="Atividades registradas">
    <button type="button" className="clube-activities-toggle" aria-expanded={expanded}
      aria-controls="npv-registered-activity-content" onClick={() => setExpanded(v => !v)}>
      <span>
        <strong>Atividades registradas</strong>
        <small>Seus quilômetros de corrida, caminhada e bicicleta</small>
      </span>
      <span className="clube-activities-chevron">{expanded ? <ChevronUp size={21}/> : <ChevronDown size={21}/>}</span>
    </button>
    {expanded && <div id="npv-registered-activity-content" className="clube-activities-expanded npv-strava-detail">
      <div className="npv-strava-connection" role="status">
        <div className="npv-strava-status-icon"><LockKeyhole size={19}/></div>
        <div><strong>Strava ainda não conectado</strong><p>A conexão automática está sendo preparada. Nenhuma atividade sua foi consultada ou pontuada.</p></div>
      </div>
      <a className="npv-strava-connect-button" href="/api/strava/pilot" target="_blank" rel="noopener noreferrer" aria-label="Testar conexão e conferir minhas atividades no Strava (abre em uma nova aba)">Conectar ao Strava — testar meus quilômetros ↗</a>
      <p className="npv-strava-pilot-note">Primeiro teste: somente leitura das atividades da própria conta. Nenhum ponto é creditado.</p>
      <button type="button" className="npv-strava-example-button" onClick={() => setPreview(v => !v)}>
        {preview ? <EyeOff size={16}/> : <Eye size={16}/>}
        {preview ? 'Ocultar exemplo' : 'Visualizar exemplo de atividades'}
      </button>
      {preview && <div className="npv-strava-example" aria-label="Exemplo fictício de atividades">
        <div className="npv-strava-example-head">
          <span><Footprints size={17}/> EXEMPLO FICTÍCIO — OUTUBRO</span>
          <strong>{format(29.5)} km</strong>
        </div>
        {SAMPLE.map(item => <div className="npv-strava-example-row" key={item.id}>
          <span aria-hidden="true">{item.symbol}</span>
          <div><strong>{item.label}</strong><small>{item.when} · somente demonstração</small></div>
          <b>{format(item.km)} km</b>
        </div>)}
        <p>Estes registros são apenas uma demonstração de como ficará a área do aluno. Não são atividades reais e não geram pontos.</p>
      </div>}
    </div>}
  </section>
}
