import React,{useCallback,useEffect,useMemo,useState} from 'react'
import {Mail,Plus,Save,Send,RefreshCw,Eye,Clock3,CheckCircle2,AlertTriangle} from 'lucide-react'
import {EMAIL_PRESETS,SUPPORTED_NEW_EMAILS,renderTemplateEmail,validateTemplate} from '../clube/email/templateEngine.mjs'
import './ClubeEmailAdmin.css'
const sample={firstName:'Aluna',available:2000,eventPoints:400,reward:{name:'Garrafinha NPV',points:1500}}
const stamp=d=>d?new Date(d).toLocaleString('pt-BR',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}):'—'
export default function ClubeEmailAdmin({session}){
 const [items,setItems]=useState([])
 const [logs,setLogs]=useState([])
 const [chosen,setChosen]=useState('')
 const [draft,setDraft]=useState(null)
 const [newKind,setNewKind]=useState('')
 const [loading,setLoading]=useState(true)
 const [busy,setBusy]=useState('')
 const [message,setMessage]=useState('')
 const [error,setError]=useState('')
 const request=useCallback(async(method='GET',payload)=>{
  if(!session?.access_token)throw new Error('Sessão administrativa indisponível.')
  const response=await fetch('/api/clube/email-admin',{method,cache:'no-store',headers:{Authorization:'Bearer '+session.access_token,...(payload?{'Content-Type':'application/json'}:{})},...(payload?{body:JSON.stringify(payload)}:{})})
  const body=await response.json().catch(()=>({}))
  if(!response.ok)throw new Error(body.message||({'unauthorized':'Entre novamente na sua conta.','forbidden':'Acesso exclusivo ao administrador.','test_send_failed':'Falha ao enviar teste. Confira as configurações do provedor.'}[body.status]||'Não foi possível concluir a operação.'))
  return body
 },[session?.access_token])
 const load=useCallback(async(keepKey='')=>{
  setLoading(true);setError('')
  try{
   const data=await request()
   const templates=data.templates||[]
   setItems(templates);setLogs(data.dispatches||[])
   const key=keepKey||chosen||templates[0]?.key||''
   setChosen(key)
   setDraft(templates.find(x=>x.key===key)||null)
  }catch(e){setError(e.message)}
  finally{setLoading(false)}
 },[request,chosen])
 useEffect(()=>{load()},[session?.access_token])
 const select=t=>{setChosen(t.key);setDraft({...t});setError('');setMessage('')}
 const edited=useMemo(()=>JSON.stringify(items.find(t=>t.key===draft?.key)||null)!==JSON.stringify(draft),[items,draft])
 const preview=useMemo(()=>draft?renderTemplateEmail(sample,{template:draft}):null,[draft])
 const set=(field,value)=>setDraft(x=>({...x,[field]:value}))
 const save=async()=>{
  if(!draft)return
  const invalid=validateTemplate(draft);if(invalid){setError(invalid);return}
  setBusy('save');setError('');setMessage('')
  try{await request('PATCH',{action:'save',template:draft});setMessage('Modelo salvo. As próximas mensagens usarão este conteúdo.');await load(draft.key)}
  catch(e){setError(e.message)}finally{setBusy('')}
 }
 const create=async()=>{
  if(!newKind)return
  setBusy('create');setMessage('');setError('')
  try{await request('POST',{action:'create',key:newKind});setNewKind('');setMessage('Novo modelo criado como desativado. Configure o texto antes de ativar.');await load(newKind)}
  catch(e){setError(e.message)}finally{setBusy('')}
 }
 const sendTest=async()=>{
  if(!draft||busy)return
  if(edited){setError('Salve as alterações antes de enviar um teste.');return}
  setBusy('test');setError('');setMessage('')
  try{const data=await request('POST',{action:'test',key:draft.key});setMessage('Teste enviado para '+data.recipient+'. Nenhuma aluna recebeu a simulação.')}
  catch(e){setError(e.message)}finally{setBusy('')}
 }
 const available=SUPPORTED_NEW_EMAILS.filter(k=>!items.some(x=>x.key===k))
 return <section className="npv-email-center">
  <div className="npv-email-heading"><div><span className="npv-admin-workspace-kicker">COMUNICAÇÃO COM AS ALUNAS</span><h2>E-mails automáticos</h2><p>Edite, visualize e acompanhe os avisos. A verificação acontece às 10h; o envio só ocorre quando há um acontecimento elegível.</p></div><button className="clube-btn clube-btn-outline" type="button" onClick={()=>load(chosen)} disabled={loading||!!busy}><RefreshCw size={15}/> Atualizar</button></div>
  {error&&<p className="npv-email-alert" role="alert"><AlertTriangle size={16}/>{error}</p>}
  {message&&<p className="npv-email-success" role="status"><CheckCircle2 size={16}/>{message}</p>}
  <div className="npv-email-layout">
   <div className="npv-email-list">
    <h3>Modelos cadastrados</h3>
    {items.map(t=><button type="button" key={t.key} className={'npv-email-list-item'+(chosen===t.key?' is-current':'')} onClick={()=>select(t)}><span className="npv-email-list-name"><Mail size={17}/><strong>{t.name}</strong></span><small>{EMAIL_PRESETS[t.key]?.event}</small><span className={'npv-email-status'+(t.enabled?' is-active':'')}>{t.key==='birthday_inactive'?'Preparando':t.enabled?'Ativo':'Desativado'}</span></button>)}
    {available.length>0&&<div className="npv-email-new"><strong>Adicionar outro aviso</strong><label htmlFor="npv-email-event">Acontecimento que autoriza o envio</label><select id="npv-email-event" value={newKind} onChange={e=>setNewKind(e.target.value)}><option value="">Selecionar acontecimento</option>{available.map(k=><option key={k} value={k}>{EMAIL_PRESETS[k].name}</option>)}</select><button className="clube-btn clube-btn-outline" type="button" onClick={create} disabled={!newKind||!!busy}><Plus size={15}/> Adicionar desativado</button><small>Não são enviados e-mails sem um gatilho real registrado.</small></div>}
   </div>
   <div className="npv-email-editor">
    {draft?<><div className="npv-email-section-title"><h3>Editar modelo</h3><span className="npv-email-event">Gatilho: {EMAIL_PRESETS[draft.key]?.event}</span></div>
      {draft.key==='birthday_inactive'&&<p className="npv-email-muted">Este modelo está pronto para editar, visualizar e testar. O envio real permanece bloqueado até validarmos a assinatura inativa e a autorização para receber e-mails. Nenhum ponto será concedido.</p>}
      <div className="npv-email-fields">
       <label>Nome interno<input value={draft.name} maxLength={80} onChange={e=>set('name',e.target.value)}/></label>
       <label>Assunto do e-mail<input value={draft.subject} maxLength={180} onChange={e=>set('subject',e.target.value)}/></label>
       <label>Título da mensagem<input value={draft.headline} maxLength={160} onChange={e=>set('headline',e.target.value)}/></label>
       <label>Texto da mensagem<textarea rows={6} maxLength={2000} value={draft.body} onChange={e=>set('body',e.target.value)}/></label>
       <label>Texto do botão<input value={draft.button_label} maxLength={60} onChange={e=>set('button_label',e.target.value)}/></label>
       <div className="npv-email-tokens">Campos automáticos: <code>{'{{primeiro_nome}}'}</code> <code>{'{{premio}}'}</code> <code>{'{{pontos}}'}</code> <code>{'{{saldo}}'}</code> <code>{'{{pontos_evento}}'}</code></div>
       <label className="npv-email-toggle"><input type="checkbox" checked={draft.enabled} disabled={draft.key==='birthday_inactive'} onChange={e=>set('enabled',e.target.checked)}/><span><strong>Envio automático ativo</strong><small>{draft.key==='birthday_inactive'?'Bloqueado até validar status na Hotmart e permissão de contato.':'Somente após evento real e sem repetir o mesmo aviso.'}</small></span></label>
      </div>
      <div className="npv-email-actions"><button className="clube-btn clube-btn-primary" onClick={save} disabled={!!busy||loading||!edited}><Save size={16}/> {busy==='save'?'Salvando...':'Salvar alterações'}</button><button className="clube-btn clube-btn-outline" onClick={sendTest} disabled={!!busy||loading}><Send size={16}/> {busy==='test'?'Enviando...':'Enviar teste para mim'}</button></div>
      <div className="npv-email-preview-head"><h3><Eye size={17}/> Prévia real da mensagem</h3><small>Exemplo com dados fictícios. Ao enviar, os dados são personalizados para a aluna.</small></div>
      <iframe className="npv-email-preview-frame" title="Prévia de e-mail" sandbox="" srcDoc={preview?.html||''}/>
    </>:<div className="npv-email-empty">{loading?'Consultando modelos...':'Escolha um modelo para editar.'}</div>}
   </div>
  </div>
  <section className="npv-email-history"><div className="npv-email-section-title"><h3><Clock3 size={17}/> Histórico de envios</h3><span>Últimos 30 registros</span></div>{logs.length?<div className="npv-email-history-scroll"><table><thead><tr><th>Aluna</th><th>Aviso</th><th>Situação</th><th>Data</th></tr></thead><tbody>{logs.map((x,i)=><tr key={i}><td>{x.member?.name||x.member?.email||'Perfil não encontrado'}</td><td>{EMAIL_PRESETS[x.kind]?.name||x.kind}</td><td>{x.status==='sent'?'Enviado':x.status==='failed'?'Falhou':'Processando'}</td><td>{stamp(x.sent_at||x.created_at)}</td></tr>)}</tbody></table></div>:<p className="npv-email-muted">Nenhum envio registrado até agora. Testes não aparecem no histórico das alunas.</p>}</section>
 </section>
}
