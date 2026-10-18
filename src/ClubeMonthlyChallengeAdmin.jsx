import React, {useEffect,useState} from 'react'
import {Flag,Save,CheckCircle2} from 'lucide-react'
import {clubeSupabase as supabase} from './clubeSupabase.js'
import {currentNpvMonth} from '../clube/strava/challengeProgress.mjs'
import './ClubeMonthlyChallengeAdmin.css'

export default function ClubeMonthlyChallengeAdmin(){
  const monthKey=currentNpvMonth()
  const [goal,setGoal]=useState('')
  const [active,setActive]=useState(true)
  const [loading,setLoading]=useState(true)
  const [saving,setSaving]=useState(false)
  const [feedback,setFeedback]=useState('')
  useEffect(()=>{
    let live=true
    supabase.from('clube_monthly_challenges').select('goal_km,active').eq('month_key',monthKey).maybeSingle()
      .then(({data,error})=>{
        if(!live)return
        if(error)setFeedback('Não foi possível consultar a meta do mês.')
        else if(data){setGoal(String(data.goal_km));setActive(Boolean(data.active))}
      })
      .catch(()=>{if(live)setFeedback('Erro ao consultar o desafio.')})
      .finally(()=>{if(live)setLoading(false)})
    return()=>{live=false}
  },[monthKey])
  async function submit(e){
    e.preventDefault()
    const amount=Number(goal)
    if(saving||loading||goal.trim()===''||!Number.isFinite(amount)||amount<=0||amount>10000)return
    setSaving(true);setFeedback('')
    try{
      const {error}=await supabase.from('clube_monthly_challenges')
        .upsert({month_key:monthKey,goal_km:amount,active,updated_at:new Date().toISOString()},{onConflict:'month_key'})
      if(error)throw error
      setFeedback('Meta do mês salva. A barra dos alunos conectados passa a usar esta meta, sem lançar pontos.')
    }catch{
      setFeedback('Não foi possível salvar a meta. Confira a conta de administrador.')
    }finally{setSaving(false)}
  }
  return <section className="npv-challenge-admin" aria-labelledby="npv-challenge-admin-title">
    <div className="npv-challenge-admin-heading"><Flag size={21}/>
      <div><strong id="npv-challenge-admin-title">Desafio do mês</strong>
        <small>Defina quantos quilômetros os alunos precisam atingir no mês. Nenhum ponto será lançado automaticamente.</small>
      </div>
    </div>
    <form onSubmit={submit} className="npv-challenge-admin-form">
      <label><span>Meta de {monthKey}</span><span className="npv-challenge-input-row"><input inputMode="decimal" type="number" min="0.1" max="10000" step="0.1" placeholder="Ex.: 50" value={goal} disabled={loading||saving} onChange={e=>setGoal(e.target.value)}/> <b>km</b></span></label>
      <label className="npv-challenge-admin-check"><input type="checkbox" checked={active} disabled={loading||saving} onChange={e=>setActive(e.target.checked)}/> Desafio ativo</label>
      <button type="submit" disabled={loading||saving||goal.trim()===''||!Number.isFinite(Number(goal))||Number(goal)<=0||Number(goal)>10000}><Save size={16}/>{saving?'Salvando...':'Salvar meta'}</button>
    </form>
    {feedback&&<p className="npv-challenge-admin-feedback" role="status"><CheckCircle2 size={14}/>{feedback}</p>}
  </section>
}
