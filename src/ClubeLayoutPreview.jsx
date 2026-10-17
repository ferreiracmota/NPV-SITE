import React, { useState } from 'react'
import { ArrowLeft, ArrowRight, Award, Check, ChevronDown, ChevronUp, ExternalLink, Gift, History, LogOut, Package, ShieldCheck, Sparkles, Ticket, Users, Wallet, X } from 'lucide-react'
import { PartnerCards } from './ClubeExtras.jsx'
import './ClubeNPV.css'
import './ClubeRecompensas.css'
import './ClubeExtras.css'
import './ClubeNPVOnline.css'
import './ClubeLayoutPreview.css'

// Prévia visual independente. Não acessa o Supabase e não grava pontos ou resgates.
const activities=[
  {id:1,title:'Indicação convertida',date:'16 de out. de 2026',points:150},
  {id:2,title:'Indicação convertida',date:'16 de out. de 2026',points:150},
  {id:3,title:'Resgate de recompensa',date:'15 de out. de 2026',points:-300,note:'Benefício especial'},
  {id:4,title:'Indicação convertida',date:'15 de out. de 2026',points:150},
  {id:5,title:'Aniversário como assinante',date:'15 de out. de 2026',points:80},
  {id:6,title:'Participação em desafio',date:'15 de out. de 2026',points:50},
]
const rewards=[
  {id:1,name:'Camiseta NPV',points:1000,icon:Gift,category:'Exclusivo NPV',theme:'ink'},
  {id:2,name:'Coqueteleira NPV',points:450,icon:Package,category:'Exclusivo NPV',theme:'lime'},
  {id:3,name:'Kit snacks parceiro',points:700,icon:Gift,category:'Parceiros',theme:'pink'},
  {id:4,name:'Benefício especial',points:300,icon:Ticket,category:'Benefícios',theme:'cream'},
]
const partners=[
  {id:1,name:'Cacow',logo_key:'',logo_url:'https://cacow.com.br/cdn/shop/files/Template_de_Banner_2.0_-_by_Estudio_Gole_2_2b6ed56a-607b-42de-a4ca-4e857cb86466.png?v=1765388753&width=270',link_url:'https://cacow.com.br/',coupon_code:'NPV5',active:true,position:1,discount_percent:null},
  {id:2,name:'Z2 Performance',logo_key:'',logo_url:'https://z2performance.com/cdn/shop/files/logo_z2_azul_01.png?v=1725888283&width=100',link_url:'https://z2performance.com/',coupon_code:'Z2naopensevai',active:true,position:2,discount_percent:null},
  {id:3,name:'Cia do Esporte',logo_key:'parceiro2',logo_url:'',link_url:'https://www.instagram.com/ciadoesporte2/',coupon_code:'NPV10',active:true,position:3,discount_percent:null},
  {id:4,name:'NF Moda Fitness',logo_key:'parceiro4',logo_url:'',link_url:'https://www.instagram.com/nf.modafitness/',coupon_code:'',active:true,position:4,discount_percent:null},
]
const rules=[
  ['Renovação confirmada',100],
  ['Indicação convertida',150],
  ['Aniversário como assinante',80],
  ['Participação em desafio',50]
]
const fmt=n=>Number(n).toLocaleString('pt-BR')
const previewTotal=1170
const previewAvailable=1170
function Movements({items}){
  return <div className="clube-activities">
    {items.map(a=><div className="clube-activity" key={a.id}>
      <span className={`clube-activity-icon ${a.points<0?'clube-debit':''}`}><Sparkles size={19}/></span>
      <div className="clube-activity-description"><strong>{a.title}</strong>{a.note&&<span>{a.note}</span>}<small>{a.date}</small></div>
      <strong className={`clube-activity-points ${a.points<0?'clube-negative':''}`}>{a.points>0?'+':''}{fmt(a.points)} pts</strong>
    </div>)}
  </div>
}
export default function ClubeLayoutPreview(){
  const [tab,setTab]=useState('inicio')
  const [activitiesOpen,setActivitiesOpen]=useState(false)
  const [selectedReward,setSelectedReward]=useState(null)
  const [previewActive,setPreviewActive]=useState(true)
  const nav=[
    ['inicio','Visão geral',Wallet],
    ['historico','Histórico',History],
    ['recompensas','Recompensas',Gift],
    ['parceiros','Parceiros',Award]
  ]
  function RewardGrid({items}){
    return <div className="npv-shop-grid">{items.map(item=>{
      const Icon=item.icon
      return <article className="npv-shop-card" key={item.id}>
        <div className={`npv-shop-art npv-shop-art-${item.theme}`}><Icon size={76} strokeWidth={1.25}/><span className="npv-shop-art-stamp">CLUBE NPV ✦</span></div>
        <div className="npv-shop-info"><span className="npv-shop-category">{item.category}</span><h3>{item.name}</h3>
          <div className="npv-shop-price"><strong>{fmt(item.points)}</strong><span>pontos</span></div>
          <div className="npv-shop-progress"><div className="npv-shop-progress-track"><span style={{width:`${Math.round(Math.min(100,previewAvailable/item.points*100))}%`}}/></div><span className="npv-shop-progress-label">{previewAvailable>=item.points?'Pontos suficientes!':`Faltam ${fmt(item.points-previewAvailable)} pts`}</span></div>
          <div className="npv-shop-foot"><span className="npv-shop-stock">Prévia demonstrativa</span><button className="npv-shop-request" type="button" onClick={()=>setSelectedReward(item)}>Ver detalhes <ArrowRight size={15}/></button></div>
        </div>
      </article>
    })}</div>
  }
  return <div className="clube-shell clube-layout-preview">
    <header className="clube-header"><div className="clube-header-inner">
      <div className="clube-logo"><div className="clube-logo-mark">NPV<span>!</span></div><div className="clube-logo-label"><strong>NÃO PENSE, VAI!</strong><span>CLUBE DE BENEFÍCIOS</span></div></div>
      {previewActive&&<button className="clube-preview-header-logout" type="button" onClick={()=>setPreviewActive(false)} aria-label="Sair da conta (simulação)"><LogOut size={17}/> Sair</button>}
    </div></header>
    <div className="clube-layout-preview-note"><ShieldCheck size={16}/> PRÉVIA INTERATIVA DO LAYOUT · Dados ilustrativos · Nenhuma movimentação real</div>
    <div className="clube-layout-frame">
      {previewActive?<><nav className="clube-nav clube-layout-preview-nav" aria-label="Menu do Clube NPV">
        {nav.map(([key,label,Icon])=><button key={key} type="button" className={tab===key?'active':''} onClick={()=>setTab(key)}><Icon size={17}/>{label}</button>)}
      </nav>
      <main className="clube-layout-preview-main">
        <div className="clube-intro"><div><h1>{tab==='inicio'?'Sua evolução vale pontos.':tab==='historico'?'Histórico de pontos':tab==='recompensas'?'Benefícios e recompensas':'Parceiros e descontos'}</h1><p>Seu extrato de pontos e benefícios em um só lugar.</p></div></div>
        {tab==='inicio'&&<>
          <div className="clube-student-summary clube-score-refined">
            <div className="clube-score-refined-top">
              <div><div className="clube-student-hello">OLÁ, NPV! ✦</div>
                <p>SEUS PONTOS EM 2026</p>
                <strong>{fmt(previewTotal)} <small>pontos</small></strong>
                {previewAvailable!==previewTotal&&<span className="clube-summary-caption">Disponíveis para solicitar: {fmt(previewAvailable)} pontos</span>}
              </div>
              <Award size={88} aria-hidden="true"/>
            </div>
          </div>
          <section className="clube-card clube-activities-card">
            <button className="clube-activities-toggle" aria-expanded={activitiesOpen} aria-controls="preview-activities" type="button" onClick={()=>setActivitiesOpen(v=>!v)}>
              <span><strong>Minhas atividades</strong><small>Meu extrato de pontos</small></span>
              <span className="clube-activities-chevron">{activitiesOpen?<ChevronUp size={22}/>:<ChevronDown size={22}/>}</span>
            </button>
            {activitiesOpen&&<div id="preview-activities" className="clube-activities-expanded"><Movements items={activities}/><button className="clube-text-button clube-activities-view-all" type="button" onClick={()=>setTab('historico')}>Ver todas as atividades <ArrowRight size={16}/></button></div>}
          </section>
          <section className="npv-shop npv-shop-featured">
            <div className="npv-shop-heading"><div><div className="npv-shop-eyebrow"><Gift size={16}/> LOJINHA DO CLUBE NPV</div><h2>Troque seus pontos ✦</h2><p>Seu próximo objetivo pode estar aqui.</p></div><button type="button" className="npv-shop-view-all" onClick={()=>setTab('recompensas')}>Ver catálogo <ArrowRight size={16}/></button></div>
            <RewardGrid items={rewards}/>
          </section>
          <section className="npv-partners-section"><div className="npv-shop-heading"><div><div className="npv-shop-eyebrow"><Award size={16}/> PARCERIAS NPV</div><h2>Benefícios de parceiros ✦</h2><p>Descontos e vantagens que você pode aproveitar.</p></div><button className="npv-shop-view-all" onClick={()=>setTab('parceiros')}>Ver parceiros <ArrowRight size={16}/></button></div><PartnerCards partners={partners}/></section>
          <section className="clube-card clube-next clube-earn-bottom">
            <div className="clube-card-head"><div><h2>Continue acumulando ✦</h2><p>Mais maneiras de ganhar pontos no Clube NPV</p></div></div>
            <div className="clube-how">{rules.map(([title,points])=><div key={title}><span>✦</span><strong>{title}</strong><b>+{fmt(points)} pts</b></div>)}</div>
            <p className="clube-micro">Exemplo visual de pontuação. Consulte as regras válidas no clube oficial.</p>
          </section>
        </>}
        {tab==='historico'&&<section className="clube-card"><div className="clube-card-head"><div><h2>Minhas atividades</h2><p>Histórico ilustrativo de pontos</p></div></div><Movements items={activities}/></section>}
        {tab==='recompensas'&&<section className="npv-shop"><div className="npv-shop-heading"><div><div className="npv-shop-eyebrow"><Gift size={16}/> LOJINHA DO CLUBE NPV</div><h2>Vitrine de recompensas ✦</h2><p>Os produtos abaixo são ilustrativos nesta prévia.</p></div></div><RewardGrid items={rewards}/></section>}
        {tab==='parceiros'&&<section className="npv-partners-section"><div className="npv-shop-heading"><div><div className="npv-shop-eyebrow"><Award size={16}/> PARCERIAS NPV</div><h2>Parceiros e descontos ✦</h2><p>Clique numa logo para visitar o site ou Instagram do parceiro.</p></div></div><PartnerCards partners={partners}/></section>}
        <footer className="clube-main-footer"><span>© 2026 Não Pense, Vai! · Prévia do layout</span><span>Sem login ou alteração de pontos reais.</span></footer>
      </main></>:<main className="clube-layout-preview-signed-out"><ShieldCheck size={40}/><h2>Você saiu da prévia.</h2><p>Este teste não altera sua sessão ou saldo do Clube NPV.</p><button className="clube-btn clube-btn-primary" type="button" onClick={()=>{setPreviewActive(true);setTab('inicio')}}>Voltar à prévia <ArrowRight size={16}/></button></main>}
    </div>
    {selectedReward&&<div className="clube-modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setSelectedReward(null)}}>
      <section className="clube-modal" role="dialog" aria-modal="true" aria-label="Detalhes demonstrativos do prêmio">
        <div className="clube-modal-top"><div><small>PRÉVIA ILUSTRATIVA</small><h2>{selectedReward.name}</h2></div><button type="button" onClick={()=>setSelectedReward(null)} aria-label="Fechar"><X size={20}/></button></div>
        <div className="clube-layout-preview-detail"><Gift size={36}/><strong>{fmt(selectedReward.points)} pontos</strong><p>Os detalhes são apenas uma demonstração visual. Nenhuma solicitação de resgate será enviada.</p><button type="button" className="clube-btn clube-btn-primary clube-btn-full" onClick={()=>setSelectedReward(null)}>Entendi <Check size={16}/></button></div>
      </section>
    </div>}
  </div>
}
