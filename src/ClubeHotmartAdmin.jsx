import { useCallback, useEffect, useMemo, useState } from 'react'
import { Activity, CheckCircle2, Clock3, CreditCard, RefreshCw, Search, ShieldCheck, Users } from 'lucide-react'
import './ClubeHotmartAdmin.css'

const EMPTY={status:'awaiting_integration',metrics:null,subscriptions:[],synced_at:null}
const fmtDate=value=>value?new Date(value).toLocaleDateString('pt-BR'):'—'
const fmtMetric=value=>Number.isFinite(value)?value.toLocaleString('pt-BR'):'—'

export default function ClubeHotmartAdmin({session,isAdmin}){
  const [status,setStatus]=useState('loading')
  const [data,setData]=useState(EMPTY)
  const [search,setSearch]=useState('')
  const [plan,setPlan]=useState('todos')
  const [situation,setSituation]=useState('todas')
  const refresh=useCallback(async(signal)=>{
    if(!isAdmin||!session?.access_token){setStatus('unauthorized');return}
    setStatus('loading')
    try{
      const response=await fetch('/api/clube/hotmart-admin',{
        method:'GET',cache:'no-store',
        headers:{Authorization:'Bearer '+session.access_token},
        signal
      })
      if(response.status===401||response.status===403){setStatus('unauthorized');setData(EMPTY);return}
      if(!response.ok)throw new Error('service_unavailable')
      const payload=await response.json()
      if(!payload||!Array.isArray(payload.subscriptions))throw new Error('unexpected_response')
      setData({
        status:payload.status,
        metrics:payload.metrics,
        subscriptions:payload.subscriptions,
        synced_at:payload.synced_at
      })
      setStatus('ready')
    }catch(error){
      if(error?.name!=='AbortError'){setStatus('error');setData(EMPTY)}
    }
  },[isAdmin,session?.access_token])
  useEffect(()=>{
    const controller=new AbortController()
    void refresh(controller.signal)
    return()=>controller.abort()
  },[refresh])

  const rows=useMemo(()=>data.subscriptions.filter(item=>{
    const query=search.trim().toLocaleLowerCase('pt-BR')
    const haystack=[item.subscriber_name,item.subscriber_email,item.subscriber_code,
      item.product_name,item.plan_label].filter(Boolean).join(' ').toLocaleLowerCase('pt-BR')
    return (!query||haystack.includes(query)) &&
      (plan==='todos'||item.plan===plan) &&
      (situation==='todas'||item.status===situation)
  }),[data.subscriptions,plan,search,situation])
  if(!isAdmin)return null
  return <section className="npv-hotmart-admin" aria-label="Administração de assinaturas Hotmart">
    <div className="npv-hotmart-top">
      <div className="npv-hotmart-heading">
        <div className="npv-hotmart-eyebrow"><ShieldCheck size={15}/> ÁREA RESTRITA · ADMINISTRADOR</div>
        
        <p>Visão administrativa das assinaturas, pagamentos confirmados e competências de pontos do Clube NPV.</p>
      </div>
      <button type="button" className="npv-hotmart-refresh" onClick={()=>refresh()} disabled={status==='loading'}>
        <RefreshCw size={16} aria-hidden="true"/> {status==='loading'?'Verificando...':'Atualizar'}
      </button>
    </div>

    {status==='unauthorized'||status==='error'?
      <div className="npv-hotmart-warning" role="alert">
        <ShieldCheck size={20}/>
        <div><strong>{status==='unauthorized'?'Acesso administrativo não autorizado':'Não foi possível validar a integração'}</strong>
          <p>{status==='unauthorized'?'Entre com uma conta administradora autorizada do Clube NPV.':
          'A verificação segura está indisponível. Nenhum dado foi carregado; tente atualizar mais tarde.'}</p></div>
      </div>:
      <div className="npv-hotmart-pending" role="status">
        <span className="npv-hotmart-pending-icon"><Clock3 size={22}/></span>
        <div><strong>{status==='loading'?'Verificando acesso seguro...':'Aguardando integração com a Hotmart'}</strong>
          <p>Nenhuma sincronização de assinaturas foi realizada. Os indicadores serão preenchidos apenas com dados oficiais, após a integração autorizada.</p></div>
      </div>
    }

    <div className="npv-hotmart-metrics" aria-label="Indicadores de assinaturas">
      {[
        {label:'Assinantes ativos',value:data.metrics?.active,Icon:Users},
        {label:'Vinculados ao Clube',value:data.metrics?.linked,Icon:CheckCircle2},
        {label:'Vínculos pendentes',value:data.metrics?.pending,Icon:Clock3},
        {label:'Renovações confirmadas',value:data.metrics?.renewed,Icon:CreditCard}
      ].map(({label,value,Icon})=><div className="npv-hotmart-metric" key={label}>
        <span className="npv-hotmart-metric-icon"><Icon size={18}/></span>
        <small>{label}</small><strong>{fmtMetric(value)}</strong>
        <span>{Number.isFinite(value)?'Dados sincronizados':'Aguardando dados'}</span>
      </div>)}
    </div>

    <div className="npv-hotmart-panel">
      <div className="npv-hotmart-panel-head">
        <div><h3>Assinaturas e renovações</h3><p>Pesquisa e filtros preparados para os registros oficiais da Hotmart.</p></div>
        <span className="npv-hotmart-sync"><Activity size={14}/>{data.synced_at?'Sincronizado em '+fmtDate(data.synced_at):'Ainda não sincronizado'}</span>
      </div>
      <div className="npv-hotmart-filters">
        <label className="npv-hotmart-search"><Search size={17}/><span className="sr-only">Pesquisar assinaturas</span>
          <input value={search} onChange={event=>setSearch(event.target.value)} placeholder="Pesquisar assinante, e-mail ou produto"/>
        </label>
        <label><span>Plano</span><select aria-label="Filtrar por plano" value={plan} onChange={event=>setPlan(event.target.value)}>
          <option value="todos">Todos os planos</option><option value="mensal">Mensal</option><option value="trimestral">Trimestral</option>
        </select></label>
        <label><span>Situação</span><select aria-label="Filtrar por situação" value={situation} onChange={event=>setSituation(event.target.value)}>
          <option value="todas">Todas as situações</option><option value="active">Ativa</option>
          <option value="pending">Pendente</option><option value="cancelled">Cancelada</option>
        </select></label>
      </div>
      <p className="npv-hotmart-swipe-hint">Deslize a tabela para os lados para ver todas as colunas.</p>
      <div className="npv-hotmart-table-wrap" role="region" tabIndex={0} aria-label="Tabela de assinaturas com rolagem horizontal">
        <table className="npv-hotmart-table">
          <thead><tr><th>Assinante / vínculo</th><th>Produto / plano</th><th>Situação</th>
            <th>Próxima cobrança</th><th>Último pagamento</th><th>Pontos</th></tr></thead>
          <tbody>{rows.length?rows.map(item=><tr key={item.id}>
            <td><strong>{item.subscriber_name||'—'}</strong><small>{item.link_status||'Vínculo pendente'}</small></td>
            <td>{item.product_name||'—'}<small>{item.plan_label||'—'}</small></td>
            <td>{item.status_label||'—'}</td><td>{fmtDate(item.next_charge_at)}</td>
            <td>{fmtDate(item.last_paid_at)}</td><td>{fmtMetric(item.points)}</td>
          </tr>):<tr><td colSpan="6" className="npv-hotmart-empty">
            <div><CreditCard size={26}/><strong>{status==='ready'&&data.status==='awaiting_integration'?'Aguardando integração com a Hotmart':'Nenhuma assinatura disponível'}</strong>
              <p>{search||plan!=='todos'||situation!=='todas'?'Nenhum registro encontrado para os filtros selecionados.':
              'A tabela será preenchida depois da primeira sincronização oficial, sem lançamentos fictícios.'}</p></div>
          </td></tr>}</tbody>
        </table>
      </div>
      <p className="npv-hotmart-footnote">Somente leitura nesta etapa. Nenhum pagamento, ponto ou vínculo é alterado por esta página.</p>
    </div>
  </section>
}
