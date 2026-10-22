import { useCallback, useEffect, useMemo, useState } from 'react'
import { Activity, AlertCircle, CheckCircle2, Clock3, CreditCard, RefreshCw, Search, ShieldCheck, Users } from 'lucide-react'
import './ClubeHotmartAdmin.css'

const EMPTY={status:'awaiting_integration',metrics:null,subscriptions:[],synced_at:null,identity_complete:false}
const STATUS={
 ACTIVE:'Ativa',
 DELAYED:'Em atraso',
 CANCELLED_BY_ADMIN:'Cancelada pelo administrador',
 CANCELLED_BY_CUSTOMER:'Cancelada pelo cliente',
 INACTIVE:'Inativa',
 OTHER:'Outra situação'
}
const LINK={
 linked:'Vínculo confirmado',
 pending_missing_email:'E-mail indisponível',
 pending_no_clube_profile:'Sem conta no Clube',
 pending_clube_approval:'Cadastro não aprovado',
 pending_email_confirmation:'E-mail não confirmado',
 conflict_multiple_profiles:'Conflito de identidade',
 conflict_auth_email:'E-mail divergente',
 verification_unavailable:'Vínculo não verificado'
}
const fmtDate=value=>{
 if(!value)return '—'
 const date=new Date(value)
 return Number.isFinite(date.getTime())?date.toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'}):'—'
}
const fmtMetric=value=>Number.isFinite(value)?value.toLocaleString('pt-BR'):'—'

export default function ClubeHotmartAdmin({session,isAdmin}){
 const [status,setStatus]=useState('loading')
 const [data,setData]=useState(EMPTY)
 const [warning,setWarning]=useState(null)
 const [search,setSearch]=useState('')
 const [plan,setPlan]=useState('todos')
 const [situation,setSituation]=useState('todas')
 const refresh=useCallback(async(signal,force=false)=>{
  if(!isAdmin||!session?.access_token){setStatus('unauthorized');setData(EMPTY);return}
  setStatus('loading')
  try{
   const response=await fetch('/api/clube/hotmart-admin'+(force?'?refresh=1':''),{
    method:'GET',cache:'no-store',
    headers:{Authorization:'Bearer '+session.access_token},
    signal
   })
   if(signal?.aborted)return
   if(response.status===401||response.status===403){
    setStatus('unauthorized');setData(EMPTY);setWarning(null);return
   }
   if(!response.ok)throw new Error('service_unavailable')
   const payload=await response.json()
   if(signal?.aborted)return
   if(!payload||!Array.isArray(payload.subscriptions))throw new Error('unexpected_response')
   setData({
    status:payload.status,metrics:payload.metrics,
    subscriptions:payload.subscriptions,synced_at:payload.synced_at,
    identity_complete:payload.identity_complete
   })
   setWarning(payload.warning||
     (payload.status==='synced'&&!payload.identity_complete?
      'Verificação de vínculos ainda não disponível: não confundir alunos não verificados com vínculos pendentes.':null))
   setStatus(payload.status==='stale'?'stale':'ready')
  }catch(error){
   if(signal?.aborted||error?.name==='AbortError')return
   // Mantém a última leitura SOMENTE na memória da aba enquanto o admin estiver logado.
   setStatus(prev=>prev==='unauthorized'?prev:'error')
   setWarning('A atualização falhou. Quando disponível, os dados da última sincronização continuam visíveis.')
  }
 },[isAdmin,session?.access_token])
 useEffect(()=>{
  const controller=new AbortController()
  void refresh(controller.signal)
  return()=>controller.abort()
 },[refresh])
 useEffect(()=>{
  if(isAdmin&&session?.access_token)return
  setData(EMPTY);setWarning(null);setStatus('unauthorized')
 },[isAdmin,session?.access_token])

 const rows=useMemo(()=>data.subscriptions.filter(item=>{
  const query=search.trim().toLocaleLowerCase('pt-BR')
  const haystack=[item.subscriber_name,item.subscriber_email,item.subscriber_code,
   item.product_name,item.plan_label].filter(Boolean).join(' ').toLocaleLowerCase('pt-BR')
  return (!query||haystack.includes(query))&&
   (plan==='todos'||item.plan===plan)&&
   (situation==='todas'||item.status===situation)
 }),[data.subscriptions,plan,search,situation])
 const hasRows=data.subscriptions.length>0
 if(!isAdmin)return null
 return <section className="npv-hotmart-admin" aria-label="Administração de assinaturas Hotmart">
  <div className="npv-hotmart-top">
   <div className="npv-hotmart-heading">
    <div className="npv-hotmart-eyebrow"><ShieldCheck size={15}/> ÁREA RESTRITA · ADMINISTRADOR</div>
    <p>Assinaturas, pagamentos e situação de vínculo com o Clube NPV. Consulta somente leitura.</p>
   </div>
   <button type="button" className="npv-hotmart-refresh" onClick={()=>refresh(undefined,true)} disabled={status==='loading'}>
    <RefreshCw size={16} aria-hidden="true"/> {status==='loading'?'Verificando...':'Atualizar'}
   </button>
  </div>

  {(status==='unauthorized'||(status==='error'&&!hasRows))?
   <div className="npv-hotmart-warning" role="alert"><AlertCircle size={20}/>
    <div><strong>{status==='unauthorized'?'Acesso administrativo não autorizado':'Não foi possível validar a integração'}</strong>
     <p>{status==='unauthorized'?'Entre com uma conta administradora autorizada do Clube NPV.':
      'Nenhum dado é apresentado como atualizado quando a consulta falha. Tente novamente.'}</p></div>
   </div>:data.status==='awaiting_integration'?
   <div className="npv-hotmart-pending" role="status">
    <span className="npv-hotmart-pending-icon"><Clock3 size={22}/></span>
    <div><strong>{status==='loading'?'Verificando acesso seguro...':'Aguardando integração com a Hotmart'}</strong>
     <p>Os indicadores serão preenchidos somente após consulta oficial autorizada, sem dados fictícios.</p></div>
   </div>:
   <div className="npv-hotmart-pending" role="status">
    <span className="npv-hotmart-pending-icon"><CheckCircle2 size={22}/></span>
    <div><strong>{data.status==='stale'||status==='error'?'Última leitura disponível':'Dados consultados na Hotmart'}</strong>
     <p>Assinaturas oficiais do produto NPV. Status financeiro não equivale a renovação bonificável.</p></div>
   </div>}
  {(warning||data.status==='stale')&&status!=='unauthorized'&&
   <div className="npv-hotmart-warning" role="alert"><AlertCircle size={18}/>
    <div><strong>{data.status==='stale'||status==='error'?'Dados possivelmente desatualizados':'Atenção à verificação de vínculo'}</strong>
     <p>{warning||'A sincronização mais recente falhou.'}</p></div></div>}

  <div className="npv-hotmart-metrics" aria-label="Indicadores de assinaturas">
   {[
    {label:'Assinantes ativos',value:data.metrics?.active,help:'Assinaturas com situação ACTIVE na Hotmart',Icon:Users},
    {label:'Vinculados ao Clube',value:data.metrics?.linked,help:'Somente vínculos com conta e identidade verificadas',Icon:CheckCircle2},
    {label:'Vínculos pendentes',value:data.metrics?.pending,help:'Somente assinaturas ativas sem vínculo confirmado',Icon:Clock3},
    {label:'Renovações verificadas',value:null,help:'Indisponível até homologar renovação versus parcelamento',Icon:CreditCard}
   ].map(({label,value,help,Icon})=><div className="npv-hotmart-metric" key={label} title={help}>
    <span className="npv-hotmart-metric-icon"><Icon size={18}/></span>
    <small>{label}</small><strong>{fmtMetric(value)}</strong>
    <span>{label==='Renovações verificadas'?'Não verificadas':Number.isFinite(value)?'Conforme última sincronização':'Aguardando verificação'}</span>
   </div>)}
  </div>
  {data.metrics?.statuses&&<div className="npv-hotmart-status-summary" aria-label="Histórico por situação">
   {Object.entries(STATUS).map(([key,label])=><span key={key}><strong>{data.metrics.statuses[key]||0}</strong> {label}</span>)}
  </div>}

  <div className="npv-hotmart-panel">
   <div className="npv-hotmart-panel-head">
    <div><h3>Assinaturas e histórico completo</h3>
     <p>{data.metrics?.total!=null?fmtMetric(data.metrics.total)+' assinaturas históricas disponíveis':'Pesquisa e filtros preparados para os registros oficiais da Hotmart.'}</p></div>
    <span className="npv-hotmart-sync"><Activity size={14}/>
     {data.synced_at?'Última sincronização: '+fmtDate(data.synced_at):'Ainda não sincronizado'}</span>
   </div>
   <div className="npv-hotmart-filters">
    <label className="npv-hotmart-search"><Search size={17}/><span className="sr-only">Pesquisar assinaturas</span>
     <input value={search} onChange={event=>setSearch(event.target.value)} placeholder="Pesquisar assinante, e-mail ou produto"/>
    </label>
    <label><span>Plano</span><select aria-label="Filtrar por plano" value={plan} onChange={event=>setPlan(event.target.value)}>
     <option value="todos">Todos os planos</option><option value="mensal">Mensal</option><option value="trimestral">Trimestral</option>
    </select></label>
    <label><span>Situação</span><select aria-label="Filtrar por situação" value={situation} onChange={event=>setSituation(event.target.value)}>
     <option value="todas">Todas as situações</option>
     {Object.entries(STATUS).map(([key,label])=><option key={key} value={key}>{label}</option>)}
    </select></label>
   </div>
   <p className="npv-hotmart-swipe-hint">Deslize a tabela para os lados para ver todas as colunas.</p>
   <div className="npv-hotmart-table-wrap" role="region" tabIndex={0} aria-label="Tabela de assinaturas com rolagem horizontal">
    <table className="npv-hotmart-table">
     <thead><tr><th>Assinante / e-mail</th><th>Produto / plano</th><th>Situação Hotmart</th>
      <th>Vínculo NPV</th><th>Pagamentos aprovados</th><th>Meses pagos*</th><th>Renovações identificadas</th><th>Último pagamento confirmado</th><th>Próxima cobrança prevista</th><th>Pontos</th></tr></thead>
     <tbody>{rows.length?rows.map(item=><tr key={item.id} className={item.status==='ACTIVE'?'npv-hotmart-row-active':''}>
      <td><strong>{item.subscriber_name||'Nome não informado'}</strong>
       <small>{item.subscriber_email||'E-mail não informado'}</small></td>
      <td>{item.product_name||'—'}<small>{item.plan_label||'—'}</small></td>
      <td><span className={'npv-hotmart-status '+(item.status==='ACTIVE'?'is-active':'')}>
       {STATUS[item.status]||item.status||'—'}</span></td>
      <td>{LINK[item.link_status]||'Não verificado'}</td>
      <td>{fmtMetric(item.confirmed_payments)}<small>Não são necessariamente renovações</small></td>
      <td>{fmtMetric(item.paid_months)}<small>{item.paid_months===null?'Recorrências não identificadas':item.plan==='trimestral'?'Cobertura financeira trimestral':'Mensalidades identificadas'}</small></td>
      <td>{fmtMetric(item.renewal_cycles)}<small>{item.renewal_cycles===null?'Aguardando prova de recorrência':'Ciclos após primeira compra; crédito sujeito à conferência'}</small></td>
      <td>{fmtDate(item.last_paid_at)}<small>{item.last_paid_at?'Pagamento confirmado; elegibilidade não verificada':'Sem pagamento confirmado no histórico'}</small></td>
      <td>{fmtDate(item.next_charge_at)}</td>
      <td>Não verificados</td>
     </tr>):<tr><td colSpan="10" className="npv-hotmart-empty">
      <div><CreditCard size={26}/><strong>{data.status==='awaiting_integration'?'Aguardando integração com a Hotmart':'Nenhuma assinatura disponível'}</strong>
       <p>{search||plan!=='todos'||situation!=='todas'?'Nenhum registro encontrado para os filtros selecionados.':
        'Nenhuma assinatura pôde ser exibida como confirmada nesta consulta.'}</p></div>
     </td></tr>}</tbody>
    </table>
   </div>
   <p className="npv-hotmart-footnote">* Meses pagos: calculados somente quando o número da recorrência foi identificado nas transações aprovadas e não revertidas. No trimestral, uma cobrança cobre três meses, mas os pontos são liberados por competência. A primeira compra não gera bônus. Renovação identificada não significa pontos automaticamente elegíveis. Quem não tem conta no Clube não pode receber créditos. Consulta exclusiva para administradores; nenhuma pontuação é lançada nesta tela.</p>
  </div>
 </section>
}
