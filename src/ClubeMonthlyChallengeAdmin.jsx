import React, {useEffect,useState} from 'react'
import {Flag,Save,CheckCircle2,Plus} from 'lucide-react'
import {clubeSupabase as supabase} from './clubeSupabase.js'
import {currentNpvMonth} from '../clube/strava/challengeProgress.mjs'
import './ClubeMonthlyChallengeAdmin.css'

const newChallenge=()=>({
  id:crypto.randomUUID(), name:'', goal_km:'50', reward_points:'300', active:true
})
const toDraft=row=>({
  ...row, name:String(row.name||''), goal_km:String(row.goal_km),
  reward_points:String(row.reward_points)
})

export default function ClubeMonthlyChallengeAdmin(){
  const monthKey=currentNpvMonth()
  const [items,setItems]=useState([])
  const [loading,setLoading]=useState(true)
  const [saving,setSaving]=useState(false)
  const [feedback,setFeedback]=useState('')
  const [error,setError]=useState('')
  useEffect(()=>{
    let live=true
    setLoading(true);setError('');setFeedback('')
    supabase.from('clube_monthly_challenges')
      .select('id,name,goal_km,active,reward_points,position')
      .eq('month_key',monthKey).order('position',{ascending:true})
      .then(({data,error:dbError})=>{
        if(!live)return
        if(dbError)throw dbError
        setItems((data||[]).map(toDraft))
      })
      .catch(()=>{if(live)setError('Não foi possível consultar os desafios do mês.')})
      .finally(()=>{if(live)setLoading(false)})
    return()=>{live=false}
  },[monthKey])
  function edit(id,field,value){
    setFeedback('');setError('')
    setItems(previous=>previous.map(item=>item.id===id?{...item,[field]:value}:item))
  }
  async function submit(event){
    event.preventDefault()
    if(loading||saving||!items.length)return
    const names=items.map(item=>item.name.trim())
    if(names.some(name=>name.length<2||name.length>75)){
      setError('Dê a cada desafio um nome de 2 a 75 caracteres.');return
    }
    if(new Set(names.map(name=>name.toLocaleLowerCase('pt-BR'))).size!==names.length){
      setError('Os desafios de um mesmo mês precisam ter nomes diferentes.');return
    }
    const payload=items.map((item,index)=>({
      id:item.id,month_key:monthKey,name:names[index],
      goal_km:Number(item.goal_km),reward_points:Number(item.reward_points),
      active:item.active,position:index+1,updated_at:new Date().toISOString()
    }))
    if(payload.some(item=>!Number.isFinite(item.goal_km)||item.goal_km<=0||item.goal_km>10000
      ||!Number.isInteger(item.reward_points)||item.reward_points<1||item.reward_points>100000)){
      setError('Confira as metas (acima de 0 e até 10.000 km) e as recompensas (1 a 100.000 pontos).');return
    }
    setSaving(true);setError('');setFeedback('')
    try{
      const {data,error:dbError}=await supabase.from('clube_monthly_challenges')
        .upsert(payload,{onConflict:'id'})
        .select('id,name,goal_km,active,reward_points,position')
      if(dbError)throw dbError
      setItems((data||[]).sort((a,b)=>a.position-b.position).map(toDraft))
      setFeedback('Desafios salvos! O histórico foi mantido e nenhum ponto foi lançado automaticamente.')
    }catch{
      setError('Não foi possível salvar os desafios. Confira sua permissão de administrador e tente novamente.')
    }finally{setSaving(false)}
  }
  return <section className="npv-challenge-admin" aria-labelledby="npv-challenge-admin-title">
    <div className="npv-challenge-admin-heading"><Flag size={21}/>
      <div><strong id="npv-challenge-admin-title">Desafios do mês</strong>
        <small>Crie, renomeie ou ajuste desafios de {monthKey}. Cada desafio tem nome, meta e recompensa próprios. O crédito de pontos não é automático.</small>
      </div>
    </div>
    <form onSubmit={submit} className="npv-challenge-admin-form">
      <div className="npv-challenge-admin-list">
        {items.map((item,index)=><div className="npv-challenge-admin-item" key={item.id}>
          <div className="npv-challenge-admin-item-head"><strong>Desafio {index+1}</strong><span>{item.active?'Ativo':'Inativo'}</span></div>
          <label className="npv-challenge-name"><span>Nome do desafio</span>
            <input required minLength={2} maxLength={75} placeholder="Ex.: Desafio 50 km" value={item.name}
              disabled={loading||saving} onChange={e=>edit(item.id,'name',e.target.value)}/></label>
          <div className="npv-challenge-admin-fields">
            <label><span>Meta de distância</span><span className="npv-challenge-input-row">
              <input inputMode="decimal" type="number" min="0.1" max="10000" step="0.01" placeholder="Ex.: 50" value={item.goal_km}
                disabled={loading||saving} onChange={e=>edit(item.id,'goal_km',e.target.value)}/><b>km</b></span></label>
            <label><span>Recompensa ao completar</span><span className="npv-challenge-input-row">
              <input inputMode="numeric" type="number" min="1" max="100000" step="1" value={item.reward_points}
                disabled={loading||saving} onChange={e=>edit(item.id,'reward_points',e.target.value)}/><b>pts</b></span></label>
            <label className="npv-challenge-admin-check"><input type="checkbox" checked={item.active}
              disabled={loading||saving} onChange={e=>edit(item.id,'active',e.target.checked)}/> Desafio ativo</label>
          </div>
        </div>)}
        {!items.length&&!loading&&<p className="npv-challenge-admin-empty">Nenhum desafio cadastrado para este mês. Crie o primeiro abaixo.</p>}
      </div>
      <div className="npv-challenge-admin-actions">
        <button type="button" className="npv-challenge-add" disabled={loading||saving||items.length>=25}
          onClick={()=>{setItems(current=>[...current,newChallenge()]);setError('');setFeedback('')}}><Plus size={16}/> Adicionar desafio</button>
        <button type="submit" disabled={loading||saving||!items.length}><Save size={16}/>{saving?'Salvando...':'Salvar desafios'}</button>
      </div>
    </form>
    {error&&<p className="npv-challenge-admin-error" role="alert">{error}</p>}
    {feedback&&<p className="npv-challenge-admin-feedback" role="status"><CheckCircle2 size={14}/>{feedback}</p>}
  </section>
}
