import { createClient } from '@supabase/supabase-js'
import { timingSafeEqual } from 'node:crypto'
import { planClubeEmail } from '../../clube/notifications/plan.mjs'

export const config={maxDuration:60}
const reply=(res,code,obj)=>res.writeHead(code,{
 'Content-Type':'application/json; charset=utf-8',
 'Cache-Control':'private, no-store',
 'X-Content-Type-Options':'nosniff'
}).end(JSON.stringify(obj))
const secure=(a,b)=>{if(!a||!b)return false;const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y)}
const escape=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
async function all(client,table,columns) {
 const {data,error}=await client.from(table).select(columns).limit(501)
 if(error)throw new Error('database_read_failed')
 if(data.length>500)throw new Error('database_page_limit')
 return data
}
function buildEmail(item) {
 const name=escape(item.first_name),reward=escape(item.reward_name)
 const newReward=item.kind==='new_reward'
 const subject=newReward?'Novidade na lojinha NPV: '+item.reward_name:'Você já pode resgatar: '+item.reward_name
 const message=newReward?'Chegou uma nova recompensa ao Clube de Benefícios!':'Seus pontos já são suficientes para esta recompensa!'
 const html='<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#171717">'+
  '<p style="font-size:13px;font-weight:700">NÃO PENSE, VAI! · CLUBE DE BENEFÍCIOS</p>'+
  '<h1 style="font-size:25px">Oi, '+name+'! 💚</h1>'+
  '<p>'+escape(message)+'</p><p><strong>'+reward+'</strong> · '+item.points.toLocaleString('pt-BR')+' pontos</p>'+
  '<p>O resgate depende do seu saldo disponível e do estoque no momento da solicitação.</p>'+
  '<p><a href="https://www.naopensevai.com/clube" style="display:inline-block;background:#151515;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none">Ver lojinha NPV</a></p>'+
  '<hr><p style="font-size:12px;color:#666">Você recebe este e-mail porque ativou avisos no Clube NPV. Para cancelar, entre no Clube e desmarque os avisos em Novidades por e-mail.</p></div>'
 return {subject,html,text:'Oi, '+item.first_name+'! '+message+' '+item.reward_name+' ('+item.points+' pontos). Acesse https://www.naopensevai.com/clube . Para desativar, abra suas preferências de e-mail no Clube.'}
}
export default async function handler(req,res){
 if(req.method!=='GET')return reply(res,405,{status:'method_not_allowed'})
 const env=process.env
 const secret=env.CRON_SECRET
 if(!secure(req.headers.authorization,'Bearer '+secret)||!secret)return reply(res,401,{status:'unauthorized'})
 const url=new URL(req.url||'/api/clube/notification-cron','https://npv.local')
 const preview=url.searchParams.get('dry_run')==='1'
 if(env.NPV_NOTIFICATIONS_ENABLED!=='true'&&!preview)
  return reply(res,200,{status:'disabled',sent:0})
 const cutoff=env.NPV_NOTIFICATIONS_LIVE_AFTER
 if(!cutoff||!Number.isFinite(Date.parse(cutoff)))
  return reply(res,503,{status:'activation_date_required'})
 const key=env.SUPABASE_SERVICE_ROLE_KEY,urlDb=env.VITE_CLUBE_SUPABASE_URL||env.SUPABASE_URL
 if(!key||!urlDb)return reply(res,503,{status:'database_unavailable'})
 if(!preview&&!env.RESEND_API_KEY)return reply(res,503,{status:'sender_unavailable'})
 try {
  const client=createClient(urlDb,key,{auth:{persistSession:false,autoRefreshToken:false}})
  const [profiles,preferences,rewards,events,redemptions,deliveries,admins]=await Promise.all([
   all(client,'clube_profiles','id,full_name,email,approved'),
   all(client,'clube_notification_preferences','student_id,reward_ready,new_reward,opted_in_at'),
   all(client,'clube_rewards','id,name,points,stock,active,test_only,created_at'),
   all(client,'clube_point_events','student_id,points,is_test,created_at'),
   all(client,'clube_redemptions','student_id,points,is_test,status'),
   all(client,'clube_notification_deliveries','student_id,reward_id,kind,status'),
   all(client,'clube_admins','user_id')
  ])
  const candidates=planClubeEmail({profiles,preferences,rewards,events,redemptions,deliveries,admins,liveAfter:cutoff})
  if(preview)return reply(res,200,{status:'dry_run',candidates:candidates.length,emails_sent:0})
  let sent=0,errors=0,skipped=0
  for(const item of candidates.slice(0,25)) {
   // Reserva exclusiva antes de enviar. Caso haja falha ambigua, nao reenviar automaticamente.
   const {error:reservationError}=await client.from('clube_notification_deliveries')
    .insert({student_id:item.student_id,reward_id:item.reward_id,kind:item.kind,status:'reserved'})
   if(reservationError){skipped++;continue}
   try{
    const message=buildEmail(item)
    const response=await fetch('https://api.resend.com/emails',{
      method:'POST',headers:{Authorization:'Bearer '+env.RESEND_API_KEY,'Content-Type':'application/json'},
      body:JSON.stringify({from:'Não Pense, Vai! <clube@naopensevai.com>',to:[item.recipient],
       reply_to:'naopensevai@gmail.com',subject:message.subject,html:message.html,text:message.text})
    })
    if(!response.ok)throw new Error('provider_http_'+response.status)
    await client.from('clube_notification_deliveries').update({status:'sent',sent_at:new Date().toISOString()})
      .eq('student_id',item.student_id).eq('reward_id',item.reward_id).eq('kind',item.kind)
    sent++
   }catch(error) {
    errors++
    await client.from('clube_notification_deliveries').update({status:'error',error_code:String(error.message||'send_failed').slice(0,64)})
      .eq('student_id',item.student_id).eq('reward_id',item.reward_id).eq('kind',item.kind)
   }
   // Resend free: evitar bursts e ficar abaixo da cota diaria.
   await new Promise(r=>setTimeout(r,620))
  }
  return reply(res,200,{status:'processed',candidates:candidates.length,sent,errors,skipped})
 }catch {return reply(res,503,{status:'notification_check_unavailable'})}
}
