import {groupSubscriberHistory,calculateReturningSubscriberPoints} from './subscriberHistory.mjs'

/**
 * Pagamentos são calculados com base em comprovantes verificados pela Hotmart.
 * A primeira compra de uma pessoa não recebe 400 pontos; recontratação após
 * cancelamento, pelo mesmo e-mail, recebe UM ciclo de continuidade.
 * Não credita contratos com histórico incompleto ou trimestrais antecipadamente.
 */
export function verifiedMonthlyRenewalTargets(subscriptions,rate){
  if(!Number.isSafeInteger(rate)||rate<1||rate>100000)return []
  const groups=groupSubscriberHistory(subscriptions)
  const results=[]
  for(const group of groups){
    if(!group.linked||!group.subscriber_email||!group.key?.startsWith('email:'))continue
    const items=group.subscriptions
    if(!items.length||items.some(r=>r.plan!=='mensal'||r.linked!==true
       ||r.link_status!=='linked'||r.payment_history_complete!==true
       ||r.recurring_audit!=='payment_recurrences_identified'
       ||!Number.isSafeInteger(r.renewal_cycles)||r.renewal_cycles<0
       ||!Number.isSafeInteger(r.paid_recurrences)||r.paid_recurrences<1))continue
    const base=items.reduce((sum,r)=>sum+r.renewal_cycles,0)
    const returning=calculateReturningSubscriberPoints(group,rate)
    const cycles=base+(returning?1:0)
    if(!Number.isSafeInteger(cycles)||cycles<1||cycles>10000)continue
    const total=cycles*rate
    if(!Number.isSafeInteger(total)||total>10000000)continue
    results.push({email:group.subscriber_email,cycles,total,returning:Boolean(returning),
      contractCount:items.length})
  }
  return results
}
export function creditDifference(target,existingRenewalCredits){
  const past=Number(existingRenewalCredits)
  if(!Number.isSafeInteger(past)||past<0||past>10000000)return null
  if(!Number.isSafeInteger(target?.total)||target.total<1)return null
  return Math.max(0,target.total-past)
}
