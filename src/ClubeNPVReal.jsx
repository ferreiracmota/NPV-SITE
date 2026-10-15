import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft, ArrowRight, Award, CalendarDays, Check, ChevronRight,
  Gift, History, LockKeyhole, LogOut, Mail, Plus, Search,
  ShieldCheck, Sparkles, TrendingUp, UserRound, Users, Wallet, X
} from 'lucide-react'
import { clubeSupabase as db } from './clubeSupabase'
import { RewardCard } from './ClubeRecompensas'
import './ClubeNPV.css'
import './ClubeRecompensas.css'
import './ClubeReal.css'

const YEAR = new Date().getFullYear()
const fmt = n => Number(n || 0).toLocaleString('pt-BR')
const datePt = d => new Date(d).toLocaleDateString('pt-BR',{day:'2-digit',month:'short',year:'numeric'})
const ofYear = entry => new Date(entry.created_at).getFullYear() === YEAR
const id = (value) => String(value || '')
const emptyReward = () => ({name:'',category:'Exclusivo NPV',description:'',points:500,stock:0,icon:'gift',theme:'lime',is_active:false})
const allowedIcons=['gift','shirt','cup','package','water','ticket']
const allowedThemes=['lime','ink','pink','sky','cream']
const errorText = error => {
  if(!error) return 'Não foi possível concluir a operação.'
  const m = error.message || String(error)
  if(/Invalid login credentials/i.test(m)) return 'E-mail ou senha incorretos.'
  if(/Email not confirmed/i.test(m)) return 'Confirme seu e-mail pelo link recebido antes de entrar.'
  if(/User already registered/i.test(m)) return 'Já existe uma conta com esse e-mail.'
  if(/rate limit/i.test(m)) return 'Muitas tentativas. Aguarde um pouco antes de tentar novamente.'
  return m
}
function Logo() {
  return <div className="clube-logo">
    <div className="clube-logo-mark">NPV<span>!</span></div>
    <div className="clube-logo-label"><strong>NÃO PENSE, VAI!</strong><span>CLUBE DE BENEFÍCIOS</span></div>
  </div>
}
function Shell({children,user,onExit}) {
  return <div className="clube-shell clube-live">
    <header className="clube-header"><div className="clube-header-inner"><Logo/><div className="clube-header-actions"><a className="clube-back" href="/"><ArrowLeft size={16}/><span>Voltar ao site</span></a>{user&&<button className="clube-logout" type="button" onClick={onExit}><LogOut size={16}/> Sair</button>}<span className="clube-live-badge"><ShieldCheck size={14}/> Clube NPV</span></div></div></header>
    {children}
  </div>
}
function AuthScreen({onReady}) {
  const [mode,setMode] = useState('login')
  const [name,setName] = useState('')
  const [email,setEmail] = useState('')
  const [password,setPassword] = useState('')
  const [confirm,setConfirm] = useState('')
  const [message,setMessage] = useState('')
  const [error,setError] = useState('')
  const [busy,setBusy] = useState(false)
  const callback = `${window.location.origin}/clube`
  async function submit(e) {
    e.preventDefault();setBusy(true);setError('');setMessage('')
    try {
      if(mode==='login') {
        const {error}=await db.auth.signInWithPassword({email:email.trim().toLowerCase(),password})
        if(error)throw error
        onReady()
      } else if(mode==='signup') {
        if(name.trim().length<3)throw new Error('Informe seu nome completo.')
        if(password.length<8)throw new Error('A senha precisa ter pelo menos oito caracteres.')
        if(password!==confirm)throw new Error('A confirmação da senha não corresponde.')
        const {data,error}=await db.auth.signUp({
          email:email.trim().toLowerCase(),password,
          options:{data:{full_name:name.trim()},emailRedirectTo:callback}
        })
        if(error)throw error
        setPassword('');setConfirm('')
        setMessage('Cadastro recebido! Confirme seu e-mail e aguarde a aprovação do Clube NPV. Você não recebe pontos automaticamente ao se cadastrar.')
        if(data.session)onReady()
      } else if(mode==='recover') {
        const {error}=await db.auth.resetPasswordForEmail(email.trim().toLowerCase(),{redirectTo:callback})
        if(error)throw error
        setMessage('Se o e-mail estiver cadastrado, você receberá as instruções para recuperar sua senha.')
      }
    } catch(e){setError(errorText(e))} finally{setBusy(false)}
  }
  return <Shell><main className="clube-auth-wrap">
    <div className="clube-auth-intro"><div className="clube-eyebrow"><span/> SUA EVOLUÇÃO VALE PONTOS</div><h1>Um clube feito para recompensar cada conquista.</h1><p>Consulte seu saldo, acompanhe as atividades e solicite benefícios exclusivos. Suas informações ficam protegidas na sua conta.</p>
      <div className="clube-auth-perks"><span><Award size={18}/> Pontos pelas suas conquistas</span><span><Gift size={18}/> Vitrine de recompensas</span><span><ShieldCheck size={18}/> Acesso individual</span></div>
    </div>
    <section className="clube-auth-card" aria-label="Acesso ao Clube NPV">
      <div className="clube-auth-card-head"><span><LockKeyhole size={23}/></span><h2>{mode==='login'?'Acesse sua conta':mode==='signup'?'Criar minha conta':'Recuperar minha senha'}</h2><p>{mode==='login'?'Use o e-mail e a senha que você cadastrou.':mode==='signup'?'Após confirmar o e-mail, seu cadastro ficará aguardando aprovação.':'Enviaremos um link para seu e-mail.'}</p></div>
      <form onSubmit={submit} className="clube-form">
        {mode==='signup'&&<label>Nome completo<input type="text" minLength="3" maxLength="120" autoComplete="name" value={name} onChange={e=>setName(e.target.value)} required/></label>}
        <label>E-mail<input type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="voce@exemplo.com" required/></label>
        {mode!=='recover'&&<label>Senha<input type="password" autoComplete={mode==='signup'?'new-password':'current-password'} value={password} onChange={e=>setPassword(e.target.value)} required minLength={mode==='signup'?8:1}/></label>}
        {mode==='signup'&&<label>Repita sua senha<input type="password" autoComplete="new-password" value={confirm} onChange={e=>setConfirm(e.target.value)} minLength="8" required/></label>}
        {error&&<p className="clube-real-error" role="alert">{error}</p>}
        {message&&<p className="clube-real-success" role="status">{message}</p>}
        <button className="clube-btn clube-btn-primary clube-btn-full" type="submit" disabled={busy}>{busy?'Aguarde...':mode==='login'?'Entrar no Clube':mode==='signup'?'Criar conta e confirmar e-mail':'Enviar link de recuperação'} <ArrowRight size={16}/></button>
        <div className="clube-auth-options">{mode!=='login'&&<button type="button" onClick={()=>{setMode('login');setError('');setMessage('')}}>Já tenho conta</button>}{mode!=='signup'&&<button type="button" onClick={()=>{setMode('signup');setError('');setMessage('')}}>Criar conta</button>}{mode==='login'&&<button type="button" onClick={()=>{setMode('recover');setError('');setMessage('')}}>Esqueci minha senha</button>}</div>
      </form>
    </section>
  </main></Shell>
}
function RecoverScreen({onSaved,onExit}) {
  const [password,setPassword]=useState('')
  const [confirm,setConfirm]=useState('')
  const [err,setErr]=useState('')
  const [busy,setBusy]=useState(false)
  async function save(e) {
    e.preventDefault()
    if(password.length<8||password!==confirm){setErr('A senha precisa ter oito caracteres e os campos precisam ser iguais.');return}
    setBusy(true);setErr('')
    const {error}=await db.auth.updateUser({password})
    setBusy(false)
    if(error)setErr(errorText(error));else onSaved()
  }
  return <Shell onExit={onExit}><div className="clube-auth-wrap"><section className="clube-auth-card"><div className="clube-auth-card-head"><h2>Defina sua nova senha</h2><p>Escolha uma senha de pelo menos oito caracteres.</p></div><form className="clube-form" onSubmit={save}><label>Nova senha<input type="password" autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} required minLength="8"/></label><label>Confirmar senha<input type="password" autoComplete="new-password" value={confirm} onChange={e=>setConfirm(e.target.value)} required minLength="8"/></label>{err&&<p className="clube-real-error">{err}</p>}<button type="submit" className="clube-btn clube-btn-primary clube-btn-full" disabled={busy}>{busy?'Aguarde...':'Salvar nova senha'}</button></form></section></div></Shell>
}
function Entry({label,caption,value,negative=false}) {
  return <div className="clube-activity"><span className="clube-activity-icon"><Sparkles size={18}/></span><div className="clube-activity-description"><strong>{label}</strong><small>{caption}</small></div><strong className={`clube-activity-points ${negative?'clube-negative':''}`}>{value>0?'+':''}{fmt(value)} pts</strong></div>
}
export default function ClubeNPVReal() {
  const [user,setUser] = useState(null)
  const [recover,setRecover] = useState(window.location.search.includes('type=recovery')||window.location.hash.includes('type=recovery'))
  const [loading,setLoading] = useState(true)
  const [refreshKey,setRefreshKey] = useState(0)
  const [profile,setProfile] = useState(null)
  const [admin,setAdmin] = useState(false)
  const [students,setStudents] = useState([])
  const [ledger,setLedger] = useState([])
  const [rewards,setRewards] = useState([])
  const [requests,setRequests] = useState([])
  const [rules,setRules] = useState([])
  const [tab,setTab]=useState('inicio')
  const [notice,setNotice]=useState('')
  const [search,setSearch]=useState('')
  const [modal,setModal]=useState(null)
  const [selected,setSelected]=useState('')
  const [pointsType,setPointsType]=useState('renovacao')
  const [pointsValue,setPointsValue]=useState('')
  const [note,setNote]=useState('')
  const [rewardDraft,setRewardDraft]=useState(emptyReward)
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const [authReady,setAuthReady]=useState(false)

  useEffect(()=>{
    let active=true
    db.auth.getUser().then(({data})=>{if(active){setUser(data.user||null);setLoading(false)}}).catch(()=>{if(active)setLoading(false)})
    const {data:{subscription}}=db.auth.onAuthStateChange((event,session)=>{
      if(!active)return
      if(event==='PASSWORD_RECOVERY')setRecover(true)
      if(event==='SIGNED_OUT'){setUser(null);setProfile(null);setAdmin(false)}
      if(session?.user)setUser(session.user)
      setLoading(false)
    })
    return ()=>{active=false;subscription.unsubscribe()}
  },[])

  const reload=useCallback(()=>setRefreshKey(n=>n+1),[])
  useEffect(()=>{
    if(!user||recover)return
    let active=true
    async function load(){
      setLoading(true);setError('')
      try{
        const [a,p]=await Promise.all([
          db.from('clube_admins').select('user_id').eq('user_id',user.id).maybeSingle(),
          db.from('clube_profiles').select('id,full_name,is_active,created_at').eq('id',user.id).maybeSingle()
        ])
        if(a.error)throw a.error
        if(p.error)throw p.error
        const administrator=Boolean(a.data)
        if(active){setAdmin(administrator);setProfile(p.data)}
        if(!p.data)throw new Error('Seu cadastro ainda não foi sincronizado. Contate o suporte.')
        if(!administrator&&!p.data.is_active){if(active){setStudents([]);setLedger([]);setRequests([]);setRewards([]);setRules([])}return}
        const query = await Promise.all([
          db.from('clube_profiles').select('id,full_name,is_active,created_at').order('created_at',{ascending:false}),
          db.from('clube_point_events').select('id,student_id,event_type,points,note,created_at').order('created_at',{ascending:false}).limit(2000),
          db.from('clube_rewards').select('id,name,category,description,points,stock,icon,theme,is_active').order('created_at',{ascending:true}),
          db.from('clube_reward_requests').select('id,student_id,reward_id,reward_name,points,status,created_at').order('created_at',{ascending:false}).limit(1000),
          db.from('clube_point_rules').select('id,label,points,is_active,sort_order').order('sort_order')
        ])
        for(const item of query){if(item.error)throw item.error}
        if(active){setStudents(query[0].data||[]);setLedger(query[1].data||[]);setRewards(query[2].data||[]);setRequests(query[3].data||[]);setRules(query[4].data||[]);setSelected(value=>value||query[0].data?.find(x=>x.is_active)?.id||'')}
      } catch(e){if(active)setError(errorText(e))}
      finally{if(active)setLoading(false)}
    }
    load();return ()=>{active=false}
  },[user,refreshKey,recover])

  const allYear=useMemo(()=>ledger.filter(ofYear),[ledger])
  const currentId=admin?selected:user?.id
  const forUser=(idValue)=>allYear.filter(x=>x.student_id===idValue)
  const total=(who)=>forUser(who).reduce((n,x)=>n+x.points,0)
  const held=(who)=>requests.filter(x=>x.student_id===who&&x.status==='pending'&&ofYear(x)).reduce((n,x)=>n+x.points,0)
  const available=(who)=>Math.max(0,total(who)-held(who))
  const totalAwarded=allYear.reduce((n,x)=>n+x.points,0)
  const label=(row)=>row.event_type==='resgate'?'Resgate aprovado':row.event_type==='ajuste'?'Ajuste administrativo':rules.find(x=>x.id===row.event_type)?.label||'Atividade de pontos'
  const currentEntries=forUser(currentId)
  const activeStudents=students.filter(x=>x.is_active)
  const filteredStudents=students.filter(x=>`${x.full_name} ${x.id}`.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR')))
  const pending=requests.filter(x=>x.status==='pending')
  const selectedName=students.find(x=>x.id===selected)?.full_name||'Aluno'

  async function signOut(){await db.auth.signOut();setTab('inicio')}
  async function action(run,success){
    setBusy(true);setNotice('')
    try{await run();setModal(null);setNotice(success);reload()}
    catch(e){setNotice(errorText(e))}
    finally{setBusy(false)}
  }
  const checked=async(promise)=>{const r=await promise;if(r.error)throw r.error;return r.data}
  const openAward=(student)=>{setSelected(student||activeStudents[0]?.id||'');setPointsType('renovacao');setPointsValue('');setNote('');setModal('award')}
  function award(e){
    e.preventDefault()
    if(!admin)return
    const p=pointsType==='ajuste'?Number(pointsValue):Number(rules.find(x=>x.id===pointsType)?.points)
    if(!Number.isInteger(p)||p===0||Math.abs(p)>100000){setNotice('Pontuação inválida.');return}
    action(()=>checked(db.rpc('clube_award_points',{p_student_id:selected,p_type:pointsType,p_points:p,p_note:note})), 'Pontos registrados com sucesso.')
  }
  function approveStudent(student,isActive) {
    if(!admin)return
    action(()=>checked(db.from('clube_profiles').update({is_active:isActive}).eq('id',student.id)),isActive?'Aluno aprovado.':'Acesso do aluno suspenso.')
  }
  function redeem(reward){
    if(admin||reward.stock<=0||available(user.id)<reward.points)return
    setRewardDraft(reward);setModal('request')
  }
  function confirmRedeem(){
    action(()=>checked(db.rpc('clube_request_reward',{p_reward_id:rewardDraft.id})),'Pedido enviado para aprovação. Seus pontos ficarão reservados.')
  }
  function decide(req,approve){
    if(!admin)return
    action(()=>checked(db.rpc('clube_decide_reward',{p_request_id:req.id,p_approve:approve})),approve?'Resgate aprovado. Pontos descontados e estoque atualizado.':'Solicitação recusada. Pontos liberados.')
  }
  function saveReward(e){
    e.preventDefault()
    if(!admin)return
    const p=Number(rewardDraft.points),stock=Number(rewardDraft.stock)
    if(!Number.isInteger(p)||p<=0||p>100000||!Number.isInteger(stock)||stock<0||stock>100000){setNotice('Informe pontos e estoque válidos.');return}
    const fields={
      name:rewardDraft.name.trim(),category:rewardDraft.category.trim(),
      description:rewardDraft.description.trim(),points:p,stock,
      icon:allowedIcons.includes(rewardDraft.icon)?rewardDraft.icon:'gift',
      theme:allowedThemes.includes(rewardDraft.theme)?rewardDraft.theme:'lime',
      is_active:Boolean(rewardDraft.is_active)
    }
    if(fields.name.length<3){setNotice('O prêmio precisa ter um nome.');return}
    action(()=>checked(rewardDraft.id?db.from('clube_rewards').update(fields).eq('id',rewardDraft.id):db.from('clube_rewards').insert(fields)),'Recompensa salva com sucesso.')
  }
  if(loading&&(!profile||recover))return <Shell user={user} onExit={signOut}><div className="clube-live-loader">Carregando Clube NPV...</div></Shell>
  if(!user)return <AuthScreen onReady={reload}/>
  if(recover)return <RecoverScreen onExit={signOut} onSaved={()=>{setRecover(false);reload();setNotice('Senha atualizada com sucesso.')}}/>
  if(!profile||(!profile.is_active&&!admin))return <Shell user={user} onExit={signOut}><main className="clube-pending"><div className="clube-pending-icon"><ShieldCheck size={32}/></div><h1>{!profile?'Cadastro em sincronização':'Seu cadastro está aguardando aprovação'}</h1><p>{!profile?'Tente novamente em alguns instantes ou solicite suporte.':'Seu acesso foi criado e você já pode entrar com seu e-mail e senha. O administrador precisa confirmar sua participação antes de liberar o saldo e as recompensas.'}</p>{error&&<p className="clube-real-error">{error}</p>}<button className="clube-btn clube-btn-primary" type="button" onClick={reload}>Verificar novamente <ArrowRight size={16}/></button><button className="clube-btn clube-btn-outline" onClick={signOut}>Sair da conta</button></main></Shell>

  const rewardCard = (reward,manage=false)=><RewardCard key={reward.id} reward={{...reward,active:reward.is_active}} available={available(user?.id)} isAdmin={manage} onRequest={redeem} onEdit={item=>{setRewardDraft({...item,is_active:item.is_active});setModal('reward')}}/>
  return <Shell user={user} onExit={signOut}>
    <div className="clube-container">
      <aside className="clube-sidebar">
        <div className="clube-person"><span className="clube-avatar">{(profile.full_name||'A').charAt(0)}</span><div><strong>{profile.full_name||'Membro NPV'}</strong><span>{admin?'Administrador':'Área do aluno'}</span></div></div>
        <div className="clube-side-label">NAVEGAÇÃO</div><nav className="clube-nav" aria-label="Navegação do clube">
          <button className={tab==='inicio'?'active':''} onClick={()=>setTab('inicio')}><Wallet size={18}/>Visão geral</button>
          {admin&&<button className={tab==='alunos'?'active':''} onClick={()=>setTab('alunos')}><Users size={18}/>Alunos</button>}
          <button className={tab==='historico'?'active':''} onClick={()=>setTab('historico')}><History size={18}/>Histórico</button>
          <button className={tab==='recompensas'?'active':''} onClick={()=>setTab('recompensas')}><Gift size={18}/>Recompensas</button>
        </nav><div className="clube-side-bottom"><span className="clube-side-label">CONTA</span><div className="clube-real-account">{user.email}</div><button className="clube-reset" onClick={signOut}><LogOut size={16}/> Sair</button></div>
      </aside>
      <main className="clube-main">
        {notice&&<div className="clube-feedback" role="status"><Check size={17}/>{notice}<button onClick={()=>setNotice('')} aria-label="Fechar"><X size={15}/></button></div>}
        {error&&<p className="clube-real-error" role="alert">{error} <button onClick={reload}>Tentar novamente</button></p>}
        <div className="clube-intro"><div><div className="clube-eyebrow"><span/> {admin?'ADMINISTRAÇÃO SEGURA':'MEU CLUBE NPV'}</div><h1>{tab==='inicio'?(admin?'Seu clube, sob controle.':'Sua evolução vale pontos.'):tab==='alunos'?'Alunos e aprovações':tab==='historico'?'Histórico de pontos':'Vitrine de recompensas'}</h1><p>{tab==='inicio'?(admin?'Acompanhe alunos, lançamentos e solicitações de resgate.':'Acompanhe suas conquistas e veja os prêmios disponíveis para você.'):tab==='alunos'?'Os alunos criam a própria conta e aguardam sua aprovação.':tab==='historico'?'Extrato de pontos deste ano.':'Conquiste benefícios com seus pontos acumulados.'}</p></div>{admin&&tab!=='recompensas'&&<button className="clube-btn clube-btn-primary" disabled={!activeStudents.length} onClick={()=>openAward()}><Plus size={18}/> Lançar pontos</button>}</div>

        {tab==='inicio'&&admin&&<>
          <div className="clube-kpis"><div className="clube-kpi clube-kpi-dark"><span>PONTOS LÍQUIDOS EM {YEAR}</span><strong>{fmt(totalAwarded)}</strong><small><TrendingUp size={15}/> Histórico real do clube</small></div><div className="clube-kpi"><div className="clube-icon-chip"><Users size={19}/></div><span>ALUNOS ATIVOS</span><strong>{activeStudents.length}</strong><small>{students.filter(x=>!x.is_active).length} aguardando aprovação</small></div><div className="clube-kpi"><div className="clube-icon-chip clube-chip-pink"><Gift size={19}/></div><span>RESGATES PENDENTES</span><strong>{pending.length}</strong><small>Solicitações para analisar</small></div></div>
          {pending.length>0&&<button className="npv-shop-pending-banner" onClick={()=>setTab('recompensas')}><Gift size={19}/><span><strong>{pending.length} solicitação(ões) aguardando aprovação</strong><small>Verificar resgates</small></span><ArrowRight size={16}/></button>}
          <div className="clube-columns"><section className="clube-card"><div className="clube-card-head"><div><h2>Movimentações recentes</h2><p>Lançamentos do clube</p></div></div>{allYear.slice(0,6).map(row=><Entry key={row.id} label={label(row)} caption={`${students.find(x=>x.id===row.student_id)?.full_name||'Aluno'} · ${datePt(row.created_at)}`} value={row.points} negative={row.points<0}/>)}</section>
            <section className="clube-card"><div className="clube-card-head"><div><h2>Alunos para acompanhar</h2><p>Saldo líquido atual</p></div><button className="clube-text-button" onClick={()=>setTab('alunos')}>Ver todos <ArrowRight size={15}/></button></div><div className="clube-ranking">{students.slice(0,6).map(x=><button key={x.id} onClick={()=>{setSelected(x.id);setTab('historico')}}><span className="clube-avatar">{x.full_name?.charAt(0)||'A'}</span><span className="clube-rank-person">{x.full_name||'Aluno'}<small>{x.is_active?'Ativo':'Aguardando'}</small></span><strong>{fmt(total(x.id))} pts</strong><ArrowRight size={14}/></button>)}</div></section>
          </div>
        </>}

        {tab==='inicio'&&!admin&&<>
          <div className="clube-student-summary"><div><div className="clube-student-hello">OLÁ, {profile.full_name?.split(' ')[0]?.toUpperCase()||'ALUNO'}! <span>✦</span></div><p>SALDO DO ANO {YEAR}</p><strong>{fmt(total(user.id))} <small>pontos</small></strong><span className="clube-summary-caption">{held(user.id)>0?`${fmt(held(user.id))} pts reservados · ${fmt(available(user.id))} disponíveis para resgate`:'Cada atividade confirmada faz sua evolução valer mais.'}</span></div><Award size={92}/></div>
          <div className="clube-columns"><section className="clube-card"><div className="clube-card-head"><div><h2>Minhas atividades</h2><p>Seu extrato individual</p></div><button className="clube-text-button" onClick={()=>setTab('historico')}>Ver tudo <ArrowRight size={15}/></button></div>{forUser(user.id).slice(0,5).map(row=><Entry key={row.id} label={label(row)} caption={`${row.note||''} · ${datePt(row.created_at)}`} value={row.points} negative={row.points<0}/>)}{!forUser(user.id).length&&<p className="clube-empty">Seus pontos aparecerão aqui assim que forem lançados.</p>}</section>
            <section className="clube-card clube-next"><div className="clube-card-head"><div><h2>Continue acumulando</h2><p>Atividades que valem pontos</p></div></div><div className="clube-how">{rules.filter(x=>x.is_active).map(x=><div key={x.id}><span>✦</span><strong>{x.label}</strong><b>+{fmt(x.points)}</b></div>)}</div><p className="clube-micro">Os pontos são creditados após validação do administrador.</p></section>
          </div>
          <section className="npv-shop npv-shop-featured"><div className="npv-shop-heading"><div><div className="npv-shop-eyebrow"><Gift size={16}/> CLUBE DE BENEFÍCIOS</div><h2>Troque seus pontos <span>✦</span></h2><p>Escolha a sua próxima conquista.</p></div><button className="npv-shop-view-all" onClick={()=>setTab('recompensas')}>Ver catálogo <ArrowRight size={15}/></button></div><div className="npv-shop-grid">{rewards.filter(x=>x.is_active).slice(0,4).map(x=>rewardCard(x))}</div></section>
        </>}

        {tab==='alunos'&&admin&&<><label className="clube-search clube-real-search"><Search size={18}/><input placeholder="Pesquisar aluno pelo nome" value={search} onChange={e=>setSearch(e.target.value)}/></label><div className="clube-card clube-students">{filteredStudents.map(x=><div className="clube-student-row" key={x.id}><span className="clube-avatar">{x.full_name?.charAt(0)||'A'}</span><div><strong>{x.full_name||'Nome não informado'}</strong><small>{x.is_active?'Aluno aprovado':'Cadastro aguardando aprovação'}</small></div><span className="clube-student-saldo">{fmt(total(x.id))} pts</span>{x.is_active?<><button className="clube-btn clube-btn-outline" onClick={()=>openAward(x.id)}><Plus size={15}/> Pontos</button><button className="clube-real-small" title="Suspender acesso" onClick={()=>approveStudent(x,false)}>Suspender</button></>:<button className="clube-btn clube-btn-primary" onClick={()=>approveStudent(x,true)}><Check size={15}/> Aprovar</button>}</div>)}{!filteredStudents.length&&<div className="clube-empty">Nenhum aluno encontrado.</div>}</div><p className="clube-real-hint">O aluno cria sua própria senha e confirma o e-mail. Você libera a participação aqui, sem acesso à senha de ninguém.</p></>}

        {tab==='historico'&&<div className="clube-card"><div className="clube-card-head"><div><h2>{admin?'Histórico por aluno':'Meu extrato'}</h2><span className="clube-year"><CalendarDays size={16}/>{YEAR}</span></div>{admin&&<select className="clube-real-select" value={selected} onChange={e=>setSelected(e.target.value)} aria-label="Selecionar aluno">{students.map(x=><option value={x.id} key={x.id}>{x.full_name||'Aluno'}</option>)}</select>}{currentEntries.map(row=><Entry key={row.id} label={label(row)} caption={`${row.note||''} · ${datePt(row.created_at)}`} value={row.points} negative={row.points<0}/>)}{!currentEntries.length&&<p className="clube-empty">Nenhum lançamento no período.</p>}</div>}

        {tab==='recompensas'&&<>
          <section className="npv-shop"><div className="npv-shop-heading"><div><div className="npv-shop-eyebrow"><Gift size={16}/> VITRINE NPV</div><h2>{admin?'Gestão de recompensas':'Troque seus pontos'} <span>✦</span></h2><p>{admin?'Cadastre itens e analise solicitações.':'Os pontos são reservados ao solicitar e debitados somente após aprovação.'}</p></div>{admin?<button className="clube-btn clube-btn-primary" onClick={()=>{setRewardDraft(emptyReward());setModal('reward')}}><Plus size={17}/> Novo prêmio</button>:<div className="npv-shop-balance">Disponível <strong>{fmt(available(user.id))} pts</strong></div>}</div><div className="npv-shop-grid">{rewards.filter(x=>admin||x.is_active).map(x=>rewardCard(x,admin))}</div></section>
          <section className="npv-shop-requests"><div className="npv-shop-requests-head"><div><h3>{admin?'Pedidos de resgate':'Meus resgates'}</h3><p>{admin?'Aprovação administrativa, com registro no extrato.':'Confira o andamento das solicitações.'}</p></div></div>{!requests.length&&<div className="npv-shop-no-requests">Nenhum resgate registrado.</div>}{requests.map(x=><div className="npv-shop-request-row" key={x.id}><span className="npv-shop-request-icon"><Gift size={18}/></span><div className="npv-shop-request-text"><strong>{x.reward_name}</strong>{admin&&<span>{students.find(st=>st.id===x.student_id)?.full_name||'Aluno'}</span>}<small>{datePt(x.created_at)} · {fmt(x.points)} pontos</small></div><span className={`npv-shop-status npv-shop-status-${x.status}`}>{x.status==='pending'?'Aguardando':x.status==='approved'?'Aprovado':'Recusado'}</span>{admin&&x.status==='pending'&&<div className="npv-shop-resolve"><button onClick={()=>decide(x,true)} disabled={busy}><Check size={15}/> Aprovar</button><button onClick={()=>decide(x,false)} disabled={busy}><X size={15}/> Recusar</button></div>}</div>)}</section>
        </>}

        <footer className="clube-main-footer"><span>© {YEAR} Não Pense, Vai! — Clube de Benefícios</span><span>Seu acesso é protegido · <a href="/politica-de-privacidade.html">Privacidade</a></span></footer>
      </main>
    </div>
    {modal&&<div className="clube-modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setModal(null)}}><section className="clube-modal" role="dialog" aria-modal="true" aria-labelledby="clube-live-modal">
      <div className="clube-modal-top"><div><small>CLUBE NPV</small><h2 id="clube-live-modal">{modal==='award'?'Registrar pontos':modal==='request'?'Solicitar resgate':'Editar recompensa'}</h2></div><button onClick={()=>setModal(null)} aria-label="Fechar"><X size={20}/></button></div>
      {modal==='award'&&<form className="clube-form" onSubmit={award}><label>Aluno<select required value={selected} onChange={e=>setSelected(e.target.value)}>{activeStudents.map(x=><option value={x.id} key={x.id}>{x.full_name} — {fmt(total(x.id))} pts</option>)}</select></label><label>Motivo<select value={pointsType} onChange={e=>setPointsType(e.target.value)}>{rules.filter(x=>x.is_active).map(x=><option key={x.id} value={x.id}>{x.label} (+{x.points})</option>)}<option value="ajuste">Ajuste manual (+ ou -)</option></select></label>{pointsType==='ajuste'&&<label>Quantidade de pontos<input type="number" step="1" min="-100000" max="100000" value={pointsValue} onChange={e=>setPointsValue(e.target.value)} required/></label>}<label>Observação<textarea rows="2" value={note} onChange={e=>setNote(e.target.value)} required={pointsType==='ajuste'} placeholder="Descrição da atividade ou justificativa"/></label><button className="clube-btn clube-btn-primary clube-btn-full" type="submit" disabled={busy}>{busy?'Salvando...':'Confirmar lançamento'}</button></form>}
      {modal==='request'&&<div className="npv-shop-confirm-body"><strong>{rewardDraft.name}</strong><p>Confirme a solicitação de {fmt(rewardDraft.points)} pontos. Eles ficarão reservados até a aprovação do administrador.</p><button className="clube-btn clube-btn-primary clube-btn-full" disabled={busy} onClick={confirmRedeem}><Check size={17}/> {busy?'Enviando...':'Confirmar solicitação'}</button></div>}
      {modal==='reward'&&<form className="clube-form" onSubmit={saveReward}><label>Nome<input required minLength="3" maxLength="75" value={rewardDraft.name} onChange={e=>setRewardDraft(d=>({...d,name:e.target.value}))}/></label><label>Categoria<input maxLength="45" value={rewardDraft.category} onChange={e=>setRewardDraft(d=>({...d,category:e.target.value}))}/></label><div className="npv-shop-fields"><label>Custo em pontos<input type="number" step="1" min="1" max="100000" required value={rewardDraft.points} onChange={e=>setRewardDraft(d=>({...d,points:e.target.value}))}/></label><label>Estoque<input type="number" step="1" min="0" max="100000" required value={rewardDraft.stock} onChange={e=>setRewardDraft(d=>({...d,stock:e.target.value}))}/></label></div><div className="npv-shop-fields"><label>Ilustração<select value={rewardDraft.icon} onChange={e=>setRewardDraft(d=>({...d,icon:e.target.value}))}>{allowedIcons.map(x=><option value={x} key={x}>{x}</option>)}</select></label><label>Cor<select value={rewardDraft.theme} onChange={e=>setRewardDraft(d=>({...d,theme:e.target.value}))}>{allowedThemes.map(x=><option value={x} key={x}>{x}</option>)}</select></label></div><label>Descrição<textarea maxLength="250" rows="2" value={rewardDraft.description} onChange={e=>setRewardDraft(d=>({...d,description:e.target.value}))}/></label><label className="npv-shop-check"><input type="checkbox" checked={rewardDraft.is_active} onChange={e=>setRewardDraft(d=>({...d,is_active:e.target.checked}))}/> Disponível para os alunos</label><button className="clube-btn clube-btn-primary clube-btn-full" type="submit" disabled={busy}>{busy?'Salvando...':'Salvar recompensa'}</button></form>}
    </section></div>}
  </Shell>
}
