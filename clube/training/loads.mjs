// Regras puras da área de cargas. Não altera nenhuma regra de pontos do Clube.
export const MAX_TRAINING_LOAD_KG=500
export const MIN_TRAINING_LOAD_KG=0
export const MAX_TRAINING_REPETITIONS=100

export function trainingToday(now=new Date()){
  const parts=new Intl.DateTimeFormat('en-US',{
    timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'
  }).formatToParts(now)
  const part=name=>parts.find(item=>item.type===name)?.value
  return [part('year'),part('month'),part('day')].join('-')
}

export function parseTrainingLoad(value){
  if(value===null||value===undefined||String(value).trim()==='')return null
  const raw=String(value).trim().replace(',','.')
  if(!/^\d+(?:\.\d{1,2})?$/.test(raw))return null
  const n=Number(raw)
  return Number.isFinite(n)&&n>=MIN_TRAINING_LOAD_KG&&n<=MAX_TRAINING_LOAD_KG?n:null
}

export function parseTrainingRepetitions(value){
  if(value===null||value===undefined||String(value).trim()==='')return null
  const n=Number(value)
  return Number.isInteger(n)&&n>=1&&n<=MAX_TRAINING_REPETITIONS?n:null
}

export function formatTrainingLoad(value){
  if(value===undefined||value===null||value==='')return '—'
  const n=Number(value)
  return Number.isFinite(n)?n.toLocaleString('pt-BR',{maximumFractionDigits:2})+' kg':'—'
}

export function trainingHistory(entries,exerciseSlug){
  const rows=(Array.isArray(entries)?entries:[])
    .filter(row=>row?.exercise_slug===exerciseSlug&&Number.isFinite(Number(row.load_kg))&&/^\d{4}-\d{2}-\d{2}$/.test(row.recorded_on||''))
    .sort((a,b)=>a.recorded_on.localeCompare(b.recorded_on)||String(a.created_at||'').localeCompare(String(b.created_at||'')))
  if(!rows.length)return {rows:[],initial:null,latest:null,record:null,changeKg:null,changePercent:null}
  const initial=rows[0],latest=rows[rows.length-1]
  const record=rows.reduce((best,row)=>Number(row.load_kg)>Number(best.load_kg)?row:best,rows[0])
  const changeKg=Number((Number(latest.load_kg)-Number(initial.load_kg)).toFixed(2))
  const changePercent=Number(initial.load_kg)>0?Number(((changeKg/Number(initial.load_kg))*100).toFixed(1)):null
  return {rows,initial,latest,record,changeKg,changePercent}
}

export function trainingChartData(entries,exerciseSlug){
  return trainingHistory(entries,exerciseSlug).rows.map(row=>{
    const [year,month,day]=row.recorded_on.split('-')
    return {
      date:row.recorded_on,
      label:day+'/'+month,
      fullDate:day+'/'+month+'/'+year,
      carga:Number(row.load_kg),
      repeticoes:row.repetitions==null?null:Number(row.repetitions)
    }
  })
}

export function entryOnDay(entries,exerciseSlug,day){
  return (Array.isArray(entries)?entries:[]).find(row=>
    row.exercise_slug===exerciseSlug&&row.recorded_on===day
  )||null
}

export function lastEntryOnOrBefore(entries,exerciseSlug,day){
  return trainingHistory(entries,exerciseSlug).rows.filter(row=>row.recorded_on<=day).at(-1)||null
}

// O campo de carga representa a última carga conhecida (ou o rascunho ainda
// não salvo), não a carga da data escolhida. Mudar de data NUNCA zera os campos.
// Registros da data selecionada são mostrados como SOMENTE LEITURA.
export function trainingInputForDate(entries,exerciseSlug,recordDate,working){
  const existing=entryOnDay(entries,exerciseSlug,recordDate)
  const latest=trainingHistory(entries,exerciseSlug).latest
  const load=existing
    ?String(Number(existing.load_kg))
    :working?.load??(latest?String(Number(latest.load_kg)):'')
  const repetitions=existing
    ?(existing.repetitions==null?'':String(existing.repetitions))
    :working?.repetitions??(latest?.repetitions==null?'':String(latest.repetitions))
  return {existing,latest,locked:Boolean(existing),load,repetitions}
}

// Uma carga só é salva quando a aluna a modifica explicitamente. Não criar
// registros automáticos por mudar a data, ainda que os pesos estejam visíveis.
export function trainingSaveableSlugs(dirtySlugs,entries,recordDate){
  return Object.keys(dirtySlugs||{}).filter(slug=>
    dirtySlugs[slug]&&!entryOnDay(entries,slug,recordDate)
  )
}

// Gráfico Geral: média aritmética da última carga registrada de CADA
// exercício conhecido, na data de cada registro. Cargas dos exercícios
// não atualizados naquele dia continuam a compor a média, sem inventar
// novos registros nem dar peso maior a exercícios registrados mais vezes.
// A média considera somente exercícios que já têm pelo menos 1 registro.
export function trainingGeneralHistory(entries,allowedSlugs=null){
  const whitelist=Array.isArray(allowedSlugs)?new Set(allowedSlugs):null
  const chronological=(Array.isArray(entries)?entries:[])
    .filter(row=>row && typeof row.exercise_slug==='string'
      &&(!whitelist||whitelist.has(row.exercise_slug))
      &&/^\d{4}-\d{2}-\d{2}$/.test(row.recorded_on||'')
      &&Number.isFinite(Number(row.load_kg))
      &&Number(row.load_kg)>=MIN_TRAINING_LOAD_KG
      &&Number(row.load_kg)<=MAX_TRAINING_LOAD_KG)
    .sort((a,b)=>a.recorded_on.localeCompare(b.recorded_on)
      ||String(a.created_at||'').localeCompare(String(b.created_at||'')))

  const lastByExercise=new Map()
  const rows=[]
  for(let index=0;index<chronological.length;){
    const day=chronological[index].recorded_on
    while(index<chronological.length && chronological[index].recorded_on===day){
      const row=chronological[index]
      lastByExercise.set(row.exercise_slug,Number(row.load_kg))
      index++
    }
    if(lastByExercise.size===0)continue
    const loads=[...lastByExercise.values()]
    const mean=Number((loads.reduce((sum,n)=>sum+n,0)/loads.length).toFixed(2))
    rows.push({id:'geral-'+day,exercise_slug:'geral',recorded_on:day,
      load_kg:mean,exercise_count:loads.length})
  }
  if(!rows.length)return {rows:[],initial:null,latest:null,record:null,
    changeKg:null,changePercent:null}
  const initial=rows[0]
  const latest=rows.at(-1)
  const record=rows.reduce((best,row)=>row.load_kg>best.load_kg?row:best,initial)
  const changeKg=Number((latest.load_kg-initial.load_kg).toFixed(2))
  const changePercent=initial.load_kg>0
    ?Number((changeKg/initial.load_kg*100).toFixed(1)):null
  return {rows,initial,latest,record,changeKg,changePercent}
}

export function trainingGeneralChartData(entries,allowedSlugs=null){
  return trainingGeneralHistory(entries,allowedSlugs).rows.map(row=>{
    const [year,month,day]=row.recorded_on.split('-')
    return {date:row.recorded_on,label:day+'/'+month,
      fullDate:day+'/'+month+'/'+year,
      carga:row.load_kg,exerciseCount:row.exercise_count}
  })
}
