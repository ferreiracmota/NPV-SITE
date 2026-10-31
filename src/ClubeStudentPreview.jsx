import React,{useState} from 'react'
import {ArrowLeft,ArrowRight,Award,Gift,History,UserRound,Wallet,ChevronDown,ChevronUp,Footprints,Instagram,CheckCircle2,LockKeyhole} from 'lucide-react'
import ClubeStudentMomentum from './ClubeStudentMomentum.jsx'
import ClubeWalletCard from './ClubeWalletCard.jsx'
import ClubeConnectionGuide from './ClubeConnectionGuide.jsx'
import {memberAchievements} from '../clube/profile/achievements.mjs'
import logo from './assets/logo-vai-circular.webp'
import './ClubeNPV.css'
import './ClubeNPVOnline.css'
import './ClubeRecompensas.css'
import './ClubeV211.css'
import './ClubeLiveHeader.css'
import './ClubeStudentDark.css'
import './ClubeStudentPolish.css'
import './ClubeStudentPreview.css'

const id='npv-visual-demo-only'
const profile={id,full_name:'Aluna Demonstração',birthday_mmdd:'1015',created_at:'2026-01-10',approved:true}
const created=days=>new Date(Date.now()-days*86400000).toISOString()
const events=[
 {id:'demo-1',student_id:id,event_type:'renovacao',points:400,created_at:created(3)},
 {id:'demo-2',student_id:id,event_type:'desafio',points:300,created_at:created(14)},
 {id:'demo-3',student_id:id,event_type:'renovacao',points:400,created_at:created(30)},
 {id:'demo-4',student_id:id,event_type:'foto',points:200,created_at:created(50)},
 {id:'demo-5',student_id:id,event_type:'renovacao',points:400,created_at:created(65)},
 {id:'demo-6',student_id:id,event_type:'indicacao',points:1000,created_at:created(80)},
 {id:'demo-7',student_id:id,event_type:'resgate',points:-300,created_at:created(90)}
]
const rewards=[
 {id:'gift1',name:'Camiseta NPV',points:6500,stock:5,active:true,test_only:false},
 {id:'gift2',name:'Garrafinha NPV',points:10000,stock:5,active:true,test_only:false},
 {id:'gift3',name:'Jaqueta NPV',points:20000,stock:3,active:true,test_only:false}
]
const partners=['Z2 Performance','Cacow','Hey!Mu','Liquids']
const options=[
 {key:'inicio',name:'Início',Icon:Wallet},
 {key:'perfil',name:'Perfil',Icon:UserRound},
 {key:'recompensas',name:'Prêmios',Icon:Gift},
 {key:'parceiros',name:'Parceiros',Icon:Award},
 {key:'historico',name:'Extrato',Icon:History}
]
const fmt=n=>Number(n||0).toLocaleString('pt-BR')
const sourceNames={renovacao:'Renovação confirmada',desafio:'Desafio mensal',foto:'Foto aprovada',indicacao:'Indicação convertida',resgate:'Resgate registrado'}
export default function ClubeStudentPreview(){
 const [tab,setTab]=useState('inicio')
 const [open,setOpen]=useState(false)
 const [theme,setTheme]=useState('light')
 const [connected,setConnected]=useState(false)
 const achievements=memberAchievements(events,id)
 const balance=events.reduce((sum,event)=>sum+event.points,0)
 const go=next=>{setTab(next);window.scrollTo({top:0,behavior:'instant'})}
 const records=<div className="npv-demo-extract">{events.map(e=><div className="npv-demo-extract-row" key={e.id}><div><strong>{sourceNames[e.event_type]}</strong><small>{new Date(e.created_at).toLocaleDateString('pt-BR')}</small></div><b className={e.points<0?'negative':''}>{e.points>0?'+':''}{fmt(e.points)} pts</b></div>)}</div>
 const shop=<div className="npv-demo-rewards">{rewards.map((r,i)=><article key={r.id}><div className="npv-demo-product"><Gift size={36}/></div><div><small>RECOMPENSA NPV</small><h3>{r.name}</h3><strong>{fmt(r.points)} pontos</strong><p>Faltam {fmt(Math.max(0,r.points-balance))} pontos disponíveis.</p><span>Disponível para visualização</span></div></article>)}</div>
 return <div className={'clube-shell clube-live-student npv-theme-'+theme+' npv-student-demo'}>
   <div className="npv-demo-warning" role="status"><strong>DEMONSTRAÇÃO DE TESTE</strong><span>Dados 100% fictícios · Não são pontos nem dados de uma aluna real · Nenhum resgate é realizado aqui</span></div>
   <header className="clube-header"><div className="clube-header-inner"><div className="clube-logo"><img className="clube-logo-vai" src={logo} alt=""/><div className="clube-logo-label"><strong>NÃO PENSE, VAI!</strong><span>CLUBE DE BENEFÍCIOS</span></div></div><div className="clube-header-actions"><a className="clube-back" href="/"><ArrowLeft size={16}/><span>Site principal</span></a><span className="clube-demo-badge clube-online-badge">PREVIEW</span></div></div></header>
   <div className="npv-demo-controls"><span>Visualização simulada do aluno</span><div><button onClick={()=>setTheme('light')} className={theme==='light'?'active':''}>Branco</button><button onClick={()=>setTheme('dark')} className={theme==='dark'?'active':''}>Preto</button></div></div>
   <section className="clube-live-tabs-wrap"><nav className="clube-live-tabs" aria-label="Abas de demonstração">{options.map(({key,name,Icon})=><button key={key} type="button" className={tab===key?'active':''} aria-current={tab===key?'page':undefined} onClick={()=>go(key)}><Icon size={17}/><span>{name}</span></button>)}</nav></section>
   <div className="clube-container"><aside className="clube-sidebar"><div className="clube-person"><span className="clube-avatar">A</span><div><strong>Aluna Demonstração</strong><span>Conta ilustrativa</span></div></div><div className="clube-side-label">MINHA NAVEGAÇÃO</div><nav className="clube-nav">{options.map(({key,name,Icon})=><button key={key} className={tab===key?'active':''} onClick={()=>go(key)}><Icon size={18}/>{name}</button>)}</nav></aside>
   <main className={'clube-main'+(tab==='inicio'?'':' clube-student-inner-tab')}>
     {tab==='inicio'&&<>
       <div className="clube-intro"><div><div className="clube-eyebrow"><span/> MINHA CONTA NPV</div><h1>Sua evolução vale pontos.</h1><p>Olá, Aluna. Pontos, desafios e conquistas em um só lugar.</p></div></div>
       <section className={'clube-student-summary clube-student-summary-statement'+(open?' is-open':'')} aria-label="Seus pontos e extrato"><button className="clube-student-summary-trigger" aria-expanded={open} onClick={()=>setOpen(v=>!v)}><span className="clube-student-balance-group"><span className="clube-student-balance-label">SEU SALDO DE PONTOS</span><strong className="clube-student-balance-value">{fmt(balance)} <small>pontos</small></strong></span><span className="clube-student-statement-action"><span className="clube-student-statement-cta">Extrato {open?<ChevronUp size={16}/>:<ChevronDown size={16}/>}</span></span></button>{open&&<div className="clube-student-statement-body"><div className="clube-student-statement-heading"><strong>Últimas movimentações</strong><span>Entradas e saídas do seu saldo</span></div>{records}</div>}</section>
       <ClubeStudentMomentum events={events} studentId={id} rewards={rewards} availablePoints={balance} showJourney onProfile={()=>go('perfil')} onRewards={()=>go('recompensas')}/>
       <section className="clube-card npv-demo-activity"><div className="clube-card-head"><div><h2>Atividades e desafios ✦</h2><p>Acompanhe suas atividades elegíveis e continue evoluindo.</p></div></div><div className="npv-demo-activity-row"><span><Footprints size={23}/></span><div><strong>Seu desafio do mês</strong><small>Conecte seu Strava e acompanhe a evolução do desafio.</small></div><span className="npv-demo-pill">Participe</span></div><div className="npv-demo-activity-row"><span><CheckCircle2 size={23}/></span><div><strong>Renovação confirmada</strong><small>Exemplo de registro de +400 pontos.</small></div><span className="npv-demo-pill">Concluído</span></div></section>
       <ClubeConnectionGuide instagram={{checked:true,connected:connected,available:true}} strava={{checked:true,connected:connected,disabled:false}} onInstagram={()=>setConnected(x=>!x)} onStrava={()=>setConnected(x=>!x)}/>
       <section className="npv-shop npv-shop-featured"><div className="npv-shop-heading"><div><div className="npv-shop-eyebrow"><Gift size={15}/> LOJINHA DO CLUBE NPV</div><h2>Troque seus pontos ✦</h2><p>Uma amostra de recompensas com valores ilustrativos.</p></div><button className="npv-shop-view-all" onClick={()=>go('recompensas')}>Ver catálogo <ArrowRight size={16}/></button></div>{shop}</section>
     </>}
     {tab==='perfil'&&<div className="npv-demo-inner"><div className="npv-profile-heading"><h1>Minha trajetória</h1><p>Cada conquista te leva mais longe.</p></div><div className="npv-demo-profile"><ClubeWalletCard profile={profile} achievements={achievements}/></div><section className="clube-card npv-demo-activity"><h2>Minhas conquistas</h2><p>Primeiros passos, Constância e outras conquistas aparecem conforme o histórico de pontos.</p></section><section className="clube-card npv-demo-activity"><h2>Meus dados e conexões</h2><p>Essas informações pertencem à sua conta real. Aqui mostramos apenas uma demonstração.</p></section></div>}
     {tab==='recompensas'&&<section className="npv-demo-inner"><div className="npv-shop-heading"><div><h1>Prêmios do Clube</h1><p>Conheça as recompensas. Neste ambiente, nada pode ser resgatado.</p></div></div>{shop}</section>}
     {tab==='parceiros'&&<section className="npv-demo-inner"><div className="npv-shop-heading"><div><h1>Parceiros NPV ✦</h1><p>Condições e cupons oficiais devem ser consultados na sua conta real.</p></div></div><div className="npv-demo-partners">{partners.map(n=><div key={n}><Award size={28}/><strong>{n}</strong><small>Benefícios exclusivos para integrantes do Clube.</small></div>)}</div></section>}
     {tab==='historico'&&<section className="npv-demo-inner"><div className="npv-shop-heading"><div><h1>Extrato de pontos</h1><p>Exemplos de créditos e resgates, sem utilizar dados pessoais.</p></div></div><section className="clube-card npv-demo-activity"><h2>Movimentações demonstrativas</h2>{records}</section></section>}
     <footer className="clube-main-footer"><span>© 2026 Não Pense, Vai! · Preview ilustrativo</span><a className="clube-terms-link" href="/">Voltar ao site principal</a></footer>
   </main></div>
 </div>
}
