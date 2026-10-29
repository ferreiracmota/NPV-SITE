import React,{useEffect,useRef} from 'react'
import {Activity,Clock3,Gift,History,Instagram,Plus,Wallet,X} from 'lucide-react'
import './ClubeStudentAdminDetail.css'
const fmt=v=>Number(v||0).toLocaleString('pt-BR')
const fmtDate=v=>{
 if(!v)return '—'
 const d=new Date(v)
 return Number.isFinite(d.getTime())?d.toLocaleString('pt-BR',{
  timeZone:'America/Sao_Paulo',dateStyle:'short',timeStyle:'short'}):'—'
}
const statusStrings={
 instagram:{
  active:'Ativo',linked:'Vinculado',disconnected:'Não vinculado',unknown:'Não verificado'
 },
 strava:{
  active:'Ativo recentemente',linked:'Vinculado',disconnected:'Desconectado',
  unknown:'Aguardando verificação'
 }
}
export function StudentConnectionBadge({channel,connection,loading=false,unavailable=false}){
 const Icon=channel==='instagram'?Instagram:Activity
 const state=unavailable?'unavailable':loading?'loading':connection?.status||'unknown'
 const label=state==='loading'?'Consultando...':state==='unavailable'?'Indisponível':
  statusStrings[channel]?.[state]||'Não verificado'
 const info=channel==='strava'?
  state==='active'?'Autorização confirmada nos últimos 7 dias; pode ser revogada no Strava':
  state==='linked'?'Última confirmação há mais de 7 dias; verificar na conta da aluna':
  state==='unknown'?'Vínculos antigos no navegador só são reconhecidos após nova consulta da aluna':
  state==='disconnected'?'Desconexão registrada no Clube':'':
  state==='active'?'Vínculo confirmado por mensagem e integração Meta disponível':
  state==='linked'?'Vínculo confirmado; integração oficial indisponível ou sem confirmação atual':''
 return <span className={'npv-admin-connection npv-admin-connection-'+state} title={info}>
   <Icon size={13} aria-hidden="true"/><span>{channel==='instagram'?'Instagram':'Strava'}: {label}</span>
  </span>
}
const redemptionNames={pending:'Aguardando aprovação',approved:'Aprovado',rejected:'Recusado'}
export default function ClubeStudentAdminDetail({student,balance,reserved,events,redemptions,
 labelEvent,connection,connectionsLoading=false,connectionsUnavailable=false,onClose,onAddPoints}){
 const closeRef=useRef(null)
 useEffect(()=>{
   const previous=document.activeElement
   closeRef.current?.focus()
   const key=e=>{
     if(e.key==='Escape')onClose()
     if(e.key==='Tab'){
       const root=closeRef.current?.closest('[role="dialog"]')
       const focusables=Array.from(root?.querySelectorAll('button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])')||[])
       if(!focusables.length)return
       const first=focusables[0],last=focusables[focusables.length-1]
       if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}
       else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
     }
   }
   document.addEventListener('keydown',key)
   return ()=>{document.removeEventListener('keydown',key);previous?.focus?.()}
 },[onClose])
 const entries=[...(events||[])].sort((a,b)=>
   String(b.created_at||'').localeCompare(String(a.created_at||''))||String(b.id).localeCompare(String(a.id)))
 const requests=[...(redemptions||[])].sort((a,b)=>
   String(b.created_at||'').localeCompare(String(a.created_at||''))||String(b.id).localeCompare(String(a.id)))
 const available=Math.max(0,balance-reserved)
 return <div className="clube-modal-backdrop npv-student-detail-backdrop" onMouseDown={e=>{
   if(e.target===e.currentTarget)onClose()
  }}>
  <section className="npv-student-detail" role="dialog" aria-modal="true" aria-labelledby="npv-student-detail-title">
   <header className="npv-student-detail-header">
    <div><small>CLUBE NPV · FICHA DA ALUNA</small>
     <h2 id="npv-student-detail-title">{student.full_name||'Aluna'}</h2>
     <p>{student.email} · {student.approved?'Acesso aprovado':'Aguardando aprovação'}</p>
    </div>
    <button ref={closeRef} type="button" onClick={onClose} aria-label="Fechar ficha da aluna"><X size={19}/></button>
   </header>
   <div className="npv-student-detail-body">
    <div className="npv-student-detail-stats">
     <div><Wallet size={16}/><small>Saldo total</small><strong>{fmt(balance)} pts</strong></div>
     <div><Clock3 size={16}/><small>Reservados em pedidos</small><strong>{fmt(reserved)} pts</strong></div>
     <div><Gift size={16}/><small>Disponíveis para resgate</small><strong>{fmt(available)} pts</strong></div>
    </div>
    <div className="npv-student-detail-connections">
     <StudentConnectionBadge channel="instagram" connection={connection?.instagram}
       loading={connectionsLoading} unavailable={connectionsUnavailable}/>
     <StudentConnectionBadge channel="strava" connection={connection?.strava}
       loading={connectionsLoading} unavailable={connectionsUnavailable}/>
     {connection?.strava?.verified_at&&<small>Última confirmação Strava: {fmtDate(connection.strava.verified_at)}</small>}
    </div>
    <section className="npv-student-detail-section" aria-label="Extrato individual de pontos">
     <h3><History size={17}/> Extrato de pontos <span>{entries.length} movimentações</span></h3>
     {entries.length===0?<p className="npv-student-detail-empty">Nenhuma movimentação registrada para esta aluna.</p>:
     <div className="npv-student-detail-ledger">{entries.map(item=>
      <div key={item.id} className="npv-student-detail-ledger-row">
       <div><strong>{labelEvent(item.event_type)}</strong>
        {item.is_test&&<span className="npv-student-detail-test">Teste</span>}
        {item.note&&<p>{item.note}</p>}
        <small>{fmtDate(item.created_at)}</small>
       </div>
       <b className={item.points<0?'is-debit':''}>{item.points>0?'+':''}{fmt(item.points)} pts</b>
      </div>
     )}</div>}
    </section>
    <section className="npv-student-detail-section" aria-label="Histórico de resgates">
     <h3><Gift size={17}/> Histórico de resgates <span>{requests.length} pedidos</span></h3>
     {requests.length===0?<p className="npv-student-detail-empty">Nenhum pedido de resgate registrado.</p>:
     <div className="npv-student-detail-ledger">{requests.map(item=>
      <div key={item.id} className="npv-student-detail-ledger-row">
       <div><strong>{item.reward_name||'Recompensa'}</strong>
        {item.is_test&&<span className="npv-student-detail-test">Teste</span>}
        <p className={'npv-student-redemption-status npv-student-redemption-'+item.status}>
          {redemptionNames[item.status]||'Situação não identificada'}</p>
        <small>Solicitado em {fmtDate(item.created_at)}
         {item.resolved_at?' · Concluído em '+fmtDate(item.resolved_at):''}</small>
       </div>
       <b>{fmt(item.points)} pts</b>
      </div>
     )}</div>}
    </section>
   </div>
   <footer className="npv-student-detail-footer">
    <small>Informações consultadas no extrato oficial. Esta ficha não altera pontos nem solicita resgates.</small>
    {student.approved&&<button type="button" onClick={onAddPoints}><Plus size={15}/> Lançar pontos</button>}
   </footer>
  </section>
 </div>
}
