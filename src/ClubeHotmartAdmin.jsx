import {useCallback,useEffect,useMemo,useRef,useState} from 'react'
import {Activity,AlertTriangle,CheckCircle2,Clock3,CreditCard,RefreshCw,Search,ShieldCheck,Users} from 'lucide-react'
import './ClubeHotmartAdmin.css'

const EMPTY={status:'awaiting_integration',metrics:null,subscriptions:[],synced_at:null,identity_verified:false}
const SITUATIONS={
 ACTIVE:'Ativa',DELAYED:'Em atraso',INACTIVE:'Inativa',
 CANCELLED_BY_ADMIN:'Cancelada pelo administrador',
 CANCELLED_BY_CUSTOMER:'Cancelada pelo cliente',UNKNOWN:'Outra situação'
}
const LINKS={
 linked:'Vinculado ao Clube',not_linked:'Sem conta no Clube',
 not_verified:'Vínculo não verificado',missing_email:'E-mail ausente',
 conflict:'Conflito de identidade',identity_mismatch:'Identidade divergente',
 email_unconfirmed:'E-mail não confirmado',awaiting_approval:'Cadastro sem aprovação'
}
const fmtDate=value=>{
 if(!value)return '—'
 const dt=new Date(value)
 return Number.isFinite(dt.getTime())?dt.toLocaleDateString('pt-BR'):'—'
}
const fmtDateTime=value=>{
 if(!value)return '—'
 const dt=new Date(value)
 return Number.isFinite(dt.getTime())?dt.toLocaleString('pt-BR'):'—'
}
const fmtMetric=value=>Number.isFinite(value)?value.toLocaleString('pt-BR'):'—'
const current=(date)=>Boolean(date&&Date.now()-new Date(date).getTime()<10*60*1000)
const makeUrl=(code)=>'/api/clube/hotmart-admin?action=payments&subscriber_code='+encodeURIComponent(code)

export default function ClubeHotmartAdmin({session,isAdmin}){
 const [status,setStatus]=useState('loading')
 const [data,setData]=useState(EMPTY)
 const [payments,setPayments]=useState({})
 const [expanded,setExpanded]=useState(null)
 const [search,setSearch]=useState('')
 const [plan,setPlan]=useState('todos')
 const [situation,setSituation]=useState('todas')
 const [linkFilter,setLinkFilter]=useState('todos')
 const runId=useRef(0)
 const accessToken=session?.access_token
 const refresh=useCallback(async(signal)=>{
  if(!isAdmin||!accessToken){setStatus('unauthorized');setData(EMPTY);return}
  const run=++runId.current
  setStatus('loading')
  try{
   const resp=await fetch('/api/clube/hotmart-admin?refresh=1',{
    method:'GET',cache:'no-store',headers:{Authorization:'Bearer '+accessToken},signal
   })
   if(resp.status===401||resp.status===403){
    setStatus('unauthorized');setData(EMPTY);return
   }
   if(!resp.ok)throw new Error('service_unavailable')
   const payload=await resp.json()
   if(!Array.isArray(payload?.subscriptions))throw new Error('unexpected_response')
   if(run!==runId.current)return
   setData(payload)
   setPayments({})
   setStatus(payload.status==='stale'?'stale':'ready')
  }catch(error){
   if(error?.name!=='AbortError'&&run===runId.current)setStatus('error')
  }
 },[accessToken,isAdmin])
 useEffect(()=>{
  const ctrl=new AbortController()
  void refresh(ctrl.signal)
  return()=>{ctrl.abort();runId.current++}
 },[refresh])
 // Histórico financeiro buscado só após uma leitura administrativa válida.
 // Concorrência 2 para respeitar API e permitir atualização progressiva sem salvar PII.
 useEffect(()=>{
  if(!isAdmin||!accessToken||status!=='ready'||data.status!=='ready'||!data.subscriptions.length)return
  const ctrl=new AbortController()
  const order=[...data.subscriptions].sort((a,b)=>
   Number(b.status==='ACTIVE')-Number(a.status==='ACTIVE'))
  let pointer=0
  const worker=async()=>{
   while(pointer<order.length&&!ctrl.signal.aborted){
    const row=order[pointer++]
    try{
     const resp=await fetch(makeUrl(row.subscriber_code),{
      method:'GET',cache:'no-store',
      headers:{Authorization:'Bearer '+accessToken},signal:ctrl.signal})
     if(!resp.ok)throw new Error('history_unavailable')
     const body=await resp.json()
     if(body.status!=='read_only'||!Array.isArray(body.history))throw new Error('invalid_history')
     if(!ctrl.signal.aborted)setPayments(old=>({...old,[row.id]:{...body,loaded:true}}))
    }catch(error){
     if(error?.name!=='AbortError'&&!ctrl.signal.aborted)
      setPayments(old=>({...old,[row.id]:{loaded:true,error:true}}))
    }
   }
  }
  void Promise.all([worker(),worker()])
  return()=>ctrl.abort()
 },[accessToken,isAdmin,status,data])

 const rows=useMemo(()=>data.subscriptions.filter(item=>{
  const q=search.trim().toLocaleLowerCase('pt-BR')
  const haystack=[item.subscriber_name,item.subscriber_email,item.product_name,item.subscriber_code]
   .filter(Boolean).join(' ').toLocaleLowerCase('pt-BR')
  return (!q||haystack.includes(q))&&
   (plan==='todos'||item.plan===plan)&&
   (situation==='todas'||item.status===situation)&&
   (linkFilter==='todos'||(linkFilter==='linked'?item.link_status==='linked':
    item.link_status!=='linked'))
 }),[data.subscriptions,plan,search,situation,linkFilter])
 const activeRows=data.subscriptions.filter(item=>item.status==='ACTIVE')
 const historyLoaded=Object.values(payments).filter(x=>x.loaded&&!x.error).length
 const historyErrors=Object.values(payments).filter(x=>x.error).length
 const stale=status==='stale'||(data.status==='ready'&&!current(data.synced_at))
 if(!isAdmin)return null
 return <section className="npv-hotmart-admin" aria-label="Administração de assinaturas Hotmart">
   <div className="npv-hotmart-top">
     <div className="npv-hotmart-heading">
       <div className="npv-hotmart-eyebrow"><ShieldCheck size={15}/> ÁREA RESTRITA · ADMINISTRADOR</div>
       <p>Assinaturas oficiais, vínculos com o Clube e pagamentos confirmados. Somente leitura.</p>
     </div>
     <button type="button" className="npv-hotmart-refresh" onClick={()=>refresh()} disabled={status==='loading'}>
       <RefreshCw size={16} aria-hidden="true"/>{status==='loading'?'Consultando...':'Atualizar'}
     </button>
   </div>

   {(status==='unauthorized'||status==='error'||stale||historyErrors>0)&&
    <div className="npv-hotmart-warning" role="alert"><AlertTriangle size={20}/>
      <div><strong>{status==='unauthorized'?'Acesso administrativo não autorizado':
        status==='error'?'Falha na atualização oficial':stale?'Dados desatualizados':'Alguns históricos não puderam ser verificados'}</strong>
        <p>{status==='unauthorized'?'Entre com uma conta administradora autorizada.':
        'A última leitura válida é mantida apenas nesta sessão. Verifique a data da sincronização e atualize novamente.'}</p></div>
    </div>}
   {status==='ready'&&data.status==='awaiting_integration'&&
    <div className="npv-hotmart-pending" role="status"><Clock3 size={23}/>
      <div><strong>Aguardando integração com a Hotmart</strong>
        <p>O acesso protegido ainda não possui todas as credenciais server-side e a allowlist autorizada neste ambiente.</p>
      </div></div>}
   {status==='loading'&&<div className="npv-hotmart-pending" role="status"><Clock3 size={23}/>
     <div><strong>Verificando acesso seguro...</strong><p>Consultando o servidor.</p></div></div>}
   {data.status==='ready'&&!data.identity_verified&&
     <div className="npv-hotmart-pending" role="status"><ShieldCheck size={22}/>
       <div><strong>Vínculos ainda não verificados</strong>
        <p>Os indicadores de vínculo serão preenchidos somente após confirmar Auth e perfis aprovados; não presumimos que todo histórico precise de cadastro.</p>
       </div></div>}

   <div className="npv-hotmart-metrics" aria-label="Indicadores de assinaturas">
     {[
      {label:'Assinantes ativos',value:data.metrics?.active,Icon:Users,note:'Assinaturas ativas na Hotmart'},
      {label:'Vinculados ao Clube',value:data.metrics?.linked,Icon:CheckCircle2,note:'Vínculos com identidade confirmada'},
      {label:'Vínculos pendentes',value:data.metrics?.pending,Icon:Clock3,note:'Somente assinaturas ativas sem vínculo'},
      {label:'Renovações confirmadas',value:null,Icon:CreditCard,note:'Ainda não homologadas (parcelamento)'}
     ].map(({label,value,Icon,note})=><div className="npv-hotmart-metric" key={label}>
       <span className="npv-hotmart-metric-icon"><Icon size={18}/></span>
       <small>{label}</small><strong>{fmtMetric(value)}</strong><span>{note}</span>
     </div>)}
   </div>

   {activeRows.length>0&&<div className="npv-hotmart-active">
     <div className="npv-hotmart-panel-head"><div><h3>Assinaturas ativas agora</h3>
       <p>Esses registros têm prioridade no acompanhamento de vínculo com o Clube.</p></div>
       <span className="npv-hotmart-sync">{activeRows.length} ativa(s)</span></div>
     <div className="npv-hotmart-active-list">{activeRows.map(item=><div key={item.id} className="npv-hotmart-active-item">
       <strong>{item.subscriber_name||item.subscriber_email||'Assinante sem nome'}</strong>
       <small>{item.subscriber_email||'E-mail indisponível'} · {item.plan_label}</small>
       <span>{LINKS[item.link_status]||'Vínculo não verificado'}</span>
     </div>)}</div>
   </div>}

   <div className="npv-hotmart-panel">
     <div className="npv-hotmart-panel-head"><div><h3>Histórico de assinaturas</h3>
       <p>{data.metrics?.historical==null?'Aguardando consulta':'Total histórico: '+data.metrics.historical+' assinaturas'} · pesquisa e filtros sem excluir registros cancelados.</p></div>
       <span className="npv-hotmart-sync"><Activity size={14}/>{data.synced_at?'Última sincronização: '+fmtDateTime(data.synced_at):'Ainda não sincronizado'}</span>
     </div>
     <div className="npv-hotmart-filters">
       <label className="npv-hotmart-search"><Search size={17}/><span className="sr-only">Pesquisar assinaturas</span>
         <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Pesquisar assinante, e-mail ou produto"/>
       </label>
       <label><span>Plano</span><select aria-label="Filtrar por plano" value={plan} onChange={e=>setPlan(e.target.value)}>
         <option value="todos">Todos os planos</option><option value="mensal">Mensal</option><option value="trimestral">Trimestral</option>
         <option value="desconhecido">Não verificado</option>
       </select></label>
       <label><span>Situação</span><select aria-label="Filtrar por situação" value={situation} onChange={e=>setSituation(e.target.value)}>
         <option value="todas">Todas as situações</option>
         {Object.entries(SITUATIONS).map(([id,name])=><option value={id} key={id}>{name}</option>)}
       </select></label>
       <label><span>Vínculo</span><select aria-label="Filtrar por vínculo" value={linkFilter} onChange={e=>setLinkFilter(e.target.value)}>
         <option value="todos">Todos os vínculos</option><option value="linked">Confirmados</option>
         <option value="not_linked">Sem vínculo confirmado</option>
       </select></label>
     </div>
     <p className="npv-hotmart-swipe-hint">Deslize a tabela para os lados para ver todas as colunas.</p>
     <div className="npv-hotmart-table-wrap" role="region" tabIndex={0} aria-label="Tabela de assinaturas com rolagem horizontal">
       <table className="npv-hotmart-table">
         <thead><tr><th>Assinante / e-mail</th><th>Produto / plano</th><th>Situação Hotmart</th>
           <th>Vínculo Clube</th><th>Próxima cobrança</th><th>Último pagamento</th><th>Pontos / pagamentos</th></tr></thead>
         <tbody>{rows.length?rows.map(item=>{
           const payment=payments[item.id]
           return <tr key={item.id} className={item.status==='ACTIVE'?'npv-hotmart-active-row':''}>
             <td><strong>{item.subscriber_name||'—'}</strong><small>{item.subscriber_email||'E-mail não disponível'}</small></td>
             <td>{item.product_name||'Não Pense, Vai!'}<small>{item.plan_label}</small></td>
             <td><span className={item.status==='ACTIVE'?'npv-hotmart-status-active':''}>{SITUATIONS[item.status]||item.status}</span></td>
             <td>{LINKS[item.link_status]||'Não verificado'}</td>
             <td>{fmtDate(item.next_charge_at)}<small>Previsão, não pagamento</small></td>
             <td>{payment?.error?'Indisponível':payment?.loaded?fmtDate(payment.last_paid_at):'Verificando...'}
               <small>{payment?.loaded&&!payment?.error?payment.confirmed_payments+' pagamentos confirmados':'Não presume renovação'}</small></td>
             <td>Não homologados
               <small><button type="button" className="npv-hotmart-details" onClick={()=>setExpanded(old=>old===item.id?null:item.id)}
                 aria-expanded={expanded===item.id}> {expanded===item.id?'Ocultar pagamentos':'Ver pagamentos'} </button></small>
               {expanded===item.id&&<div className="npv-hotmart-history">
                 {!payment?.loaded?'Carregando histórico...':payment.error?'Histórico indisponível. Atualize para tentar novamente.':
                  payment.history.length?payment.history.map((p,i)=><div key={i}>
                   {p.status} · {fmtDate(p.approved_at)} · {p.payment_type||'Meio não informado'} · {p.recurrence_number==null?'—':'Parcela/recorrência '+p.recurrence_number}
                  </div>):'Nenhum pagamento encontrado'}
               </div>}
             </td>
           </tr>
         }):<tr><td colSpan="7" className="npv-hotmart-empty">
           <div><CreditCard size={26}/><strong>{status==='ready'&&data.status==='awaiting_integration'?'Aguardando integração com a Hotmart':'Nenhuma assinatura encontrada'}</strong>
             <p>{search||plan!=='todos'||situation!=='todas'||linkFilter!=='todos'?'Nenhum registro corresponde aos filtros.':
              'A tabela será preenchida por dados oficiais após autorização do servidor.'}</p></div>
         </td></tr>}</tbody>
       </table>
     </div>
     <p className="npv-hotmart-footnote">
       {data.subscriptions.length>0?historyLoaded+' de '+data.subscriptions.length+' históricos de pagamento consultados nesta sessão. ':''}
       Somente leitura. Pagamentos confirmados não equivalem a renovações elegíveis. Nenhum ponto, cadastro ou vínculo é alterado.
     </p>
   </div>
 </section>
}
