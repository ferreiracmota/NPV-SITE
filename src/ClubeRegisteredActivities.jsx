import React, { useEffect, useState } from 'react'
import { ChevronDown, ChevronUp, Footprints, LockKeyhole, Eye, EyeOff, CheckCircle2, RefreshCw } from 'lucide-react'
import { clubeSupabase as supabase } from './clubeSupabase.js'
import { currentNpvMonth, challengeBar } from '../clube/strava/challengeProgress.mjs'
import './ClubeRegisteredActivities.css'
import './ClubeMonthlyChallengeBar.css'

const SAMPLE = [
  { id: 1, label: 'Corrida', when: '04 de outubro', km: 8.0, symbol: '🏃' },
  { id: 2, label: 'Pedalada', when: '09 de outubro', km: 13.5, symbol: '🚴' },
  { id: 3, label: 'Caminhada', when: '14 de outubro', km: 8.0, symbol: '🚶' }
]
const format=v=>Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:2})
const formatPoints=v=>Number(v||0).toLocaleString('pt-BR',{maximumFractionDigits:0})
const sportName={Run:'Corrida',Walk:'Caminhada',Ride:'Bicicleta',VirtualRun:'Corrida virtual',VirtualRide:'Bicicleta virtual',Hike:'Trilha'}
const sportIcon={Run:'🏃',Walk:'🚶',Ride:'🚴',VirtualRun:'🏃',VirtualRide:'🚴',Hike:'🥾'}
const readableDate=v=>/^\d{4}-\d{2}-\d{2}$/.test(v||'')
  ? v.split('-').reverse().join('/') : 'Data indisponível'

export default function ClubeRegisteredActivities({session}) {
  const [expanded,setExpanded]=useState(()=>new URLSearchParams(window.location.search).has('strava'))
  const [preview,setPreview]=useState(false)
  const [status,setStatus]=useState({connected:false,disabled:false,activities:[]})
  const [busy,setBusy]=useState(false)
  const [loading,setLoading]=useState(false)
  const [goal,setGoal]=useState({loaded:false,km:null,active:false,reward:300})
  const [error,setError]=useState('')
  const token=session?.access_token
  const activities=Array.isArray(status.activities)?status.activities:[]
  const totalKm=activities.reduce((sum,a)=>sum+Number(a.km||0),0)
  const monthKey=currentNpvMonth()
  const monthData=status.connected&&status.monthly?.monthKey===monthKey?status.monthly:null
  const monthKm=monthData&&Number.isFinite(Number(monthData.km))?Number(monthData.km):null
  const monthlyGoal=goal.active&&Number.isFinite(Number(goal.km))&&Number(goal.km)>0?Number(goal.km):null
  const progress=monthKm!==null&&monthlyGoal!==null?challengeBar(monthKm,monthlyGoal):{valid:false,percentage:0,completed:false}
  useEffect(()=>{
    let live=true
    setGoal({loaded:false,km:null,active:false,reward:300})
    supabase.from('clube_monthly_challenges').select('goal_km,active,reward_points')
      .eq('month_key',monthKey).maybeSingle()
      .then(({data,error:dbError})=>{
        if(!live)return
        if(dbError||!data)setGoal({loaded:true,km:null,active:false,reward:300})
        else setGoal({loaded:true,km:Number(data.goal_km),active:!!data.active,reward:Number(data.reward_points)||300})
      })
      .catch(()=>{if(live)setGoal({loaded:true,km:null,active:false,reward:300})})
    return()=>{live=false}
  },[monthKey,token])

  async function readStatus(signal) {
    if(!token)return
    setLoading(true)
    setError('')
    try{
      const response=await fetch('/api/strava/status',{
        headers:{Authorization:'Bearer '+token},
        credentials:'same-origin',signal
      })
      if(!response.ok)throw new Error('Falha ao consultar conexão')
      const data=await response.json()
      if(!signal?.aborted){
        setStatus({connected:!!data.connected,disabled:!!data.disabled,activities:data.activities||[],monthly:data.monthly||null})
        if(data.error)setError(data.error)
      }
    }catch(e){
      if(e?.name!=='AbortError'&&!signal?.aborted)setError('Não foi possível verificar a conexão. Tente atualizar.')
    }finally{if(!signal?.aborted)setLoading(false)}
  }

  // A primeira consulta também acontece com o card fechado: o resumo usa apenas
  // quilômetros reais já retornados pela própria conta, nunca dados fictícios.
  const checkedOnce=React.useRef(false)
  useEffect(()=>{
    if(!token){checkedOnce.current=false;return}
    if(!expanded&&checkedOnce.current)return
    checkedOnce.current=true
    const controller=new AbortController()
    readStatus(controller.signal)
    return()=>controller.abort()
  },[expanded,token])

  async function connect(){
    if(!token||busy||status.disabled)return
    setBusy(true);setError('')
    try{
      const response=await fetch('/api/strava/connect',{
        method:'POST',
        headers:{Authorization:'Bearer '+token},
        credentials:'same-origin'
      })
      const data=await response.json()
      if(!response.ok||!data.authorize_url)throw new Error(data.error||'Não foi possível iniciar a conexão')
      // No mesmo navegador: a autorização do Strava devolve o aluno ao Clube NPV.
      window.location.assign(data.authorize_url)
    }catch(e){setError(e.message||'Falha ao iniciar o Strava.');setBusy(false)}
  }

  async function disconnect(){
    if(!token||busy)return
    setBusy(true);setError('')
    try{
      const response=await fetch('/api/strava/status',{
        method:'POST',headers:{Authorization:'Bearer '+token},credentials:'same-origin'
      })
      const data=await response.json()
      if(!response.ok)throw new Error('Não foi possível desconectar')
      setStatus({connected:false,activities:[]})
      if(!data.revoked)setError('Desconectado deste navegador. Você também pode revogar o acesso em strava.com/settings/apps.')
    }catch(e){setError(e.message||'Erro ao desconectar.')}finally{setBusy(false)}
  }

  return <section className="clube-card clube-activities-card npv-strava-activities" aria-label="Atividades registradas">
    <button type="button" className="clube-activities-toggle npv-strava-hero-trigger" aria-expanded={expanded}
      aria-controls="npv-registered-activity-content" onClick={()=>setExpanded(v=>!v)}>
      <span className="npv-strava-hero-icon" aria-hidden="true"><Footprints size={25} strokeWidth={2.15}/></span>
      <span className="npv-strava-hero-copy">
        <span className="npv-strava-hero-eyebrow">SEU ESPAÇO DE PERFORMANCE <span aria-hidden="true">✦</span></span>
        <strong>Atividades registradas</strong>
        <small>Seus treinos, quilômetros e evolução em um só lugar.</small>
        <span className="npv-strava-hero-meta" aria-live="polite">
          <span className={'npv-strava-hero-indicator'+(status.connected?' is-active':'')} aria-hidden="true"/>
          <span>{loading?'Atualizando conexão...':status.connected?'Strava conectado':status.disabled?'Strava em preparação':'Seu Strava, suas conquistas'}</span>
          {status.connected
            ?<span className="npv-strava-hero-metric"><b>{format(totalKm)} km</b><span>nos últimos 7 dias</span></span>
            :<span className="npv-strava-hero-sports">Corrida · caminhada · bicicleta</span>}
        </span>
        <span className="npv-strava-challenge" role="group" aria-label="Desafio do mês">
          <span className="npv-strava-challenge-top">
            <span className="npv-strava-challenge-title">DESAFIO DO MÊS</span>
            {monthlyGoal!==null&&<span className="npv-strava-challenge-reward" aria-label={`Recompensa prevista de ${goal.reward} pontos ao completar a meta`}>
              <span aria-hidden="true">✦</span> +{formatPoints(goal.reward)} pts
            </span>}
          </span>
          <span className="npv-strava-challenge-status">{progress.valid
              ?(progress.completed?'Meta alcançada ✦':format(monthKm)+' de '+format(monthlyGoal)+' km')
              :(monthKm!==null?format(monthKm)+' km percorridos':status.connected?'Consultando quilômetros...':status.disabled?'Integração Strava em preparação':'Conecte seu Strava')}</span>
          <span className={'npv-strava-challenge-track'+(progress.completed?' is-complete':'')}
            role="progressbar" aria-label="Progresso do desafio do mês"
            aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.valid?progress.percentage:undefined}
            aria-valuetext={progress.valid?format(monthKm)+' de '+format(monthlyGoal)+' quilômetros':'Meta do desafio ainda não disponível'}>
            <span className="npv-strava-challenge-fill" style={{width:(progress.valid?progress.percentage:0)+'%'}}/>
          </span>
          <span className="npv-strava-challenge-caption">
            {progress.valid?(progress.completed
              ?'Meta alcançada! Recompensa prevista: '+goal.reward+' pontos (crédito ainda não automático).'
              :format(monthlyGoal-monthKm>0?Math.max(0,monthlyGoal-monthKm):0)+' km para completar o desafio')
              :(!goal.loaded?'Carregando meta do desafio...':monthlyGoal===null?'Meta mensal a definir pelo clube':!status.connected?status.disabled?'A conexão com o Strava ainda será liberada nesta versão.': 'Conecte-se para acompanhar sua evolução':monthKm===null?'Aguardando dados reais do Strava':'Atualize as atividades para conferir o progresso')}
          </span>
        </span>
      </span>
      <span className="npv-strava-hero-action" aria-hidden="true">
        <span>{expanded?'Recolher':'Ver detalhes'}</span>
        <span className="npv-strava-hero-arrow">{expanded?<ChevronUp size={20}/>:<ChevronDown size={20}/>}</span>
      </span>
    </button>
    {expanded&&<div id="npv-registered-activity-content" className="clube-activities-expanded npv-strava-detail">
      <div className={'npv-strava-connection'+(status.connected?' npv-strava-connected':'')} role="status">
        <div className="npv-strava-status-icon">{status.connected?<CheckCircle2 size={19}/>:<LockKeyhole size={19}/>}</div>
        <div><strong>{loading?'Verificando suas atividades...':status.connected?'Sua conta Strava está conectada':status.disabled?'Strava ainda não disponível nesta versão':'Strava ainda não conectado'}</strong>
          <p>{status.connected?'Atividades consultadas diretamente da sua conta. Nenhum ponto é gerado automaticamente nesta fase.':status.disabled?'O painel do desafio está ativo; a leitura automática do Strava será habilitada após configurar e homologar a integração oficial.':'Você pode conectar sua conta para consultar suas atividades reais nesta área.'}</p>
        </div>
      </div>
      {error&&<p className="npv-strava-feedback" role="alert">{error}</p>}
      {status.connected?<>
        <div className="npv-strava-example-head npv-strava-live-heading"><span><Footprints size={17}/> ÚLTIMOS 7 DIAS</span><strong>{format(totalKm)} km</strong></div>
        {activities.length?activities.map((item,i)=><div className="npv-strava-example-row" key={i}>
          <span aria-hidden="true">{sportIcon[item.sport]||'🏅'}</span>
          <div><strong>{sportName[item.sport]||item.sport||'Atividade'}</strong><small>{readableDate(item.date)} · Strava</small></div>
          <b>{format(item.km)} km</b>
        </div>):<p className="npv-strava-pilot-note">Nenhuma atividade disponível nos últimos sete dias para a permissão concedida.</p>}
        <div className="npv-strava-actions">
          <button type="button" className="npv-strava-example-button" disabled={busy||loading} onClick={()=>readStatus()}><RefreshCw size={16}/> Atualizar atividades</button>
          <button type="button" className="npv-strava-disconnect" disabled={busy} onClick={disconnect}>Desconectar</button>
        </div>
      </>:<>
        <button type="button" className="npv-strava-connect-button" disabled={busy||loading||!token||status.disabled} onClick={connect}>{status.disabled?'Conexão Strava em preparação':busy?'Abrindo Strava...':'Conectar minha conta Strava ↗'}</button>
        <p className="npv-strava-pilot-note">Ao conectar, você autoriza a leitura de data, modalidade e distância das suas atividades. O NPV não armazena o histórico nesta etapa. Você pode desconectar quando quiser.</p>
        <button type="button" className="npv-strava-example-button" onClick={()=>setPreview(v=>!v)}>
          {preview?<EyeOff size={16}/>:<Eye size={16}/>}
          {preview?'Ocultar exemplo':'Visualizar exemplo fictício'}
        </button>
        {preview&&<div className="npv-strava-example">
          <div className="npv-strava-example-head"><span><Footprints size={17}/> EXEMPLO FICTÍCIO — OUTUBRO</span><strong>{format(29.5)} km</strong></div>
          {SAMPLE.map(item=><div className="npv-strava-example-row" key={item.id}>
            <span aria-hidden="true">{item.symbol}</span><div><strong>{item.label}</strong><small>{item.when} · demonstração</small></div><b>{format(item.km)} km</b>
          </div>)}
          <p>Somente demonstração, sem dados reais ou créditos.</p>
        </div>}
      </>}
      <p className="npv-strava-privacy"><a href="https://www.strava.com/settings/apps" target="_blank" rel="noopener noreferrer">Gerenciar permissões no Strava ↗</a> · A conexão de teste fica salva somente neste navegador por até 30 dias. Seus pontos e resgates não são alterados.</p>
    </div>}
  </section>
}
