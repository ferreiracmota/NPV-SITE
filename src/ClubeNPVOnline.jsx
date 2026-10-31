import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft, ArrowRight, Award, Check, Clock3, Gift, History, KeyRound, LockKeyhole,
  LogOut, Mail, Package, Plus, Search, ShieldCheck, Sparkles, TrendingUp,
  UserRound, Users, Wallet, X, Shirt, CupSoda, Droplets, Ticket, Pencil, ImagePlus, SlidersHorizontal, ChevronDown, ChevronUp, CreditCard, Layers3, Instagram, Link2, Settings2, Activity, Palette
} from 'lucide-react'
import { clubeSupabase as supabase } from './clubeSupabase.js'
import logoVaiCirculo from './assets/logo-vai-circular.webp'
import './ClubeNPV.css'
import './ClubeRecompensas.css'
import './ClubeNPVOnline.css'
import './ClubeLiveHeader.css'
import './ClubeV211.css'
import { BenefitNotice, PartnerCards, PartnerEditor, safePartnerUrl } from './ClubeExtras.jsx'
import ClubeKmSetup from './ClubeKmSetup.jsx'
import ClubeRegisteredActivities from './ClubeRegisteredActivities.jsx'
import ClubeConnectionGuide from './ClubeConnectionGuide.jsx'
import ClubeMonthlyChallengeAdmin from './ClubeMonthlyChallengeAdmin.jsx'
import { currentNpvMonth } from '../clube/strava/challengeProgress.mjs'
import ClubeSiteWidgetAdmin from './ClubeSiteWidgetAdmin.jsx'
import ClubeHotmartAdmin from './ClubeHotmartAdmin.jsx'
import ClubeVersionsAdmin from './ClubeVersionsAdmin.jsx'
import ClubeInstagramPanel from './ClubeInstagramPanel.jsx'
import ClubeInstagramAdminSummary from './ClubeInstagramAdminSummary.jsx'
import ClubeAdminStudents from './ClubeAdminStudents.jsx'
import ClubeStudentProfile from './ClubeStudentProfile.jsx'
import ClubeStudentMomentum from './ClubeStudentMomentum.jsx'
import ClubeEmailAdmin from './ClubeEmailAdmin.jsx'
import ClubeAppearanceAdmin from './ClubeAppearanceAdmin.jsx'
import './ClubeStudentDark.css'
import {firstNameOf} from '../clube/profile/achievements.mjs'
import {BIRTHDAY_MONTHS,BIRTHDAY_DAYS,birthdayFromParts,validOptionalPhone} from '../clube/profile/birthday.mjs'
import './ClubeAdminWorkspace.css'
import './ClubeBirthday.css'
import './ClubeStudentPolish.css'

const format = value => Number(value||0).toLocaleString('pt-BR')
const date = value => new Date(value).toLocaleDateString('pt-BR',{day:'2-digit',month:'short',year:'numeric'})
const statementMonth = value => Number.isNaN(Date.parse(value))?'Data não informada':new Date(value).toLocaleDateString('pt-BR',{month:'long',year:'numeric'})
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
    <div className="clube-logo"><img className="clube-logo-vai" src={logoVaiCirculo} alt="" aria-hidden="true"/><div className="clube-logo-label"><strong>NÃO PENSE, VAI!</strong><span>CLUBE DE BENEFÍCIOS</span></div></div>
    <div className="clube-header-actions"><a className="clube-back" href="/"><ArrowLeft size={16}/><span>Voltar ao site</span></a><span className="clube-demo-badge clube-online-badge"><span className="clube-demo-dot"/> CLUBE NPV</span></div>
  </div></header>
}
function AuthPage({onLoggedIn,onResetDone,defaultMode='login'}) {
  const [mode,setMode]=useState(defaultMode)
  const [fullName,setFullName]=useState('')
  const [birthdayDay,setBirthdayDay]=useState('')
  const [birthdayMonth,setBirthdayMonth]=useState('')
  const [phone,setPhone]=useState('')
  const [birthdayExOptIn,setBirthdayExOptIn]=useState(false)
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
        const birthday=birthdayFromParts(birthdayDay,birthdayMonth)
        if(!birthday) throw new Error('Informe um dia e mês de nascimento válidos.')
        if(!validOptionalPhone(phone)) throw new Error('Confira o número de WhatsApp informado.')
        if(password.length<8) throw new Error('A senha precisa ter pelo menos 8 caracteres.')
        const {error}=await supabase.auth.signUp({
          email:email.trim().toLowerCase(),password,
          options:{data:{full_name:fullName.trim(),birthday_mmdd:birthday,phone:phone.trim()||null,birthday_exstudent_opt_in:birthdayExOptIn},emailRedirectTo:window.location.origin+'/clube'}
        })
        if(error) throw error
        setPassword('');setMode('login')
        setShow('Cadastro solicitado! Confira seu e-mail para confirmar a conta. Depois, aguarde a aprovação do Clube NPV.')
        return
      }
      const {data,error}=await supabase.auth.signInWithPassword({email:email.trim(),password})
      if(error) throw error
      // Ao concluir o login, solte o foco do campo para o iOS fechar o teclado
      // antes de montar a nova tela (sem interferir na autenticação).
      if(document.activeElement instanceof HTMLElement) document.activeElement.blur()
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
        {mode==='signup'&&<label>Data de nascimento <span>(dia e mês)</span><span className="npv-birthday-inputs"><select aria-label="Dia do nascimento" required value={birthdayDay} onChange={e=>setBirthdayDay(e.target.value)}><option value="">Dia</option>{BIRTHDAY_DAYS.map(d=><option key={d} value={d}>{d}</option>)}</select><select aria-label="Mês do nascimento" required value={birthdayMonth} onChange={e=>setBirthdayMonth(e.target.value)}><option value="">Mês</option>{BIRTHDAY_MONTHS.map((m,i)=><option key={m} value={String(i+1).padStart(2,'0')}>{m}</option>)}</select></span><small>Usamos somente dia e mês para lembrar do seu aniversário.</small></label>}
        {mode==='signup'&&<label>WhatsApp <span>(opcional)</span><input type="tel" autoComplete="tel" inputMode="tel" maxLength={24} value={phone} onChange={e=>setPhone(e.target.value)} placeholder="(31) 99999-9999"/></label>}
        {mode==='signup'&&<label className="npv-birthday-optin"><input type="checkbox" checked={birthdayExOptIn} onChange={e=>setBirthdayExOptIn(e.target.checked)}/><span>Quero receber parabéns por e-mail mesmo se minha assinatura encerrar. <small>Opcional; posso mudar em Meu Perfil.</small></span></label>}
        {mode!=='reset'&&<label>E-mail<input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="voce@email.com"/></label>}
        {mode!=='forgot'&&<label>Senha <input type="password" autoComplete={mode==='login'?'current-password':'new-password'} minLength={mode==='login'?undefined:8} required value={password} onChange={e=>setPassword(e.target.value)} placeholder={mode==='login'?'Sua senha':'Mínimo de 8 caracteres'}/></label>}
        {show&&<div className="clube-auth-message" role="status">{show}</div>}
        <button className="clube-btn clube-btn-primary clube-btn-full" type="submit" disabled={busy}>{busy?'Aguarde...':mode==='signup'?'Solicitar cadastro':mode==='forgot'?'Enviar recuperação':mode==='reset'?'Salvar nova senha':'Entrar no Clube'}<ArrowRight size={17}/></button>
      </form>
      <div className="clube-auth-links">{mode==='login'?<><button onClick={()=>{setMode('forgot');setShow('')}}>Esqueci minha senha</button><button onClick={()=>{setMode('signup');setShow('')}}>Criar uma conta</button></>:<button onClick={()=>{setMode('login');setShow('')}}><ArrowLeft size={15}/> Voltar para login</button>}</div>
      <small>Seus pontos ficam vinculados exclusivamente à sua conta. Esta área não substitui o acesso aos treinos pela Hotmart. Consulte nossa <a href="/politica-de-privacidade.html" target="_blank" rel="noopener noreferrer">Política de Privacidade</a> e os <a href="/clube/termos-de-uso.html" target="_blank" rel="noopener noreferrer">Termos de Uso</a>.</small>
    </section>
  </div></div>
}
const emptyState={members:[],events:[],rewards:[],requests:[],rules:[],partners:[]}
const REWARD_IMAGE_BUCKET='clube-npv-recompensas'
const rewardImageUrl = path => /^images\/[a-f0-9-]{36}\.(?:jpg|png|webp)$/.test(path||'') ? supabase.storage.from(REWARD_IMAGE_BUCKET).getPublicUrl(path).data.publicUrl : ''
const ruleDefaultPoints=(rules,type)=>rules.find(x=>x.event_type===type)?.points ?? 0
// Exibição baseada nas regras editáveis do Clube. Valores de histórico nunca são recalculados.
const STRAVA_RULE='extra_11111111111111111111111111111111'
const STORY_RULE='extra_22222222222222222222222222222222'
const earningCopy={
  renovacao:{help:'Por mensalidade paga e confirmada'},
  desafio:{help:'Pontuação definida no desafio ativo'},
  [STRAVA_RULE]:{help:'Corrida, caminhada e bicicleta verificadas no Strava; até 200 pts/mês, crédito automático'},
  [STORY_RULE]:{help:'Até 5 Stories válidos por mês'},
  foto:{help:'Intervalo mínimo de 3 meses'},
  aniversario:{help:'Uma vez ao ano'},
  indicacao:{help:'500 pts no 1º pagamento + 500 no 2º'}
}
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
const DEFAULT_DISPLAY_SETTINGS={theme:'dark',show_journey:true,show_achievements:true}
export default function ClubeNPVOnline() {
  const [session,setSession]=useState(null)
  const [recovery,setRecovery]=useState(false)
  const [initializing,setInitializing]=useState(true)
  const [profile,setProfile]=useState(null)
  const [isAdmin,setIsAdmin]=useState(false)
  const [displaySettings,setDisplaySettings]=useState(DEFAULT_DISPLAY_SETTINGS)
  const [isTester,setIsTester]=useState(false)
  const [data,setData]=useState(emptyState)
  const [tab,setTab]=useState('inicio')
  const [connectionsTab,setConnectionsTab]=useState('instagram')
  const [activitiesOpen,setActivitiesOpen]=useState(false)
  const [stravaConnection,setStravaConnection]=useState({checked:false,connected:false,disabled:false})
  const [instagramConnection,setInstagramConnection]=useState({checked:false,connected:false,available:false})
  const [notice,setNotice]=useState('')
  const [error,setError]=useState('')
  const [busy,setBusy]=useState(false)
  const [loading,setLoading]=useState(false)
  const [search,setSearch]=useState('')
  const [award,setAward]=useState(null)
  const [rewardDraft,setRewardDraft]=useState(null)
  const [redeemDraft,setRedeemDraft]=useState(null)
  const [rewardImageFile,setRewardImageFile]=useState(null)
  const [imagePreviewUrl,setImagePreviewUrl]=useState('')
  const [ruleDraft,setRuleDraft]=useState(null)
  const [kmRate,setKmRate]=useState(null)
  const [hasActiveChallenge,setHasActiveChallenge]=useState(false)
  const [partnerDraft,setPartnerDraft]=useState(null)
  const [confirmedPendingIds,setConfirmedPendingIds]=useState(null)
  useEffect(()=>{
    if(!rewardImageFile){setImagePreviewUrl('');return}
    const objectUrl=URL.createObjectURL(rewardImageFile)
    setImagePreviewUrl(objectUrl)
    return ()=>URL.revokeObjectURL(objectUrl)
  },[rewardImageFile])
  const user=session?.user
  useEffect(()=>{
    let active=true
    setDisplaySettings(DEFAULT_DISPLAY_SETTINGS)
    if(!user?.id)return()=>{active=false}
    supabase.from('clube_display_settings')
      .select('theme,show_journey,show_achievements').eq('singleton',true).maybeSingle()
      .then(({data,error})=>{
        if(active&&!error&&data)setDisplaySettings({
          theme:data.theme==='light'?'light':'dark',
          show_journey:data.show_journey!==false,
          show_achievements:data.show_achievements!==false
        })
      }).catch(()=>{})
    return()=>{active=false}
  },[user?.id])
  async function saveDisplaySettings(next){
    if(!isAdmin||!user?.id)throw new Error('admin_required')
    const payload={theme:next.theme==='light'?'light':'dark',show_journey:Boolean(next.show_journey),show_achievements:Boolean(next.show_achievements),updated_at:new Date().toISOString()}
    const {data:updated,error}=await supabase.from('clube_display_settings').update(payload).eq('singleton',true).select('theme,show_journey,show_achievements').single()
    if(error)throw error
    setDisplaySettings({theme:updated.theme,show_journey:updated.show_journey,show_achievements:updated.show_achievements})
  }
  useEffect(()=>{
    setStravaConnection({checked:false,connected:false,disabled:false})
  },[user?.id])
  const openStravaFromGuide=()=>{
    const anchor=document.getElementById('npv-month-challenges-anchor')
    const trigger=anchor?.querySelector('.npv-strava-hero-trigger')
    if(trigger?.getAttribute('aria-expanded')==='false')trigger.click()
    requestAnimationFrame(()=>anchor?.scrollIntoView({behavior:'smooth',block:'start'}))
  }
  useEffect(()=>{
    if(!user?.id)return
    let live=true
    Promise.all([
      supabase.from('clube_km_settings').select('points_per_km').eq('singleton',true).maybeSingle(),
      supabase.from('clube_monthly_challenges').select('id').eq('month_key',currentNpvMonth()).eq('active',true).limit(1)
    ]).then(([km,challenge])=>{
      if(!live)return
      if(!km.error&&km.data)setKmRate(Number(km.data.points_per_km))
      if(!challenge.error)setHasActiveChallenge(Boolean(challenge.data?.length))
    }).catch(()=>{})
    return()=>{live=false}
  },[user?.id])
  // O formulário pode estar rolado até o campo Senha quando o painel abre.
  // Após carregar o perfil autenticado, mostre o painel a partir do início.
  useEffect(()=>{
    if(!user?.id || !profile?.id || (!profile.approved && !isAdmin)) return
    window.scrollTo({top:0,left:0,behavior:'auto'})
  },[user?.id,profile?.id,profile?.approved,isAdmin])
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
    setProfile(null);setIsAdmin(false);setIsTester(false);setData(emptyState);setTab('inicio');setError('')
    if(!user?.id) return
    ;(async()=>{
      const [role,owner,tester]=await Promise.all([
        supabase.from('clube_admins').select('user_id').eq('user_id',user.id).maybeSingle(),
        supabase.from('clube_profiles').select('*').eq('id',user.id).maybeSingle(),
        supabase.from('clube_pilot_testers').select('user_id').eq('user_id',user.id).maybeSingle()
      ])
      if(!active)return
      if(role.error||owner.error||tester.error||!owner.data){setError('Não foi possível carregar o seu cadastro. O banco de dados pode estar em configuração.');return}
      setIsAdmin(Boolean(role.data));setIsTester(Boolean(tester.data));setProfile(owner.data)
    })()
    return ()=>{active=false}
  },[user?.id])
  const refresh=useCallback(async()=>{
    if(!user?.id || !profile || (!isAdmin&&!profile.approved)) return
    setLoading(true)
    try {
      const queries=[
        isAdmin ? fetchAllClubeRows('clube_profiles','id,full_name,email,approved,created_at,birthday_mmdd,phone') : Promise.resolve({data:[],error:null}),
        fetchAllClubeRows('clube_point_events','id,student_id,event_type,points,note,reference_id,is_test,created_at'),
        fetchAllClubeRows('clube_rewards','id,name,category,description,points,stock,icon,theme,active,test_only,showcase,image_path,created_at',true),
        fetchAllClubeRows('clube_redemptions','id,student_id,reward_id,reward_name,points,status,is_test,created_at,resolved_at'),
        supabase.from('clube_point_rules').select('event_type,label,points,position').order('position',{ascending:true}),
        fetchAllClubeRows('clube_partners','id,name,logo_key,logo_url,link_url,discount_percent,coupon_code,details,active,position,created_at',true)
      ]
      const results=await Promise.all(queries)
      if(results.some(x=>x.error)){
        setError('Não foi possível carregar o Clube NPV. Confira a estrutura do banco e as permissões.')
      } else {
        setData({members:results[0].data||[],events:results[1].data||[],rewards:results[2].data||[],requests:results[3].data||[],rules:results[4].data||[],partners:results[5].data||[]})
        setError('')
      }
    } catch {
      setError('A conexão foi interrompida. Tente atualizar os dados do clube.')
    } finally {
      setLoading(false)
    }
  },[user?.id,profile?.id,profile?.approved,isAdmin])
  useEffect(()=>{refresh()},[refresh])
  // A fila de aprovação exige confirmação do e-mail verificada no servidor.
  useEffect(()=>{
    if(!isAdmin||!session?.access_token){setConfirmedPendingIds(null);return}
    const controller=new AbortController()
    setConfirmedPendingIds(null)
    fetch('/api/clube/hotmart-admin?pending=1',{
      headers:{Authorization:'Bearer '+session.access_token},cache:'no-store',signal:controller.signal
    }).then(async res=>{
      if(!res.ok)throw new Error('pending_verification_unavailable')
      const payload=await res.json()
      if(!controller.signal.aborted)setConfirmedPendingIds(new Set(payload.verified_pending_ids||[]))
    }).catch(()=>{if(!controller.signal.aborted)setConfirmedPendingIds(null)})
    return()=>controller.abort()
  },[isAdmin,session?.access_token])
  const approved=profile?.approved || isAdmin
  // Uma leitura real por entrada na Visão geral: nenhuma conexão é presumida.
  // Assim o guia só vai para o fim após confirmação dos DOIS provedores.
  useEffect(()=>{
    if(tab!=='inicio'||isAdmin||!approved||!session?.access_token)return
    const controller=new AbortController()
    setInstagramConnection({checked:false,connected:false,available:false})
    setStravaConnection({checked:false,connected:false,disabled:false})
    fetch('/api/instagram/link',{
      method:'GET',
      headers:{Authorization:'Bearer '+session.access_token},
      credentials:'same-origin',
      signal:controller.signal
    }).then(async response=>{
      if(!response.ok)throw new Error('instagram_status_unavailable')
      const data=await response.json()
      if(!controller.signal.aborted)setInstagramConnection({
        checked:true,connected:!!data.connected,available:!!data.available
      })
    }).catch(()=>{
      if(!controller.signal.aborted)setInstagramConnection({
        checked:true,connected:false,available:false,error:true
      })
    })
    return()=>controller.abort()
  },[tab,isAdmin,approved,user?.id,session?.access_token])
  const connectionsChecked=instagramConnection.checked&&stravaConnection.checked
  const connectionsComplete=connectionsChecked&&instagramConnection.connected&&stravaConnection.connected
  const balance=id=>data.events.filter(x=>x.student_id===id).reduce((acc,x)=>acc+x.points,0)
  const reserved=id=>data.requests.filter(x=>x.student_id===id && x.status==='pending').reduce((acc,x)=>acc+x.points,0)
  const mine=useMemo(()=>data.events.filter(x=>x.student_id===user?.id),[data.events,user?.id])
  const mineRequests=useMemo(()=>data.requests.filter(x=>x.student_id===user?.id),[data.requests,user?.id])
  const studentMembers=isAdmin?data.members.filter(x=>x.id!==user?.id &&
    (x.approved||confirmedPendingIds?.has(x.id))):data.members
  const catalogRewards=data.rewards.filter(x=>x.active||x.showcase)
  const totalPoints=data.events.filter(isThisYear).reduce((acc,x)=>acc+x.points,0)
  const pendingCount=data.requests.filter(x=>x.status==='pending').length
  const memberName=id=>data.members.find(x=>x.id===id)?.full_name||'Aluno'
  const ruleLabel=type=>data.rules.find(x=>x.event_type===type)?.label||ruleNames[type]||'Atividade'
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
  function openRedeem(reward){
    if(!approved||isAdmin||busy||!reward.active||reward.stock<1||(reward.test_only&&!isTester))return
    if(balance(user?.id)-reserved(user?.id)<reward.points)return
    setRedeemDraft(reward)
  }
  async function confirmRedeem(e){
    e.preventDefault()
    if(!redeemDraft||busy)return
    const selected={...redeemDraft}
    setBusy(true);setNotice('')
    try{
      const {error}=await supabase.rpc('clube_request_redemption',{p_reward_id:selected.id})
      if(error)throw error
      setRedeemDraft(null)
      setTab('recompensas')
      setNotice(selected.test_only?
        'Pedido de TESTE registrado! A administração pode aprovar ou recusar. Não há entrega real.':
        'Solicitação enviada! Seus pontos ficam reservados até a aprovação do administrador.')
      await refresh()
    }catch(err){setNotice(formatError(err));setRedeemDraft(null)}
    finally{setBusy(false)}
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
    const payload={name:item.name.trim(),category:item.category.trim()||'Benefícios',description:item.description.trim(),points:Number(item.points),stock:Number(item.stock),icon:item.icon,theme:item.theme,active:Boolean(item.active),test_only:Boolean(item.test_only),showcase:Boolean(item.showcase||item.active),image_path:item.image_path||''}
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
  async function savePartner(e){
    e.preventDefault();if(!isAdmin||!partnerDraft)return
    const item={...partnerDraft}
    const url=safePartnerUrl(item.link_url)
    const logo=item.logo_url.trim()
    const imageOk=!logo || logo==='/parceiros/logo-liquidz.svg' || Boolean(safePartnerUrl(logo))
    const discount=item.discount_percent===''||item.discount_percent==null ? null : Number(item.discount_percent)
    const position=Number(item.position)
    if(item.name.trim().length<2||!url||!imageOk){setNotice('Confira o nome, o link HTTPS e a imagem do parceiro.');return}
    if(discount!==null&&(!Number.isSafeInteger(discount)||discount<1||discount>100)){setNotice('Informe um desconto inteiro entre 1 e 100%, ou deixe vazio.');return}
    if(!Number.isSafeInteger(position)||position<0||position>10000){setNotice('Informe uma ordem entre 0 e 10.000.');return}
    const payload={
      name:item.name.trim(),logo_key:item.logo_key||'',logo_url:logo,
      link_url:url,discount_percent:discount,coupon_code:item.coupon_code.trim(),
      details:item.details.trim(),active:Boolean(item.active),position
    }
    await run(async()=>{
      const query=item.id?supabase.from('clube_partners').update(payload).eq('id',item.id):supabase.from('clube_partners').insert(payload)
      const {error}=await query
      if(error)throw error
      setPartnerDraft(null)
    },'Parceiro atualizado no Clube NPV.')
  }
  async function saveRules(e){
    e.preventDefault()
    if(!isAdmin||!ruleDraft||busy)return
    const rules=ruleDraft.map((r,i)=>({
      event_type:r.event_type,label:r.label.trim(),
      points:Number(r.points),position:i+1
    }))
    if(rules.some(r=>r.label.length<2||r.label.length>75)){
      setNotice('Cada benefício precisa de um nome de 2 a 75 caracteres.');return
    }
    if(new Set(rules.map(r=>r.label.toLocaleLowerCase('pt-BR'))).size!==rules.length){
      setNotice('Não é permitido cadastrar benefícios com nomes repetidos.');return
    }
    if(rules.some(r=>!Number.isSafeInteger(r.points)||r.points<0||r.points>100000)){
      setNotice('Informe pontos inteiros entre 0 e 100.000.');return
    }
    await run(async()=>{
      const {error}=await supabase.rpc('clube_save_point_rules',{p_rules:rules})
      if(error)throw error
      setRuleDraft(null)
    },'Benefícios e pontuações salvos. Seu histórico de pontos foi preservado.')
  }
  async function signOut(){
    // Encerrar apenas esta sessão: ao trocar de aluno para admin no Opera,
    // não invalidar o login do mesmo usuário em outro dispositivo.
    await supabase.auth.signOut({scope:'local'})
    setSession(null)
    window.scrollTo({top:0,left:0,behavior:'auto'})
  }
  useEffect(()=>{
    // Abas do aluno compartilham uma única rota: não manter a rolagem da aba anterior.
    if(user?.id&&!isAdmin)window.scrollTo({top:0,left:0,behavior:'auto'})
  },[tab,user?.id,isAdmin])
  function newAward(id){setAward({studentId:id||studentMembers.find(x=>x.approved)?.id||'',type:'renovacao',points:ruleDefaultPoints(data.rules,'renovacao'),note:''})}
  const activityList=(rows,showMember=false,groupByMonth=false)=>{
    const ordered=groupByMonth?[...rows].sort((a,b)=>Date.parse(b.created_at)-Date.parse(a.created_at)):rows
    return <div className="clube-activities">
    {!ordered.length&&<p className="clube-empty">Nenhuma movimentação registrada ainda.</p>}
    {ordered.map((x,index)=><React.Fragment key={x.id}>
      {groupByMonth&&(index===0||statementMonth(ordered[index-1].created_at)!==statementMonth(x.created_at))&&
        <h3 className="npv-statement-month">{statementMonth(x.created_at)}</h3>}
      <div className="clube-activity">
      <span className={`clube-activity-icon ${x.points<0?'clube-debit':''}`}><Sparkles size={18}/></span>
      <div className="clube-activity-description"><strong>{ruleLabel(x.event_type)}</strong>{showMember&&<span>{memberName(x.student_id)}</span>}{x.note&&<span>{x.note}</span>}<small>{date(x.created_at)}</small></div>
      <strong className={`clube-activity-points ${x.points<0?'clube-negative':''}`}>{x.points>0?'+':''}{format(x.points)} pts</strong>
    </div></React.Fragment>)}
  </div>
  }
  function rewardsGrid(limit=null){return <div className="npv-shop-grid">
    {(isAdmin?data.rewards:catalogRewards).length===0&&<p className="npv-shop-empty">Nenhuma recompensa cadastrada para exibição no momento.</p>}
    {(isAdmin?data.rewards:catalogRewards).slice(0,limit||undefined).map(item=>{
      const Icon=glyphs[item.icon]||Gift
      const availablePoints=Math.max(0,balance(user?.id)-reserved(user?.id))
      const missingPoints=Math.max(0,item.points-availablePoints)
      const enough=missingPoints===0
      const available=item.active&&item.stock>0&&(!item.test_only||isTester)
      const canRedeem=available&&enough&&!isAdmin
      const progress=item.points>0?Math.min(100,Math.round(availablePoints/item.points*100)):0
      return <article className={`npv-shop-card ${!isAdmin&&enough?'npv-shop-card-milestone':''}`} key={item.id}>
        <div className={`npv-shop-art npv-shop-art-${themeSet.has(item.theme)?item.theme:'lime'}`}>
          {rewardImageUrl(item.image_path)?<img src={rewardImageUrl(item.image_path)} alt={`Foto de ${item.name}`} className="npv-shop-photo" loading="lazy"/>:<Icon size={87} strokeWidth={1.2}/>}
          <span className="npv-shop-art-stamp">CLUBE NPV ✦</span><span className="npv-shop-art-corner">NPV / {YEAR}</span>
        </div>
        <div className="npv-shop-info">
          <span className="npv-shop-category">{item.category}</span><h3>{item.name}</h3>
          <div className="npv-shop-price"><strong>{format(item.points)}</strong><span>pontos</span></div>
          {!isAdmin&&<div className="npv-shop-progress" aria-label={`Progresso de pontos para ${item.name}: ${progress}%`}>
            <div className="npv-shop-progress-track"><span style={{width:`${progress}%`}}/></div>
            <span className={`npv-shop-progress-label ${enough?'npv-shop-progress-met':''}`}>{enough?<><Check size={13}/> Pontos suficientes!</>:`Faltam ${format(missingPoints)} pts`}</span>
          </div>}
          <div className="npv-shop-foot">
            <span className={`npv-shop-stock ${!available?'npv-shop-stock-off':''}`}>{!item.active?'Prêmio demonstrativo · resgate não liberado':item.test_only?(isTester?'Modo teste · sem entrega real':'Disponível somente para testes internos'):item.stock<1?'Prêmio esgotado':isAdmin?`${item.stock} em estoque`:enough?'Pronto para resgatar agora':`Acumule mais ${format(missingPoints)} pontos`}</span>
            {isAdmin?<button className="npv-shop-edit" onClick={()=>editReward(item)}><Pencil size={15}/> Editar prêmio e foto</button>
            :<button className={`npv-shop-request ${enough&&!available?'npv-shop-request-met':''}`} disabled={busy||!canRedeem} onClick={()=>openRedeem(item)}>
              {canRedeem?(item.test_only?'Testar resgate':'Resgatar agora'):!available?(enough?'Meta atingida ✓':item.stock<1&&item.active?'Esgotado':'Continue acumulando'):'Acumule pontos'}
              {canRedeem&&<ArrowRight size={14}/>}
            </button>}
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
  return <div className={`clube-shell ${isAdmin?'clube-live-admin':`clube-live-student npv-theme-${displaySettings.theme}`}`}>
    {isAdmin?<ShellHeader/>:<section className="clube-live-banner" aria-label="Cabeçalho do Clube de Benefícios NPV">
      <div className="clube-live-banner-top">
        <div className="clube-live-title"><span>Clube de</span><strong>Benefícios</strong></div>
        <button type="button" className="clube-live-signout" onClick={signOut}><LogOut size={16}/> Sair</button>
      </div>
      <nav className="clube-live-tabs" aria-label="Navegação do Clube NPV">
        <button type="button" aria-label="Visão geral" aria-current={tab==='inicio'?'page':undefined} className={tab==='inicio'?'active':''} onClick={()=>setTab('inicio')}><Wallet size={17}/><span className="npv-nav-desktop">Visão geral</span><span className="npv-nav-mobile" aria-hidden="true">Início</span></button>
        <button type="button" aria-label="Meu perfil" aria-current={tab==='perfil'?'page':undefined} className={tab==='perfil'?'active':''} onClick={()=>setTab('perfil')}><UserRound size={17}/><span>Perfil</span></button>
        <button type="button" aria-label="Recompensas" aria-current={tab==='recompensas'?'page':undefined} className={tab==='recompensas'?'active':''} onClick={()=>setTab('recompensas')}><Gift size={17}/><span className="npv-nav-desktop">Prêmios</span><span className="npv-nav-mobile" aria-hidden="true">Prêmios</span></button>
        <button type="button" aria-label="Parceiros" aria-current={tab==='parceiros'?'page':undefined} className={tab==='parceiros'?'active':''} onClick={()=>setTab('parceiros')}><Award size={17}/><span>Parceiros</span></button>
        <button type="button" aria-label="Histórico de pontos" aria-current={tab==='historico'?'page':undefined} className={tab==='historico'?'active':''} onClick={()=>setTab('historico')}><History size={17}/><span className="npv-nav-desktop">Extrato</span><span className="npv-nav-mobile" aria-hidden="true">Extrato</span></button>
      </nav>
    </section>}
    <div className="clube-container"><aside className="clube-sidebar">
      <div className="clube-person"><span className="clube-avatar">{(profile?.full_name||user?.email||'A').charAt(0).toUpperCase()}</span><div><strong>{profile?.full_name||user?.email}</strong><span>{isAdmin?'Administração':'Minha conta'}</span></div></div>
      <div className="clube-side-label">{isAdmin?'CENTRAL DE GESTÃO':'MINHA NAVEGAÇÃO'}</div>
      <nav className="clube-nav">{isAdmin&&<span className="npv-admin-nav-group-label">OPERAÇÃO</span>}<button className={tab==='inicio'?'active':''} onClick={()=>setTab('inicio')}><Wallet size={18}/>Visão geral</button>
        {isAdmin&&<button className={tab==='alunos'?'active':''} onClick={()=>setTab('alunos')}><Users size={18}/>Alunos</button>}
        {isAdmin&&<button className={tab==='hotmart'?'active':''} onClick={()=>setTab('hotmart')}><CreditCard size={18}/>Hotmart — Assinaturas</button>}
        {!isAdmin&&<button className={tab==='perfil'?'active':''} onClick={()=>setTab('perfil')}><UserRound size={18}/>Meu perfil</button>}
        <button className={tab==='historico'?'active':''} onClick={()=>setTab('historico')}><History size={18}/>{isAdmin?'Pontos e histórico':'Histórico'}</button>
        {isAdmin&&<span className="npv-admin-nav-group-label">BENEFÍCIOS E COMUNIDADE</span>}
        <button className={tab==='recompensas'?'active':''} onClick={()=>setTab('recompensas')}><Gift size={18}/>Recompensas</button>
        <button className={tab==='parceiros'?'active':''} onClick={()=>setTab('parceiros')}><Award size={18}/>Parceiros</button>
        {isAdmin?<button className={tab==='conexoes'?'active':''} onClick={()=>setTab('conexoes')}><Link2 size={18}/>Conexões · Instagram / Strava</button>:<button className={tab==='instagram'?'active':''} onClick={()=>setTab('instagram')}><Instagram size={18}/>Instagram · Stories</button>}
        {isAdmin&&<details className="npv-admin-settings-nav" defaultOpen={['email','widget','versoes','aparencia'].includes(tab)}><summary><Settings2 size={18}/>Configurações <ChevronDown size={14}/></summary>
          <button className={tab==='aparencia'?'active':''} onClick={()=>setTab('aparencia')}><Palette size={17}/>Aparência e perfil</button>
          <button className={tab==='email'?'active':''} onClick={()=>setTab('email')}><Mail size={17}/>E-mails automáticos</button>
          <button className={tab==='widget'?'active':''} onClick={()=>setTab('widget')}><SlidersHorizontal size={17}/>Widget do site</button>
          <button className={tab==='versoes'?'active':''} onClick={()=>setTab('versoes')}><Layers3 size={17}/>Versões e recursos</button>
        </details>}
        {!isAdmin&&<button className="clube-nav-logout" type="button" onClick={signOut}><LogOut size={18}/>Sair</button>}
      </nav>
      {isAdmin&&<div className="clube-side-bottom"><span className="clube-side-label">CONTA SEGURA</span><div className="clube-online-email">{user.email}</div><button className="clube-online-logout" onClick={signOut}><LogOut size={15}/>Sair da conta</button></div>}
    </aside>
    <main className={`clube-main${!isAdmin&&tab!=='inicio'?' clube-student-inner-tab':''}`}>
      {isAdmin&&<div className="clube-online-mobile-account"><span>Administrador · {user.email}</span><button onClick={signOut}><LogOut size={15}/> Sair</button></div>}
      {error&&<div className="clube-online-alert" role="alert">{error} <button onClick={refresh}>Tentar novamente</button></div>}
      {notice&&<div className="clube-feedback" role="status"><Check size={17}/>{notice}<button onClick={()=>setNotice('')}><X size={16}/></button></div>}
      {(isAdmin||tab==='inicio')&&<div className="clube-intro"><div><div className="clube-eyebrow"><span/> {isAdmin?'PAINEL DE GESTÃO':'MINHA CONTA NPV'}</div><h1>{tab==='inicio'?(isAdmin?'Seu clube, sob controle.':<><span className="npv-profile-greeting-desktop">{firstNameOf(profile?.full_name)}, sua evolução vale pontos.</span><span className="npv-profile-greeting-mobile">Sua evolução vale pontos.</span></>):tab==='alunos'?'Alunos do Clube NPV':tab==='hotmart'?'Hotmart — Assinaturas':tab==='historico'?'Histórico de pontos':tab==='parceiros'?'Parceiros e descontos':tab==='instagram'?'Instagram e Stories':tab==='conexoes'?'Conexões · Instagram / Strava':tab==='email'?'E-mails automáticos':tab==='aparencia'?'Aparência e perfil':tab==='widget'?'Widget do site':tab==='versoes'?'Versões e recursos':'Benefícios e recompensas'}</h1><p>{isAdmin?'Gerencie os cadastros, lançamentos e solicitações com segurança.':<><span className="npv-profile-greeting-mobile">Olá, {firstNameOf(profile?.full_name)}. </span>Pontos, desafios e conquistas em um só lugar.</>}</p></div>
        {isAdmin&&tab!=='recompensas'&&tab!=='parceiros'&&tab!=='widget'&&tab!=='hotmart'&&tab!=='versoes'&&tab!=='instagram'&&tab!=='conexoes'&&tab!=='email'&&tab!=='aparencia'&&<button className="clube-btn clube-btn-primary" onClick={()=>newAward()}><Plus size={17}/> Lançar pontos</button>}
      </div>}
      {loading&&<p className="clube-online-loading">Atualizando dados do clube...</p>}
      {tab==='inicio'&&isAdmin&&<>
        <div className="clube-kpis"><div className="clube-kpi clube-kpi-dark"><span>PONTOS DISTRIBUÍDOS EM {YEAR}</span><strong>{format(totalPoints)}</strong><small><TrendingUp size={15}/> Saldo líquido dos lançamentos</small></div><div className="clube-kpi"><span>ALUNOS APROVADOS</span><strong>{studentMembers.filter(x=>x.approved).length}</strong><small>Perfis autorizados</small></div><div className="clube-kpi"><span>RESGATES PENDENTES</span><strong>{pendingCount}</strong><small>Aguardando decisão</small></div></div>
        <ClubeInstagramAdminSummary session={session} pendingRedemptions={pendingCount} pendingRegistrations={studentMembers.filter(x=>!x.approved).length} onNavigate={setTab}/>
        <div className="clube-columns"><section className="clube-card"><div className="clube-card-head"><div><h2>Últimas movimentações</h2><p>Histórico do clube</p></div></div>{activityList(data.events.slice(0,6),true)}</section><section className="clube-card"><div className="clube-card-head"><div><h2>Novos cadastros</h2><p>Alunos aguardando aprovação</p></div></div>{studentMembers.filter(x=>!x.approved).slice(0,6).map(x=><div className="clube-online-member" key={x.id}><div><strong>{x.full_name}</strong><small>{x.email}</small></div><button disabled={busy} className="clube-btn clube-btn-outline" onClick={()=>approve(x.id)}><Check size={15}/> Aprovar</button></div>)}{confirmedPendingIds!==null&&studentMembers.every(x=>x.approved)&&<p className="clube-empty">Nenhum cadastro pendente com e-mail confirmado.</p>}{confirmedPendingIds===null&&<p className="clube-empty">Conferindo confirmação dos cadastros...</p>}<button className="clube-btn clube-btn-outline clube-btn-full" onClick={()=>setTab('alunos')}>Gerenciar alunos</button></section></div>
      </>}
      {tab==='conexoes'&&isAdmin&&<section><div className="npv-admin-connections-tabs" role="tablist" aria-label="Conexões do Clube"><button type="button" role="tab" aria-selected={connectionsTab==='instagram'} className={connectionsTab==='instagram'?'active':''} onClick={()=>setConnectionsTab('instagram')}><Instagram size={18}/> Instagram · Stories</button><button type="button" role="tab" aria-selected={connectionsTab==='strava'} className={connectionsTab==='strava'?'active':''} onClick={()=>setConnectionsTab('strava')}><Activity size={18}/> Strava · Corridas e desafios</button></div>
        {connectionsTab==='instagram'?<ClubeInstagramPanel session={session} isAdmin={true}/>:<div className="npv-admin-operations-content"><ClubeKmSetup/><ClubeMonthlyChallengeAdmin/><ClubeRegisteredActivities session={session} onPointsSynced={refresh}/></div>}</section>}
      {tab==='aparencia'&&isAdmin&&<ClubeAppearanceAdmin settings={displaySettings} onSave={saveDisplaySettings}/>}
      {tab==='email'&&isAdmin&&<ClubeEmailAdmin session={session}/>}
      {tab==='widget'&&isAdmin&&<ClubeSiteWidgetAdmin rewards={data.rewards} partners={data.partners}/>}
      {tab==='hotmart'&&isAdmin&&<ClubeHotmartAdmin session={session} isAdmin={isAdmin} onPointsSynced={refresh} renewalPointRate={data.rules.find(rule=>rule.event_type==='renovacao')?.points ?? null}/>}
      {tab==='versoes'&&isAdmin&&<ClubeVersionsAdmin onNavigate={setTab}/>}
      {tab==='instagram'&&!isAdmin&&<ClubeInstagramPanel session={session} isAdmin={false}/>}
      {tab==='inicio'&&!isAdmin&&<>
        <section className={`clube-student-summary clube-student-summary-statement${activitiesOpen?' is-open':''}`} aria-label="Seus pontos e extrato">
          <button type="button" className="clube-student-summary-trigger"
            aria-expanded={activitiesOpen} aria-controls="clube-points-statement-content"
            onClick={()=>setActivitiesOpen(open=>!open)}>
            <span className="clube-student-balance-group">
              <span className="clube-student-balance-label">SEU SALDO DE PONTOS</span>
              <strong className="clube-student-balance-value">{format(balance(user.id))} <small>pontos</small></strong>
            </span>
            <span className="clube-student-statement-action">
              <span className="clube-student-statement-cta">Extrato {activitiesOpen?<ChevronUp size={16}/>:<ChevronDown size={16}/>}</span>
            </span>
          </button>
          {activitiesOpen&&<div id="clube-points-statement-content" className="clube-student-statement-body">
            <div className="clube-student-statement-heading"><strong>Últimas movimentações</strong><span>Entradas e saídas do seu saldo</span></div>
            {activityList(mine.slice(0,6))}
            {mine.length>0&&<button type="button" className="clube-student-statement-see-all" onClick={()=>setTab('historico')}>Ver extrato completo <ArrowRight size={16}/></button>}
          </div>}
        </section>
        <ClubeStudentMomentum
          events={mine} studentId={user.id} rewards={data.rewards}
          availablePoints={Math.max(0,balance(user.id)-reserved(user.id))}
          showJourney={displaySettings.show_journey}
          onProfile={()=>setTab('perfil')} onRewards={()=>setTab('recompensas')}
        />
        <BenefitNotice rewards={data.rewards} points={Math.max(0,balance(user.id)-reserved(user.id))} onOpen={()=>setTab('recompensas')}/>
        <div id="npv-month-challenges-anchor"><ClubeRegisteredActivities session={session} onConnectionStatusChange={setStravaConnection} onPointsSynced={refresh}/></div>
        {connectionsChecked&&<ClubeConnectionGuide instagram={instagramConnection} strava={stravaConnection} onInstagram={()=>{setTab('instagram');window.scrollTo({top:0,behavior:'smooth'})}} onStrava={openStravaFromGuide}/>} 
        <section className="npv-shop npv-shop-featured"><div className="npv-shop-heading"><div><div className="npv-shop-eyebrow"><Gift size={15}/>LOJINHA DO CLUBE NPV</div><h2>Troque seus pontos ✦</h2><p>Seu próximo objetivo pode estar aqui.</p></div><button className="npv-shop-view-all" onClick={()=>setTab('recompensas')}>Ver catálogo <ArrowRight size={16}/></button></div>{rewardsGrid(4)}<p className="npv-shop-demo-note">A disponibilidade real será confirmada após a aprovação do prêmio e dos parceiros.</p></section>
        {data.partners.some(x=>x.active)&&<section className="npv-partners-section">
          <div className="npv-shop-heading"><div><div className="npv-shop-eyebrow"><Award size={15}/> PARCERIAS NPV</div><h2>Benefícios de parceiros ✦</h2><p>Explore os parceiros e consulte os descontos disponíveis.</p></div>
            <button className="npv-shop-view-all" onClick={()=>setTab('parceiros')}>Ver parceiros <ArrowRight size={16}/></button></div>
          <PartnerCards partners={data.partners} limit={4}/>
        </section>}
        <section className="clube-card clube-next clube-earn-bottom">
          <div className="clube-card-head"><div><h2>Continue acumulando ✦</h2><p>Mais maneiras de ganhar pontos no Clube NPV</p></div></div>
          <div className="clube-how">{data.rules.map(rule=>{
            const info=earningCopy[rule.event_type]
            const value=rule.event_type==='desafio'?'Confira o desafio':
              rule.event_type===STRAVA_RULE?`+${format(kmRate??rule.points)} pontos/km`:
              `+${format(rule.points)} pontos`
            return <div className="npv-earn-rule" key={rule.event_type}>
              <span aria-hidden="true">✦</span>
              <div className="npv-earn-rule-text"><strong>{ruleLabel(rule.event_type)}</strong>{info?.help&&<small>{info.help}</small>}</div>
              {rule.event_type==='desafio'&&hasActiveChallenge?
                <a className="npv-earn-challenge-link" href="#npv-month-challenges-anchor">{value} <ArrowRight size={13}/></a>:
                rule.event_type===STORY_RULE?
                <button type="button" className="npv-earn-challenge-link" onClick={()=>{setTab('instagram');window.scrollTo({top:0,behavior:'smooth'})}}>{value} <ArrowRight size={13}/></button>:
                <b>{value}</b>}
            </div>
          })}</div>
          <p className="clube-micro">Atividades sujeitas à confirmação.</p>
        </section>
      </>}
      {tab==='perfil'&&!isAdmin&&<ClubeStudentProfile
        profile={profile} email={user.email} events={data.events} session={session} displaySettings={displaySettings}
        onSaved={updated=>setProfile(current=>current?.id===updated.id?{...current,...updated}:current)}
        onInstagram={()=>{setTab('instagram');window.scrollTo({top:0,behavior:'smooth'})}}
        onStrava={()=>{setTab('inicio');setTimeout(openStravaFromGuide,120)}}
      />}
      {tab==='parceiros'&&<section className="npv-partners-section">
        <div className="npv-shop-heading">
          <div>{isAdmin&&<div className="npv-shop-eyebrow"><Award size={15}/> PARCEIROS NPV</div>}{isAdmin?<h2>Parceiros e descontos ✦</h2>:<h1>Parceiros NPV ✦</h1>}<p>{isAdmin?'Cadastre, edite, ordene e ative benefícios de parceiros.':'Conheça as vantagens dos nossos parceiros e aproveite os descontos.'}</p></div>
          {isAdmin&&<button className="clube-btn clube-btn-primary" onClick={()=>setPartnerDraft({name:'',logo_key:'',logo_url:'',link_url:'',discount_percent:'',coupon_code:'',details:'',active:false,position:100})}><Plus size={16}/> Novo parceiro</button>}
        </div>
        <PartnerCards partners={data.partners} admin={isAdmin} onEdit={setPartnerDraft}/>
      </section>}
      {tab==='alunos'&&isAdmin&&<>
        <div className="clube-toolbar"><label className="clube-search"><Search size={18}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar aluno ou e-mail"/></label></div>
        <ClubeAdminStudents
          session={session}
          members={studentMembers.filter(x=>`${x.full_name} ${x.email}`.toLowerCase().includes(search.toLowerCase()))}
          events={data.events} redemptions={data.requests} rules={data.rules}
          busy={busy} onAward={newAward} onApprove={approve} onRefresh={refresh}
        />
      </>}
      {tab==='historico'&&isAdmin&&<div className="npv-admin-rules-bar"><div><strong>Regras de pontuação</strong><span>Valores informativos apresentados aos alunos. Editáveis por você.</span></div><button className="clube-btn clube-btn-outline" onClick={()=>{setNotice('');setRuleDraft(data.rules.map(x=>({...x})))}}><SlidersHorizontal size={16}/> Gerenciar benefícios</button></div>}
      {tab==='historico'&&<div className="clube-card"><div className="clube-card-head"><div>{isAdmin?<h2>Extrato do Clube</h2>:<h1>Meu extrato</h1>}<p>{isAdmin?'Lançamentos com data e motivo':'Veja quando seus pontos entraram ou saíram do saldo.'}</p></div></div>{activityList(isAdmin?data.events:mine,isAdmin,!isAdmin)}</div>}
      {tab==='recompensas'&&<section className="npv-shop"><div className="npv-shop-heading"><div>{isAdmin&&<div className="npv-shop-eyebrow"><Gift size={15}/> CLUBE NPV</div>}{isAdmin?<h2>Vitrine de recompensas ✦</h2>:<h1>Prêmios do Clube</h1>}<p>{isAdmin?'Prêmios, benefícios e pedidos de resgate.':'Troque seus pontos por prêmios e acompanhe seus resgates.'}</p></div>{isAdmin?<button className="clube-btn clube-btn-primary" onClick={()=>editReward({name:'',category:'Benefícios',description:'',points:500,stock:1,icon:'gift',theme:'lime',active:false,showcase:true,test_only:true,image_path:''})}><Plus size={16}/> Novo prêmio</button>:<div className="npv-shop-balance">Saldo disponível<strong>{format(Math.max(0,balance(user.id)-reserved(user.id)))} pts</strong></div>}</div>{rewardsGrid()}
        <div className="npv-shop-requests"><div className="npv-shop-requests-head"><div><h3>{isAdmin?'Solicitações para aprovação':'Meus resgates'}</h3><p>{isAdmin?'Pedidos feitos pelos alunos':'Acompanhe suas solicitações e entregas'}</p></div>{isAdmin&&<span className="npv-shop-pending-count">{pendingCount} pendentes</span>}</div>{(isAdmin?data.requests:mineRequests).length===0&&<p className="npv-shop-no-requests">Nenhum pedido por enquanto.</p>}{(isAdmin?data.requests:mineRequests).map(req=><div className="npv-shop-request-row" key={req.id}><span className="npv-shop-request-icon"><Gift size={19}/></span><div className="npv-shop-request-text"><strong>{req.reward_name}</strong>{isAdmin&&<span>{memberName(req.student_id)}</span>}<small>{date(req.created_at)} · {format(req.points)} pts</small></div>{req.is_test&&<span className="npv-shop-test-tag">TESTE</span>}<span className={`npv-shop-status npv-shop-status-${req.status}`}>{req.status==='pending'?'Aguardando':req.status==='approved'?'Aprovado':'Recusado'}</span>{isAdmin&&req.status==='pending'&&<div className="npv-shop-resolve"><button disabled={busy} onClick={()=>resolve(req,true)}>Aprovar</button><button disabled={busy} onClick={()=>resolve(req,false)}>Recusar</button></div>}</div>)}</div>
      </section>}
      <footer className="clube-main-footer">
        <span>© {YEAR} Não Pense, Vai! — Clube NPV</span>
        <span>Conta e histórico individual protegidos por autenticação.</span>
        <a className="clube-terms-link" href="/clube/termos-de-uso.html">Termos de Uso</a>
      </footer>
    </main></div>
    {award&&isAdmin&&<div className="clube-modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setAward(null)}}><section className="clube-modal" role="dialog" aria-modal="true" aria-labelledby="award-title"><div className="clube-modal-top"><div><small>ADMINISTRAÇÃO</small><h2 id="award-title">Lançar pontos</h2></div><button onClick={()=>setAward(null)} aria-label="Fechar"><X size={20}/></button></div><form className="clube-form" onSubmit={submitAward}>
      <label>Aluno aprovado<select required value={award.studentId} onChange={e=>setAward(d=>({...d,studentId:e.target.value}))}><option value="">Selecione um aluno</option>{studentMembers.filter(x=>x.approved).map(x=><option value={x.id} key={x.id}>{x.full_name||x.email}</option>)}</select></label>
      <label>Atividade<select value={award.type} onChange={e=>setAward(d=>({...d,type:e.target.value,points:ruleDefaultPoints(data.rules,e.target.value)}))}>{data.rules.map(rule=><option value={rule.event_type} key={rule.event_type}>{ruleLabel(rule.event_type)}</option>)}<option value="ajuste">{ruleNames.ajuste}</option></select></label>
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
      <label className="npv-shop-check"><input type="checkbox" checked={Boolean(rewardDraft.test_only)} onChange={e=>setRewardDraft(d=>({...d,test_only:e.target.checked}))}/> Produto somente para teste (sem entrega)</label>
      <label className="npv-shop-check"><input type="checkbox" checked={rewardDraft.active} onChange={e=>setRewardDraft(d=>({...d,active:e.target.checked,showcase:e.target.checked?true:d.showcase}))}/> Habilitar solicitações {rewardDraft.test_only?'apenas de contas de teste':'de alunos aprovados (prêmio real)'}</label>
      <button className="clube-btn clube-btn-primary clube-btn-full" type="submit" disabled={busy}>{busy?'Salvando...':'Salvar prêmio'} <Check size={16}/></button>
    </form></section></div>}
    {redeemDraft&&!isAdmin&&<div className="clube-modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)setRedeemDraft(null)}}><section className="clube-modal" role="dialog" aria-modal="true" aria-labelledby="redeem-title"><div className="clube-modal-top"><div><small>{redeemDraft.test_only?'MODO DE TESTE · SEM ENTREGA':'CLUBE NPV · RECOMPENSA'}</small><h2 id="redeem-title">Confirmar troca de pontos</h2></div><button type="button" onClick={()=>setRedeemDraft(null)} disabled={busy} aria-label="Fechar"><X size={20}/></button></div><form className="clube-form" onSubmit={confirmRedeem}>
      <div className="npv-redeem-review"><strong>{redeemDraft.name}</strong><span>{format(redeemDraft.points)} pontos</span><small>Saldo disponível: {format(Math.max(0,balance(user?.id)-reserved(user?.id)))} pts</small></div>
      {redeemDraft.test_only?<p>Este pedido é uma simulação para testar o Clube NPV. Ele não gera direito à entrega de um produto. Os pontos de teste serão reservados até a decisão da administração e descontados se o teste for aprovado.</p>:<p>Seu pedido será enviado à administração. Os pontos ficarão reservados até a análise; se aprovado, serão descontados do saldo.</p>}
      <button className="clube-btn clube-btn-primary clube-btn-full" type="submit" disabled={busy}>{busy?'Enviando...':redeemDraft.test_only?'Confirmar teste de resgate':'Confirmar solicitação'} <ArrowRight size={16}/></button>
      <button className="clube-btn clube-btn-outline clube-btn-full" type="button" onClick={()=>setRedeemDraft(null)} disabled={busy}>Cancelar</button>
    </form></section></div>}
    {partnerDraft&&isAdmin&&<PartnerEditor draft={partnerDraft} setDraft={setPartnerDraft} onSave={savePartner} onClose={()=>setPartnerDraft(null)} busy={busy}/>} 
    {ruleDraft&&isAdmin&&<div className="clube-modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)setRuleDraft(null)}}><section className="clube-modal npv-rule-editor-modal" role="dialog" aria-modal="true" aria-labelledby="rules-title"><div className="clube-modal-top"><div><small>CLUBE NPV</small><h2 id="rules-title">Gerenciar benefícios</h2></div><button type="button" disabled={busy} onClick={()=>setRuleDraft(null)} aria-label="Fechar"><X size={20}/></button></div><form className="clube-form" onSubmit={saveRules}>
      <p>Edite os nomes e pontos ou adicione novas formas de acumular. Os lançamentos anteriores permanecem preservados.</p>
      <div className="npv-rule-editor-list">{ruleDraft.map((rule,i)=><div className="npv-rule-editor-row" key={rule.event_type}>
        <label>Nome do benefício<input required minLength={2} maxLength={75} placeholder="Ex.: Postar story marcando a NPV" value={rule.label} onChange={e=>setRuleDraft(d=>d.map((x,j)=>j===i?{...x,label:e.target.value}:x))}/></label>
        <label>Pontos<input type="number" min="0" max="100000" step="1" required value={rule.points} onChange={e=>setRuleDraft(d=>d.map((x,j)=>j===i?{...x,points:e.target.value}:x))}/></label>
      </div>)}</div>
      <button type="button" className="clube-btn clube-btn-outline clube-btn-full npv-rule-add" disabled={busy||ruleDraft.length>=50} onClick={()=>setRuleDraft(d=>[...d,{event_type:'extra_'+crypto.randomUUID().replace(/-/g,''),label:'',points:0,position:d.length+1}])}><Plus size={17}/> Adicionar benefício</button>
      <p className="npv-rule-editor-hint">Novos benefícios aparecem em “Continue acumulando” e em “Lançar pontos”. As categorias existentes não são excluídas.</p>
      {notice&&<p className="npv-rule-editor-error" role="alert">{notice}</p>}
      <button type="submit" className="clube-btn clube-btn-primary clube-btn-full" disabled={busy}>{busy?'Salvando...':'Salvar benefícios'} <Check size={16}/></button>
    </form></section></div>}
  </div>
}
