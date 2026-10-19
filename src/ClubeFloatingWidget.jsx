import React, {useEffect, useId, useState} from 'react'
import {ArrowRight, Award, ChevronDown, ChevronUp, Crown, Gift, Sparkles, Tag, Trophy, UserRound} from 'lucide-react'
import {clubeSupabase} from './clubeSupabase.js'
import './ClubeFloatingWidget.css'

// Versão de prévia. Não consulta nem publica rankings privados.
// Substituir estes dados exclusivamente por um endpoint de ranking público
// com consentimento e política de privacidade, em uma etapa posterior.
const RANKING_DEMO = [
  {id:'exemplo-a',nome:'Aluno exemplo A',iniciais:'A',pontos:1260},
  {id:'exemplo-b',nome:'Aluno exemplo B',iniciais:'B',pontos:980},
  {id:'exemplo-c',nome:'Aluno exemplo C',iniciais:'C',pontos:740}
]
const REWARDS_DEMO = [
  {id:'camiseta',name:'Camiseta NPV',hint:'Recompensa ilustrativa',icon:Gift},
  {id:'coqueteleira',name:'Coqueteleira NPV',hint:'Recompensa ilustrativa',icon:Award}
]
const PARTNERS_SHOWCASE = [
  {id:'cacow',name:'Cacow',hint:'Conheça as vantagens disponíveis'},
  {id:'liquidz',name:'Liquidz',hint:'Condições e benefícios no Clube'}
]
const points=n=>Number(n).toLocaleString('pt-BR')

function RankingPreview({compact=false}){
  return <div className={'npv-fw-ranking'+(compact?' npv-fw-ranking-compact':'')}>
    {RANKING_DEMO.slice(0,compact?2:3).map((entry,index)=><div className="npv-fw-rank" key={entry.id}>
      <span className="npv-fw-rank-position">{index+1}º</span>
      <span className={'npv-fw-avatar npv-fw-avatar-'+index} aria-hidden="true">{entry.iniciais}</span>
      <span className="npv-fw-rank-name">{entry.nome}</span>
      <strong>{points(entry.pontos)} <small>pts</small></strong>
    </div>)}
  </div>
}

export default function ClubeFloatingWidget(){
  const [open,setOpen]=useState(false)
  const [slide,setSlide]=useState(0)
  const [authenticated,setAuthenticated]=useState(false)
  const [paused,setPaused]=useState(false)
  const panelId=useId()

  useEffect(()=>{
    if(!clubeSupabase)return
    let mounted=true
    clubeSupabase.auth.getSession().then(({data,error})=>{
      if(mounted&&!error)setAuthenticated(Boolean(data?.session))
    }).catch(()=>{})
    const {data:{subscription}}=clubeSupabase.auth.onAuthStateChange((_event,session)=>{
      if(mounted)setAuthenticated(Boolean(session))
    })
    return()=>{mounted=false;subscription.unsubscribe()}
  },[])

  useEffect(()=>{
    if(open||paused||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return
    const timer=window.setInterval(()=>{
      if(!document.hidden)setSlide(previous=>(previous+1)%3)
    },6200)
    return()=>window.clearInterval(timer)
  },[open,paused])

  useEffect(()=>{
    if(!open)return
    const escape=event=>{if(event.key==='Escape')setOpen(false)}
    document.addEventListener('keydown',escape)
    return()=>document.removeEventListener('keydown',escape)
  },[open])

  const slides=[
    <div className="npv-fw-compact-feature" key="ranking">
      <span className="npv-fw-feature-title"><Trophy size={14}/> Ranking de pontos</span>
      <RankingPreview compact/>
    </div>,
    <div className="npv-fw-compact-feature" key="rewards">
      <span className="npv-fw-feature-title"><Gift size={14}/> Recompensas do Clube</span>
      <span className="npv-fw-feature-main">Camisetas, brindes e vantagens</span>
      <span className="npv-fw-feature-detail">Veja os benefícios na lojinha <ArrowRight size={13}/></span>
    </div>,
    <div className="npv-fw-compact-feature" key="partners">
      <span className="npv-fw-feature-title"><Tag size={14}/> Parceiros e descontos</span>
      <span className="npv-fw-feature-main">Cacow · Liquidz · parceiros NPV</span>
      <span className="npv-fw-feature-detail">Condições disponíveis no Clube <ArrowRight size={13}/></span>
    </div>
  ]

  return <aside className={'npv-floating-club'+(open?' npv-floating-club--expanded':'')}
    aria-label="Prévia do Clube de Benefícios NPV"
    onMouseEnter={()=>setPaused(true)} onMouseLeave={()=>setPaused(false)}
    onFocusCapture={()=>setPaused(true)} onBlurCapture={event=>{
      if(!event.currentTarget.contains(event.relatedTarget))setPaused(false)
    }}>
    <div className="npv-fw-shell">
      <button type="button" className="npv-fw-toggle" aria-expanded={open} aria-controls={panelId}
        onClick={()=>setOpen(value=>!value)} aria-label={open?'Recolher widget do Clube NPV':'Expandir widget do Clube NPV'}>
        <span className="npv-fw-emblem" aria-hidden="true"><Sparkles size={19} strokeWidth={1.8}/></span>
        <span className="npv-fw-heading">
          <span className="npv-fw-eyebrow">NÃO PENSE, VAI! <i aria-hidden="true">✦</i></span>
          <strong>Clube de Benefícios</strong>
          <small>{open?'Evolua. Acumule. Conquiste.':'Suas conquistas valem mais.'}</small>
        </span>
        <span className="npv-fw-toggle-icon" aria-hidden="true">{open?<ChevronDown size={17}/>:<ChevronUp size={17}/>}</span>
      </button>
      <div className="npv-fw-rule" aria-hidden="true"/>
      {!open&&<div className="npv-fw-collapsed" aria-label="Destaques do Clube NPV">
        {slides[slide]}
        <div className="npv-fw-footer"><span className="npv-fw-demo-chip">DEMONSTRAÇÃO</span>
          <span className="npv-fw-dots" aria-hidden="true">{slides.map((_,i)=><span key={i} className={slide===i?'is-active':''}/>)}</span>
        </div>
      </div>}
      <div id={panelId} className="npv-fw-expanded-content" aria-hidden={!open} inert={!open?'':undefined}>
        <div className="npv-fw-expanded-inner">
          <div className="npv-fw-section-head"><span><Crown size={16}/> Ranking do Clube</span><em>EXEMPLO</em></div>
          <RankingPreview/>
          <p className="npv-fw-disclaimer">Nomes e pontuações ilustrativos. Este ranking não representa alunos reais.</p>
          <div className="npv-fw-divider"/>
          <div className="npv-fw-section-head"><span><Gift size={16}/> Lojinha & recompensas</span><em>PRÉVIA</em></div>
          <div className="npv-fw-rewards">{REWARDS_DEMO.map(item=>{
            const Icon=item.icon
            return <div className="npv-fw-reward" key={item.id}>
              <span className="npv-fw-reward-icon"><Icon size={18}/></span>
              <span><strong>{item.name}</strong><small>{item.hint}</small></span>
            </div>
          })}</div>
          <div className="npv-fw-benefits"><Tag size={16}/><span>Descontos e benefícios em parceiros como {PARTNERS_SHOWCASE.map(item=>item.name).join(' e ')}. Consulte as condições no Clube.</span></div>
          <p className="npv-fw-about">Transforme sua constância em conquistas: acompanhe atividades, acumule pontos e descubra recompensas.</p>
          <a className="npv-fw-primary" href="/clube">{authenticated?'Acessar meus pontos':'Conhecer o Clube NPV'} <ArrowRight size={16}/></a>
          {!authenticated&&<a className="npv-fw-secondary" href="#planos">Conhecer planos e assinar <ArrowRight size={13}/></a>}
          {authenticated&&<p className="npv-fw-account-note"><UserRound size={13}/> Seu saldo real está disponível após entrar no Clube.</p>}
        </div>
      </div>
    </div>
  </aside>
}
