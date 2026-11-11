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
