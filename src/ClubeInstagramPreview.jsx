import React, {useCallback,useEffect,useState} from 'react'
import {ArrowLeft,ArrowRight,CheckCircle2,Clipboard,Instagram,Link2,LockKeyhole,RefreshCw,ShieldCheck,TicketCheck,Unplug,AlertTriangle} from 'lucide-react'
import {clubeSupabase as supabase,clubeReady} from './clubeSupabase.js'
import logo from './assets/logo-vai-circular.webp'
import './ClubeInstagramPreview.css'

const DM_URL='https://ig.me/m/naopensevai'

export default function ClubeInstagramPreview(){
  const [session,setSession]=useState(null)
  const [booting,setBooting]=useState(true)
  const [email,setEmail]=useState('')
  const [password,setPassword]=useState('')
  const [busy,setBusy]=useState(false)
  const [state,setState]=useState(null)
  const [stories,setStories]=useState([])
  const [code,setCode]=useState('')
  const [notice,setNotice]=useState('')
  const [err,setErr]=useState('')

  useEffect(()=>{
    document.title='Teste real — Instagram | Clube NPV'
    if(!clubeReady){setBooting(false);return}
    let active=true
    supabase.auth.getSession().then(({data})=>{if(active){setSession(data?.session||null);setBooting(false)}}).catch(()=>{if(active)setBooting(false)})
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,current)=>{if(active)setSession(current||null)})
    return()=>{active=false;subscription.unsubscribe()}
  },[])

  const call=useCallback(async(path,method='GET')=>{
    const token=session?.access_token
    if(!token)throw new Error('Entre no Clube NPV.')
    const response=await fetch(path,{
      method,headers:{'Authorization':'Bearer '+token,...(method!=='GET'?{'Content-Type':'application/json'}:{})},
      cache:'no-store'
    })
    const body=await response.json().catch(()=>({}))
    if(!response.ok){
      const errors={
        instagram_database_setup_required:'Banco de homologação ainda não preparado.',
        club_login_required:'Entre no Clube com uma conta aprovada.',
        too_soon:'Aguarde um minuto antes de gerar outro código.',
        unlink_failed:'Não foi possível desfazer o vínculo.'
      }
      throw new Error(body.message||errors[body.status]||'Integração indisponível no momento.')
    }
    return body
  },[session?.access_token])

  const refresh=useCallback(async()=>{
    setErr('')
    try{
      const status=await call('/api/instagram/link')
      setState(status)
      if(status.connected)setCode('')
      if(status.available){
        const activity=await call('/api/instagram/activity')
        setStories(activity.events||[])
      }
    }catch(e){setErr(e.message)}
  },[call])

  useEffect(()=>{
    if(!session?.access_token){setState(null);setCode('');setStories([]);return}
    refresh()
  },[session?.access_token,refresh])

  useEffect(()=>{
    if(!session||!state?.available||state.connected||!code)return
    const interval=setInterval(()=>refresh(),6000)
    return()=>clearInterval(interval)
  },[session,state?.available,state?.connected,code,refresh])

  async function login(e){
    e.preventDefault();setBusy(true);setErr('');setNotice('')
    try{
      const {error}=await supabase.auth.signInWithPassword({email:email.trim(),password})
      if(error)throw new Error('Não foi possível entrar. Confira o e-mail e a senha do Clube.')
      setPassword('')
    }catch(e){setErr(e.message)}finally{setBusy(false)}
  }

  async function start(){
    setBusy(true);setErr('');setNotice('')
    try{
      const data=await call('/api/instagram/link','POST')
      if(data.status!=='pending'||!data.code)throw new Error('Código não foi disponibilizado.')
      setCode(data.code)
      setNotice('Copie o código e envie por DM à conta oficial @naopensevai. Ele é válido por 10 minutos.')
      await refresh()
    }catch(e){setErr(e.message)}finally{setBusy(false)}
  }

  async function unlink(){
    if(!window.confirm('Desvincular seu Instagram da conta NPV?'))return
    setBusy(true);setErr('')
    try{
      await call('/api/instagram/link','DELETE')
      setCode('');await refresh();setNotice('Instagram desvinculado.')
    }catch(e){setErr(e.message)}finally{setBusy(false)}
  }

  async function logout(){
    await supabase.auth.signOut();setSession(null);setCode('');setState(null);setStories([])
  }

  return <div className="igpv-shell">
    <header className="igpv-header"><div className="igpv-header-inner">
      <div className="igpv-brand"><img src={logo} alt="" /><div><strong>NÃO PENSE, VAI!</strong><small>CLUBE DE BENEFÍCIOS</small></div></div>
      <a className="igpv-back" href="/clube"><ArrowLeft size={16}/> Clube NPV</a>
    </div></header>
    <main className="igpv-main">
      <div className="igpv-eyebrow">INTEGRAÇÃO INSTAGRAM · TESTE REAL</div>
      <h1>Seu Story pode virar <em>pontos.</em></h1>
      <p className="igpv-sub">Vamos vincular a conta do Instagram por mensagem direta, sem compartilhar sua senha. A pontuação só aparece depois da confirmação do servidor.</p>
      <div className="igpv-notice"><AlertTriangle size={18}/><div><strong>Homologação, sem lançamento de pontos reais.</strong> Esta tela consulta apenas a integração oficial. Se a Meta ainda não estiver autorizada, você verá o aviso em vez de uma falsa confirmação.</div></div>
      {!clubeReady?<div className="igpv-panel"><h2>Clube indisponível</h2><p>Não foi possível carregar a autenticação do Clube.</p></div>:
      booting?<div className="igpv-panel">Conferindo seu acesso ao Clube…</div>:
      !session?<div className="igpv-grid"><section className="igpv-panel">
        <div className="igpv-kicker"><LockKeyhole size={19}/> ÁREA PROTEGIDA</div>
        <h2>Entre na sua conta do Clube</h2>
        <p>É a senha do <strong>Clube NPV</strong>, não a senha do Instagram. O Instagram será confirmado por DM.</p>
        <form onSubmit={login} className="igpv-form">
          <label>E-mail do Clube<input type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" required placeholder="voce@email.com"/></label>
          <label>Senha do Clube NPV<input type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password" required/></label>
          <button type="submit" className="igpv-btn" disabled={busy}>{busy?'Aguarde…':'Acessar teste do Instagram'}<ArrowRight size={17}/></button>
        </form>
        {err&&<p className="igpv-error" role="alert">{err}</p>}
      </section><aside className="igpv-panel igpv-side">
        <h2>Privacidade primeiro</h2><p>O NPV não coleta nem armazena senhas do Instagram.</p>
        <div className="igpv-step"><ShieldCheck size={19}/><div><strong>Código exclusivo</strong><span>Ligado à sua conta aprovada no Clube</span></div></div>
        <div className="igpv-step"><Instagram size={19}/><div><strong>Confirmação por DM</strong><span>Recebida da própria Meta</span></div></div>
      </aside></div>:
      <div className="igpv-grid"><section className="igpv-panel">
        <div className="igpv-row"><div className="igpv-kicker"><Instagram size={19}/> CONEXÃO DO INSTAGRAM</div><button className="igpv-iconbtn" onClick={refresh} title="Atualizar situação"><RefreshCw size={17}/></button></div>
        <h2>{state?.connected?'Instagram confirmado':state?.available?'Vincule sua conta por mensagem':'Conexão ainda não ativada'}</h2>
        {state?.connected?
          <><div className="igpv-success"><CheckCircle2 size={22}/><div><strong>Conta vinculada com segurança</strong><span>Confirmação recebida pelo Instagram em {new Date(state.verified_at).toLocaleString('pt-BR')}.</span></div></div>
          <p>Agora publique um Story mencionando <strong>@naopensevai</strong>. A notificação será registrada quando recebida pela Meta.</p>
          <button className="igpv-secondary" disabled={busy} onClick={unlink}><Unplug size={17}/> Desvincular conta</button></>:
        state?.available?
          <><p>Toque para gerar um código de uso único. Ele será confirmado quando a mensagem chegar diretamente à nossa conta do Instagram.</p>
            <button className="igpv-btn" disabled={busy} onClick={start}><Link2 size={17}/>{busy?'Gerando…':'Gerar código para vinculação'}</button>
            {code&&<div className="igpv-codebox">
              <span>SEU CÓDIGO TEMPORÁRIO</span><strong>{code}</strong>
              <div className="igpv-row">
                <button className="igpv-secondary" onClick={()=>navigator.clipboard?.writeText(code)}><Clipboard size={16}/> Copiar código</button>
                <a className="igpv-btn" href={DM_URL} target="_blank" rel="noopener noreferrer"><Instagram size={16}/> Abrir Instagram</a>
              </div>
              <p>Envie exatamente esse código por mensagem direta para <strong>@naopensevai</strong>. Em seguida, a situação atualizará automaticamente.</p>
            </div>}</>:
          <div className="igpv-pending"><LockKeyhole size={20}/><div>
            <strong>Autorização oficial da Meta pendente</strong>
            <span>A integração não foi configurada para este ambiente. Não é possível verificar o Instagram apenas digitando o @.</span>
          </div></div>}
        {notice&&<p className="igpv-info" role="status">{notice}</p>}
        {err&&<p className="igpv-error" role="alert">{err}</p>}
        <div className="igpv-divider"/>
        <h2>Histórico de Stories recebidos</h2>
        <p>Somente menções reais recebidas pela API oficial aparecem aqui. Nada é simulado nesta tela.</p>
        {stories.length?stories.map(e=><div className="igpv-story" key={e.event_id}>
          <div><strong>Menção ao @naopensevai</strong><small>{new Date(e.created_at).toLocaleString('pt-BR')}</small></div>
          <span className={e.status==='credited'?'igpv-pill green':'igpv-pill'}>
            {e.status==='credited'?'+200 pontos':e.status==='review'?'Recebida · aguardando':e.status==='limit_reached'?'Limite atingido':e.status==='unlinked'?'Não vinculada':'Em análise'}
          </span>
        </div>):<p className="igpv-empty">Nenhum Story confirmado até o momento.</p>}
      </section><aside className="igpv-panel igpv-side">
        <h2>Como funciona</h2>
        <div className="igpv-step"><span className="igpv-number">1</span><div><strong>Entre no Clube</strong><span>Sua conta precisa estar aprovada.</span></div></div>
        <div className="igpv-step"><span className="igpv-number">2</span><div><strong>Confirme por DM</strong><span>Sem informar sua senha do Instagram.</span></div></div>
        <div className="igpv-step"><span className="igpv-number">3</span><div><strong>Marque @naopensevai</strong><span>Publique um Story pela conta vinculada.</span></div></div>
        <div className="igpv-step"><span className="igpv-number">4</span><div><strong>Validação e pontos</strong><span>Uma única vez por Story elegível, conforme a regra do Clube.</span></div></div>
        <div className="igpv-metric"><small>Regra aprovada</small><strong>+200 pts</strong><span>Por Story válido · até 5 no mês</span></div>
        <button className="igpv-secondary" onClick={logout}>Sair do teste</button>
      </aside></div>}
      <footer>Não Pense, Vai! · Rota de homologação separada do Clube oficial. Nenhum crédito de produção é executado aqui.</footer>
    </main>
  </div>
}
