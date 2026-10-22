import React, {useEffect, useId, useRef, useState} from 'react'
import {ArrowRight, Award, ChevronDown, ChevronUp, Crown, Gift, Sparkles, Tag, Trophy, UserRound} from 'lucide-react'
import {clubeSupabase} from './clubeSupabase.js'
import {partnerLogo} from './ClubeExtras.jsx'
import {DEFAULT_WIDGET,WIDGET_SCOPE,normalizeWidget,widgetGlassStyle,widgetPublicImage} from './ClubeSiteWidgetConfig.js'
import './ClubeFloatingWidget.css'

// Fallback aprovado quando nao ha configuracao publicada.
const REWARDS_DEMO=[
  {id:'camiseta',name:'Camiseta NPV',hint:'Recompensa ilustrativa',icon:Gift},
  {id:'coqueteleira',name:'Coqueteleira NPV',hint:'Recompensa ilustrativa',icon:Award}
]
const PARTNERS_SHOWCASE=[{name:'Cacow'},{name:'Liquidz'}]
const points=n=>Number(n).toLocaleString('pt-BR')

function RankingPreview({compact=false,ranking=[]}){
  return <div className={'npv-fw-ranking'+(compact?' npv-fw-ranking-compact':'')}>
    {ranking.slice(0,compact?2:3).map((entry,index)=><div className="npv-fw-rank" key={entry.id}>
      <span className="npv-fw-rank-position">{index+1}º</span>
      <span className={'npv-fw-avatar npv-fw-avatar-'+index} aria-hidden="true">{widgetPublicImage(clubeSupabase,entry.avatar_path)?<img src={widgetPublicImage(clubeSupabase,entry.avatar_path)} alt="" className="npv-fw-avatar-photo" loading="lazy"/>:(entry.id?.startsWith('exemplo-')?String.fromCharCode(65+index):entry.name?.trim()?.charAt(0)?.toUpperCase()||'A')}</span>
      <span className="npv-fw-rank-name">{entry.name}</span>
      <strong>{points(entry.points)} <small>pts</small></strong>
    </div>)}
  </div>
}

export default function ClubeFloatingWidget({configOverride=null,forceVisible=false}){
  const [open,setOpen]=useState(false)
  const widgetRef=useRef(null)
  const [slide,setSlide]=useState(0)
  const [authenticated,setAuthenticated]=useState(false)
  const [paused,setPaused]=useState(false)
  const [remote,setRemote]=useState(null)
  const config=normalizeWidget(configOverride||remote||DEFAULT_WIDGET)
  const rewardList=(config.rewards.length?config.rewards:REWARDS_DEMO)
  const partnerList=(config.partners.length?config.partners:PARTNERS_SHOWCASE)
  const glassStyle=widgetGlassStyle(config.visual)
  const panelId=useId()

  useEffect(()=>{
    if(configOverride||!clubeSupabase)return
    let alive=true
    async function load(){
      try{
        const {data,error}=await clubeSupabase.rpc('clube_site_widget_public',{p_scope:WIDGET_SCOPE})
        if(error)throw error
        if(alive)setRemote(data||null)
      }catch{/* Falha de rede nao afeta o site: visual aprovado permanece. */}
    }
    load()
    const timer=window.setInterval(load,60000)
    return()=>{alive=false;window.clearInterval(timer)}
  },[configOverride])
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
    },2000)
    return()=>window.clearInterval(timer)
  },[open,paused])

  useEffect(()=>{
    if(!open)return
    const escape=event=>{if(event.key==='Escape')setOpen(false)}
    // Capture pointerdown catches mouse, touch and pen. Interactions inside remain open.
    const outside=event=>{
      if(widgetRef.current&&!widgetRef.current.contains(event.target))setOpen(false)
    }
    document.addEventListener('keydown',escape)
    document.addEventListener('pointerdown',outside,true)
    return()=>{
      document.removeEventListener('keydown',escape)
      document.removeEventListener('pointerdown',outside,true)
    }
  },[open])

  const slides=[
    <div className="npv-fw-compact-feature" key="ranking">
      <span className="npv-fw-feature-title"><Trophy size={14}/> Ranking de pontos</span>
      <RankingPreview compact ranking={config.ranking}/>
    </div>,
    <div className="npv-fw-compact-feature" key="rewards">
      <span className="npv-fw-feature-title"><Gift size={14}/> Recompensas do Clube</span>
      <span className="npv-fw-feature-main">{config.rewards.length?rewardList.map(x=>x.name).join(' · '):'Camisetas, brindes e vantagens'}</span>
      <span className="npv-fw-feature-detail">Veja os benefícios na lojinha <ArrowRight size={13}/></span>
    </div>,
    <div className="npv-fw-compact-feature" key="partners">
      <span className="npv-fw-feature-title"><Tag size={14}/> Parceiros e descontos</span>
      <span className="npv-fw-feature-main">{config.partners.length?partnerList.map(x=>x.name).join(' · '):'Cacow · Liquidz · parceiros NPV'}</span>
      <span className="npv-fw-feature-detail">Condições disponíveis no Clube <ArrowRight size={13}/></span>
    </div>
  ]

  if(!config.enabled&&!forceVisible)return null
  return <aside ref={widgetRef} className={'npv-floating-club'+(open?' npv-floating-club--expanded':'')}
    aria-label="Prévia do Clube de Benefícios NPV"
    onMouseEnter={()=>setPaused(true)} onMouseLeave={()=>setPaused(false)}
    onFocusCapture={()=>setPaused(true)} onBlurCapture={event=>{
      if(!event.currentTarget.contains(event.relatedTarget))setPaused(false)
    }}>
    <div className="npv-fw-shell" style={glassStyle}>
      <button type="button" className="npv-fw-toggle" aria-expanded={open} aria-controls={panelId}
        onClick={()=>setOpen(value=>!value)} aria-label={open?'Recolher widget do Clube NPV':'Expandir widget do Clube NPV'}>
        <span className="npv-fw-emblem" aria-hidden="true">{widgetPublicImage(clubeSupabase,config.logo_path)?<img className="npv-fw-logo-upload" src={widgetPublicImage(clubeSupabase,config.logo_path)} alt=""/>:<Sparkles size={19} strokeWidth={1.8}/>}</span>
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
        <div className="npv-fw-footer">
          <span className="npv-fw-dots" aria-hidden="true">{slides.map((_,i)=><span key={i} className={slide===i?'is-active':''}/>)}</span>
        </div>
      </div>}
      <div id={panelId} className="npv-fw-expanded-content" aria-hidden={!open} inert={!open?'':undefined}>
        <div className="npv-fw-expanded-inner">
          <a className="npv-fw-primary npv-fw-cta-top" href="/clube">{authenticated?'Acessar meus pontos':'Conhecer o Clube NPV'} <ArrowRight size={16}/></a>
          <div className="npv-fw-section-head" title="Participantes e pontuações de exemplo, não representam alunos reais."><span><Crown size={16}/> Ranking do Clube</span></div>
          <RankingPreview ranking={config.ranking}/>
          <p className="npv-fw-disclaimer">E você? Quantos pontos já acumulou?</p>
          <div className="npv-fw-divider"/>
          <div className="npv-fw-section-head"><span><Gift size={16}/> Lojinha & recompensas</span></div>
          <div className="npv-fw-rewards">{rewardList.map(item=>{
            const Icon=typeof item.icon==='function'?item.icon:Gift
            const photo=widgetPublicImage(clubeSupabase,item.image_path)
            return <div className={'npv-fw-reward'+(photo?' npv-fw-reward--photo':' npv-fw-reward--no-photo')} key={item.id}>
              <span className="npv-fw-reward-icon" aria-hidden="true">{photo?<img className="npv-fw-reward-photo" src={photo} alt="" loading="lazy"/>:<Icon size={46} strokeWidth={1.2}/>}</span>
              <span className="npv-fw-reward-copy"><strong>{item.name}</strong><small>{item.hint||((item.points||0).toLocaleString('pt-BR')+' pontos')}</small></span>
            </div>
          })}</div>
          <div className="npv-fw-benefits"><Tag size={16}/><span>{config.partners.length>0&&<span className="npv-fw-partner-logos">{partnerList.map(item=>partnerLogo(item)&&<img src={partnerLogo(item)} alt={item.name} key={item.id} loading="lazy"/>)}</span>}Descontos e benefícios em parceiros como {partnerList.map(item=>item.name+(item.discount_percent?' ('+item.discount_percent+'% de desconto)':'')).join(' e ')}. Consulte as condições no Clube.</span></div>
          <p className="npv-fw-about">Transforme sua constância em conquistas: acompanhe atividades, acumule pontos e descubra recompensas.</p>
          {!authenticated&&<a className="npv-fw-secondary" href="#planos">Conhecer planos e assinar <ArrowRight size={13}/></a>}
          {authenticated&&<p className="npv-fw-account-note"><UserRound size={13}/> Seu saldo real está disponível após entrar no Clube.</p>}
        </div>
      </div>
    </div>
  </aside>
}
