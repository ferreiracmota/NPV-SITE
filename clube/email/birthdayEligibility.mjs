// Classificação defensiva para aniversários. Nunca equiparar "cadastro aprovado" a assinatura ativa.
const normalEmail=e=>typeof e==='string'&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim().toLowerCase())?e.trim().toLowerCase():null
const inactiveStatuses=new Set(['INACTIVE','CANCELLED_BY_CUSTOMER','CANCELLED_BY_ADMIN'])
export function birthdayDateParts(now=new Date()){
 const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'America/Sao_Paulo',day:'2-digit',month:'2-digit',year:'numeric'}).formatToParts(now)
 const take=type=>parts.find(x=>x.type===type)?.value
 const year=Number(take('year')),day=take('day'),month=take('month')
 const current=day+'-'+month
 // 29/02 é comemorado em 28/02 nos anos não bissextos.
 const leap=year%4===0&&(year%100!==0||year%400===0)
 return {year,mmdd:current,alsoFeb29:current==='28-02'&&!leap}
}
export function classifyBirthdayMembers({profiles=[],subscriptions=[],freeAccess=[],admins=[],preferences=[]},now=new Date()){
 const today=birthdayDateParts(now)
 if(!Number.isInteger(today.year)||!Array.isArray(subscriptions))throw Error('incomplete_snapshot')
 const grouped=new Map()
 let unknownActiveIdentity=false
 for(const s of subscriptions){
  const status=String(s.status||'').toUpperCase()
  const email=normalEmail(s.subscriber_email)
  if(status==='ACTIVE'&&!email)unknownActiveIdentity=true
  if(!email)continue
  grouped.set(email,[...(grouped.get(email)||[]),status])
 }
 const free=new Set(freeAccess.filter(x=>x.enabled===true).map(x=>x.student_id))
 const adminsSet=new Set(admins.map(x=>x.user_id))
 const prefs=new Map(preferences.map(x=>[x.student_id,x]))
 const choices=[]
 for(const p of profiles){
  if(!p.approved||adminsSet.has(p.id)||!normalEmail(p.email))continue
  if(p.birthday_mmdd!==today.mmdd&&!(today.alsoFeb29&&p.birthday_mmdd==='29-02'))continue
  const states=grouped.get(normalEmail(p.email))||[]
  const confirmedActive=states.includes('ACTIVE')
  const freeAuthorized=free.has(p.id)
  const approvedInactive=states.length>0&&states.every(x=>inactiveStatuses.has(x))
  if(confirmedActive||freeAuthorized){choices.push({id:p.id,email:normalEmail(p.email),kind:'active'});continue}
  // Ex-aluna: vínculo histórico demonstrado, sem assinatura ativa, e consentimento explícito.
  // Se alguma assinatura ativa veio sem e-mail, não inferir inatividade de ninguém.
  const pref=prefs.get(p.id)
  if(!unknownActiveIdentity&&approvedInactive&&p.birthday_exstudent_opt_in===true
    &&pref?.notify_unlocks!==false&&pref?.notify_new_rewards!==false)
   choices.push({id:p.id,email:normalEmail(p.email),kind:'inactive'})
 }
 return {choices,year:today.year,mmdd:today.mmdd}
}
