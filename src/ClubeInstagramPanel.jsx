import React,{useCallback,useEffect,useState} from 'react'
import {Instagram,ShieldCheck,Copy,ArrowUpRight,RefreshCw,Link2,Unplug,Clock3,CheckCircle2,AlertCircle,LockKeyhole} from 'lucide-react'
import './ClubeInstagramPanel.css'
import {clubeSupabase as supabase} from './clubeSupabase.js'

const INSTAGRAM_DM='https://ig.me/m/naopensevai'
const STORY_LABEL={credited:'Crédito confirmado',review:'Recebido · aguardando validação',unlinked:'Perfil não identificado',limit_reached:'Limite mensal atingido',disabled:'Automação desativada'}
const ago = date => {
  if(!date)return ''
  const timestamp=new Date(date)
  return Number.isNaN(timestamp.getTime())?'':timestamp.toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'})
}

export default function ClubeInstagramPanel({session,isAdmin=false}){
  const [data,setData]=useState(null)
  const [events,setEvents]=useState([])
  const [adminData,setAdminData]=useState(null)
  const [official,setOfficial]=useState(null)
  const [officialBusy,setOfficialBusy]=useState(false)
  const [officialMessage,setOfficialMessage]=useState('')
  const [webhookDiagnostic,setWebhookDiagnostic]=useState(null)
  const [webhookBusy,setWebhookBusy]=useState(false)
  const [webhookNote,setWebhookNote]=useState('')
  const [code,setCode]=useState('')
  const [loading,setLoading]=useState(false)
  const [notice,setNotice]=useState('')
  const [error,setError]=useState('')
  const [needsLogin,setNeedsLogin]=useState(false)

  const request=useCallback(async(path,method='GET')=>{
    if(!session?.access_token)throw new Error('Acesse sua conta do Clube NPV.')
    const fetchWithToken=token=>fetch(path,{
      method,cache:'no-store',
      headers:{Authorization:'Bearer '+token}
    })
    let response=await fetchWithToken(session.access_token)
    let body=await response.json().catch(()=>({}))
    // Uma sessão antiga pode continuar no navegador mesmo após ser revogada,
    // especialmente ao alternar aluno/admin em outro dispositivo.
    // Renovar uma única vez antes de pedir novo login; nunca usar token público
    // nem liberar acesso sem autenticação.
    if(response.status===401&&body.status==='club_login_required'){
      let token
      try{
        const refreshed=await supabase.auth.refreshSession()
        if(!refreshed.error)token=refreshed.data?.session?.access_token
      }catch{}
      if(token&&token!==session.access_token){
        response=await fetchWithToken(token)
        body=await response.json().catch(()=>({}))
      }
    }
    if(!response.ok){
      if(response.status===401&&body.status==='club_login_required')setNeedsLogin(true)
      const msg={
        too_soon:'Aguarde um minuto antes de gerar outro código.',
        club_login_required:'Sua sessão não está mais válida. Entre novamente no Clube para vincular seu Instagram.',
        instagram_database_setup_required:'O armazenamento do Instagram ainda não está pronto.',
        invalid_origin:'Atualize a página oficial do Clube para tentar novamente.'
      }[body.status]
      throw new Error(body.message||msg||'Não foi possível consultar a conexão com o Instagram.')
    }
    setNeedsLogin(false)
    return body
  },[session?.access_token])

  const load=useCallback(async({quiet=false}={})=>{
    if(!session?.access_token)return
    if(!quiet)setLoading(true)
    try{
      const status=await request('/api/instagram/link')
      setData(status)
      if(status.connected)setCode('')
      if(status.available){
        const next=await request('/api/instagram/activity')
        setEvents(Array.isArray(next.events)?next.events:[])
        if(isAdmin){
          const admin=await request('/api/instagram/admin')
          setAdminData(admin)
        }
      }else{setEvents([]);setAdminData(null)}
      if(!quiet)setError('')
    }catch(e){if(!quiet)setError(e.message)}
    finally{if(!quiet)setLoading(false)}
  },[session?.access_token,isAdmin,request])

  useEffect(()=>{load()},[load])
  // Após o consentimento do Instagram profissional, retornar à mesma área do Clube
  // com um aviso verificável sem registrar códigos de autorização no navegador.
  useEffect(()=>{
    if(!isAdmin)return
    const params=new URLSearchParams(window.location.search)
    const oauthStatus=params.get('ig_meta_status')
    if(oauthStatus!=='connected'&&oauthStatus!=='error')return
    setOfficialMessage(oauthStatus==='connected'
      ?'Autorização do @naopensevai recebida e registrada. Confira a situação do painel.'
      :'O Instagram não confirmou a autorização. Revise a conta profissional e as permissões na Meta.')
    params.delete('ig_meta_status')
    const search=params.toString()
    window.history.replaceState(window.history.state,'',
      window.location.pathname+(search?'?'+search:'')+window.location.hash)
  },[isAdmin])
  useEffect(()=>{
    if(!isAdmin||!session?.access_token){setOfficial(null);return}
    let alive=true
    request('/api/instagram/professional').then(result=>{if(alive)setOfficial(result)})
      .catch(()=>{if(alive)setOfficial({ready:false,connected:false})})
    return()=>{alive=false}
  },[isAdmin,session?.access_token,request])

  async function authorizeOfficial(){
    setOfficialBusy(true);setOfficialMessage('')
    try{
      const result=await request('/api/instagram/professional','POST')
      if(!result.authorization_url||!result.authorization_url.startsWith('https://www.instagram.com/oauth/authorize?'))
        throw new Error('A Meta não disponibilizou a autorização.')
      window.location.assign(result.authorization_url)
    }catch(e){setOfficialMessage(e.message);setOfficialBusy(false)}
  }
  async function diagnoseWebhook(repair=false){
    setWebhookBusy(true);setWebhookNote('')
    try{
      const info=await request('/api/instagram/diagnostics',repair?'POST':'GET')
      setWebhookDiagnostic(info)
      if(info.status==='subscriptions_verified')
        setWebhookNote('A Meta confirma as assinaturas. A entrega de um Direct real ainda precisa ser verificada.')
      else if(info.status==='app_webhook_not_registered')
        setWebhookNote('A Meta ainda não tem o webhook do Instagram cadastrado.')
      else if(info.status==='app_messages_not_subscribed')
        setWebhookNote('A Meta ainda não assina o campo messages no aplicativo.')
      else if(info.status==='account_messages_not_subscribed')
        setWebhookNote('A conta profissional ainda não está inscrita em messages.')
      else if(info.status==='existing_callback_conflict')
        setWebhookNote('Existe outro callback cadastrado. A configuração não foi alterada para proteger o webhook existente.')
      else
        setWebhookNote('Não foi possível confirmar todas as assinaturas. Verifique as permissões do aplicativo na Meta.')
    }catch(e){setWebhookNote(e.message||'Não foi possível consultar a Meta.')}
    finally{setWebhookBusy(false)}
  }
  async function sendDemoReply(){
    setOfficialBusy(true);setOfficialMessage('')
    try{
      const result=await request('/api/instagram/reply','POST')
      if(result.sent)setOfficialMessage('Mensagem enviada pela API oficial. Confira o Direct da conta pessoal vinculada.')
    }catch(e){setOfficialMessage(e.message)}
    finally{setOfficialBusy(false)}
  }
  useEffect(()=>{
    if(!code||data?.connected||!data?.available)return
    const timer=setInterval(()=>load({quiet:true}),8000)
    return()=>clearInterval(timer)
  },[code,data?.connected,data?.available,load])

  async function restartLogin(){
    setLoading(true);setError('')
    try{
      await supabase.auth.signOut({scope:'local'})
      window.location.assign('/clube')
    }catch{
      setError('Não foi possível reiniciar seu login. Use a opção Sair do Clube e entre novamente.')
      setLoading(false)
    }
  }
  async function connect(){
    setLoading(true);setError('');setNotice('')
    try{
      const answer=await request('/api/instagram/link','POST')
      if(answer.status!=='pending'||!answer.code)throw new Error('Não foi possível iniciar a vinculação.')
      setCode(answer.code)
      setNotice('Código gerado. Envie-o por mensagem direta para @naopensevai. Ele expira em 10 minutos.')
      await load({quiet:true})
    }catch(e){setError(e.message)}
    finally{setLoading(false)}
  }
  async function disconnect(){
    if(!window.confirm('Desvincular seu Instagram? Seus pontos já confirmados serão preservados.'))return
    setLoading(true);setError('');setNotice('')
    try{
      await request('/api/instagram/link','DELETE')
      setCode('')
      setNotice('Conta Instagram desvinculada do Clube.')
      await load({quiet:true})
    }catch(e){setError(e.message)}
    finally{setLoading(false)}
  }
  return <div className="npv-ig-root">
    <section className="npv-ig-card">
      <div className="npv-ig-heading">
        <span className="npv-ig-symbol"><Instagram size={25}/></span>
        <div><span className="npv-ig-overline">CONEXÃO INSTAGRAM</span><h2>Seus Stories valem pontos ✦</h2><p>Vincule sua conta e marque <strong>@naopensevai</strong> nos Stories para participar.</p></div>
      </div>
      <div className="npv-ig-status">
        <div className="npv-ig-status-head">
          {needsLogin?<LockKeyhole size={18}/>:data?.connected?<CheckCircle2 size={18}/>:data?.available?<Link2 size={18}/>:<Clock3 size={18}/>}
          <strong>{needsLogin?'Seu acesso precisa ser renovado':data?.connected?'Instagram vinculado':data?.available?'Vincule seu Instagram':'Integração em preparação'}</strong>
        </div>
        {needsLogin?
          <p>A integração está preparada, mas este dispositivo não tem uma sessão válida do Clube. Entre novamente para gerar o código de vinculação.</p>:
          data?.connected?
          <p>Vinculação confirmada em {ago(data.verified_at)} pelo Instagram. Não precisamos da sua senha.</p>:
          data?.available?
          <p>Para confirmar que o perfil realmente é seu, envie um código temporário por mensagem direta ao Instagram oficial da NPV.</p>:
          <p>Estamos habilitando a comunicação oficial com o Instagram. Ainda não é possível verificar marcações nem lançar pontos automaticamente.</p>}
      </div>
      <div className="npv-ig-steps">
        <div><strong>01</strong><span>Conecte sua conta pelo código enviado por DM.</span></div>
        <div><strong>02</strong><span>Publique um Story marcando @naopensevai.</span></div>
        <div><strong>03</strong><span>Após validação, receba até 200 pontos por Story elegível.</span></div>
      </div>
      {needsLogin&&<button className="npv-ig-action" type="button" onClick={restartLogin} disabled={loading}>
        <LockKeyhole size={18}/>{loading?'Reiniciando...':'Entrar novamente no Clube'}
      </button>}
      {!needsLogin&&data?.available&&!data.connected&&<>
        <button className="npv-ig-action" type="button" onClick={connect} disabled={loading}>
          <Instagram size={18}/>{loading?'Processando...':'Gerar código de vinculação'}
        </button>
        {code&&<div className="npv-ig-code" aria-live="polite">
          <small>SEU CÓDIGO TEMPORÁRIO</small><strong>{code}</strong>
          <div className="npv-ig-controls">
            <button type="button" onClick={async()=>{try{await navigator.clipboard.writeText(code);setNotice('Código copiado.')}catch{setNotice('Copie o código manualmente.')}}}><Copy size={16}/> Copiar</button>
            <a href={INSTAGRAM_DM} target="_blank" rel="noopener noreferrer"><Instagram size={16}/> Abrir direct <ArrowUpRight size={13}/></a>
          </div>
          <p>A confirmação aparece automaticamente quando a mensagem é recebida. Código válido por 10 minutos.</p>
        </div>}
      </>}
      <div className="npv-ig-actions-row">
        <button type="button" onClick={()=>load()} disabled={loading}><RefreshCw size={16}/> {loading?'Atualizando...':'Atualizar situação'}</button>
        {data?.connected&&<button type="button" onClick={disconnect} disabled={loading}><Unplug size={16}/> Desvincular</button>}
      </div>
      {error&&<p className="npv-ig-message npv-ig-error" role="alert"><AlertCircle size={15}/>{error}</p>}
      {notice&&<p className="npv-ig-message" role="status"><CheckCircle2 size={15}/>{notice}</p>}
      <p className="npv-ig-privacy"><ShieldCheck size={15}/> O Clube nunca solicita sua senha do Instagram. O reconhecimento depende da notificação oficial da Meta, que pode não chegar para todos os perfis privados.</p>
    </section>
    <section className="npv-ig-card">
      <div className="npv-ig-section-title"><h2>Stories registrados</h2><span>+200 pts por Story válido</span></div>
      <p className="npv-ig-paragraph">Até 5 Stories válidos por mês, conforme as regras do Clube. Não é necessário enviar prints quando a notificação for recebida e confirmada.</p>
      <div className="npv-ig-summary">
        <div><small>Stories confirmados neste mês</small><strong>{data?.available?(data?.credited_stories??0):'—'} <span>/ 5</span></strong></div>
        <div><small>Pontos confirmados</small><strong>{data?.available?(data?.credited_points??0).toLocaleString('pt-BR'):'—'} <span>pts</span></strong></div>
      </div>
      {events.length>0?<div className="npv-ig-events">{events.map(evt=><div className="npv-ig-event" key={evt.event_id}>
        <div><strong>Menção em Story</strong><small>{ago(evt.created_at)}</small></div>
        <span className={evt.status==='credited'?'npv-ig-credit':''}>{evt.status==='credited'?'+200 pontos':STORY_LABEL[evt.status]||'Em análise'}</span>
      </div>)}</div>:
      <p className="npv-ig-empty">Nenhum Story confirmado neste histórico.</p>}
    </section>
    {isAdmin&&<section className="npv-ig-card npv-ig-admin">
      <div className="npv-ig-section-title"><h2>Monitoramento do Instagram</h2><span>Administração</span></div>
      <p className="npv-ig-paragraph">A integração depende das permissões de mensagens e menções da conta @naopensevai no Meta for Developers. Quando ativa, notificações sem vínculo ficam pendentes para conferência.</p>
      <div className="npv-ig-status">
        <div className="npv-ig-status-head">
          {official?.connected?<CheckCircle2 size={18}/>:<LockKeyhole size={18}/>}
          <strong>{official?.connected?'@naopensevai autorizada na Meta':'Autorização da conta profissional'}</strong>
        </div>
        <p>{official?.connected
          ?'A conta profissional foi autorizada por Instagram Login. O recebimento de mensagens ainda depende do webhook ativo.'
          :official?.ready
          ?'Conecte a conta profissional @naopensevai para demonstrar o consentimento oficial à Meta.'
          :'Configure as credenciais privadas de Instagram Login no backend antes de iniciar a autorização.'}</p>
        {official?.connected&&official?.username&&
          <p>Perfil profissional identificado pela API oficial: <strong>@{official.username}</strong>.</p>}
        {official?.ready&&
          <button type="button" className="npv-ig-action" disabled={officialBusy} onClick={authorizeOfficial}>
            <Instagram size={18}/> {official?.connected?'Reautorizar @naopensevai na Meta':'Conectar @naopensevai na Meta'}
          </button>}
        {official?.connected&&
          <p>A reautorização é opcional e permite demonstrar o consentimento para a análise da Meta. Se cancelar, o vínculo atual continuará salvo; uma autorização nova só substitui a anterior depois de validada.</p>}
        {official?.connected&&
          <button type="button" className="npv-ig-action" disabled={officialBusy} onClick={sendDemoReply}>
            <Instagram size={18}/> Enviar mensagem de confirmação ao aluno vinculado
          </button>}
        {officialMessage&&<p className="npv-ig-message" role="status">{officialMessage}</p>}
      </div>
      <div className="npv-ig-status">
        <div className="npv-ig-status-head"><Link2 size={18}/><strong>Diagnóstico da entrega de Directs</strong></div>
        <p>Verifique a assinatura de mensagens na Meta. Se ela estiver ausente, o administrador poderá cadastrar somente o webhook oficial do Clube, sem alterar pontos.</p>
        <div className="npv-ig-controls">
          <button type="button" disabled={webhookBusy||!official?.connected} onClick={()=>diagnoseWebhook(false)}>
            <RefreshCw size={16}/> {webhookBusy?'Conferindo...':'Verificar integração'}
          </button>
          <button type="button" disabled={webhookBusy||!official?.connected} onClick={()=>diagnoseWebhook(true)}>
            <Link2 size={16}/> Corrigir assinatura Meta
          </button>
        </div>
        {webhookDiagnostic&&<p role="status">
          Conta profissional: {webhookDiagnostic.accountMessagesSubscribed===true?'mensagens inscritas':webhookDiagnostic.accountMessagesSubscribed===false?'mensagens não inscritas':'não confirmado'}.
          Aplicativo: {webhookDiagnostic.appMessagesSubscribed===true?'messages inscrito':webhookDiagnostic.appMessagesSubscribed===false?'messages não inscrito':'não confirmado'}.
          Callback: {webhookDiagnostic.callbackConfigured===true?'oficial':webhookDiagnostic.callbackConfigured===false?'divergente':'não confirmado'}.
        </p>}
        {webhookNote&&<p className="npv-ig-message" role="status">{webhookNote}</p>}
      </div>
      <div className="npv-ig-summary">
        <div><small>Menções recebidas</small><strong>{adminData?.available?(adminData.total_events||0):'—'}</strong></div>
        <div><small>Aguardando análise</small><strong>{adminData?.available?(adminData.pending_events||0):'—'}</strong></div>
      </div>
      {adminData?.events?.length>0&&<div className="npv-ig-events">{adminData.events.map(evt=><div className="npv-ig-event" key={evt.event_id}>
        <div><strong>{evt.student_name||'Instagram sem vínculo'}</strong><small>{ago(evt.created_at)} · {evt.event_id.slice(0,28)}</small></div>
        <span>{STORY_LABEL[evt.status]||evt.status}</span>
      </div>)}</div>}
      <p className="npv-ig-privacy"><LockKeyhole size={15}/> Sem acesso à Meta, a plataforma não concede pontos nem apresenta dados fictícios como se fossem reais.</p>
    </section>}
  </div>
}
