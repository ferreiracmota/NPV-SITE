import {useCallback,useEffect,useMemo,useState} from 'react'
import {ArrowDownRight,ArrowUpRight,Check,ChevronDown,ChevronUp,Clock3,
  Gift,History,Instagram,Plus,RefreshCw,Search,ShieldCheck} from 'lucide-react'
import {instagramAdminStatus,stravaAdminStatus} from '../clube/admin/studentConnectionStatus.mjs'
import './ClubeAdminStudents.css'

const fmt=n=>Number(n||0).toLocaleString('pt-BR')
const fmtDate=value=>{
 const d=new Date(value||'')
 return Number.isFinite(d.getTime())?d.toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'}):'—'
}
const redemptionLabels={pending:'Solicitado · aguardando',approved:'Aprovado',rejected:'Recusado'}
function ConnectionTag({type,status,verifiedAt}){
 const Icon=type==='instagram'?Instagram:ShieldCheck
 return <span className={'npv-admin-link-state is-'+status.key} title={verifiedAt&&status.key==='connected'?status.help+' · Última confirmação: '+fmtDate(verifiedAt):status.help}>
  <Icon size={14}/>
  <span><small>{type==='instagram'?'Instagram':'Strava'}</small><strong>{status.label}</strong></span>
  {verifiedAt&&status.key==='connected'&&<em>{fmtDate(verifiedAt)}</em>}
 </span>
}
export default function ClubeAdminStudents({
  session,students,events,requests,search,onSearch,balanceOf,ruleLabel,onAward,onApprove,busy
}){
 const [expandedId,setExpandedId]=useState(null)
 const [links,setLinks]=useState({status:'loading',instagram:[],strava:[]})
 const [refreshing,setRefreshing]=useState(false)
 const load=useCallback(async(signal)=>{
  if(!session?.access_token)return
  setRefreshing(true)
  try{
   const response=await fetch('/api/clube/admin-student-connections',{
    method:'GET',cache:'no-store',
    headers:{Authorization:'Bearer '+session.access_token},signal
   })
   if(!response.ok)throw new Error('unavailable')
   const info=await response.json()
   if(info?.status!=='ok'||!Array.isArray(info.instagram)||!Array.isArray(info.strava))
     throw new Error('invalid_data')
   if(!signal?.aborted)setLinks({status:'ready',instagram:info.instagram,strava:info.strava})
  }catch(e){
   if(e?.name!=='AbortError'&&!signal?.aborted)setLinks({status:'error',instagram:[],strava:[]})
  }finally{if(!signal?.aborted)setRefreshing(false)}
 },[session?.access_token])
 useEffect(()=>{
  if(!session?.access_token){setLinks({status:'error',instagram:[],strava:[]});return}
  const controller=new AbortController()
  void load(controller.signal)
  return()=>controller.abort()
 },[load,session?.access_token])
 const instagramByStudent=useMemo(()=>new Map(links.instagram.map(x=>[x.student_id,x])),[links.instagram])
 const stravaByStudent=useMemo(()=>new Map(links.strava.map(x=>[x.student_id,x])),[links.strava])
 const visible=students.filter(x=>`${x.full_name||''} ${x.email||''}`.toLocaleLowerCase('pt-BR')
  .includes((search||'').trim().toLocaleLowerCase('pt-BR')))
 const known=links.status==='ready'
 return <section className="npv-admin-students" aria-label="Alunos do Clube e histórico individual">
  <div className="npv-admin-students-tools">
   <label className="clube-search"><Search size={18}/>
    <input value={search} onChange={e=>onSearch(e.target.value)} placeholder="Buscar aluno ou e-mail"/>
   </label>
   <button className="npv-admin-students-refresh" type="button" onClick={()=>load()}
    disabled={refreshing}><RefreshCw size={15}/>{refreshing?'Conferindo...':'Atualizar vínculos'}</button>
  </div>
  {links.status==='error'&&<p className="npv-admin-students-warning" role="status">
    Não foi possível consultar as conexões. Pontos e extrato continuam disponíveis.
  </p>}
  <div className="npv-admin-students-list">
   {visible.length===0&&<p className="npv-admin-students-empty">Nenhum aluno encontrado.</p>}
   {visible.map(person=>{
    const open=expandedId===person.id
    const instagramRecord=instagramByStudent.get(person.id)
    const stravaRecord=stravaByStudent.get(person.id)
    const ig=instagramAdminStatus(instagramRecord,known)
    const strava=stravaAdminStatus(stravaRecord,known)
    const balance=balanceOf(person.id)
    const ownEvents=open?events.filter(e=>e.student_id===person.id)
      .sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)):[]
    const ownRequests=open?requests.filter(r=>r.student_id===person.id)
      .sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)):[]
    const reserved=ownRequests.filter(r=>r.status==='pending').reduce((s,r)=>s+Number(r.points||0),0)
    return <div className={'npv-admin-student-item'+(open?' is-open':'')} key={person.id}>
     <div className="npv-admin-student-heading">
      <button className="npv-admin-student-opener" type="button" onClick={()=>setExpandedId(open?null:person.id)}
       aria-expanded={open} aria-controls={'npv-admin-student-detail-'+person.id}>
       <span className="clube-avatar">{person.full_name?.charAt(0)||'A'}</span>
       <span className="npv-admin-student-identity"><strong>{person.full_name||person.email}</strong>
        <small>{person.email} · {person.approved?'Aprovado':'Aguardando aprovação'}</small>
        <span className="npv-admin-student-open-hint">{open?'Ocultar detalhes':'Ver extrato e resgates'}</span>
       </span>
       {open?<ChevronUp size={18}/>:<ChevronDown size={18}/>}
      </button>
      <div className="npv-admin-student-states">
       <ConnectionTag type="instagram" status={ig} verifiedAt={instagramRecord?.verified_at}/>
       <ConnectionTag type="strava" status={strava} verifiedAt={stravaRecord?.verified_at}/>
      </div>
      <strong className="npv-admin-student-total">{fmt(balance)} <small>pts</small></strong>
      {person.approved?
       <button className="clube-btn clube-btn-outline npv-admin-student-award" type="button"
        onClick={()=>onAward(person.id)}><Plus size={15}/> Pontos</button>:
       <button className="clube-btn clube-btn-primary npv-admin-student-award" type="button"
        disabled={busy} onClick={()=>onApprove(person.id)}><Check size={15}/> Aprovar</button>}
     </div>
     {open&&<div className="npv-admin-student-detail" id={'npv-admin-student-detail-'+person.id}>
      <div className="npv-admin-student-overview">
       <div><small>Saldo do extrato</small><strong>{fmt(balance)} pts</strong></div>
       <div><small>Reservado em pedidos</small><strong>{fmt(reserved)} pts</strong></div>
       <div><small>Disponível para resgatar</small><strong>{fmt(Math.max(0,balance-reserved))} pts</strong></div>
      </div>
      <div className="npv-admin-student-history-grid">
       <section className="npv-admin-student-history-col">
        <h3><History size={17}/> Movimentações de pontos <span>{ownEvents.length}</span></h3>
        {ownEvents.length===0&&<p className="npv-admin-student-no-rows">Ainda não existem lançamentos.</p>}
        {ownEvents.map(e=><div className="npv-admin-student-entry" key={e.id}>
         <span className={'npv-admin-entry-symbol'+(Number(e.points)<0?' is-debit':'')}>
          {Number(e.points)<0?<ArrowDownRight size={17}/>:<ArrowUpRight size={17}/>}
         </span>
         <div className="npv-admin-entry-description">
          <strong>{e.event_type==='resgate'?'Resgate de recompensa':ruleLabel(e.event_type)}</strong>
          <small>{fmtDate(e.created_at)}{e.is_test?' · TESTE':''}</small>
          {e.note&&<p>{e.note}</p>}
         </div>
         <b className={Number(e.points)<0?'is-debit':''}>{Number(e.points)>0?'+':''}{fmt(e.points)} pts</b>
        </div>)}
       </section>
       <section className="npv-admin-student-history-col">
        <h3><Gift size={17}/> Pedidos de resgate <span>{ownRequests.length}</span></h3>
        {ownRequests.length===0&&<p className="npv-admin-student-no-rows">Nenhuma solicitação de resgate.</p>}
        {ownRequests.map(r=><div className="npv-admin-student-entry" key={r.id}>
         <span className="npv-admin-entry-symbol is-gift"><Gift size={17}/></span>
         <div className="npv-admin-entry-description">
          <strong>{r.reward_name}</strong>
          <small>{fmtDate(r.created_at)} · {redemptionLabels[r.status]||r.status}{r.is_test?' · TESTE':''}</small>
          {r.resolved_at&&<small>Decisão: {fmtDate(r.resolved_at)}</small>}
         </div>
         <b>{fmt(r.points)} pts</b>
        </div>)}
       </section>
      </div>
      <p className="npv-admin-student-detail-note"><Clock3 size={13}/>
       O Instagram exibe vínculos confirmados. O Strava mostra a última conexão verificada, não monitoramento em tempo real.
       Os pedidos pendentes reservam pontos; resgates aprovados também aparecem como débito no extrato.
      </p>
     </div>}
    </div>
   })}
  </div>
 </section>
}
