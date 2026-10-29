import React,{useCallback,useEffect,useMemo,useState} from 'react'
import {ArrowRight,Check,ChevronDown,ChevronUp,Gift,History,Instagram,Plus,RefreshCw,Footprints} from 'lucide-react'
import './ClubeAdminStudents.css'

const fmt=n=>Number(n||0).toLocaleString('pt-BR')
const when=d=>{if(!d)return 'Sem data';const x=new Date(d)
 return Number.isFinite(x.getTime())?x.toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'}):'Sem data'}
const STRAVA_RECENCY_MS=7*24*60*60*1000
export function connectionDisplay(kind,row,checkedAt=Date.now()){
 if(!row)return kind==='strava'
  ?{label:'Sem verificação',tone:'neutral',help:'A conexão usa o navegador da aluna; aguarda uma verificação real no Clube.'}
  :{label:'Não vinculado',tone:'neutral',help:'Nenhum vínculo confirmado pelo Clube.'}
 if(kind==='instagram')return {
  label:'Vinculado',tone:'ok',
  help:'Vínculo de identidade confirmado em '+when(row.verified_at)+'. Não é uma consulta ao Instagram em tempo real.'
 }
 if(!row.connected)return {label:'Desconectado',tone:'off',help:'Desconexão registrada em '+when(row.verified_at)+'.'}
 const time=Date.parse(row.verified_at||'')
 if(!Number.isFinite(time)||checkedAt-time>STRAVA_RECENCY_MS||checkedAt<time-300000)
  return {label:'Verificação antiga',tone:'neutral',help:'Última conexão confirmada em '+when(row.verified_at)+'. Aguarda nova consulta da aluna.'}
 return {label:'Ativo na última verificação',tone:'ok',help:'Conexão confirmada em '+when(row.verified_at)+'. O status pode mudar até a próxima consulta.'}
}
const redemptionStatus=s=>s==='pending'?'Aguardando aprovação':s==='approved'?'Aprovado':s==='rejected'?'Recusado':'Situação desconhecida'

export default function ClubeAdminStudents({session,members=[],events=[],redemptions=[],rules=[],busy,onAward,onApprove,onRefresh}){
 const [opened,setOpened]=useState(null)
 const [links,setLinks]=useState({status:'loading',instagram:new Map(),strava:new Map()})
 const [reload,setReload]=useState(0)
 const token=session?.access_token
 useEffect(()=>{
  if(!token){setLinks({status:'loading',instagram:new Map(),strava:new Map()});return}
  const controller=new AbortController()
  setLinks(v=>({...v,status:'loading'}))
  fetch('/api/clube/student-connections',{
   headers:{Authorization:'Bearer '+token},cache:'no-store',signal:controller.signal
  }).then(async res=>{
   if(!res.ok)throw new Error('unavailable')
   const body=await res.json()
   if(body.status!=='ok'||!Array.isArray(body.instagram)||!Array.isArray(body.strava))throw new Error('invalid_response')
   if(controller.signal.aborted)return
   setLinks({
    status:'ready',
    instagram:new Map(body.instagram.map(v=>[v.student_id,v])),
    strava:new Map(body.strava.map(v=>[v.student_id,v]))
   })
  }).catch(()=>{if(!controller.signal.aborted)setLinks({status:'error',instagram:new Map(),strava:new Map()})})
  return ()=>controller.abort()
 },[token,reload])

 const byMember=useMemo(()=>{
  const m=new Map()
  for(const person of members)m.set(person.id,{events:[],requests:[],balance:0,reserved:0})
  for(const event of events){
   const item=m.get(event.student_id)
   if(item){item.events.push(event);item.balance+=Number(event.points)||0}
  }
  for(const req of redemptions){
   const item=m.get(req.student_id)
   if(item){
    item.requests.push(req)
    if(req.status==='pending')item.reserved+=Number(req.points)||0
   }
  }
  for(const entry of m.values()){
   entry.events.sort((a,b)=>String(b.created_at||'').localeCompare(String(a.created_at||''))||String(b.id||'').localeCompare(String(a.id||'')))
   entry.requests.sort((a,b)=>String(b.created_at||'').localeCompare(String(a.created_at||'')))
  }
  return m
 },[members,events,redemptions])
 const ruleLabel=type=>rules.find(x=>x.event_type===type)?.label||({
  renovacao:'Renovação',indicacao:'Indicação',foto:'Foto',desafio:'Desafio',
  aniversario:'Aniversário',ajuste:'Ajuste administrativo',resgate:'Resgate'
 })[type]||'Atividade registrada'
 function badge(kind,row){
  if(links.status!=='ready')return <span className="npv-admin-students-tag" title={links.status==='error'?'Consulta de vínculos indisponível':'Consultando vínculos'}>
   {kind==='strava'?<Footprints size={13}/>:<Instagram size={13}/>} {links.status==='error'?'Indisponível':'Consultando...'}
  </span>
  const display=connectionDisplay(kind,row)
  return <span className={'npv-admin-students-tag npv-admin-students-tag-'+display.tone} title={display.help}>
   {kind==='strava'?<Footprints size={13}/>:<Instagram size={13}/>} {display.label}
  </span>
 }
 return <section className="npv-admin-students" aria-label="Alunas e vínculos no Clube">
  <div className="npv-admin-students-meta">
   <span>Toque em uma aluna para ver o extrato, resgates e detalhes dos vínculos.</span>
   <button type="button" onClick={()=>{setReload(n=>n+1);onRefresh?.()}} title="Atualizar dados e conexões">
    <RefreshCw size={15}/> Atualizar
   </button>
  </div>
  {members.length===0&&<p className="clube-empty">Nenhuma aluna encontrada.</p>}
  {members.map(person=>{
   const record=byMember.get(person.id)||{events:[],requests:[],balance:0,reserved:0}
   const expanded=opened===person.id
   const instagram=links.instagram.get(person.id)
   const strava=links.strava.get(person.id)
   return <div className={'npv-admin-students-item'+(expanded?' is-expanded':'')} key={person.id}>
    <div className="npv-admin-students-row">
     <button type="button" className="npv-admin-students-open" onClick={()=>setOpened(expanded?null:person.id)}
      aria-expanded={expanded} aria-controls={'npv-student-details-'+person.id}
      aria-label={(expanded?'Fechar':'Abrir')+' ficha de '+(person.full_name||person.email)}>
      <span className="clube-avatar" aria-hidden="true">{(person.full_name||person.email||'A').charAt(0)}</span>
      <span className="npv-admin-students-identity">
       <strong>{person.full_name||person.email}</strong>
       <small>{person.email} · {person.approved?'Aprovado':'Aguardando aprovação'}</small>
       <span className="npv-admin-students-tags">
        {badge('instagram',instagram)}{badge('strava',strava)}
       </span>
      </span>
      <span className="npv-admin-students-points"><b>{fmt(record.balance)} pts</b><small>Saldo atual</small></span>
      {expanded?<ChevronUp size={19}/>:<ChevronDown size={19}/>}
     </button>
     <div className="npv-admin-students-actions">
      {person.approved?<button className="clube-btn clube-btn-outline" type="button" onClick={()=>onAward?.(person.id)}><Plus size={15}/> Pontos</button>
       :<button className="clube-btn clube-btn-primary" type="button" disabled={busy} onClick={()=>onApprove?.(person.id)}><Check size={15}/> Aprovar</button>}
     </div>
    </div>
    {expanded&&<div className="npv-admin-students-detail" id={'npv-student-details-'+person.id}>
     <div className="npv-admin-students-metrics">
      <div><small>Saldo no extrato</small><strong>{fmt(record.balance)} pts</strong></div>
      <div><small>Reservados em pedidos</small><strong>{fmt(record.reserved)} pts</strong></div>
      <div><small>Disponíveis para resgate</small><strong>{fmt(Math.max(0,record.balance-record.reserved))} pts</strong></div>
     </div>
     <div className="npv-admin-students-connection-details">
      <p><Instagram size={16}/> <b>Instagram:</b> {links.status==='ready'?connectionDisplay('instagram',instagram).help:'Aguardando consulta administrativa dos vínculos.'}</p>
      <p><Footprints size={16}/> <b>Strava:</b> {links.status==='ready'?connectionDisplay('strava',strava).help:'Aguardando consulta administrativa dos vínculos.'}</p>
     </div>
     <div className="npv-admin-students-history-grid">
      <section>
       <h3><History size={17}/> Extrato de pontos</h3>
       {record.events.length===0&&<p className="npv-admin-students-empty">Nenhuma movimentação registrada.</p>}
       {record.events.map(item=><div className="npv-admin-students-history-row" key={item.id}>
        <div><strong>{ruleLabel(item.event_type)}</strong><small>{when(item.created_at)}</small>
         {item.note&&<p>{item.note}</p>}</div>
        <b className={item.points<0?'is-negative':'is-positive'}>{item.points>0?'+':''}{fmt(item.points)} pts</b>
       </div>)}
      </section>
      <section>
       <h3><Gift size={17}/> Solicitações e resgates</h3>
       {record.requests.length===0&&<p className="npv-admin-students-empty">Nenhum resgate ou solicitação.</p>}
       {record.requests.map(item=><div className="npv-admin-students-history-row" key={item.id}>
        <div><strong>{item.reward_name}</strong><small>{when(item.created_at)} · {redemptionStatus(item.status)}{item.is_test?' · TESTE':''}</small>
         {item.resolved_at&&<small>Decisão: {when(item.resolved_at)}</small>}</div>
        <b>{fmt(item.points)} pts</b>
       </div>)}
      </section>
     </div>
     <p className="npv-admin-students-footnote">Pedidos pendentes reservam pontos; resgates aprovados já aparecem como desconto no extrato. As informações de conexão são verificações registradas, não acesso às contas externas.</p>
    </div>}
   </div>
  })}
 </section>
}
