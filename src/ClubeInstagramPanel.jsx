import React,{useCallback,useEffect,useState} from 'react'
import {Instagram,ShieldCheck,Copy,ArrowUpRight,RefreshCw,Link2,Unplug,Clock3,CheckCircle2,AlertCircle,LockKeyhole} from 'lucide-react'
import './ClubeInstagramPanel.css'

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
  const [code,setCode]=useState('')
  const [loading,setLoading]=useState(false)
  const [notice,setNotice]=useState('')
  const [error,setError]=useState('')

  const request=useCallback(async(path,method='GET')=>{
    if(!session?.access_token)throw new Error('Acesse sua conta do Clube NPV.')
    const response=await fetch(path,{
      method,cache:'no-store',
      headers:{Authorization:'Bearer '+session.access_token}
    })
    const body=await response.json().catch(()=>({}))
    if(!response.ok){
      const msg={
        too_soon:'Aguarde um minuto antes de gerar outro código.',
        club_login_required:'Seu acesso ao Clube expirou. Entre novamente.',
        instagram_database_setup_required:'O armazenamento do Instagram ainda não está pronto.',
        invalid_origin:'Atualize a página oficial do Clube para tentar novamente.'
      }[body.status]
      throw new Error(body.message||msg||'Não foi possível consultar a conexão com o Instagram.')
    }
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
          {data?.connected?<CheckCircle2 size={18}/>:data?.available?<Link2 size={18}/>:<Clock3 size={18}/>}
          <strong>{data?.connected?'Instagram vinculado':data?.available?'Vincule seu Instagram':'Integração em preparação'}</strong>
        </div>
        {data?.connected?
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
      {data?.available&&!data.connected&&<>
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
        {official?.ready&&!official.connected&&
          <button type="button" className="npv-ig-action" disabled={officialBusy} onClick={authorizeOfficial}>
            <Instagram size={18}/> Conectar @naopensevai na Meta
          </button>}
        {official?.connected&&
          <button type="button" className="npv-ig-action" disabled={officialBusy} onClick={sendDemoReply}>
            <Instagram size={18}/> Enviar mensagem de confirmação ao aluno vinculado
          </button>}
        {officialMessage&&<p className="npv-ig-message" role="status">{officialMessage}</p>}
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
