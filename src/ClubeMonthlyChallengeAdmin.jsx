import React, {useEffect,useState} from 'react'
import {Flag,Save,CheckCircle2,Plus,Trash2,ImagePlus} from 'lucide-react'
import {clubeSupabase as supabase} from './clubeSupabase.js'
import {currentNpvMonth,nextNpvMonth} from '../clube/strava/challengeProgress.mjs'
import ClubeImageFrameEditor from './ClubeImageFrameEditor.jsx'
import {DEFAULT_IMAGE_FRAME,imageFrameFromRow,imageFramePayload} from '../clube/image/framing.mjs'
import './ClubeMonthlyChallengeAdmin.css'

const newChallenge=()=>({
  id:crypto.randomUUID(), name:'', goal_km:'50', reward_points:'300', active:true, saved:false
})
const toDraft=row=>({
  ...row, saved:true, name:String(row.name||''), goal_km:String(row.goal_km),
  reward_points:String(row.reward_points)
})

const COVER_BUCKET='clube-npv-desafios'
const COVER_EXTENSIONS={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}
const coverUrl=path=>/^images\/[a-f0-9-]{36}\.(?:jpg|png|webp)$/.test(path||'')
  ?supabase.storage.from(COVER_BUCKET).getPublicUrl(path).data.publicUrl:''
const monthLabel=key=>new Date(key+'-01T12:00:00Z')
  .toLocaleDateString('pt-BR',{month:'long',year:'numeric',timeZone:'UTC'})

export default function ClubeMonthlyChallengeAdmin(){
  const [monthKey,setMonthKey]=useState(currentNpvMonth)
  const currentMonth=currentNpvMonth()
  const nextMonth=nextNpvMonth()
  const [items,setItems]=useState([])
  const [loading,setLoading]=useState(true)
  const [saving,setSaving]=useState(false)
  const [deletingId,setDeletingId]=useState(null)
  const [feedback,setFeedback]=useState('')
  const [error,setError]=useState('')
  const [coverFile,setCoverFile]=useState(null)
  const [coverPreviewUrl,setCoverPreviewUrl]=useState('')
  const [coverSaving,setCoverSaving]=useState(false)
  const [coverFrame,setCoverFrame]=useState(DEFAULT_IMAGE_FRAME)
  const coverDisplayUrl=coverPreviewUrl||coverUrl(items[0]?.cover_path)
  useEffect(()=>{
    if(!coverFile){setCoverPreviewUrl('');return}
    const url=URL.createObjectURL(coverFile)
    setCoverPreviewUrl(url)
    return()=>URL.revokeObjectURL(url)
  },[coverFile])
  useEffect(()=>{
    let live=true
    setLoading(true);setError('');setFeedback('');setCoverFile(null);setCoverFrame(DEFAULT_IMAGE_FRAME)
    supabase.rpc('clube_ensure_challenge_month',{p_month_key:monthKey})
      .then(({error:ensureError})=>{
        if(ensureError)throw ensureError
        return supabase.from('clube_monthly_challenges')
          .select('id,name,goal_km,active,reward_points,position,cover_path,cover_position_x,cover_position_y,cover_zoom')
          .eq('month_key',monthKey).order('position',{ascending:true})
      })
      .then(({data,error:dbError})=>{
        if(!live)return
        if(dbError)throw dbError
        setItems((data||[]).map(toDraft))
        setCoverFrame(imageFrameFromRow(data?.[0],'cover'))
      })
      .catch(()=>{if(live)setError('Não foi possível consultar os desafios do mês.')})
      .finally(()=>{if(live)setLoading(false)})
    return()=>{live=false}
  },[monthKey])
  function edit(id,field,value){
    setFeedback('');setError('')
    setItems(previous=>previous.map(item=>item.id===id?{...item,[field]:value}:item))
  }
  async function removeChallenge(item){
    if(loading||saving||deletingId||coverSaving)return
    const label=(item.name||'Desafio sem nome').trim()
    const message=item.saved
      ? `Excluir o desafio "${label}"? Ele deixará de aparecer para os alunos. Esta ação não apaga os pontos já lançados.`
      : `Descartar o desafio "${label}" ainda não salvo?`
    if(!window.confirm(message))return
    setError('');setFeedback('')
    if(!item.saved){
      setItems(current=>current.filter(challenge=>challenge.id!==item.id))
      setFeedback('Desafio não salvo descartado.')
      return
    }
    setDeletingId(item.id)
    try{
      const {data,error:dbError}=await supabase.from('clube_monthly_challenges')
        .delete().eq('id',item.id).eq('month_key',monthKey).select('id')
      if(dbError)throw dbError
      if(!data||data.length!==1)throw new Error('Desafio não encontrado ou sem permissão.')
      setItems(current=>current.filter(challenge=>challenge.id!==item.id))
      setFeedback('Desafio excluído com sucesso. Os demais desafios e os pontos dos alunos foram preservados.')
    }catch{
      setError('Não foi possível excluir este desafio. Verifique sua permissão de administrador e tente novamente.')
    }finally{
      setDeletingId(null)
    }
  }
  async function saveCover(){
    const primary=items[0]
    if(!primary?.saved||(!coverFile&&!primary.cover_path)||loading||saving||deletingId||coverSaving)return
    const extension=coverFile?COVER_EXTENSIONS[coverFile.type]:null
    if(coverFile&&(!extension||coverFile.size<1||coverFile.size>4*1024*1024)){
      setError('Use uma imagem JPG, PNG ou WebP de até 4 MB.');return
    }
    setCoverSaving(true);setError('');setFeedback('')
    try{
      let imagePath=primary.cover_path||null
      if(coverFile){
        imagePath='images/'+crypto.randomUUID()+'.'+extension
        const {error:uploadError}=await supabase.storage.from(COVER_BUCKET)
          .upload(imagePath,coverFile,{contentType:coverFile.type,cacheControl:'3600',upsert:false})
        if(uploadError)throw uploadError
      }
      const {data,error:dbError}=await supabase.from('clube_monthly_challenges')
        .update({cover_path:imagePath,...imageFramePayload(coverFrame,'cover'),updated_at:new Date().toISOString()})
        .eq('id',primary.id).eq('month_key',monthKey)
        .select('id,cover_path,cover_position_x,cover_position_y,cover_zoom').single()
      if(dbError||!data)throw dbError||new Error('A imagem não foi associada ao mês.')
      setItems(current=>current.map(item=>item.id===data.id?{...item,...data}:item))
      setCoverFrame(imageFrameFromRow(data,'cover'))
      setCoverFile(null)
      setFeedback('Enquadramento salvo para '+monthLabel(monthKey)+'. A fotografia original foi preservada.')
    }catch{
      setError('Não foi possível substituir a imagem. Confira a conexão e a permissão de administrador.')
    }finally{setCoverSaving(false)}
  }
  async function submit(event){
    event.preventDefault()
    if(loading||saving||deletingId||coverSaving||!items.length)return
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
        .select('id,name,goal_km,active,reward_points,position,cover_path')
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
        <small>O desafio padrão de 50 km e 300 pontos é criado automaticamente a cada mês. Você pode personalizar as metas e a imagem. A premiação depende da validação pelo Strava.</small>
      </div>
    </div>
    <div className="npv-challenge-month-selector">
      <label htmlFor="npv-challenge-admin-month">Mês do desafio</label>
      <select id="npv-challenge-admin-month" value={monthKey} disabled={loading||saving||coverSaving||!!deletingId}
        onChange={e=>setMonthKey(e.target.value)}>
        <option value={currentMonth}>{monthLabel(currentMonth)} — atual</option>
        <option value={nextMonth}>{monthLabel(nextMonth)} — próximo mês</option>
      </select>
      <small>Se o mês ainda não tiver desafios cadastrados, o padrão será criado sem apagar configurações anteriores.</small>
    </div>
    <div className="npv-challenge-cover-admin">
      <div className="npv-challenge-cover-frame">
        <ClubeImageFrameEditor src={coverDisplayUrl} value={coverFrame}
          onChange={setCoverFrame} kind="challenge" title={monthLabel(monthKey)+' · '+(items[0]?.name||'Desafio do mês')}
          disabled={loading||coverSaving||saving||!!deletingId}/>
      </div>
      <div className="npv-challenge-cover-controls">
        <strong><ImagePlus size={17}/> Imagem de fundo do desafio</strong>
        <p>Envie a foto, arraste na prévia para posicionar e ajuste o zoom. Salve o enquadramento para este mês sem modificar a imagem original.</p>
        <label className="npv-challenge-cover-file">
          <span>Escolher imagem</span>
          <input type="file" accept="image/jpeg,image/png,image/webp" disabled={loading||saving||coverSaving||!!deletingId}
            onChange={e=>{setCoverFile(e.target.files?.[0]||null);setCoverFrame(DEFAULT_IMAGE_FRAME)}}/>
        </label>
        <button type="button" onClick={saveCover} disabled={(!coverFile&&!items[0]?.cover_path)||!items[0]?.saved||loading||saving||coverSaving||!!deletingId}>
          <Save size={15}/>{coverSaving?'Salvando enquadramento...':'Salvar imagem e enquadramento'}
        </button>
        <small>JPG, PNG ou WebP, até 4 MB. O original é mantido: ajuste o enquadramento para celular e computador acima.</small>
      </div>
    </div>
    <form onSubmit={submit} className="npv-challenge-admin-form">
      <div className="npv-challenge-admin-list">
        {items.map((item,index)=><div className="npv-challenge-admin-item" key={item.id}>
          <div className="npv-challenge-admin-item-head"><strong>Desafio {index+1}</strong>
            <div className="npv-challenge-admin-item-actions">
              <span>{item.active?'Ativo':'Inativo'}</span>
              <button type="button" className="npv-challenge-delete" aria-label={`Excluir desafio ${item.name||index+1}`}
                disabled={loading||saving||coverSaving||!!deletingId} onClick={()=>removeChallenge(item)}>
                <Trash2 size={14}/>{deletingId===item.id?'Excluindo...':'Excluir'}
              </button>
            </div>
          </div>
          <label className="npv-challenge-name"><span>Nome do desafio</span>
            <input required minLength={2} maxLength={75} placeholder="Ex.: Desafio 50 km" value={item.name}
              disabled={loading||saving||coverSaving||!!deletingId} onChange={e=>edit(item.id,'name',e.target.value)}/></label>
          <div className="npv-challenge-admin-fields">
            <label><span>Meta de distância</span><span className="npv-challenge-input-row">
              <input inputMode="decimal" type="number" min="0.1" max="10000" step="0.01" placeholder="Ex.: 50" value={item.goal_km}
                disabled={loading||saving||coverSaving||!!deletingId} onChange={e=>edit(item.id,'goal_km',e.target.value)}/><b>km</b></span></label>
            <label><span>Recompensa ao completar</span><span className="npv-challenge-input-row">
              <input inputMode="numeric" type="number" min="1" max="100000" step="1" value={item.reward_points}
                disabled={loading||saving||coverSaving||!!deletingId} onChange={e=>edit(item.id,'reward_points',e.target.value)}/><b>pts</b></span></label>
            <label className="npv-challenge-admin-check"><input type="checkbox" checked={item.active}
              disabled={loading||saving||coverSaving||!!deletingId} onChange={e=>edit(item.id,'active',e.target.checked)}/> Desafio ativo</label>
          </div>
        </div>)}
        {!items.length&&!loading&&<p className="npv-challenge-admin-empty">Sem desafios salvos para este mês. Verifique a conexão ou crie um desafio.</p>}
      </div>
      <div className="npv-challenge-admin-actions">
        <button type="button" className="npv-challenge-add" disabled={loading||saving||coverSaving||!!deletingId||items.length>=25}
          onClick={()=>{setItems(current=>[...current,newChallenge()]);setError('');setFeedback('')}}><Plus size={16}/> Adicionar desafio</button>
        <button type="submit" disabled={loading||saving||coverSaving||!!deletingId||!items.length}><Save size={16}/>{saving?'Salvando...':'Salvar desafios'}</button>
      </div>
    </form>
    {error&&<p className="npv-challenge-admin-error" role="alert">{error}</p>}
    {feedback&&<p className="npv-challenge-admin-feedback" role="status"><CheckCircle2 size={14}/>{feedback}</p>}
  </section>
}
