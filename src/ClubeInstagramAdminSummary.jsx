import React,{useCallback,useEffect,useState} from 'react'
import {ArrowUpRight,Gift,Instagram,RefreshCw,Users} from 'lucide-react'

export default function ClubeInstagramAdminSummary({
  session,pendingRedemptions=0,pendingRegistrations=0,onNavigate
}){
  const [stories,setStories]=useState(null)
  const [loading,setLoading]=useState(false)
  const refresh=useCallback(async()=>{
    if(!session?.access_token)return
    setLoading(true)
    try{
      const response=await fetch('/api/instagram/admin',{
        cache:'no-store',headers:{Authorization:'Bearer '+session.access_token}
      })
      const result=await response.json()
      setStories(response.ok&&result?.available?result:null)
    }catch{setStories(null)}
    finally{setLoading(false)}
  },[session?.access_token])
  useEffect(()=>{refresh()},[refresh])
  return <section className="npv-admin-workspace" aria-label="Central de pendências do Clube">
    <div className="npv-admin-workspace-header">
      <div><span className="npv-admin-workspace-kicker">GESTÃO DO DIA A DIA</span>
        <h2>Central de pendências</h2>
        <p>As decisões que precisam da sua atenção, reunidas em um só lugar.</p>
      </div>
      <button type="button" className="npv-admin-refresh" onClick={refresh} disabled={loading}>
        <RefreshCw size={15} className={loading?'npv-admin-spin':''}/> {loading?'Atualizando...':'Atualizar'}
      </button>
    </div>
    <div className="npv-admin-workspace-grid">
      <button type="button" onClick={()=>onNavigate('recompensas')} className="npv-admin-task">
        <span className="npv-admin-task-icon"><Gift size={20}/></span>
        <span className="npv-admin-task-data">
          <small>RESGATES</small><strong>{pendingRedemptions}</strong>
          <span>{pendingRedemptions===1?'Pedido aguardando aprovação':'Pedidos aguardando aprovação'}</span>
        </span><ArrowUpRight size={17} className="npv-admin-task-arrow"/>
      </button>
      <button type="button" onClick={()=>onNavigate('alunos')} className="npv-admin-task">
        <span className="npv-admin-task-icon"><Users size={20}/></span>
        <span className="npv-admin-task-data">
          <small>CADASTROS</small><strong>{pendingRegistrations}</strong>
          <span>Alunos para liberar acesso</span>
        </span><ArrowUpRight size={17} className="npv-admin-task-arrow"/>
      </button>
      <button type="button" onClick={()=>onNavigate('instagram')} className="npv-admin-task">
        <span className="npv-admin-task-icon"><Instagram size={20}/></span>
        <span className="npv-admin-task-data">
          <small>STORIES</small><strong>{stories?.pending_events??'—'}</strong>
          <span>{stories?.pending_events===1?'Menção para conferir':'Menções para conferir'}</span>
        </span><ArrowUpRight size={17} className="npv-admin-task-arrow"/>
      </button>
    </div>
    <p className="npv-admin-workspace-footnote">
      Aprovações de Stories são manuais. Nenhum ponto é lançado apenas por receber uma menção.
    </p>
  </section>
}
