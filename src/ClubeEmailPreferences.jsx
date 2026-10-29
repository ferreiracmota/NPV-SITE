import React,{useEffect,useState} from 'react'
import {Mail,Check} from 'lucide-react'
import {clubeSupabase as supabase} from './clubeSupabase.js'
import './ClubeEmailPreferences.css'
export default function ClubeEmailPreferences({studentId}){
  const [loaded,setLoaded]=useState(false)
  const [saving,setSaving]=useState(false)
  const [choices,setChoices]=useState({notify_unlocks:false,notify_new_rewards:false})
  const [notice,setNotice]=useState('')
  useEffect(()=>{
    if(!studentId||!supabase)return
    let live=true;setLoaded(false);setNotice('')
    supabase.from('clube_email_preferences').select('notify_unlocks,notify_new_rewards').eq('student_id',studentId).maybeSingle()
      .then(({data,error})=>{if(!live)return;if(error){setNotice('Os avisos estão indisponíveis no momento.');return}
        if(data)setChoices({notify_unlocks:!!data.notify_unlocks,notify_new_rewards:!!data.notify_new_rewards});setLoaded(true)})
      .catch(()=>{if(live)setNotice('Não foi possível carregar os avisos.')})
    return ()=>{live=false}
  },[studentId])
  async function save(){
    if(!loaded||!studentId||saving)return
    setSaving(true);setNotice('')
    try{
      const {error}=await supabase.from('clube_email_preferences').upsert({
        student_id:studentId,...choices,updated_at:new Date().toISOString()
      },{onConflict:'student_id'})
      if(error)throw error
      setNotice('Suas preferências de e-mail foram salvas.')
    }catch{setNotice('Não foi possível salvar. Tente novamente.')}
    finally{setSaving(false)}
  }
  return <section className="npv-email-prefs" aria-label="Avisos por e-mail do Clube">
    <div className="npv-email-prefs-head"><Mail size={20}/><div><strong>Avisos do Clube por e-mail</strong><p>Você escolhe quais novidades quer receber. Pode desativar quando quiser.</p></div></div>
    <label><input type="checkbox" disabled={!loaded||saving} checked={choices.notify_unlocks} onChange={e=>setChoices(v=>({...v,notify_unlocks:e.target.checked}))}/><span>Quando eu atingir pontos suficientes para resgatar um prêmio</span></label>
    <label><input type="checkbox" disabled={!loaded||saving} checked={choices.notify_new_rewards} onChange={e=>setChoices(v=>({...v,notify_new_rewards:e.target.checked}))}/><span>Quando um novo prêmio estiver disponível na lojinha</span></label>
    <div className="npv-email-prefs-foot"><small>Os avisos são opcionais e não alteram seus pontos.</small><button type="button" disabled={!loaded||saving} onClick={save}><Check size={15}/>{saving?'Salvando...':'Salvar preferências'}</button></div>
    {notice&&<p role="status" className="npv-email-prefs-notice">{notice}</p>}
  </section>
}
