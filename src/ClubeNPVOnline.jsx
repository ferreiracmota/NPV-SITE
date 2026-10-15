import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft, ArrowRight, Award, Check, Clock3, Gift, History, KeyRound, LockKeyhole,
  LogOut, Mail, Package, Plus, Search, ShieldCheck, Sparkles, TrendingUp,
  UserRound, Users, Wallet, X, Shirt, CupSoda, Droplets, Ticket, Pencil, ImagePlus, SlidersHorizontal
} from 'lucide-react'
import { clubeSupabase as supabase } from './clubeSupabase.js'
import './ClubeNPV.css'
import './ClubeRecompensas.css'
import './ClubeNPVOnline.css'

const format = value => Number(value||0).toLocaleString('pt-BR')
const date = value => new Date(value).toLocaleDateString('pt-BR',{day:'2-digit',month:'short',year:'numeric'})
const YEAR = new Date().getFullYear()
const isThisYear = item => new Date(item.created_at).getFullYear() === YEAR
const glyphs={shirt:Shirt,cup:CupSoda,package:Package,water:Droplets,ticket:Ticket,gift:Gift}
const themeSet=new Set(['ink','lime','pink','sky','cream'])
const ruleNames={
  renovacao:'Renovação confirmada',indicacao:'Indicação convertida',foto:'Foto aprovada',
  desafio:'Participação em desafio',aniversario:'Aniversário como assinante',
  ajuste:'Ajuste administrativo',resgate:'Resgate de recompensa'
}
function ShellHeader() {
  return <header className="clube-header"><div className="clube-header-inner">
    <div className="clube-logo"><div className="clube-logo-mark">NPV<span>!</span></div><div className="clube-logo-label"><strong>NÃO PENSE, VAI!</strong><span>CLUBE DE BENEFÍCIOS</span></div></div>
    <div className="clube-header-actions"><a className="clube-back" href="/"><ArrowLeft size={16}/><span>Voltar ao site</span></a><span className="clube-demo-badge clube-online-badge"><span className="clube-demo-dot"/> CLUBE NPV</span></div>
  </div></header>
}
function AuthPage({onLoggedIn,onResetDone,defaultMode='login'}) {
  const [mode,setMode]=useState(defaultMode)
  const [fullName,setFullName]=useState('')
  const [email,setEmail]=useState('')
  const [password,setPassword]=useState('')
  const [show,setShow]=useState('')
  const [busy,setBusy]=useState(false)
  useEffect(()=>{
    const {data:{subscription}}=supabase.auth.onAuthStateChange((event)=>{
      if(event==='PASSWORD_RECOVERY') setMode('reset')
    })
    return ()=>subscription.unsubscribe()
  },[])
  useEffect(()=>{
    supabase.auth.getSession().then(({data})=>{
      if(data.session && new URLSearchParams(window.location.search).has('type')) setMode('reset')
    })
  },[])
  async function submit(e){
    e.preventDefault();setBusy(true);setShow('')
    try{
      if(mode==='forgot'){
        const {error}=await supabase.auth.resetPasswordForEmail(email.trim(),{
          redirectTo:window.location.origin+'/clube'
        })
        if(error) throw error
        setShow('Se esse e-mail estiver cadastrado, enviaremos um link de recuperação. Confira sua caixa de entrada.')
        return
      }
      if(mode==='reset'){
        if(password.length<8) throw new Error('A senha precisa ter pelo menos 8 caracteres.')
        const {error}=await supabase.auth.updateUser({password})
        if(error) throw error
        setPassword('');setMode('login');setShow('Senha atualizada. Seu acesso está pronto.');onResetDone?.()
        return
      }
      if(mode==='signup'){
        if(fullName.trim().length<3) throw new Error('Informe seu nome completo.')
        if(password.length<8) throw new Error('A senha precisa ter pelo menos 8 caracteres.')
        const {error}=await supabase.auth.signUp({
          email:email.trim().toLowerCase(),password,
          options:{data:{full_name:fullName.trim()},emailRedirectTo:window.location.origin+'/clube'}
        })
        if(error) throw error
        setPassword('');setMode('login')
        setShow('Cadastro solicitado! Confira seu e-mail para confirmar a conta. Depois, aguarde a aprovação do Clube NPV.')
        return
      }
      const {data,error}=await supabase.auth.signInWithPassword({email:email.trim(),password})
      if(error) throw error
      setPassword('')
      if(data?.session) onLoggedIn?.(data.session)
    } catch(err){setShow(err?.message||'Não foi possível concluir. Tente novamente.')}
    finally{setBusy(false)}
  }
  return <div className="clube-shell"><ShellHeader/><div className="clube-auth-wrap">
    <div className="clube-auth-hero"><span>SEU CLUBE COMEÇA AQUI ✦</span><h1>Sua evolução merece <em>recompensas.</em></h1><p>Acumule pontos ao longo do ano, acompanhe suas conquistas e descubra os benefícios do Clube Não Pense, Vai!.</p>
      <div><ShieldCheck size={18}/> Conta individual e extrato protegido</div><div><Gift size={18}/> Pontos e recompensas em um só lugar</div>
    </div>
    <section className="clube-auth-panel">
      <div className="clube-auth-icon"><LockKeyhole size={23}/></div>
      <h2>{mode==='signup'?'Quero entrar no Clube NPV':mode==='forgot'?'Recuperar minha senha':mode==='reset'?'Definir nova senha':'Bem-vindo de volta!'}</h2>
      <p>{mode==='signup'?'Crie sua conta. A participação é liberada após aprovação.':mode==='forgot'?'Informe seu e-mail para receber o link de recuperação.':mode==='reset'?'Crie sua nova senha para continuar.':'Entre com seu e-mail e senha para acessar seus pontos.'}</p>
      <form onSubmit={submit} className="clube-form clube-auth-form">
        {mode==='signup'&&<label>Nome completo<input autoComplete="name" required value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="Seu nome"/></label>}
        {mode!=='reset'&&<label>E-mail<input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="voce@email.com"/></label>}
        {mode!=='forgot'&&<label>Senha <input type="password" autoComplete={mode==='login'?'current-password':'new-password'} minLength={mode==='login'?undefined:8} required value={password} onChange={e=>setPassword(e.target.value)} placeholder={mode==='login'?'Sua senha':'Mínimo de 8 caracteres'}/></label>}
        {show&&<div className="clube-auth-message" role="status">{show}</div>}
        <button className="clube-btn clube-btn-primary clube-btn-full" type="submit" disabled={busy}>{busy?'Aguarde...':mode==='signup'?'Solicitar cadastro':mode==='forgot'?'Enviar recuperação':mode==='reset'?'Salvar nova senha':'Entrar no Clube'}<ArrowRight size={17}/></button>
      </form>
      <div className="clube-auth-links">{mode==='login'?<><button onClick={()=>{setMode('forgot');setShow('')}}>Esqueci minha senha</button><button onClick={()=>{setMode('signup');setShow('')}}>Criar uma conta</button></>:<button onClick={()=>{setMode('login');setShow('')}}><ArrowLeft size={15}/> Voltar para login</button>}</div>
      <small>Seus pontos ficam vinculados exclusivamente à sua conta. Esta área não substitui o acesso aos treinos pela Hotmart.</small>
    </section>
  </div></div>
}
const emptyState={members:[],events:[],rewards:[],requests:[],rules:[]}
const REWARD_IMAGE_BUCKET='clube-npv-recompensas'
const rewardImageUrl = path => /^images\/[a-f0-9-]{36}\.(?:jpg|png|webp)$/.test(path||'') ? supabase.storage.from(REWARD_IMAGE_BUCKET).getPublicUrl(path).data.publicUrl : ''
const ruleDefaultPoints=(rules,type)=>rules.find(x=>x.event_type===type)?.points ?? 0
// O limite padrão de linhas da API não pode truncar extratos nem listas de alunos.
// Paginação estável por data e ID, inclusive quando há eventos no mesmo segundo.
const CLUB_PAGE_SIZE=500
async function fetchAllClubeRows(table,columns,ascending=false) {
  const rows=[]
  for(let start=0;;start+=CLUB_PAGE_SIZE){
    const result=await supabase.from(table)
      .select(columns)
      .order('created_at',{ascending})
      .order('id',{ascending:false})
      .range(start,start+CLUB_PAGE_SIZE-1)
    if(result.error)return {data:null,error:result.error}
    rows.push(...(result.data||[]))
    if((result.data||[]).length<CLUB_PAGE_SIZE)return {data:rows,error:null}
  }
}
export default function ClubeNPVOnline() {
  const [session,setSession]=useState(null)
  const [recovery,setRecovery]=useState(false)
  const [initializing,setInitializing]=useState(true)
  const [profile,setProfile]=useState(null)
  const [isAdmin,setIsAdmin]=useState(false)
  const [data,setData]=useState(emptyState)
  const [tab,setTab]=useState('inicio')
  const [notice,setNotice]=useState('')
  const [error,setError]=useState('')
  const [busy,setBusy]=useState(false)
  const [loading,setLoading]=useState(false)
  const [search,setSearch]=useState('')
  const [award,setAward]=useState(null)
  const [rewardDraft,setRewardDraft]=useState(null)
  const [rewardImageFile,setRewardImageFile]=useState(null)
  const [imagePreviewUrl,setImagePreviewUrl]=useState('')
  const [ruleDraft,setRuleDraft]=useState(null)
  useEffect(()=>{
    if(!rewardImageFile){setImagePreviewUrl('');return}
    const objectUrl=URL.createObjectURL(rewardImageFile)
    setImagePreviewUrl(objectUrl)
    return ()=>URL.revokeObjectURL(objectUrl)
  },[rewardImageFile])
  const user=session?.user
  useEffect(()=>{
    let live=true
    supabase.auth.getSession().then(({data})=>{
      if(live){setSession(data?.session||null);setInitializing(false)}
    }).catch(()=>{if(live)setInitializing(false)})
    const {data:{subscription}}=supabase.auth.onAuthStateChange((event,nextSession)=>{
      if(live){setSession(nextSession||null);setInitializing(false);if(event==='PASSWORD_RECOVERY')setRecovery(true)}
    })
    return ()=>{live=false;subscription.unsubscribe()}
  },[])
  useEffect(()=>{
    let active=true
    setProfile(null);setIsAdmin(false);setData(emptyState);setTab('inicio');setError('')
    if(!user?.id) return
    ;(async()=>{
      const [role,owner]=await Promise.all([
        supabase.from('clube_admins').select('user_id').eq('user_id',user.id).maybeSingle(),
        supabase.from('clube_profiles').select('*').eq('id',user.id).maybeSingle()
      ])
      if(!active)return
      if(role.error||owner.error||!owner.data){setError('Não foi possível carregar o seu cadastro. O banco de dados pode estar em configuração.');return}
      setIsAdmin(Boolean(role.data));setProfile(owner.data)
    })()
    return ()=>{active=false}
  },[user?.id])
  const refresh=useCallback(async()=>{
    if(!user?.id || !profile || (!isAdmin&&!profile.approved)) return
    setLoading(true)
    try {
      const queries=[
        isAdmin ? fetchAllClubeRows('clube_profiles','id,full_name,email,approved,created_at') : Promise.resolve({data:[],error:null}),
        fetchAllClubeRows('clube_point_events','id,student_id,event_type,points,note,created_at'),
        fetchAllClubeRows('clube_rewards','id,name,category,description,points,stock,icon,theme,active,showcase,image_path,created_at',true),
        fetchAllClubeRows('clube_redemptions','id,student_id,reward_id,reward_name,points,status,created_at,resolved_at'),
        supabase.from('clube_point_rules').select('event_type,points,position').order('position',{ascending:true})
      ]
      const results=await Promise.all(queries)
      if(results.some(x=>x.error)){
        setError('Não foi possível carregar o Clube NPV. Confira a estrutura do banco e as permissões.')
      } else {
        setData({members:results[0].data||[],events:results[1].data||[],rewards:results[2].data||[],requests:results[3].data||[],rules:results[4].data||[]})
        setError('')
      }
    } catch {
      setError('A conexão foi interrompida. Tente atualizar os dados do clube.')
    } finally {
      setLoading(false)
    }
  },[user?.id,profile?.id,profile?.approved,isAdmin])
  useEffect(()=>{refresh()},[refresh])
  const approved=profile?.approved || isAdmin
  const balance=id=>data.events.filter(x=>x.student_id===id && isThisYear(x)).reduce((acc,x)=>acc+x.points,0)
  const reserved=id=>data.requests.filter(x=>x.student_id===id && x.status==='pending').reduce((acc,x)=>acc+x.points,0)
  const mine=useMemo(()=>data.events.filter(x=>x.student_id===user?.id),[data.events,user?.id])
  const mineRequests=useMemo(()=>data.requests.filter(x=>x.student_id===user?.id),[data.requests,user?.id])
  const studentMembers=isAdmin?data.members.filter(x=>x.id!==user?.id):data.members
  const catalogRewards=data.rewards.filter(x=>x.active||x.showcase)
  const totalPoints=data.events.filter(isThisYear).reduce((acc,x)=>acc+x.points,0)
  const pendingCount=data.requests.filter(x=>x.status==='pending').length
  const memberName=id=>data.members.find(x=>x.id===id)?.full_name||'Aluno'
  const formatError=e=>e?.message?.includes('row-level security')?'Operação não permitida para esta conta.':e?.message||'Ocorreu um erro ao salvar.'
  async function run(action,success){
    setBusy(true);setNotice('')
    try{await action();setNotice(success);await refresh()}
    catch(e){setNotice(formatError(e))}
    finally{setBusy(false)}
  }
  async function approve(id){
    if(!isAdmin || !window.confirm('Aprovar este aluno para acessar o Clube NPV?'))return
    await run(async()=>{
      const {error}=await supabase.from('clube_profiles').update({approved:true}).eq('id',id)
      if(error)throw error
    },'Aluno aprovado para acessar o clube.')
  }
  async function submitAward(e){
    e.preventDefault()
    if(!isAdmin||!award)return
    const pts=Number(award.points)
    if(!Number.isInteger(pts)||!pts||Math.abs(pts)>100000){setNotice('Informe pontos inteiros válidos.');return}
    if(pts<0&&award.type!=='ajuste'){setNotice('Descontos manuais devem usar a categoria Ajuste.');return}
    await run(async()=>{
      const {error}=await supabase.rpc('clube_award_points',{p_student_id:award.studentId,p_type:award.type,p_points:pts,p_note:award.note.trim()})
      if(error) throw error
      setAward(null)
    },'Pontos lançados e salvos no banco de dados.')
  }
  async function requestReward(reward){
    if(!approved||isAdmin||!reward.active||!window.confirm(`Solicitar ${reward.name} por ${format(reward.points)} pontos? O pedido aguardará aprovação.`))return
    await run(async()=>{
      const {error}=await supabase.rpc('clube_request_redemption',{p_reward_id:reward.id})
      if(error)throw error
    },'Solicitação enviada ao administrador. Seus pontos estão reservados até a resposta.')
  }
  async function resolve(req,approve){
    if(!isAdmin||!window.confirm(`${approve?'Aprovar':'Recusar'} solicitação de ${memberName(req.student_id)}?`)) return
    await run(async()=>{
      const {error}=await supabase.rpc('clube_resolve_redemption',{p_id:req.id,p_approve:approve})
      if(error)throw error
    },approve?'Resgate aprovado; pontos e estoque atualizados.':'Resgate recusado; pontos liberados.')
  }
  function editReward(item){setRewardImageFile(null);setRewardDraft({...item})}
  async function saveReward(e){
    e.preventDefault();if(!isAdmin||!rewardDraft)return
    const item={...rewardDraft}
    const payload={name:item.name.trim(),category:item.category.trim()||'Benefícios',description:item.description.trim(),points:Number(item.points),stock:Number(item.stock),icon:item.icon,theme:item.theme,active:Boolean(item.active),showcase:Boolean(item.showcase||item.active),image_path:item.image_path||''}
    if(payload.name.length<3||!Number.isSafeInteger(payload.points)||payload.points<1||!Number.isSafeInteger(payload.stock)||payload.stock<0){setNotice('Confira nome, pontos e estoque.');return}
    await run(async()=>{
      if(rewardImageFile){
        const mimeExtensions={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}
        const ext=mimeExtensions[rewardImageFile.type]
        if(!ext||rewardImageFile.size>4*1024*1024||rewardImageFile.size<1)throw new Error('A imagem deve ser JPG, PNG ou WebP e ter até 4 MB.')
        const filePath=`images/${crypto.randomUUID()}.${ext}`
        const uploaded=await supabase.storage.from(REWARD_IMAGE_BUCKET).upload(filePath,rewardImageFile,{contentType:rewardImageFile.type,cacheControl:'3600',upsert:false})
        if(uploaded.error)throw uploaded.error
        payload.image_path=filePath
      }
      const db=item.id?supabase.from('clube_rewards').update(payload).eq('id',item.id):supabase.from('clube_rewards').insert(payload)
      const {error}=await db
      if(error)throw error
      setRewardImageFile(null);setRewardDraft(null)
    },'Recompensa e imagem salvas no banco de dados.')
  }
  async function saveRules(e){
    e.preventDefault();if(!isAdmin||!ruleDraft)return
    if(ruleDraft.some(x=>!Number.isSafeInteger(Number(x.points))||Number(x.points)<0||Number(x.points)>100000)){setNotice('Informe pontos entre 0 e 100.000 para cada atividade.');return}
    await run(async()=>{
      for(const rule of ruleDraft){
        const {error}=await supabase.from('clube_point_rules').update({points:Number(rule.points),updated_at:new Date().toISOString()}).eq('event_type',rule.event_type)
        if(error)throw error
      }
      setRuleDraft(null)
    },'Valores de referência atualizados. Os pontos continuam sendo lançados pela administração.')
  }
  async function signOut(){await supabase.auth.signOut();setSession(null)}
  function newAward(id){setAward({studentId:id||studentMembers.find(x=>x.approved)?.id||'',type:'renovacao',points:ruleDefaultPoints(data.rules,'renovacao'),note:''})}
  const activityList=(rows,showMember=false)=><div className="clube-activities">
    {!rows.length&&<p className="clube-empty">Nenhuma movimentação registrada ainda.</p>}
    {rows.map(x=><div className="clube-activity" key={x.id}>
      <span className={`clube-activity-icon ${x.points<0?'clube-debit':''}`}><Sparkles size={18}/></span>
      <div className="clube-activity-description"><strong>{ruleNames[x.event_type]||'Atividade'}</strong>{showMember&&<span>{memberName(x.student_id)}</span>}{x.note&&<span>{x.note}</span>}<small>{date(x.created_at)}</small></div>
      <strong className={`clube-activity-points ${x.points<0?'clube-negative':''}`}>{x.points>0?'+':''}{format(x.points)} pts</strong>
    </div>)}
  </div>
  function rewardsGrid(limit=null){return <div className="npv-shop-grid">
    {(isAdmin?data.rewards:catalogRewards).length===0&&<p className="npv-shop-empty">Nenhuma recompensa cadastrada para exibição no momento.</p>}
    {(isAdmin?data.rewards:catalogRewards).slice(0,limit||undefined).map(item=>{
      const Icon=glyphs[item.icon]||Gift
      const enough=balance(user?.id)-reserved(user?.id)>=item.points
      return <article className="npv-shop-card" key={item.id}>
        <div className={`npv-shop-art npv-shop-art-${themeSet.has(item.theme)?item.theme:'lime'}`}>
          {rewardImageUrl(item.image_path)?<img src={rewardImageUrl(item.image_path)} alt={`Foto de ${item.name}`} className="npv-shop-photo" loading="lazy"/>:<Icon size={87} strokeWidth={1.2}/>}
          <span className="npv-shop-art-stamp">CLUBE NPV ✦</span><span className="npv-shop-art-corner">NPV / {YEAR}</span>
        </div>
        <div className="npv-shop-info">
          <span className="npv-shop-category">{item.category}</span><h3>{item.name}</h3>
          <div className="npv-shop-price"><strong>{format(item.points)}</strong><span>pontos</span></div>
          <div className="npv-shop-foot">
            <span className={`npv-shop-stock ${item.stock<=0||(!isAdmin&&!enough)?'npv-shop-stock-off':''}`}>{!item.active?'Em demonstração · resgate indisponível':item.stock<1?'Indisponível':isAdmin?`${item.stock} em estoque`:enough?'Disponível para solicitar':`Faltam ${format(item.points-balance(user?.id)+reserved(user?.id))} pontos`}</span>
            {isAdmin?<button className="npv-shop-edit" onClick={()=>editReward(item)}><Pencil size={15}/> Editar prêmio e foto</button>
            :<button className="npv-shop-request" disabled={busy||!item.active||!enough||item.stock<1} onClick={()=>requestReward(item)}>{!item.active?'Em breve':enough?'Solicitar resgate':'Acumule pontos'}<ArrowRight size={14}/></button>}
          </div>
        </div>
      </article>
    })}
  </div>}
  if(initializing) return <div className="clube-shell"><ShellHeader/><div className="clube-auth-loading">Preparando acesso seguro ao Clube NPV...</div></div>
  if(recovery) return <AuthPage defaultMode="reset" onLoggedIn={setSession} onResetDone={()=>setRecovery(false)}/>
  if(!session) return <AuthPage onLoggedIn={setSession}/>
  if(!profile&&!error)return <div className="clube-shell"><ShellHeader/><div className="clube-auth-loading">Consultando seu cadastro...</div></div>
  if(!profile&&error)return <div className="clube-shell"><ShellHeader/><div className="clube-auth-loading clube-waiting"><ShieldCheck size={40}/><h1>Seu acesso ainda não está disponível</h1><p>{error}</p><button className="clube-btn clube-btn-outline" onClick={signOut}>Voltar ao login</button></div></div>
  if(!approved&&!error)return <div className="clube-shell"><ShellHeader/><div className="clube-auth-loading clube-waiting"><Clock3 size={44}/><h1>Cadastro recebido!</h1><p>Seu e-mail foi confirmado. Agora falta a aprovação do administrador para você visualizar seus pontos e as recompensas.</p><button className="clube-btn clube-btn-outline" onClick={signOut}>Sair da conta</button></div></div>
  return <div className="clube-shell"><ShellHeader/>
    <div className="clube-container"><aside className="clube-sidebar">
      <div className="clube-person"><span className="clube-avatar">{(profile?.full_name||user?.email||'A').charAt(0).toUpperCase()}</span><div><strong>{profile?.full_name||user?.email}</strong><span>{isAdmin?'Administração':'Minha conta'}</span></div></div>
      <div className="clube-side-label">MINHA NAVEGAÇÃO</div>
      <nav className="clube-nav"><button className={tab==='inicio'?'active':''} onClick={()=>setTab('inicio')}><Wallet size={18}/>Visão geral</button>
        {isAdmin&&<button className={tab==='alunos'?'active':''} onClick={()=>setTab('alunos')}><Users size={18}/>Alunos</button>}
        <button className={tab==='historico'?'active':''} onClick={()=>setTab('historico')}><History size={18}/>Histórico</button>
        <button className={tab==='recompensas'?'active':''} onClick={()=>setTab('recompensas')}><Gift size={18}/>Recompensas</button>
      </nav>
      <div className="clube-side-bottom"><span className="clube-side-label">CONTA SEGURA</span><div className="clube-online-email">{user.email}</div><button className="clube-online-logout" onClick={signOut}><LogOut size={15}/>Sair da conta</button></div>
    </aside>
    <main className="clube-main">
      <div className="clube-online-mobile-account"><span>{isAdmin?'Administrador':'Aluno'} · {user.email}</span><button onClick={signOut}><LogOut size={15}/> Sair</button></div>
      {error&&<div className="clube-online-alert" role="alert">{error} <button onClick={refresh}>Tentar novamente</button></div>}
      {notice&&<div className="clube-feedback" role="status"><Check size={17}/>{notice}<button onClick={()=>setNotice('')}><X size={16}/></button></div>}
      <div className="clube-intro"><div><div className="clube-eyebrow"><span/> {isAdmin?'PAINEL DE GESTÃO':'MINHA CONTA NPV'}</div><h1>{tab==='inicio'?(isAdmin?'Seu clube, sob controle.':'Sua evolução vale pontos.'):tab==='alunos'?'Alunos do Clube NPV':tab==='historico'?'Histórico de pontos':'Benefícios e recompensas'}</h1><p>{isAdmin?'Gerencie os cadastros, lançamentos e solicitações com segurança.':'Seu extrato de pontos e benefícios em um só lugar.'}</p></div>
        {isAdmin&&tab!=='recompensas'&&<button className="clube-btn clube-btn-primary" onClick={()=>newAward()}><Plus size={17}/> Lançar pontos</button>}
      </div>
      {loading&&<p className="clube-online-loading">Atualizando dados do clube...</p>}
      {tab==='inicio'&&isAdmin&&<>
        <div className="npv-admin-rules-bar"><div><strong>Regras de pontuação</strong><span>Valores informativos apresentados aos alunos. Editáveis por você.</span></div><button className="clube-btn clube-btn-outline" onClick={()=>setRuleDraft(data.rules.map(x=>({...x})))}><SlidersHorizontal size={16}/> Editar pontos</button></div>
        <div className="clube-kpis"><div className="clube-kpi clube-kpi-dark"><span>PONTOS DISTRIBUÍDOS EM {YEAR}</span><strong>{format(totalPoints)}</strong><small><TrendingUp size={15}/> Saldo líquido dos lançamentos</small></div><div className="clube-kpi"><span>ALUNOS APROVADOS</span><strong>{studentMembers.filter(x=>x.approved).length}</strong><small>Perfis autorizados</small></div><div className="clube-kpi"><span>RESGATES PENDENTES</span><strong>{pendingCount}</strong><small>Aguardando decisão</small></div></div>
        {pendingCount>0&&<button className="npv-shop-pending-banner" onClick={()=>setTab('recompensas')}><Gift size={20}/><span><strong>{pendingCount} pedido(s) aguardando aprovação</strong><small>Ver a fila de resgates</small></span><ArrowRight size={17}/></button>}
        <div className="clube-columns"><section className="clube-card"><div className="clube-card-head"><div><h2>Últimas movimentações</h2><p>Histórico do clube</p></div></div>{activityList(data.events.slice(0,6),true)}</section><section className="clube-card"><div className="clube-card-head"><div><h2>Novos cadastros</h2><p>Alunos aguardando aprovação</p></div></div>{studentMembers.filter(x=>!x.approved).slice(0,6).map(x=><div className="clube-online-member" key={x.id}><div><strong>{x.full_name}</strong><small>{x.email}</small></div><button disabled={busy} className="clube-btn clube-btn-outline" onClick={()=>approve(x.id)}><Check size={15}/> Aprovar</button></div>)}{studentMembers.every(x=>x.approved)&&<p className="clube-empty">Nenhum cadastro pendente.</p>}<button className="clube-btn clube-btn-outline clube-btn-full" onClick={()=>setTab('alunos')}>Gerenciar alunos</button></section></div>
      </>}
      {tab==='inicio'&&!isAdmin&&<>
        <div className="clube-student-summary"><div><div className="clube-student-hello">OLÁ, {profile?.full_name?.split(' ')[0]?.toUpperCase()||'ALUNO'}! ✦</div><p>SEUS PONTOS EM {YEAR}</p><strong>{format(balance(user.id))} <small>pontos</small></strong><span className="clube-summary-caption">Disponíveis para solicitar: {format(Math.max(0,balance(user.id)-reserved(user.id)))} pontos</span></div><Award size={90}/></div>
        <div className="clube-columns"><section className="clube-card"><div className="clube-card-head"><div><h2>Minhas atividades</h2><p>Meu extrato de pontos</p></div><button className="clube-text-button" onClick={()=>setTab('historico')}>Ver tudo <ArrowRight size={16}/></button></div>{activityList(mine.slice(0,6))}</section><section className="clube-card clube-next"><div className="clube-card-head"><div><h2>Continue acumulando</h2><p>Atividades que podem render pontos</p></div></div><div className="clube-how">{data.rules.map(rule=><div key={rule.event_type}><span>✦</span><strong>{ruleNames[rule.event_type]||rule.event_type}</strong><b>+{format(rule.points)} pts</b></div>)}</div><p className="clube-micro">Pontuação de referência em testes. As atividades precisam ser confirmadas pela administração; os pontos não são adicionados automaticamente.</p></section></div>
        <section className="npv-shop npv-shop-featured"><div className="npv-shop-heading"><div><div className="npv-shop-eyebrow"><Gift size={15}/>LOJINHA DO CLUBE NPV</div><h2>Troque seus pontos ✦</h2><p>Seu próximo objetivo pode estar aqui.</p></div><button className="npv-shop-view-all" onClick={()=>setTab('recompensas')}>Ver catálogo <ArrowRight size={16}/></button></div>{rewardsGrid(4)}<p className="npv-shop-demo-note">A disponibilidade real será confirmada após a aprovação do prêmio e dos parceiros.</p></section>
      </>}
      {tab==='alunos'&&isAdmin&&<><div className="clube-toolbar"><label className="clube-search"><Search size={18}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar aluno ou e-mail"/></label></div><div className="clube-card clube-students">{studentMembers.filter(x=>`${x.full_name} ${x.email}`.toLowerCase().includes(search.toLowerCase())).map(x=><div className="clube-student-row" key={x.id}><span className="clube-avatar">{x.full_name?.charAt(0)||'A'}</span><div><strong>{x.full_name||x.email}</strong><small>{x.email} · {x.approved?'Aprovado':'Aguardando aprovação'}</small></div><span className="clube-student-saldo">{format(balance(x.id))} pts</span>{x.approved?<button className="clube-btn clube-btn-outline" onClick={()=>newAward(x.id)}><Plus size={15}/> Pontos</button>:<button disabled={busy} className="clube-btn clube-btn-primary" onClick={()=>approve(x.id)}><Check size={15}/> Aprovar</button>}</div>)}</div></>}
      {tab==='historico'&&<div className="clube-card"><div className="clube-card-head"><div><h2>{isAdmin?'Extrato do Clube':'Meu extrato'}</h2><p>Lançamentos com data e motivo</p></div></div>{activityList(isAdmin?data.events:mine,isAdmin)}</div>}
      {tab==='recompensas'&&<section className="npv-shop"><div className="npv-shop-heading"><div><div className="npv-shop-eyebrow"><Gift size={15}/> CLUBE NPV</div><h2>Vitrine de recompensas ✦</h2><p>Prêmios, benefícios e pedidos de resgate.</p></div>{isAdmin?<button className="clube-btn clube-btn-primary" onClick={()=>editReward({name:'',category:'Benefícios',description:'',points:500,stock:1,icon:'gift',theme:'lime',active:false,showcase:true,image_path:''})}><Plus size={16}/> Novo prêmio</button>:<div className="npv-shop-balance">Saldo disponível<strong>{format(Math.max(0,balance(user.id)-reserved(user.id)))} pts</strong></div>}</div>{rewardsGrid()}
        <div className="npv-shop-requests"><div className="npv-shop-requests-head"><div><h3>{isAdmin?'Solicitações para aprovação':'Meus resgates'}</h3><p>{isAdmin?'Pedidos feitos pelos alunos':'Histórico e andamento dos pedidos'}</p></div>{isAdmin&&<span className="npv-shop-pending-count">{pendingCount} pendentes</span>}</div>{(isAdmin?data.requests:mineRequests).length===0&&<p className="npv-shop-no-requests">Nenhum pedido por enquanto.</p>}{(isAdmin?data.requests:mineRequests).map(req=><div className="npv-shop-request-row" key={req.id}><span className="npv-shop-request-icon"><Gift size={19}/></span><div className="npv-shop-request-text"><strong>{req.reward_name}</strong>{isAdmin&&<span>{memberName(req.student_id)}</span>}<small>{date(req.created_at)} · {format(req.points)} pts</small></div><span className={`npv-shop-status npv-shop-status-${req.status}`}>{req.status==='pending'?'Aguardando':req.status==='approved'?'Aprovado':'Recusado'}</span>{isAdmin&&req.status==='pending'&&<div className="npv-shop-resolve"><button disabled={busy} onClick={()=>resolve(req,true)}>Aprovar</button><button disabled={busy} onClick={()=>resolve(req,false)}>Recusar</button></div>}</div>)}</div>
      </section>}
      <footer className="clube-main-footer"><span>© {YEAR} Não Pense, Vai! — Clube NPV</span><span>Conta e histórico individual protegidos por autenticação.</span></footer>
    </main></div>
    {award&&isAdmin&&<div className="clube-modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setAward(null)}}><section className="clube-modal" role="dialog" aria-modal="true" aria-labelledby="award-title"><div className="clube-modal-top"><div><small>ADMINISTRAÇÃO</small><h2 id="award-title">Lançar pontos</h2></div><button onClick={()=>setAward(null)} aria-label="Fechar"><X size={20}/></button></div><form className="clube-form" onSubmit={submitAward}>
      <label>Aluno aprovado<select required value={award.studentId} onChange={e=>setAward(d=>({...d,studentId:e.target.value}))}><option value="">Selecione um aluno</option>{studentMembers.filter(x=>x.approved).map(x=><option value={x.id} key={x.id}>{x.full_name||x.email}</option>)}</select></label>
      <label>Atividade<select value={award.type} onChange={e=>setAward(d=>({...d,type:e.target.value,points:ruleDefaultPoints(data.rules,e.target.value)}))}>{Object.entries(ruleNames).filter(([k])=>k!=='resgate').map(([k,v])=><option value={k} key={k}>{v}</option>)}</select></label>
      <label>Pontos<input type="number" min="-100000" max="100000" step="1" value={award.points} onChange={e=>setAward(d=>({...d,points:e.target.value}))} required/></label>
      <label>Justificativa {award.type==='ajuste'?'(obrigatória)':'(opcional)'}<textarea rows={2} value={award.note} onChange={e=>setAward(d=>({...d,note:e.target.value}))} required={award.type==='ajuste'}/></label>
      <button className="clube-btn clube-btn-primary clube-btn-full" type="submit" disabled={busy}>{busy?'Salvando...':'Confirmar lançamento'} <Check size={17}/></button>
    </form></section></div>}
    {rewardDraft&&isAdmin&&<div className="clube-modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setRewardDraft(null)}}><section className="clube-modal" role="dialog" aria-modal="true" aria-labelledby="reward-title"><div className="clube-modal-top"><div><small>PRÊMIOS DO CLUBE</small><h2 id="reward-title">{rewardDraft.id?'Editar prêmio':'Cadastrar prêmio'}</h2></div><button onClick={()=>setRewardDraft(null)} aria-label="Fechar"><X size={20}/></button></div><form className="clube-form" onSubmit={saveReward}>
      <label>Nome<input required minLength={3} maxLength={75} value={rewardDraft.name} onChange={e=>setRewardDraft(d=>({...d,name:e.target.value}))}/></label>
      <label>Categoria<input value={rewardDraft.category} onChange={e=>setRewardDraft(d=>({...d,category:e.target.value}))}/></label>
      <div className="npv-shop-fields"><label>Custo em pontos<input type="number" step="1" min="1" value={rewardDraft.points} onChange={e=>setRewardDraft(d=>({...d,points:e.target.value}))}/></label><label>Estoque<input type="number" step="1" min="0" value={rewardDraft.stock} onChange={e=>setRewardDraft(d=>({...d,stock:e.target.value}))}/></label></div>
      <div className="npv-shop-fields"><label>Ilustração<select value={rewardDraft.icon} onChange={e=>setRewardDraft(d=>({...d,icon:e.target.value}))}>{Object.keys(glyphs).map(k=><option value={k} key={k}>{k}</option>)}</select></label><label>Cor<select value={rewardDraft.theme} onChange={e=>setRewardDraft(d=>({...d,theme:e.target.value}))}>{[...themeSet].map(k=><option value={k} key={k}>{k}</option>)}</select></label></div>
      <label>Descrição<textarea rows={2} value={rewardDraft.description} onChange={e=>setRewardDraft(d=>({...d,description:e.target.value}))}/></label>
      <div className="npv-reward-photo-editor">
        <strong>Foto do produto</strong>
        <div className="npv-photo-preview">{imagePreviewUrl?<img src={imagePreviewUrl} alt="Prévia da nova foto"/>:rewardImageUrl(rewardDraft.image_path)?<img src={rewardImageUrl(rewardDraft.image_path)} alt="Foto atual"/>:<ImagePlus size={40}/>}</div>
        <label>Substituir por uma foto do celular<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setRewardImageFile(e.target.files?.[0]||null)}/></label>
        {rewardDraft.image_path&&<button type="button" className="npv-shop-edit" onClick={()=>{setRewardImageFile(null);setRewardDraft(d=>({...d,image_path:''}))}}>Remover foto atual</button>}
        <small>JPG, PNG ou WebP, máximo 4 MB. A foto do catálogo será pública.</small>
      </div>
      <label className="npv-shop-check"><input type="checkbox" checked={Boolean(rewardDraft.showcase)} onChange={e=>setRewardDraft(d=>({...d,showcase:e.target.checked}))}/> Exibir na lojinha, mesmo sem resgate</label>
      <label className="npv-shop-check"><input type="checkbox" checked={rewardDraft.active} onChange={e=>setRewardDraft(d=>({...d,active:e.target.checked,showcase:e.target.checked?true:d.showcase}))}/> Habilitar pedidos de resgate real (somente com prêmio confirmado)</label>
      <button className="clube-btn clube-btn-primary clube-btn-full" type="submit" disabled={busy}>{busy?'Salvando...':'Salvar prêmio'} <Check size={16}/></button>
    </form></section></div>}
    {ruleDraft&&isAdmin&&<div className="clube-modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setRuleDraft(null)}}><section className="clube-modal" role="dialog" aria-modal="true" aria-labelledby="rules-title"><div className="clube-modal-top"><div><small>CLUBE NPV</small><h2 id="rules-title">Editar pontuação</h2></div><button type="button" onClick={()=>setRuleDraft(null)} aria-label="Fechar"><X size={20}/></button></div><form className="clube-form" onSubmit={saveRules}>
      <p>Defina quantos pontos cada atividade vale. Esses valores aparecem na área do aluno e servem de referência para lançamentos manuais.</p>
      {ruleDraft.map((rule,i)=><label key={rule.event_type}>{ruleNames[rule.event_type]||rule.event_type}<input type="number" min="0" max="100000" step="1" required value={rule.points} onChange={e=>setRuleDraft(d=>d.map((x,j)=>j===i?{...x,points:e.target.value}:x))}/></label>)}
      <button type="submit" className="clube-btn clube-btn-primary clube-btn-full" disabled={busy}>{busy?'Salvando...':'Salvar pontuação'} <Check size={16}/></button>
    </form></section></div>}
  </div>
}
