import React,{useCallback,useEffect,useMemo,useRef,useState} from 'react'
import {Activity,ArrowRight,CalendarDays,Check,ChevronRight,Dumbbell,ExternalLink,History,Info,Save,Target,Trash2,TrendingUp,Trophy} from 'lucide-react'
import {CartesianGrid,Line,LineChart,ResponsiveContainer,Tooltip,XAxis,YAxis} from 'recharts'
import {clubeSupabase as supabase} from './clubeSupabase.js'
import {NPV_HOTMART_TRAINING_URL} from '../clube/hotmart/trainingAccess.mjs'
import {
  MAX_TRAINING_LOAD_KG,trainingToday,parseTrainingLoad,parseTrainingRepetitions,
  formatTrainingLoad,trainingHistory,trainingChartData,entryOnDay,lastEntryOnOrBefore
} from '../clube/training/loads.mjs'
import './ClubeStudentTraining.css'

const LABEL_DATE=iso=>{
  if(!/^\d{4}-\d{2}-\d{2}$/.test(iso||''))return ''
  const [y,m,d]=iso.split('-')
  return d+'/'+m+'/'+y
}
const showChange=value=>value===null?'—':(value>0?'+':'')+value.toLocaleString('pt-BR',{maximumFractionDigits:1})+'%'
const rowFields='id,student_id,exercise_slug,load_kg,repetitions,recorded_on,created_at,updated_at'

export default function ClubeStudentTraining({session}){
  const userId=session?.user?.id
  const today=useMemo(()=>trainingToday(),[])
  const [recordDate,setRecordDate]=useState(today)
  const [catalog,setCatalog]=useState([])
  const [entries,setEntries]=useState([])
  const [selectedExercise,setSelectedExercise]=useState('agachamento-livre')
  const [changes,setChanges]=useState({})
  const [loading,setLoading]=useState(true)
  const [saving,setSaving]=useState(false)
  const [error,setError]=useState('')
  const [notice,setNotice]=useState('')
  const recordRef=useRef(null)

  const refresh=useCallback(async()=>{
    if(!supabase||!userId)throw new Error('Faça login novamente para acessar suas cargas.')
    const [exercisesResult,historyResult]=await Promise.all([
      supabase.from('clube_training_exercises')
        .select('slug,name,display_order,active').eq('active',true).order('display_order',{ascending:true}),
      supabase.from('clube_training_load_entries')
        .select(rowFields).eq('student_id',userId)
        .order('recorded_on',{ascending:true}).limit(1500)
    ])
    if(exercisesResult.error||historyResult.error){
      throw new Error('Não foi possível carregar as cargas. Atualize a página ou tente novamente.')
    }
    setCatalog(exercisesResult.data||[])
    setEntries(historyResult.data||[])
  },[userId])

  useEffect(()=>{
    let alive=true
    setLoading(true);setError('');setEntries([]);setCatalog([]);setChanges({})
    if(!supabase||!userId){setLoading(false);return}
    Promise.all([
      supabase.from('clube_training_exercises').select('slug,name,display_order,active')
        .eq('active',true).order('display_order',{ascending:true}),
      supabase.from('clube_training_load_entries').select(rowFields)
        .eq('student_id',userId).order('recorded_on',{ascending:true}).limit(1500)
    ]).then(([a,b])=>{
      if(!alive)return
      if(a.error||b.error)throw new Error('Não foi possível carregar suas cargas. Tente atualizar.')
      setCatalog(a.data||[]);setEntries(b.data||[])
    }).catch(e=>{if(alive)setError(e?.message||'Falha ao consultar o histórico.')})
      .finally(()=>{if(alive)setLoading(false)})
    return()=>{alive=false}
  },[userId])

  useEffect(()=>{setChanges({})},[recordDate,entries])

  const actualExercise=catalog.some(e=>e.slug===selectedExercise)
    ?selectedExercise:catalog[0]?.slug||selectedExercise
  const selectedName=catalog.find(e=>e.slug===actualExercise)?.name||'Exercício'
  const history=useMemo(()=>trainingHistory(entries,actualExercise),[entries,actualExercise])
  const chart=useMemo(()=>trainingChartData(entries,actualExercise),[entries,actualExercise])
  const dirtyCount=Object.keys(changes).length

  function fieldsFor(exercise){
    const existing=entryOnDay(entries,exercise.slug,recordDate)
    const previous=existing||lastEntryOnOrBefore(entries,exercise.slug,recordDate)
    const defaultLoad=previous?String(Number(previous.load_kg)):''
    const defaultReps=existing?.repetitions==null?'':String(existing.repetitions)
    return {
      existing,
      latest:trainingHistory(entries,exercise.slug).latest,
      load:changes[exercise.slug]?.load??defaultLoad,
      repetitions:changes[exercise.slug]?.repetitions??defaultReps
    }
  }

  function edit(exercise,field,value){
    const initial=fieldsFor(exercise)
    setChanges(current=>({
      ...current,
      [exercise.slug]:{
        load:current[exercise.slug]?.load??initial.load,
        repetitions:current[exercise.slug]?.repetitions??initial.repetitions,
        [field]:value
      }
    }))
    setNotice('');setError('')
  }

  async function save(event){
    event.preventDefault()
    if(saving||!userId||!dirtyCount)return
    if(!/^\d{4}-\d{2}-\d{2}$/.test(recordDate)||recordDate>trainingToday()){
      setError('Escolha uma data válida, que não esteja no futuro.');return
    }
    const rows=[]
    for(const exercise of catalog){
      const draft=changes[exercise.slug]
      if(!draft)continue
      const weight=parseTrainingLoad(draft.load)
      if(weight===null){
        setError('Informe uma carga entre 0 e 500 kg para '+exercise.name+'.');return
      }
      const reps=parseTrainingRepetitions(draft.repetitions)
      if(String(draft.repetitions).trim()!==''&&reps===null){
        setError('Informe de 1 a 100 repetições ou deixe o campo vazio em '+exercise.name+'.');return
      }
      rows.push({
        student_id:userId,exercise_slug:exercise.slug,recorded_on:recordDate,
        load_kg:weight,repetitions:reps,updated_at:new Date().toISOString()
      })
    }
    if(!rows.length)return
    setSaving(true);setError('');setNotice('')
    try{
      // Uma carga por exercício e por dia. Atualização do mesmo dia mantém o histórico.
      const {error:saveError}=await supabase.from('clube_training_load_entries')
        .upsert(rows,{onConflict:'student_id,exercise_slug,recorded_on'})
      if(saveError)throw new Error('Não foi possível salvar. Confira sua conexão e tente novamente.')
      await refresh()
      setChanges({})
      setNotice(rows.length===1?'Carga salva com sucesso! 💚':rows.length+' cargas salvas com sucesso! 💚')
    }catch(e){setError(e?.message||'Erro ao salvar as cargas.')}
    finally{setSaving(false)}
  }

  async function remove(entry,exerciseName){
    if(saving||!entry?.id||!userId)return
    if(!window.confirm('Excluir o registro de '+exerciseName+' em '+LABEL_DATE(entry.recorded_on)+'? Esta ação não afeta outros dias.'))return
    setSaving(true);setError('');setNotice('')
    try{
      const {data,error:removeError}=await supabase.from('clube_training_load_entries')
        .delete().eq('id',entry.id).eq('student_id',userId).select('id')
      if(removeError||!data?.length)throw new Error('Não foi possível excluir esse registro.')
      await refresh()
      setChanges({})
      setNotice('Registro excluído. Os outros dias foram preservados.')
    }catch(e){setError(e?.message||'Erro ao excluir registro.')}
    finally{setSaving(false)}
  }

  function editHistorical(entry){
    setRecordDate(entry.recorded_on)
    setNotice('Você está editando o registro de '+LABEL_DATE(entry.recorded_on)+'.')
    recordRef.current?.scrollIntoView({behavior:'smooth',block:'start'})
  }

  return <div className="npv-training-area">
    <header className="npv-training-heading">
      <div>
        <span className="npv-training-eyebrow"><Dumbbell size={16}/> SEU ESPAÇO DE EVOLUÇÃO</span>
        <h1>Meus treinos<span> ✦</span></h1>
        <p>Seu treino na Hotmart. Sua evolução, registrada aqui.</p>
      </div>
    </header>

    <a className="npv-training-hotmart" href={NPV_HOTMART_TRAINING_URL} target="_blank" rel="noopener noreferrer"
      aria-label="Abrir meu treino na área de membros NPV na Hotmart, em nova aba">
      <span className="npv-training-hotmart-mark"><Dumbbell size={25}/></span>
      <span className="npv-training-hotmart-text">
        <strong>Meu treino</strong>
        <small>Acessar minha programação na Hotmart</small>
      </span>
      <ExternalLink size={21} aria-hidden="true"/>
    </a>

    <section className="npv-training-card npv-training-progress" aria-label="Minha evolução de cargas">
      <div className="npv-training-section-heading">
        <div>
          <span className="npv-training-eyebrow"><TrendingUp size={16}/> MINHA EVOLUÇÃO</span>
          <h2>Cargas e progresso</h2>
          <p>Veja sua primeira carga, a atual e seus recordes por exercício.</p>
        </div>
        <label className="npv-training-choose">Exercício
          <select aria-label="Selecionar exercício para ver evolução"
            value={actualExercise} onChange={e=>setSelectedExercise(e.target.value)} disabled={!catalog.length||saving}>
            {!catalog.length&&<option value={selectedExercise}>Exercícios</option>}
            {catalog.map(ex=><option key={ex.slug} value={ex.slug}>{ex.name}</option>)}
          </select>
        </label>
      </div>

      {loading?<div className="npv-training-empty" role="status">Carregando seu histórico de cargas...</div>:
      !catalog.length?<div className="npv-training-empty">Os exercícios ainda não estão disponíveis.</div>:
      !chart.length?<div className="npv-training-empty npv-training-empty-graph">
          <Activity size={26}/>
          <strong>Seu gráfico começa com o primeiro registro!</strong>
          <p>Registre sua carga de {selectedName.toLowerCase()} para acompanhar sua evolução de verdade.</p>
          <button type="button" onClick={()=>recordRef.current?.scrollIntoView({behavior:'smooth'})}>
            Registrar primeira carga <ArrowRight size={15}/>
          </button>
        </div>:
        <div className="npv-training-chart" role="img" aria-label={'Evolução de cargas em quilogramas para '+selectedName}>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chart} margin={{top:13,right:12,left:-18,bottom:1}}>
              <CartesianGrid stroke="#dfebdf" strokeDasharray="3 4" vertical={false}/>
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{fontSize:11,fill:'#66806b'}}/>
              <YAxis domain={[0,'auto']} tickLine={false} axisLine={false} tick={{fontSize:10,fill:'#66806b'}} width={52}/>
              <Tooltip cursor={{stroke:'#a5c99a',strokeDasharray:'3 3'}}
                formatter={value=>[formatTrainingLoad(value),'Carga']}
                labelFormatter={(label,payload)=>payload?.[0]?.payload?.fullDate||label}/>
              <Line type="monotone" dataKey="carga" stroke="#2b744e" strokeWidth={3}
                dot={{r:4,stroke:'#2b744e',strokeWidth:2,fill:'#fff'}}
                activeDot={{r:6,stroke:'#2b744e',strokeWidth:2}} isAnimationActive={false}/>
            </LineChart>
          </ResponsiveContainer>
        </div>}

      <div className="npv-training-metrics">
        <div><small>Carga inicial</small><strong>{formatTrainingLoad(history.initial?.load_kg)}</strong></div>
        <div><small>Carga atual</small><strong>{formatTrainingLoad(history.latest?.load_kg)}</strong></div>
        <div><small>Evolução</small><strong className={history.changeKg>0?'is-positive':''}>
          {history.rows.length<2?'—':showChange(history.changePercent)}
        </strong></div>
      </div>
      {history.record&&<div className="npv-training-record"><Trophy size={17}/>
        <span>Recorde pessoal em {selectedName}: <strong>{formatTrainingLoad(history.record.load_kg)}</strong></span>
      </div>}
      {!history.rows.length&&<p className="npv-training-chart-footnote">Nenhuma carga fictícia: o gráfico será criado com seus registros reais.</p>}
    </section>

    <section className="npv-training-card npv-training-register" ref={recordRef} aria-label="Registrar cargas de exercícios">
      <div className="npv-training-section-heading">
        <div>
          <span className="npv-training-eyebrow"><Target size={16}/> REGISTRO RÁPIDO</span>
          <h2>Atualizar minhas cargas</h2>
          <p>Arraste a barra ou digite o peso. Salve vários exercícios de uma vez.</p>
        </div>
        <label className="npv-training-date"><CalendarDays size={15}/> Data do treino
          <input type="date" value={recordDate} max={today} min="2020-01-01"
            disabled={saving||loading} onChange={e=>{setRecordDate(e.target.value);setNotice('');setError('')}}/>
        </label>
      </div>

      {error&&<div className="npv-training-message is-error" role="alert">{error}
        <button type="button" onClick={()=>{setError('');refresh().catch(()=>{})}}>Tentar novamente</button></div>}
      {notice&&<div className="npv-training-message is-success" role="status"><Check size={17}/>{notice}</div>}

      {!loading&&catalog.length>0&&<form onSubmit={save}>
        <div className="npv-training-exercise-list">
          {catalog.map(ex=>{
            const current=fieldsFor(ex)
            const changed=Object.prototype.hasOwnProperty.call(changes,ex.slug)
            const parsed=parseTrainingLoad(current.load)
            const slide=parsed===null?0:Math.round(parsed/2.5)*2.5
            return <div className={'npv-training-exercise'+(changed?' is-edited':'')} key={ex.slug}>
              <div className="npv-training-exercise-heading">
                <div className="npv-training-exercise-name">
                  <strong>{ex.name}</strong>
                  <small>{current.latest?'Última registrada: '+formatTrainingLoad(current.latest.load_kg):'Primeira carga ainda não registrada'}
                    {current.existing?' · Registro deste dia':''}</small>
                </div>
                <label className="npv-training-weight">
                  <input type="number" inputMode="decimal" min="0" max={MAX_TRAINING_LOAD_KG} step="0.01"
                    aria-label={'Carga em quilogramas de '+ex.name} placeholder="—"
                    value={current.load} disabled={saving}
                    onChange={e=>edit(ex,'load',e.target.value)}/>
                  <span>kg</span>
                </label>
              </div>
              <input className="npv-training-range" type="range"
                aria-label={'Arrastar carga de '+ex.name+' de 0 a 500 kg'}
                min="0" max={MAX_TRAINING_LOAD_KG} step="2.5" value={slide}
                disabled={saving} onChange={e=>edit(ex,'load',e.target.value)}/>
              <div className="npv-training-exercise-foot">
                <span>0–500 kg</span>
                <label>Repetições <input type="number" inputMode="numeric" min="1" max="100"
                  step="1" placeholder="opcional" value={current.repetitions}
                  disabled={saving} aria-label={'Repetições realizadas em '+ex.name}
                  onChange={e=>edit(ex,'repetitions',e.target.value)}/></label>
                {current.existing&&<button className="npv-training-delete-day" type="button"
                  disabled={saving} onClick={()=>remove(current.existing,ex.name)} title="Excluir apenas o registro desta data">
                  <Trash2 size={13}/> Excluir registro
                </button>}
                {changed&&<span className="npv-training-unsaved">Alterado</span>}
              </div>
            </div>
          })}
        </div>
        <div className="npv-training-actions">
          <p><Info size={15}/> O histórico permanece por exercício e por data. Nenhum ponto do Clube é alterado.</p>
          <button type="submit" disabled={saving||dirtyCount===0}>
            {saving?<span>Salvando...</span>:<><Save size={17}/> Salvar {dirtyCount?dirtyCount+' '+(dirtyCount===1?'carga':'cargas'):'cargas do dia'}</>}
          </button>
        </div>
      </form>}
      {loading&&<p className="npv-training-loading" role="status">Preparando seus exercícios...</p>}
    </section>

    <section className="npv-training-card npv-training-history" aria-label="Histórico de cargas">
      <div className="npv-training-section-heading">
        <div>
          <span className="npv-training-eyebrow"><History size={16}/> SUA TRAJETÓRIA</span>
          <h2>Histórico de cargas</h2>
          <p>{selectedName} · {history.rows.length} {history.rows.length===1?'registro':'registros'}</p>
        </div>
      </div>
      {history.rows.length===0?<p className="npv-training-history-empty">Quando você registrar suas cargas, as datas aparecerão aqui.</p>:
      <div className="npv-training-history-list">
        {[...history.rows].reverse().slice(0,12).map(entry=>
          <div className="npv-training-history-row" key={entry.id||entry.recorded_on}>
            <div className="npv-training-history-date"><CalendarDays size={16}/>
              <span>{LABEL_DATE(entry.recorded_on)}</span>
            </div>
            <strong>{formatTrainingLoad(entry.load_kg)}</strong>
            <small>{entry.repetitions==null?'':entry.repetitions+' rep.'}</small>
            <button type="button" disabled={saving||loading} onClick={()=>editHistorical(entry)}>
              Editar <ChevronRight size={14}/>
            </button>
          </div>
        )}
      </div>}
    </section>
  </div>
}
