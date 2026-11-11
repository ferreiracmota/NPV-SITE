import React,{useCallback,useEffect,useState} from 'react'
import {AlertTriangle} from 'lucide-react'
import {clubeSupabase as supabase} from './clubeSupabase.js'
import {HIDDEN_MENTION_NOTICE,isNoticePending} from '../clube/instagram/storyNotice.mjs'
import './ClubeStoryNoticeBanner.css'

const formatDate=value=>{
  const d=new Date(value||'')
  return Number.isNaN(d.getTime())?'':d.toLocaleDateString('pt-BR',{day:'2-digit',month:'short'})
}

// Aviso global: aparece logo ao entrar no Clube, independentemente da aba.
// Nunca busca dados de outra aluna e só oculta após confirmação do servidor.
export default function ClubeStoryNoticeBanner({session}){
  const [notices,setNotices]=useState([])
  const [busy,setBusy]=useState('')
  const [error,setError]=useState('')

  const request=useCallback(async(method='GET',payload=null)=>{
    if(!session?.access_token)throw new Error('Entre no Clube novamente para consultar seus avisos.')
    const send=async token=>{
      const response=await fetch('/api/instagram/activity',{
        method,cache:'no-store',
        headers:{
          Authorization:'Bearer '+token,
          ...(payload?{'Content-Type':'application/json'}:{})
        },
        ...(payload?{body:JSON.stringify(payload)}:{})
      })
      return {response,body:await response.json().catch(()=>({}))}
    }
    let result=await send(session.access_token)
    if(result.response.status===401&&result.body.status==='club_login_required'){
      try{
        const refreshed=await supabase.auth.refreshSession()
        const newToken=refreshed.data?.session?.access_token
        if(!refreshed.error&&newToken&&newToken!==session.access_token)
          result=await send(newToken)
      }catch{}
    }
    if(!result.response.ok)
      throw new Error(result.body.message||'Não foi possível consultar os avisos do Clube.')
    return result.body
  },[session?.access_token])

  const load=useCallback(async()=>{
    try{
      const result=await request()
      if(result.available===true)
        setNotices(Array.isArray(result.notices)?result.notices.filter(isNoticePending):[])
      else setNotices([])
    }catch{
      // Não apresentar dados antigos em caso de troca de login ou sessão inválida.
      setNotices([])
    }
  },[request])

  useEffect(()=>{
    if(!session?.access_token){setNotices([]);return}
    load()
    const check=()=>{if(document.visibilityState==='visible')load()}
    const timer=window.setInterval(check,30000)
    window.addEventListener('focus',check)
    document.addEventListener('visibilitychange',check)
    return()=>{
      window.clearInterval(timer)
      window.removeEventListener('focus',check)
      document.removeEventListener('visibilitychange',check)
    }
  },[session?.access_token,load])

  async function acknowledge(eventId){
    if(busy||!eventId)return
    setBusy(eventId);setError('')
    try{
      const result=await request('POST',{
        action:'acknowledge_hidden_mention',event_id:eventId
      })
      if(!['acknowledged','already_acknowledged'].includes(result.status))
        throw new Error('Não foi possível confirmar a leitura do aviso.')
      setNotices(items=>items.filter(item=>item.event_id!==eventId))
    }catch(e){setError(e?.message||'Não foi possível confirmar a leitura. Tente novamente.')}
    finally{setBusy('')}
  }

  if(!notices.length)return null

  return <section className="npv-global-story-notices" aria-label="Avisos importantes do Clube">
    {notices.map(item=><article className="npv-global-story-notice" role="alert" key={item.event_id}>
      <span className="npv-global-story-notice-icon"><AlertTriangle size={22}/></span>
      <div className="npv-global-story-notice-copy">
        <strong>{HIDDEN_MENTION_NOTICE.title}</strong>
        <p>{HIDDEN_MENTION_NOTICE.message}</p>
        <small>Sobre um Story recebido{formatDate(item.sent_at)?' em '+formatDate(item.sent_at):''}. Nenhum ponto foi descontado.</small>
      </div>
      <button type="button" onClick={()=>acknowledge(item.event_id)} disabled={Boolean(busy)}>
        {busy===item.event_id?'Confirmando...':HIDDEN_MENTION_NOTICE.action}
      </button>
    </article>)}
    {error&&<p className="npv-global-story-notice-error" role="alert">{error}</p>}
  </section>
}
