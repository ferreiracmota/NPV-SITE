import React,{useCallback,useEffect,useMemo,useRef,useState} from 'react'
import {Activity,ArrowRight,CalendarDays,Check,Dumbbell,ExternalLink,History,Info,LockKeyhole,Save,Target,Trash2,TrendingDown,TrendingUp,Trophy} from 'lucide-react'
import {Area,AreaChart,CartesianGrid,ReferenceLine,ResponsiveContainer,Tooltip,XAxis,YAxis} from 'recharts'
import {clubeSupabase as supabase} from './clubeSupabase.js'
import {NPV_HOTMART_TRAINING_URL} from '../clube/hotmart/trainingAccess.mjs'
import {
  MAX_TRAINING_LOAD_KG,trainingToday,parseTrainingLoad,parseTrainingRepetitions,
  formatTrainingLoad,trainingHistory,trainingChartData,trainingGeneralHistory,trainingGeneralChartData,entryOnDay,trainingInputForDate,trainingSaveableSlugs
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
  const [selectedExercise,setSelectedExercise]=useState('geral')
  const [changes,setChanges]=useState({})
  const [dirtyExercises,setDirtyExercises]=useState({})
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
    setLoading(true);setError('');setEntries([]);setCatalog([]);setChanges({});setDirtyExercises({})
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

  // A visualização Geral é sempre a padrão. O gráfico só muda para um
  // exercício quando a aluna o escolhe explicitamente no seletor.
  const isGeneral=selectedExercise==='geral'||!catalog.some(ex=>ex.slug===selectedExercise)
  const actualExercise=isGeneral?'geral':selectedExercise
  const selectedName=isGeneral?'Geral':catalog.find(e=>e.slug===actualExercise)?.name||'Exercício'
  const catalogSlugs=useMemo(()=>catalog.map(ex=>ex.slug),[catalog])
  const history=useMemo(()=>isGeneral
    ?trainingGeneralHistory(entries,catalogSlugs)
    :trainingHistory(entries,actualExercise),[entries,actualExercise,isGeneral,catalogSlugs])
  const chart=useMemo(()=>isGeneral
    ?trainingGeneralChartData(entries,catalogSlugs)
    :trainingChartData(entries,actualExercise),[entries,actualExercise,isGeneral,catalogSlugs])

  // A referência visual é sempre o primeiro registro real do filtro atual.
  // O verde representa valores acima do início e o vermelho, abaixo dele.
  // Nunca alteramos a média, o histórico nem os registros salvos.
  const chartTone=useMemo(()=>{
    const initial=Number(history.initial?.load_kg??0)
    const values=chart.map(point=>Number(point.carga)).filter(Number.isFinite)
    const lowest=Math.min(initial,...values)
    const highest=Math.max(initial,...values)
    const span=highest-lowest
    const cutPercent=span===0?100:Math.min(100,Math.max(0,(highest-initial)/span*100))
    const padding=Math.max(2,span*.18)
    return {
      initial,
      cutPercent,
      yDomain:[Math.max(0,Number((lowest-padding).toFixed(2))),Number((highest+padding).toFixed(2))]
    }
  },[history.initial,chart])
  const saveableSlugs=trainingSaveableSlugs(dirtyExercises,entries,recordDate)
  const dirtyCount=saveableSlugs.length

  function fieldsFor(exercise){
    return trainingInputForDate(entries,exercise.slug,recordDate,changes[exercise.slug])
  }

  function edit(exercise,field,value){
    const initial=fieldsFor(exercise)
    // Uma vez salvo, o registro do dia não pode ser alterado pela aluna.
    if(initial.locked)return
    setChanges(current=>({
      ...current,
      [exercise.slug]:{
        load:current[exercise.slug]?.load??initial.load,
        repetitions:current[exercise.slug]?.repetitions??initial.repetitions,
        [field]:value
      }
    }))
    setDirtyExercises(current=>({...current,[exercise.slug]:true}))
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
      if(!saveableSlugs.includes(exercise.slug))continue
      // O valor à vista permanece mesmo quando o dia escolhido muda.
      const draft=fieldsFor(exercise)
      if(draft.locked)continue
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
        load_kg:weight,repetitions:reps
      })
    }
    if(!rows.length)return
    setSaving(true);setError('');setNotice('')
    try{
      // Só INSERT: registros já salvos são imutáveis por decisão do Clube.
      // A unicidade no banco impede substituição silenciosa por outra sessão.
      const {error:saveError}=await supabase.from('clube_training_load_entries')
        .insert(rows)
      if(saveError)throw new Error(saveError.code==='23505'?'Já existe um registro nesta data para um dos exercícios. Atualize a página para conferir.':'Não foi possível salvar. Confira sua conexão e tente novamente.')
      await refresh()
      // Limpa somente a marca de alteração. Mantém os pesos preenchidos.
      setDirtyExercises(current=>Object.fromEntries(Object.entries(current).filter(([slug])=>!saveableSlugs.includes(slug))))
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
      setDirtyExercises(current=>{
        const next={...current};delete next[entry.exercise_slug];return next
      })
      setNotice('Registro excluído por escolha explícita. Os outros dias foram preservados.')
    }catch(e){setError(e?.message||'Erro ao excluir registro.')}
    finally{setSaving(false)}
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
          <p>{isGeneral?'Acompanhe a média de todos os exercícios ou selecione um para ver os detalhes.':'Acompanhe sua carga inicial, atual e recorde neste exercício.'}</p>
        </div>
        <label className="npv-training-choose">Visualizar
          <select aria-label="Selecionar geral ou exercício para ver evolução"
            value={actualExercise} onChange={e=>setSelectedExercise(e.target.value)} disabled={saving}>
            <option value="geral">Geral</option>
            {catalog.map(ex=><option key={ex.slug} value={ex.slug}>{ex.name}</option>)}
          </select>
        </label>
      </div>

      {loading?<div className="npv-training-empty" role="status">Carregando seu histórico de cargas...</div>:
      !catalog.length?<div className="npv-training-empty">Os exercícios ainda não estão disponíveis.</div>:
      !chart.length?<div className="npv-training-empty npv-training-empty-graph">
          <Activity size={26}/>
          <strong>Seu gráfico começa com o primeiro registro!</strong>
          <p>{isGeneral?'Registre a primeira carga de um exercício para começar seu gráfico geral.':'Registre sua carga de '+selectedName.toLowerCase()+' para acompanhar sua evolução de verdade.'}</p>
          <button type="button" onClick={()=>recordRef.current?.scrollIntoView({behavior:'smooth'})}>
            Registrar primeira carga <ArrowRight size={15}/>
          </button>
        </div>:
        <div className="npv-training-visual">
          <div className="npv-training-chart-overview">
            <div>
              <span>{isGeneral?'MÉDIA ATUAL':'CARGA ATUAL'}</span>
              <strong>{formatTrainingLoad(history.latest?.load_kg)}</strong>
            </div>
            <span className={'npv-training-chart-growth'+(history.changeKg>0?' is-positive':history.changeKg<0?' is-negative':'')}>
              {history.changeKg<0?<TrendingDown size={15}/>:<TrendingUp size={15}/>}
              {history.rows.length>1?showChange(history.changePercent):'Primeiro registro'}
            </span>
          </div>

          <div className="npv-training-chart" role="img"
            aria-label={isGeneral?'Evolução geral da média das cargas. Verde acima e vermelho abaixo da média inicial.':'Evolução da carga em '+selectedName+'. Verde acima e vermelho abaixo da carga inicial.'}>
            <ResponsiveContainer width="100%" height={216}>
              <AreaChart data={chart} margin={{top:18,right:11,left:-24,bottom:0}}>
                <defs>
                  <linearGradient id="npv-training-area-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#24e87d" stopOpacity={0.58}/>
                    <stop offset={chartTone.cutPercent+'%'} stopColor="#27c879" stopOpacity={0.30}/>
                    <stop offset={chartTone.cutPercent+'%'} stopColor="#e84357" stopOpacity={0.30}/>
                    <stop offset="100%" stopColor="#fa435d" stopOpacity={0.56}/>
                  </linearGradient>
                  <linearGradient id="npv-training-line-tone" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#35ff90"/>
                    <stop offset={chartTone.cutPercent+'%'} stopColor="#35ff90"/>
                    <stop offset={chartTone.cutPercent+'%'} stopColor="#ff536a"/>
                    <stop offset="100%" stopColor="#ff536a"/>
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#335247" strokeOpacity={0.52} strokeDasharray="2 7" vertical={false}/>
                <XAxis dataKey="label" tickLine={false} axisLine={false}
                  minTickGap={26} interval="preserveStartEnd"
                  tick={{fontSize:11,fill:'#a4c7b5'}}/>
                <YAxis domain={chartTone.yDomain} tickLine={false} axisLine={false}
                  allowDataOverflow={false}
                  tick={{fontSize:10,fill:'#9cb9a9'}} width={49}/>
                <Tooltip cursor={{stroke:'#83c9a3',strokeDasharray:'3 5'}}
                  contentStyle={{borderRadius:12,background:'#17352a',color:'#f5fff7',border:'1px solid #3e6951',boxShadow:'0 12px 24px rgba(3,15,9,.3)',fontSize:12}}
                  itemStyle={{color:'#effff3'}}
                  labelStyle={{color:'#a9d8bb'}}
                  formatter={value=>[formatTrainingLoad(value),isGeneral?'Média das cargas':'Carga']}
                  labelFormatter={(label,payload)=>payload?.[0]?.payload?.fullDate||label}/>
                <ReferenceLine y={chartTone.initial} stroke="#98bea5"
                  strokeOpacity={0.68} strokeDasharray="4 6" ifOverflow="extendDomain"/>
                <Area type="linear" dataKey="carga" baseValue={chartTone.initial}
                  stroke="url(#npv-training-line-tone)" strokeWidth={3.5}
                  fill="url(#npv-training-area-fill)"
                  dot={chart.length<=24?props=>{
                    if(!Number.isFinite(props.cx)||!Number.isFinite(props.cy))return null
                    const down=Number(props.payload?.carga)<chartTone.initial
                    return <circle key={'npv-chart-point-'+props.index} cx={props.cx} cy={props.cy}
                      r={3.3} fill="#11291e" stroke={down?'#ff536a':'#35ff90'} strokeWidth={2}/>
                  }:false}
                  activeDot={props=>{
                    if(!Number.isFinite(props.cx)||!Number.isFinite(props.cy))return null
                    const down=Number(props.payload?.carga)<chartTone.initial
                    return <circle key="npv-chart-active" cx={props.cx} cy={props.cy}
                      r={6} fill="#10291e" stroke={down?'#ff536a':'#35ff90'} strokeWidth={2.6}/>
                  }}
                  isAnimationActive={false}/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="npv-training-chart-bottom">
            <span>{isGeneral?history.rows.length+' datas registradas':history.rows.length+' '+(history.rows.length===1?'registro':'registros')+' no histórico'}</span>
            <span>{LABEL_DATE(history.initial?.recorded_on)} — {LABEL_DATE(history.latest?.recorded_on)}</span>
          </div>
        </div>}

      <div className="npv-training-metrics">
        <div><small>{isGeneral?'Média inicial':'Carga inicial'}</small><strong>{formatTrainingLoad(history.initial?.load_kg)}</strong></div>
        <div><small>{isGeneral?'Maior média':'Melhor marca'}</small><strong>{formatTrainingLoad(history.record?.load_kg)}</strong></div>
        <div><small>Progresso</small><strong className={history.changeKg>0?'is-positive':''}>
          {history.rows.length<2?'—':showChange(history.changePercent)}
        </strong></div>
      </div>
      {history.record&&<div className="npv-training-record"><Trophy size={17}/>
        {isGeneral
          ?<span>Média de <strong>{history.latest.exercise_count} {history.latest.exercise_count===1?'exercício registrado':'exercícios registrados'}</strong> no último dia. Cada carga continua valendo até ser atualizada.</span>
          :<span>Recorde pessoal em {selectedName}: <strong>{formatTrainingLoad(history.record.load_kg)}</strong></span>}
      </div>}
      {isGeneral&&history.rows.length>0&&<p className="npv-training-chart-footnote">A média usa a última carga registrada de cada exercício. Exercícios novos entram no cálculo depois do primeiro registro.</p>}
      {!history.rows.length&&<p className="npv-training-chart-footnote">Nenhuma carga fictícia: o gráfico será criado com seus registros reais.</p>}
    </section>

    <section className="npv-training-card npv-training-register" ref={recordRef} aria-label="Registrar cargas de exercícios">
      <div className="npv-training-section-heading">
        <div>
          <span className="npv-training-eyebrow"><Target size={16}/> REGISTRO RÁPIDO</span>
          <h2>Atualizar minhas cargas</h2>
          <p>Seu último peso fica preenchido ao mudar a data. Apenas novas cargas são salvas.</p>
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
            const changed=Boolean(dirtyExercises[ex.slug])&&!current.locked
            const parsed=parseTrainingLoad(current.load)
            const slide=parsed===null?0:Math.round(parsed/2.5)*2.5
            return <div className={'npv-training-exercise'+(changed?' is-edited':'')} key={ex.slug}>
              <div className="npv-training-exercise-heading">
                <div className="npv-training-exercise-name">
                  <strong>{ex.name}</strong>
                  <small>{current.latest?'Última registrada: '+formatTrainingLoad(current.latest.load_kg):'Primeira carga ainda não registrada'}
                    {current.locked?' · Já registrado nesta data':''}</small>
                </div>
                <label className="npv-training-weight">
                  <input type="number" inputMode="decimal" min="0" max={MAX_TRAINING_LOAD_KG} step="0.01"
                    aria-label={'Carga em quilogramas de '+ex.name} placeholder="—"
                    value={current.load} disabled={saving||current.locked}
                    onChange={e=>edit(ex,'load',e.target.value)}/>
                  <span>kg</span>
                </label>
              </div>
              <input className="npv-training-range" type="range"
                aria-label={'Arrastar carga de '+ex.name+' de 0 a 500 kg'}
                min="0" max={MAX_TRAINING_LOAD_KG} step="2.5" value={slide}
                disabled={saving||current.locked} onChange={e=>edit(ex,'load',e.target.value)}/>
              <div className="npv-training-exercise-foot">
                <span>0–500 kg</span>
                <label>Repetições <input type="number" inputMode="numeric" min="1" max="100"
                  step="1" placeholder="opcional" value={current.repetitions}
                  disabled={saving||current.locked} aria-label={'Repetições realizadas em '+ex.name}
                  onChange={e=>edit(ex,'repetitions',e.target.value)}/></label>
                {current.existing&&<button className="npv-training-delete-day" type="button"
                  disabled={saving} onClick={()=>remove(current.existing,ex.name)} title="Excluir apenas o registro desta data">
                  <Trash2 size={13}/> Excluir registro
                </button>}
                {current.locked&&<span className="npv-training-locked"><LockKeyhole size={12}/> Registrado · protegido</span>}
                {changed&&<span className="npv-training-unsaved">Não salvo</span>}
              </div>
            </div>
          })}
        </div>
        <div className="npv-training-actions">
          <p><Info size={15}/> O peso permanece preenchido. Registros salvos não podem ser editados; a exclusão é uma ação separada e exige confirmação. Nenhum ponto é alterado.</p>
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
          <p>{isGeneral?'Geral · médias por data':selectedName} · {history.rows.length} {history.rows.length===1?'registro':'registros'} preservados, sem edição</p>
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
            <small>{isGeneral?entry.exercise_count+' exerc.':entry.repetitions==null?'':entry.repetitions+' rep.'}</small>
            <span className="npv-training-history-locked" title="Registro salvo, sem edição">
              <LockKeyhole size={14}/> Salvo
            </span>
          </div>
        )}
      </div>}
    </section>
  </div>
}
