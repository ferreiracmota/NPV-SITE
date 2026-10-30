import {readBirthdaySubscriptionSnapshot} from '../hotmart-admin/reader.mjs'
import {classifyBirthdayMembers,birthdayDateParts} from './birthdayEligibility.mjs'
// Executor diário protegido: sem dados pessoais em logs ou resposta HTTP.
const all=async(db,table,fields,order='id')=>{
 const out=[]
 for(let from=0;from<20000;from+=500){
  const {data,error}=await db.from(table).select(fields).order(order,{ascending:true}).range(from,from+499)
  if(error)throw Error('birthday_read_failed:'+table)
  out.push(...(data||[]))
  if((data||[]).length<500)return out
 }
 throw Error('birthday_source_incomplete')
}
export async function runBirthdayDay(db,env,{loadSnapshot=readBirthdaySubscriptionSnapshot,now=new Date()}={}){
 const today=birthdayDateParts(now)
 const [profiles,admins,freeAccess,preferences]=await Promise.all([
  all(db,'clube_profiles','id,full_name,email,approved,birthday_mmdd,birthday_exstudent_opt_in'),
  all(db,'clube_admins','user_id','user_id'),
  all(db,'clube_birthday_free_access','student_id,enabled','student_id'),
  all(db,'clube_email_preferences','student_id,notify_unlocks,notify_new_rewards','student_id')
 ])
 const adminIds=new Set(admins.map(x=>x.user_id))
 const todays=profiles.filter(p=>p.approved&&!adminIds.has(p.id)&&(p.birthday_mmdd===today.mmdd||(today.alsoFeb29&&p.birthday_mmdd==='29-02')))
 if(!todays.length)return {status:'no_birthdays',credited:0,activeIds:[],inactive:[]}
 // Sem snapshot completo não declaramos assinaturas inativas e não creditamos.
 const snapshot=await loadSnapshot(env)
 if(!snapshot?.complete||!Array.isArray(snapshot.subscriptions))throw Error('hotmart_birthday_unavailable')
 const {choices,year}=classifyBirthdayMembers({profiles:todays,subscriptions:snapshot.subscriptions,
  admins,freeAccess,preferences},now)
 const activeIds=[],inactive=[]
 let credited=0
 for(const person of choices){
  // Verificar que o e-mail do Supabase Auth é o mesmo do Clube e está confirmado.
  const {data,error}=await db.auth.admin.getUserById(person.id)
  if(error||!data?.user||String(data.user.email||'').trim().toLowerCase()!==person.email
    ||!(data.user.email_confirmed_at||data.user.confirmed_at))continue
  if(person.kind==='active'){
   const {data:result,error:awardError}=await db.rpc('clube_credit_birthday_once',{p_student_id:person.id})
   if(awardError)throw Error('birthday_credit_failed')
   if(result==='credited')credited++
   if(result==='credited'||result==='already_awarded')activeIds.push(person.id)
  }else if(person.kind==='inactive')inactive.push(person.id)
 }
 return {status:'checked',credited,activeIds,inactive,year}
}
