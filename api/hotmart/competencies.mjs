// Modelo NPV: a Hotmart atesta pagamentos, o Clube gera competências e pontos.
// NÃO altera saldo. Puro/determinístico para prévia e homologação.
export function addMonthsClamped(iso,months){
 const base=new Date(iso)
 if(!Number.isFinite(base.getTime())||!Number.isInteger(months)||months<0||months>120)throw Error('date_or_months_invalid')
 const year=base.getUTCFullYear(),month=base.getUTCMonth()+months
 const first=new Date(Date.UTC(year,month,1,base.getUTCHours(),base.getUTCMinutes(),
  base.getUTCSeconds(),base.getUTCMilliseconds()))
 const endOfMonth=new Date(Date.UTC(first.getUTCFullYear(),first.getUTCMonth()+1,0)).getUTCDate()
 first.setUTCDate(Math.min(base.getUTCDate(),endOfMonth))
 return first.toISOString()
}
export function classifyPlan(periodDays){
 return periodDays===30?'mensal':periodDays===90?'trimestral':'nao_elegivel'
}
export function simulateCompetencies({
 productId,subscriberCode,transactionId,recurrence,periodDays,
 paymentStatus,subscriptionPayment,installment,paidAt,
 baselineAt,startsAt,at,rulePoints=400
}){
 const plan=classifyPlan(periodDays)
 const rejection=(reason)=>({eligible:false,reason,plan,competencies:[],totalDue:0,totalScheduled:0})
 if(plan==='nao_elegivel')return rejection('unsupported_plan')
 if(paymentStatus!=='APPROVED'&&paymentStatus!=='COMPLETE')return rejection('not_paid')
 if(subscriptionPayment!==true||installment===true)return rejection('not_subscription_renewal')
 if(!Number.isInteger(recurrence)||recurrence<=1)return rejection('initial_purchase')
 if(!productId||!subscriberCode||!transactionId)return rejection('missing_identifier')
 const date=Date.parse(paidAt),start=Date.parse(startsAt),
  baseline=Date.parse(baselineAt),today=Date.parse(at)
 if(![date,start,baseline,today].every(Number.isFinite))return rejection('missing_baseline_or_date')
 if(date<=baseline||date<start)return rejection('before_baseline')
 if(!Number.isSafeInteger(rulePoints)||rulePoints<1)return rejection('invalid_rule')
 const quantity=periodDays===90?3:1
 const competencies=Array.from({length:quantity},(_,n)=>{
  const dueAt=addMonthsClamped(paidAt,n)
  return {
   key:'hotmart:'+productId+':'+transactionId+':competencia:'+String(n+1),
   transactionId,subscriberCode,ordinal:n+1,dueAt,
   points:rulePoints,releaseEligible:Date.parse(dueAt)<=today
  }
 })
 return {eligible:true,plan,competencies,
  totalDue:competencies.filter(c=>c.releaseEligible).reduce((n,c)=>n+c.points,0),
  totalScheduled:competencies.reduce((n,c)=>n+c.points,0)}
}
