import React, { useEffect, useMemo, useState } from 'react'
import {
  Award, ArrowDownLeft, ArrowLeft, ArrowRight, CalendarDays, Check,
  ChevronDown, CircleHelp, Clock3, Gift, History, LogOut, Plus,
  RotateCcw, Search, ShieldCheck, Sparkles, TrendingUp, UserRound,
  Users, Wallet, X
} from 'lucide-react'
import './ClubeNPV.css'

const ANO = new Date().getFullYear()
const RULES_INICIAIS = [
  { id: 'renovacao', label: 'Renovação confirmada', points: 100, icon: '↻' },
  { id: 'indicacao', label: 'Indicação convertida', points: 150, icon: '✦' },
  { id: 'foto', label: 'Foto publicada e aprovada', points: 30, icon: '▣' },
  { id: 'desafio', label: 'Participação em desafio', points: 50, icon: '◎' },
  { id: 'aniversario', label: 'Aniversário como assinante', points: 80, icon: '★' }
]
const ALUNOS_INICIAIS = [
  { id: 'demo-alice', name: 'Alice Martins', email: 'alice@exemplo.test', joined: `${ANO}-02-11` },
  { id: 'demo-bruno', name: 'Bruno Oliveira', email: 'bruno@exemplo.test', joined: `${ANO}-04-08` },
  { id: 'demo-camila', name: 'Camila Souza', email: 'camila@exemplo.test', joined: `${ANO}-06-20` }
]
const dataAtras = (n) => new Date(Date.now() - n * 86400000).toISOString()
const MOV_INICIAIS = [
  { id: '1', studentId: 'demo-alice', ruleId: 'renovacao', amount: 100, note: 'Renovação aprovada', date: dataAtras(2) },
  { id: '2', studentId: 'demo-alice', ruleId: 'indicacao', amount: 150, note: 'Indicação confirmada', date: dataAtras(7) },
  { id: '3', studentId: 'demo-alice', ruleId: 'foto', amount: 30, note: 'Publicação aprovada', date: dataAtras(12) },
  { id: '4', studentId: 'demo-alice', ruleId: 'renovacao', amount: 100, note: '', date: dataAtras(32) },
  { id: '5', studentId: 'demo-bruno', ruleId: 'desafio', amount: 50, note: '', date: dataAtras(4) },
  { id: '6', studentId: 'demo-bruno', ruleId: 'renovacao', amount: 100, note: '', date: dataAtras(16) },
  { id: '7', studentId: 'demo-camila', ruleId: 'renovacao', amount: 100, note: '', date: dataAtras(3) },
  { id: '8', studentId: 'demo-camila', ruleId: 'indicacao', amount: 150, note: 'Indicação convertida', date: dataAtras(13) },
  { id: '9', studentId: 'demo-camila', ruleId: 'aniversario', amount: 80, note: '', date: dataAtras(36) }
]
const STORAGE = 'npv_clube_demo_v1'
const ID = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`)
function carregar() {
  try {
    const v = JSON.parse(localStorage.getItem(STORAGE) || 'null')
    if (v && Array.isArray(v.students) && Array.isArray(v.ledger) && Array.isArray(v.rules)) return v
  } catch { /* modo de demonstração começa com dados fictícios */ }
  return { students: ALUNOS_INICIAIS, ledger: MOV_INICIAIS, rules: RULES_INICIAIS }
}
const brData = (date) => new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
const pontos = (n) => Number(n).toLocaleString('pt-BR')
const isAnoAtual = (row) => new Date(row.date).getFullYear() === ANO
function ClubeLogo() {
  return <div className="clube-logo" aria-label="Não Pense, Vai! — Clube de Benefícios">
    <div className="clube-logo-mark">NPV<span>!</span></div>
    <div className="clube-logo-label"><strong>NÃO PENSE, VAI!</strong><span>CLUBE DE BENEFÍCIOS</span></div>
  </div>
}
function IconChip({ icon: Icon, tone = 'lime' }) {
  return <span className={`clube-icon-chip clube-chip-${tone}`}><Icon size={20} strokeWidth={2.1} /></span>
}
function Feedback({ children, onClose }) {
  return <div className="clube-feedback" role="status"><Check size={17} />{children}<button type="button" onClick={onClose} aria-label="Fechar aviso"><X size={16}/></button></div>
}
export default function ClubeNPV() {
  const [demo, setDemo] = useState(carregar)
  const [role, setRole] = useState('admin')
  const [studentId, setStudentId] = useState('demo-alice')
  const [tab, setTab] = useState('inicio')
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null)
  const [notice, setNotice] = useState('')
  const [tipo, setTipo] = useState('renovacao')
  const [destinatario, setDestinatario] = useState('demo-alice')
  const [amount, setAmount] = useState('')
  const [nota, setNota] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [ruleDraft, setRuleDraft] = useState(null)
  useEffect(() => { localStorage.setItem(STORAGE, JSON.stringify(demo)) }, [demo])
  useEffect(() => { document.title = 'Clube NPV — Demonstração | Não Pense, Vai!' }, [])
  const { students, ledger, rules } = demo
  const allYearLedger = useMemo(() => ledger.filter(isAnoAtual), [ledger])
  const balance = (id) => allYearLedger.filter(x => x.studentId === id).reduce((v, x) => v + x.amount, 0)
  const current = students.find(x => x.id === studentId) || students[0]
  const currentLedger = useMemo(() => allYearLedger.filter(x => x.studentId === current?.id).sort((a,b) => new Date(b.date) - new Date(a.date)), [allYearLedger, current?.id])
  const totalPoints = allYearLedger.reduce((n,row) => n+row.amount,0)
  const ranking = [...students].sort((a,b) => balance(b.id) - balance(a.id))
  const filtrados = students.filter(x => `${x.name} ${x.email}`.toLocaleLowerCase('pt-BR').includes(search.trim().toLocaleLowerCase('pt-BR')))
  function openPoints(id) {
    setDestinatario(id || students[0]?.id)
    setTipo('renovacao'); setAmount(''); setNota(''); setModal('points')
  }
  function registrar(e) {
    e.preventDefault()
    if (role !== 'admin') return
    const p = tipo === 'ajuste' ? Number(amount) : Number(rules.find(x=>x.id === tipo)?.points)
    if (!Number.isInteger(p) || p === 0 || Math.abs(p) > 100000) { setNotice('Informe uma pontuação inteira válida.'); return }
    if (tipo === 'ajuste' && !nota.trim()) { setNotice('Informe o motivo do ajuste.'); return }
    const dest = students.find(x=>x.id === destinatario)
    if (!dest) return
    if (balance(dest.id) + p < 0) { setNotice('O saldo do aluno não pode ficar negativo.'); return }
    setDemo(d => ({...d, ledger: [{ id: ID(), studentId:dest.id, ruleId:tipo, amount:p, note:nota.trim(), date:new Date().toISOString() }, ...d.ledger]}))
    setModal(null); setNotice(`${p > 0 ? '+' : ''}${pontos(p)} pontos registrados para ${dest.name}.`)
  }
  function adicionarAluno(e) {
    e.preventDefault()
    if (role !== 'admin') return
    const clean = name.trim(), mail = email.trim().toLowerCase()
    if (clean.length < 3 || !/^\S+@\S+\.\S+$/.test(mail)) { setNotice('Preencha nome completo e e-mail válido.'); return }
    if (students.some(x => x.email.toLowerCase() === mail)) { setNotice('Esse e-mail já está cadastrado nesta demonstração.'); return }
    const aluno = { id:ID(), name:clean, email:mail, joined:new Date().toISOString().slice(0,10) }
    setDemo(d => ({...d, students:[...d.students,aluno]}))
    setStudentId(aluno.id); setDestinatario(aluno.id); setModal(null); setName(''); setEmail('')
    setNotice(`${aluno.name} cadastrado na demonstração.`)
  }
  function saveRules(e) {
    e.preventDefault()
    const valid = ruleDraft.every(x=>Number.isInteger(Number(x.points)) && Number(x.points)>0 && Number(x.points)<=100000)
    if (!valid) {setNotice('Use valores inteiros maiores que zero nas regras.');return}
    setDemo(d=>({...d,rules:ruleDraft.map(x=>({...x,points:Number(x.points)}))}))
    setModal(null);setNotice('Regras fictícias atualizadas para os próximos lançamentos.')
  }
  function resetDemo() {
    if (!window.confirm('Restaurar somente os dados fictícios desta demonstração?')) return
    setDemo({ students:ALUNOS_INICIAIS, ledger:MOV_INICIAIS, rules:RULES_INICIAIS })
    setStudentId('demo-alice');setTab('inicio');setModal(null);setNotice('Demonstração restaurada.')
  }
  const isAdmin = role==='admin'
  const displayName = isAdmin?'Administrador (teste)':current?.name || 'Aluno'
  const activityName = (item) => item.ruleId === 'ajuste' ? 'Ajuste administrativo' : rules.find(x => x.id === item.ruleId)?.label || 'Atividade'
  const renderLedger = (items, showStudent=false) => <div className="clube-activities">
    {items.length === 0 && <div className="clube-empty">Ainda não há movimentações neste período.</div>}
    {items.map(row => <div className="clube-activity" key={row.id}>
      <span className={`clube-activity-icon ${row.amount<0?'clube-debit':''}`}>{row.amount < 0 ? <ArrowDownLeft size={19}/> : <Sparkles size={19}/>}</span>
      <div className="clube-activity-description"><strong>{activityName(row)}</strong>{showStudent&&<span>{students.find(x=>x.id===row.studentId)?.name}</span>}{row.note&&<span>{row.note}</span>}<small>{brData(row.date)}</small></div>
      <strong className={`clube-activity-points ${row.amount<0?'clube-negative':''}`}>{row.amount>0?'+':''}{pontos(row.amount)} <small>pts</small></strong>
    </div>)}
  </div>
  return <div className="clube-shell">
    <header className="clube-header">
      <div className="clube-header-inner"><ClubeLogo/><div className="clube-header-actions">
        <a className="clube-back" href="/" title="Voltar ao site Não Pense, Vai!"><ArrowLeft size={16}/><span>Voltar ao site</span></a>
        <span className="clube-demo-badge"><span className="clube-demo-dot"/> PROTÓTIPO</span>
      </div></div>
    </header>
    <div className="clube-disclaimer"><ShieldCheck size={16}/><span><strong>Ambiente de demonstração.</strong> Alunos e pontos são fictícios. Os dados ficam apenas neste navegador; nenhum login ou cadastro real está ativado.</span></div>
    <div className="clube-container">
      <aside className="clube-sidebar">
        <div className="clube-person"><span className="clube-avatar">{isAdmin?'A':current?.name?.charAt(0) || 'A'}</span><div><strong>{displayName}</strong><span>{isAdmin?'Gestão do Clube':'Área do aluno'}</span></div></div>
        <div className="clube-side-label">NAVEGAÇÃO</div>
        <nav className="clube-nav" aria-label="Navegação do Clube">
          <button className={tab==='inicio'?'active':''} onClick={()=>setTab('inicio')}><Wallet size={18}/>Visão geral</button>
          {isAdmin&&<button className={tab==='alunos'?'active':''} onClick={()=>setTab('alunos')}><Users size={18}/>Alunos</button>}
          <button className={tab==='historico'?'active':''} onClick={()=>setTab('historico')}><History size={18}/>Histórico</button>
          <button className={tab==='recompensas'?'active':''} onClick={()=>setTab('recompensas')}><Gift size={18}/>Recompensas</button>
        </nav>
        <div className="clube-side-bottom"><span className="clube-side-label">MODO DE VISUALIZAÇÃO</span>
          <label htmlFor="clube-role" className="clube-vis-label">Simular acesso como</label>
          <select id="clube-role" value={role} onChange={e=>{setRole(e.target.value);setTab('inicio')}}><option value="admin">Administrador</option><option value="aluno">Aluno</option></select>
          {!isAdmin&&<select aria-label="Aluno fictício" value={current?.id||''} onChange={e=>{setStudentId(e.target.value);setTab('inicio')}}>{students.map(x=><option value={x.id} key={x.id}>{x.name}</option>)}</select>}
          {isAdmin&&<button className="clube-reset" onClick={resetDemo}><RotateCcw size={15}/> Restaurar dados de teste</button>}
        </div>
      </aside>
      <main className="clube-main">
        {notice&&<Feedback onClose={()=>setNotice('')}>{notice}</Feedback>}
        <div className="clube-intro"><div><div className="clube-eyebrow"><span/> {isAdmin?'PAINEL DE GESTÃO':'MEU CLUBE NPV'}</div><h1>{tab==='inicio'?(isAdmin?'Seu clube, sob controle.':'Sua evolução vale pontos.'):tab==='alunos'?'Alunos do clube':tab==='historico'?'Histórico de pontos':'Benefícios e recompensas'}</h1><p>{tab==='inicio'?(isAdmin?'Acompanhe as atividades, cadastre alunos e registre pontos em poucos cliques.':'Acompanhe seus pontos e cada conquista dentro do Não Pense, Vai!.'):tab==='alunos'?'Cadastre e acompanhe a pontuação dos alunos.':tab==='historico'?'Consulte os lançamentos com data, motivo e valor.':'Um espaço para as futuras vantagens dos membros do clube.'}</p></div>
          {isAdmin&&tab!=='recompensas'&&<button className="clube-btn clube-btn-primary" onClick={()=>openPoints()}><Plus size={18}/> Lançar pontos</button>}
        </div>
        {tab==='inicio'&&isAdmin&&<>
          <div className="clube-kpis">
            <div className="clube-kpi clube-kpi-dark"><span>PONTOS DISTRIBUÍDOS EM {ANO}</span><strong>{pontos(totalPoints)}</strong><small><TrendingUp size={16}/> Total de pontos líquidos lançados</small></div>
            <div className="clube-kpi"><IconChip icon={Users}/><span>ALUNOS CADASTRADOS</span><strong>{students.length}</strong><small>Contas fictícias no protótipo</small></div>
            <div className="clube-kpi"><IconChip icon={History} tone="pink"/><span>LANÇAMENTOS NO ANO</span><strong>{allYearLedger.length}</strong><small>Registros no histórico</small></div>
          </div>
          <div className="clube-columns">
            <section className="clube-card"><div className="clube-card-head"><div><h2>Últimas movimentações</h2><p>Atividades recentes do clube</p></div><button className="clube-text-button" onClick={()=>setTab('historico')}>Ver tudo <ArrowRight size={16}/></button></div>{renderLedger([...allYearLedger].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,5),true)}</section>
            <section className="clube-card"><div className="clube-card-head"><div><h2>Seus alunos</h2><p>Maiores saldos de {ANO}</p></div></div>
              <div className="clube-ranking">{ranking.slice(0,5).map((x,i)=><button key={x.id} onClick={()=>{setStudentId(x.id);setRole('aluno');setTab('inicio')}}><span className="clube-rank-num">{String(i+1).padStart(2,'0')}</span><span className="clube-rank-person">{x.name}<small>Ver como aluno</small></span><strong>{pontos(balance(x.id))} pts</strong><ArrowRight size={15}/></button>)}</div>
              <button className="clube-btn clube-btn-outline clube-btn-full" onClick={()=>setTab('alunos')}>Gerenciar alunos <ArrowRight size={17}/></button>
            </section>
          </div>
        </>}
        {tab==='inicio'&&!isAdmin&&<>
          <div className="clube-student-summary"><div><div className="clube-student-hello">OLÁ, {current?.name?.split(' ')[0]?.toUpperCase()}! <span>✦</span></div><p>SEU SALDO EM {ANO}</p><strong>{pontos(balance(current?.id))} <small>pontos</small></strong><span className="clube-summary-caption">Cada atividade aprovada soma à sua trajetória.</span></div><Award size={100} strokeWidth={1.1}/></div>
          <div className="clube-columns">
            <section className="clube-card"><div className="clube-card-head"><div><h2>Minhas atividades</h2><p>Seu histórico individual de pontos</p></div><button className="clube-text-button" onClick={()=>setTab('historico')}>Ver tudo <ArrowRight size={16}/></button></div>{renderLedger(currentLedger.slice(0,6))}</section>
            <section className="clube-card clube-next"><div className="clube-card-head"><div><h2>Continue acumulando</h2><p>Atividades que podem render pontos</p></div></div><div className="clube-how">{rules.slice(0,4).map((x,i)=><div key={x.id}><span>{x.icon}</span><strong>{x.label}</strong><b>+{pontos(x.points)}</b></div>)}</div><p className="clube-micro">Pontuação ilustrativa, sujeita à tabela oficial do clube. Os lançamentos são validados pela administração.</p></section>
          </div>
        </>}
        {tab==='alunos'&&isAdmin&&<>
          <div className="clube-toolbar"><label className="clube-search"><Search size={18}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar por nome ou e-mail" aria-label="Buscar alunos"/></label><button className="clube-btn clube-btn-primary" onClick={()=>{setName('');setEmail('');setModal('student')}}><Plus size={18}/> Novo aluno</button></div>
          <div className="clube-card clube-students">{filtrados.length===0&&<p className="clube-empty">Nenhum aluno encontrado.</p>}{filtrados.map(x=><div className="clube-student-row" key={x.id}><span className="clube-avatar">{x.name.charAt(0)}</span><div><strong>{x.name}</strong><small>{x.email}</small></div><span className="clube-student-saldo">{pontos(balance(x.id))} pts</span><button className="clube-btn clube-btn-outline" onClick={()=>openPoints(x.id)}><Plus size={16}/> Pontos</button></div>)}</div>
        </>}
        {tab==='historico'&&<div className="clube-card"><div className="clube-card-head"><div><h2>{isAdmin?'Todos os lançamentos':'Meu extrato'}</h2><p>Exibindo os registros do ano de {ANO}</p></div><span className="clube-year"><CalendarDays size={17}/>{ANO}</span></div>{renderLedger(isAdmin?[...allYearLedger].sort((a,b)=>new Date(b.date)-new Date(a.date)):currentLedger,isAdmin)}</div>}
        {tab==='recompensas'&&<div className="clube-card clube-rewards"><div className="clube-coming-icon"><Gift size={32}/></div><h2>O melhor ainda está por vir.</h2><p>Este espaço vai mostrar prêmios, brindes e vantagens nos parceiros Não Pense, Vai!. Vamos definir as recompensas e as regras de resgate com sua tabela oficial de pontuação.</p><div className="clube-rule-list">{rules.map(r=><div key={r.id}><span>{r.icon}</span><strong>{r.label}</strong><b>+{pontos(r.points)} pts</b></div>)}</div>{isAdmin&&<button className="clube-btn clube-btn-primary" onClick={()=>{setRuleDraft(rules.map(x=>({...x})));setModal('rules')}}>Editar pontuações fictícias</button>}</div>}
        <footer className="clube-main-footer"><span>© {ANO} Não Pense, Vai! — Demonstração do Clube NPV</span><span>Dados fictícios · Sem acesso a informações reais de alunos</span></footer>
      </main>
    </div>
    {modal&&<div className="clube-modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setModal(null)}}><section className="clube-modal" role="dialog" aria-modal="true" aria-labelledby="clube-modal-title"><div className="clube-modal-top"><div><small>CLUBE NPV · DEMONSTRAÇÃO</small><h2 id="clube-modal-title">{modal==='points'?'Registrar movimentação':modal==='student'?'Cadastrar aluno fictício':'Editar regras fictícias'}</h2></div><button onClick={()=>setModal(null)} aria-label="Fechar"><X size={21}/></button></div>
      {modal==='points'&&<form onSubmit={registrar} className="clube-form"><label>Aluno<select value={destinatario} onChange={e=>setDestinatario(e.target.value)} required>{students.map(x=><option key={x.id} value={x.id}>{x.name} — {pontos(balance(x.id))} pts</option>)}</select></label><label>Motivo da pontuação<select value={tipo} onChange={e=>setTipo(e.target.value)}>{rules.map(x=><option key={x.id} value={x.id}>{x.label} (+{x.points})</option>)}<option value="ajuste">Ajuste manual (+ ou −)</option></select></label>{tipo==='ajuste'&&<label>Pontos do ajuste<input type="number" step="1" min="-100000" max="100000" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="Ex.: 40 ou -20" required/></label>}<label>Observação {tipo==='ajuste'?'(obrigatória)':'(opcional)'}<textarea rows="3" value={nota} onChange={e=>setNota(e.target.value)} placeholder="Ex.: renovação confirmada, indicação aprovada..." required={tipo==='ajuste'} /></label><div className="clube-modal-preview"><span>Variação no saldo</span><strong>{tipo==='ajuste'?(Number(amount)>0?'+':'')+pontos(Number(amount)||0):'+'+pontos(rules.find(x=>x.id===tipo)?.points||0)} pts</strong></div><button className="clube-btn clube-btn-primary clube-btn-full" type="submit"><Check size={17}/> Confirmar lançamento fictício</button></form>}
      {modal==='student'&&<form onSubmit={adicionarAluno} className="clube-form"><p>Este cadastro é apenas uma simulação local. Não será criado login nem será enviado e-mail.</p><label>Nome completo<input type="text" value={name} onChange={e=>setName(e.target.value)} placeholder="Nome do aluno" required/></label><label>E-mail de demonstração<input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="aluno@exemplo.test" required/></label><button className="clube-btn clube-btn-primary clube-btn-full" type="submit"><Plus size={17}/> Adicionar aluno fictício</button></form>}
      {modal==='rules'&&<form onSubmit={saveRules} className="clube-form">{ruleDraft?.map((r,i)=><label key={r.id}>{r.label}<input type="number" min="1" max="100000" step="1" value={r.points} onChange={e=>setRuleDraft(arr=>arr.map((v,j)=>j===i?{...v,points:e.target.value}:v))} required/></label>)}<p>As novas regras valem para lançamentos futuros. O histórico não é recalculado.</p><button className="clube-btn clube-btn-primary clube-btn-full" type="submit"><Check size={17}/> Salvar regras da demonstração</button></form>}
    </section></div>}
  </div>
}
