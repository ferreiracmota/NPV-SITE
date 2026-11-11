import React,{useCallback,useEffect,useState} from 'react'
import {AlertTriangle,CheckCircle2,Instagram,EyeOff} from 'lucide-react'
import {HIDDEN_MENTION_NOTICE} from '../clube/instagram/storyNotice.mjs'
import './ClubeInstagramStoryNotice.css'

// Aviso no topo da conta da aluna. Não depende de push pago nem de app externo.
// Consulta a sessão dela e atualiza a tela quando o administrador envia o aviso.
export default function ClubeInstagramStoryNotice({session,onOpenStories}){
  const [notices,setNotices]=useState([])
  const [busy,setBusy]=useState('')
  const [error,setError]=useState('')

  const load=useCallback(async()=>{
    if(!session?.access_token){setNotices([]);return}
    try{
      const response=await fetch('/api/instagram/activity',{
        cache:'no-store',headers:{Authorization:'Bearer '+session.access_token}
      })
      if(!response.ok)return
      const data=await response.json()
      setNotices(data.available&&Array.isArray(data.notices)?data.notices:[])
    }catch{
      // Falha de conexão não apaga um aviso que já estava visível.
    }
  },[session?.access_token])

  useEffect(()=>{
    load()
    const timer=window.setInterval(()=>{
      if(document.visibilityState==='visible')load()
    },30000)
    const refresh=()=>{if(document.visibilityState==='visible')load()}
    window.addEventListener('focus',refresh)
    document.addEventListener('visibilitychange',refresh)
    return()=>{
      window.clearInterval(timer)
      window.removeEventListener('focus',refresh)
      document.removeEventListener('visibilitychange',refresh)
    }
  },[load])

  async function acknowledge(eventId){
    if(busy||!session?.access_token)return
    setBusy(eventId);setError('')
    try{
      const response=await fetch('/api/instagram/activity',{
        method:'POST',cache:'no-store',
        headers:{Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},
        body:JSON.stringify({action:'acknowledge_notice',event_id:eventId})
      })
      if(!response.ok)throw new Error('Não foi possível confirmar a leitura.')
      setNotices(current=>current.filter(item=>item.event_id!==eventId))
    }catch{
      setError('Não foi possível confirmar agora. Tente novamente.')
    }finally{setBusy('')}
  }

  if(!notices.length)return null
  return <section className="npv-ig-story-alert" aria-label="Avisos sobre seus Stories" role="alert">
    {notices.map(item=><div className="npv-ig-story-alert-item" key={item.event_id}>
      <span className="npv-ig-story-alert-icon"><EyeOff size={21}/></span>
      <div className="npv-ig-story-alert-content">
        <small><AlertTriangle size={13}/> AVISO SOBRE SEU STORY</small>
        <h2>{HIDDEN_MENTION_NOTICE.title}</h2>
        <p>{HIDDEN_MENTION_NOTICE.message}</p>
        <div className="npv-ig-story-alert-actions">
          <button type="button" className="npv-ig-story-alert-confirm"
            disabled={Boolean(busy)} onClick={()=>acknowledge(item.event_id)}>
            <CheckCircle2 size={16}/>{busy===item.event_id?'Confirmando...':'Entendi'}
          </button>
          {onOpenStories&&<button type="button" className="npv-ig-story-alert-open"
            onClick={onOpenStories}><Instagram size={16}/> Ver meus Stories</button>}
        </div>
      </div>
    </div>)}
    {error&&<p className="npv-ig-story-alert-error" role="status">{error}</p>}
  </section>
}
