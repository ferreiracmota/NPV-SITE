// Agrupamento SOMENTE para visualização. Não cria identidade, cadastro ou crédito.
// E-mail ausente não permite agrupar registros com nomes parecidos.
export function groupSubscriberHistory(subscriptions=[]){
  const groups=new Map()
  for(const row of subscriptions){
    const email=typeof row.subscriber_email==='string'?row.subscriber_email.trim().toLowerCase():''
    const key=email&&email.includes('@')
      ?'email:'+email
      :'subscription:'+String(row.subscriber_code||row.id)
    const group=groups.get(key)||{
      key,subscriber_name:row.subscriber_name||null,subscriber_email:email||null,
      subscriptions:[],active:false,returning:false,clube_balance:null,
      link_status:null,linked:false
    }
    group.subscriptions.push(row)
    if(row.status==='ACTIVE'){group.active=true;group.subscriber_name=row.subscriber_name||group.subscriber_name}
    if(row.linked===true&&row.link_status==='linked'){
      group.linked=true;group.link_status='linked'
      if(Number.isSafeInteger(row.clube_balance))group.clube_balance=row.clube_balance
    }
    groups.set(key,group)
  }
  for(const group of groups.values()){
    group.subscriptions.sort((a,b)=>Number(b.status==='ACTIVE')-Number(a.status==='ACTIVE')
      ||(b.accession_at||'').localeCompare(a.accession_at||''))
    const nonActive=group.subscriptions.some(row=>row.status==='CANCELLED_BY_ADMIN'
      ||row.status==='CANCELLED_BY_CUSTOMER'||row.status==='INACTIVE')
    group.returning=group.active&&group.subscriptions.length>1&&nonActive
    if(!group.linked)group.link_status=group.subscriptions[0]?.link_status||'verification_unavailable'
  }
  return [...groups.values()].sort((a,b)=>Number(b.active)-Number(a.active)
    ||(b.subscriptions[0]?.accession_at||'').localeCompare(a.subscriptions[0]?.accession_at||''))
}

/**
 * Um novo contrato mensal pago pela mesma assinante, após cancelamento,
 * representa a continuidade da assinatura: a primeira compra do novo contrato
 * conta como UMA renovação da pessoa (não é uma renovação do contrato isolado).
 * Somente cálculo informativo no administrativo; nenhum crédito no Clube.
 * Exige histórico verificável e e-mail estável. Nunca soma lançamentos futuros.
 */
export function calculateReturningSubscriberPoints(group,rate){
  if(!group?.returning||!group?.subscriber_email||!group?.key?.startsWith('email:'))
    return null
  const value=Number(rate)
  if(rate===null||rate===undefined||!Number.isSafeInteger(value)||value<0||value>100000)
    return null
  const rows=[...(group.subscriptions||[])].sort((a,b)=>
    String(a.accession_at||'').localeCompare(String(b.accession_at||'')))
  if(rows.length<2)return null
  if(rows.some(x=>x.plan!=='mensal'||!x.accession_at||
    x.payment_history_complete!==true||x.recurring_audit!=='payment_recurrences_identified'||
    !Number.isSafeInteger(x.renewal_cycles)||x.renewal_cycles<0||
    !Number.isSafeInteger(x.paid_recurrences)||x.paid_recurrences<1))
    return null
  const active=rows.filter(x=>x.status==='ACTIVE')
  // Não marcar como renovação se existir mais de um contrato ativo em paralelo.
  if(active.length!==1)return null
  const current=active[0]
  const older=rows.filter(x=>x.id!==current.id&&
    String(x.accession_at)<String(current.accession_at))
  const previousCancelled=older.some(x=>
    ['CANCELLED_BY_CUSTOMER','CANCELLED_BY_ADMIN','INACTIVE'].includes(x.status))
  if(!previousCancelled)return null
  const pastRenewals=older.reduce((sum,x)=>sum+x.renewal_cycles,0)
  const currentRenewals=current.renewal_cycles
  const accumulatedRenewals=pastRenewals+currentRenewals+1
  const total=accumulatedRenewals*value
  if(!Number.isSafeInteger(total))return null
  return {
    total,rate:value,renewals:accumulatedRenewals,
    previousPoints:pastRenewals*value,
    continuingRenewals:currentRenewals,
    returnBonus:value,
    currentSubscriptionId:current.id,
    credited:false
  }
}
