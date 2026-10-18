import React, { useState } from 'react'
import { Award, ChevronDown, ChevronUp, Gift, History, LogOut, Wallet, ArrowRight, Tag } from 'lucide-react'
import { BenefitNotice } from './ClubeExtras.jsx'
import './ClubeNPV.css'
import './ClubeRecompensas.css'
import './ClubeNPVOnline.css'
import './ClubeLiveHeader.css'

// Somente a branch de prévia importa este componente. Não usa Supabase nem autenticação.
// Valores ilustrativos servem unicamente para comparar dimensões com a tela real.
const SAMPLE_REWARDS = [
  {id:1,name:'Benefício especial',points:600,stock:4,active:true,test_only:false},
  {id:2,name:'Camiseta NPV',points:700,stock:8,active:true,test_only:false},
  {id:3,name:'Coqueteleira NPV',points:800,stock:5,active:true,test_only:false},
  {id:4,name:'Vale desconto NPV',points:950,stock:4,active:true,test_only:false},
  {id:5,name:'Kit NPV',points:1100,stock:2,active:true,test_only:false}
]
const tabs = [
  ['inicio','Visão geral',Wallet],
  ['historico','Histórico',History],
  ['recompensas','Recompensas',Gift],
  ['parceiros','Parceiros',Award]
]
export default function ClubeSpacingPreview(){
  const [tab,setTab]=useState('inicio')
  const [activitiesOpen,setActivitiesOpen]=useState(false)
  return <div className="clube-shell clube-live-student">
    <section className="clube-live-banner" aria-label="Cabeçalho do Clube de Benefícios NPV">
      <div className="clube-live-banner-top">
        <div className="clube-live-title"><span>Clube de</span><strong>Benefícios</strong></div>
        <a className="clube-live-signout" href="https://www.naopensevai.com/clube"><LogOut size={16}/> Sair</a>
      </div>
      <nav className="clube-live-tabs" aria-label="Navegação do Clube NPV">
        {tabs.map(([id,label,Icon])=><button key={id} type="button" className={tab===id?'active':''} onClick={()=>setTab(id)}><Icon size={17}/>{label}</button>)}
      </nav>
    </section>
    <div className="clube-container"><main className="clube-main">
      <div className="clube-intro"><div><div className="clube-eyebrow"><span/> MINHA CONTA NPV</div><h1>{tab==='inicio'?'Sua evolução vale pontos.':tab==='historico'?'Histórico de pontos':tab==='recompensas'?'Benefícios e recompensas':'Parceiros e descontos'}</h1><p>{tab==='inicio'?'Seu extrato de pontos e benefícios em um só lugar.':'Navegação ilustrativa para avaliar o novo visual.'}</p></div></div>
      {tab==='inicio'?<>
        <div className="clube-student-summary"><div><div className="clube-student-hello">OLÁ, NPV! ✦</div><p>SEUS PONTOS EM 2026</p><strong>1.170 <small>pontos</small></strong></div><Award size={90}/></div>
        <BenefitNotice rewards={SAMPLE_REWARDS} points={1170} onOpen={()=>setTab('recompensas')}/>
        <section className="clube-card clube-activities-card">
          <button type="button" className="clube-activities-toggle" aria-expanded={activitiesOpen} aria-controls="preview-activities" onClick={()=>setActivitiesOpen(open=>!open)}>
            <span><strong>Minhas atividades</strong><small>Meu extrato de pontos</small></span>
            <span className="clube-activities-chevron">{activitiesOpen?<ChevronUp size={21}/>:<ChevronDown size={21}/>}</span>
          </button>
          {activitiesOpen&&<div id="preview-activities" className="clube-activities-expanded"><p className="clube-empty">Extrato ilustrativo. Nenhuma movimentação real nesta prévia.</p></div>}
        </section>
        <section className="npv-shop npv-shop-featured" style={{marginTop:28}}>
          <div className="npv-shop-heading"><div><div className="npv-shop-eyebrow"><Gift size={15}/> LOJINHA DO CLUBE NPV</div><h2>Troque seus pontos ✦</h2><p>Seu próximo objetivo pode estar aqui.</p></div><button className="npv-shop-view-all" type="button" onClick={()=>setTab('recompensas')}>Ver catálogo <ArrowRight size={16}/></button></div>
          <div className="npv-shop-grid">
            <article className="npv-shop-card"><div className="npv-shop-art npv-shop-art-ink"><Gift size={82}/><span className="npv-shop-art-stamp">CLUBE NPV ✦</span></div><div className="npv-shop-info"><span className="npv-shop-category">EXCLUSIVO NPV</span><h3>Camiseta NPV</h3></div></article>
            <article className="npv-shop-card"><div className="npv-shop-art npv-shop-art-lime"><Gift size={82}/><span className="npv-shop-art-stamp">CLUBE NPV ✦</span></div><div className="npv-shop-info"><span className="npv-shop-category">EXCLUSIVO NPV</span><h3>Coqueteleira NPV</h3></div></article>
          </div>
        </section>
      </>:<section className="clube-card" style={{minHeight:160}}><h2>{tab==='historico'?'Meu extrato':tab==='parceiros'?'Parceiros NPV':'Vitrine de recompensas'}</h2><p>Esta é uma prévia somente visual. O conteúdo e as movimentações reais permanecem no site oficial.</p><button type="button" className="clube-btn clube-btn-outline" onClick={()=>setTab('inicio')}>Voltar à visão geral</button></section>}
      <footer className="clube-main-footer"><span>PRÉVIA VISUAL • Pontuação ilustrativa • Nenhuma movimentação real</span><span>Site oficial preservado.</span></footer>
    </main></div>
  </div>
