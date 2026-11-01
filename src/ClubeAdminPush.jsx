import React,{useCallback,useEffect,useState} from 'react'
import {Bell,BellRing,CheckCircle2,Download,Gift,Instagram,RefreshCw,Send,ShieldCheck,Smartphone,Users} from 'lucide-react'
import './ClubeAdminPush.css'

const ZERO={registration:0,redemption:0,story:0}
const decodeKey=base64=>{
 const padded=(base64+'='.repeat((4-base64.length%4)%4)).replace(/-/g,'+').replace(/_/g,'/')
 return Uint8Array.from(atob(padded),ch=>ch.charCodeAt(0))
}
const installed=()=>window.matchMedia?.('(display-mode: standalone)')?.matches||window.navigator.standalone===true

export default function ClubeAdminPush({session,onNavigate}){
 const [status,setStatus]=useState(null)
 const [error,setError]=useState('')
 const [working,setWorking]=useState(false)
 const [enabled,setEnabled]=useState(false)
 const [notice,setNotice]=useState('')
 const supported=typeof window!=='undefined'&&'Notification' in window&&'serviceWorker' in navigator&&'PushManager' in window
 const token=session?.access_token
 const call=useCallback(async(method='GET',payload=null)=>{
   if(!token)throw Error('Entre novamente no administrativo.')
   const response=await fetch('/api/clube/admin-push',{
     method,headers:{Authorization:'Bearer '+token,...(payload?{'Content-Type':'application/json'}:{})},
     ...(payload?{body:JSON.stringify(payload)}:{}),
     credentials:'same-origin',cache:'no-store'
   })
   const body=await response.json().catch(()=>({}))
   if(!response.ok)throw Error(body.status==='push_not_configured'
     ?'Notificações ainda não configuradas no servidor.'
     :'Não foi possível consultar o serviço de notificações.')
   return body
 },[token])
 const refresh=useCallback(async()=>{
   try{
     const data=await call()
     setStatus(data)
     if(supported&&installed()){
       const sub=await navigator.serviceWorker.getRegistration('/')?.then(r=>r?.pushManager?.getSubscription()).catch(()=>null)
       setEnabled(Boolean(sub)&&Notification.permission==='granted')
     }
     const count=Object.values(data.counts||{}).reduce((n,v)=>n+(Number(v)||0),0)
     if(installed()&&'setAppBadge' in navigator&&Notification.permission==='granted')
       navigator.setAppBadge(count).catch(()=>{})
   }catch(err){setError(err.message)}
 },[call,supported])
 useEffect(()=>{
   // O manifest só aparece durante uma sessão de administrador.
   const link=document.createElement('link')
   link.rel='manifest';link.href='/clube-admin.webmanifest'
   link.dataset.npvAdminManifest='true'
   document.head.appendChild(link)
   if(supported)navigator.serviceWorker.register('/clube-push-sw.js',{scope:'/'}).catch(()=>{})
   refresh()
   const timer=setInterval(refresh,60000)
   return()=>{clearInterval(timer);link.remove()}
 },[supported,refresh])
 const activate=async()=>{
   setError('');setNotice('');setWorking(true)
   try{
     if(!supported)throw Error('Este navegador não oferece notificações Web Push.')
     if(!installed())throw Error('No iPhone, adicione o Clube à Tela de Início pelo Safari e abra pelo ícone NPV.')
     if(!status?.publicKey)throw Error('A chave pública ainda não está configurada.')
     // Permissão disparada diretamente pelo toque, exigência do iPhone.
     const permission=Notification.permission==='granted'?'granted':await Notification.requestPermission()
     if(permission!=='granted')throw Error('Permissão de notificações não autorizada. Confira os Ajustes do iPhone.')
     const registration=await navigator.serviceWorker.register('/clube-push-sw.js',{scope:'/'})
     const existing=await registration.pushManager.getSubscription()
     const subscription=existing||await registration.pushManager.subscribe({
       userVisibleOnly:true,applicationServerKey:decodeKey(status.publicKey)
     })
     await call('POST',{action:'subscribe',subscription:subscription.toJSON()})
     setEnabled(true)
     setNotice('Notificações ativadas! Use o botão de teste abaixo.')
     await refresh()
   }catch(err){setError(err.message)}
   finally{setWorking(false)}
 }
 const test=async()=>{
   setError('');setNotice('');setWorking(true)
   try{
     const result=await call('POST',{action:'test'})
     if(result.sent<1)throw Error('Não há aparelho ativo. Ative primeiro as notificações neste iPhone.')
     setNotice('Notificação de teste enviada. Confira a tela do iPhone.')
   }catch(err){setError(err.message)}
   finally{setWorking(false)}
 }
 const disable=async()=>{
   setError('');setNotice('');setWorking(true)
   try{
     const registration=await navigator.serviceWorker.getRegistration('/')
     const subscription=await registration?.pushManager.getSubscription()
     if(subscription){
       await call('POST',{action:'unsubscribe',endpoint:subscription.endpoint})
       await subscription.unsubscribe()
     }
     setEnabled(false);setNotice('Avisos desativados neste aparelho.')
     await refresh()
   }catch(err){setError(err.message)}
   finally{setWorking(false)}
 }
 const counts=status?.counts||ZERO
 const items=[
   {id:'registration',title:'Cadastros aguardando aprovação',tab:'alunos',Icon:Users},
   {id:'redemption',title:'Pedidos de resgate',tab:'recompensas',Icon:Gift},
   {id:'story',title:'Stories aguardando análise',tab:'conexoes',Icon:Instagram}
 ]
 const pending=items.reduce((total,item)=>total+(Number(counts[item.id])||0),0)
 return <section className="npv-admin-push" aria-labelledby="npv-push-heading">
   <div className="npv-admin-push-head">
     <span className="npv-admin-push-bell"><BellRing size={21}/>{pending>0&&<small>{Math.min(pending,99)}</small>}</span>
     <div><h2 id="npv-push-heading">Avisos do administrador</h2><p>Receba no celular apenas solicitações que precisam da sua decisão.</p></div>
     <button type="button" aria-label="Atualizar pendências" className="npv-push-refresh" onClick={refresh}><RefreshCw size={18}/></button>
   </div>
   <div className="npv-admin-push-pending">
     {items.map(({id,title,tab,Icon})=><button type="button" key={id} onClick={()=>onNavigate(tab)}>
       <Icon size={18}/><span>{title}</span><strong>{counts[id]===null?'—':Number(counts[id])||0}</strong>
     </button>)}
   </div>
   <div className="npv-admin-push-actions">
     <div className="npv-admin-push-state"><Smartphone size={16}/>
       <span>{enabled?'Avisos habilitados neste aparelho':installed()?'NPV instalado · avisos ainda desligados':'Adicione o NPV à Tela de Início para receber avisos'}</span>
     </div>
     <div className="npv-admin-push-buttons">
       {!enabled?<button type="button" disabled={working||!status?.configured} className="npv-push-primary" onClick={activate}><Bell size={16}/> Ativar notificações</button>
         :<button type="button" disabled={working} className="npv-push-outline" onClick={disable}>Desativar neste aparelho</button>}
       <button type="button" disabled={working||!enabled} className="npv-push-outline" onClick={test}><Send size={15}/> Enviar teste</button>
     </div>
   </div>
   {!installed()&&<p className="npv-admin-push-help"><Download size={15}/> No iPhone: Safari → Compartilhar → Adicionar à Tela de Início → abrir o NPV pelo ícone → Ativar notificações.</p>}
   {!status?.configured&&<p className="npv-admin-push-help">Configuração de envio ainda não habilitada. O sininho e as pendências já funcionam.</p>}
   {error&&<p role="alert" className="npv-push-error">{error}</p>}
   {notice&&<p role="status" className="npv-push-success"><CheckCircle2 size={15}/>{notice}</p>}
 </section>
}
