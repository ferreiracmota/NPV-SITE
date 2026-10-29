// Agrupamento SOMENTE para visualização. Não cria identidade, cadastro ou crédito.
// E-mail ausente não permite agrupar registros com nomes parecidos.
export function groupSubscriberHistory(subscriptions=[]){
  const groups=new Map()
  for(const row of subscriptions){
    const email=typeof row.subscriber_email==='string'?row.subscriber_email.trim().toLowerCase():''
    const key=email&&/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)
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
