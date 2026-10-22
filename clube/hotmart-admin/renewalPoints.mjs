// Cálculo exibido no ADMIN. Não concede créditos ao extrato.
// Números só aparecem quando o histórico de compras foi integralmente
// verificado e cada recorrência teve transação aprovada identificável.
export function calculateRenewalPoints(subscription,pointsPerRenewal) {
  const rate=Number(pointsPerRenewal)
  const validRate=pointsPerRenewal!==null&&pointsPerRenewal!==undefined&&
    Number.isSafeInteger(rate)&&rate>=0&&rate<=100000
  if(!validRate)return {renewals:null,total:null,reason:'rule_unavailable'}
  const verified=subscription?.payment_history_complete===true&&
    subscription.recurring_audit==='payment_recurrences_identified'&&
    Number.isSafeInteger(subscription.renewal_cycles)&&
    subscription.renewal_cycles>=0&&subscription.renewal_cycles<=10000
  if(!verified)return {renewals:null,total:null,reason:'payment_not_verified'}
  const total=rate*subscription.renewal_cycles
  if(!Number.isSafeInteger(total))return {renewals:null,total:null,reason:'overflow'}
  // Trimestral: é apenas valor nominal por renovação de cobrança;
  // crédito de três competências mensais NÃO acontece de uma vez.
  return {
    renewals:subscription.renewal_cycles,total,rate,
    reason:subscription.plan==='trimestral'?'quarterly_installments':'calculated',
    linked:subscription.linked===true&&subscription.link_status==='linked',
    credited:false
  }
}
