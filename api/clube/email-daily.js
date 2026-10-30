import {createClient} from '@supabase/supabase-js'
import {eligibleClubeEmails,emailContent} from '../../clube/email/notificationCandidates.mjs'
import {renderTemplateEmail} from '../../clube/email/templateEngine.mjs'
import {handleClubeEmailUnsubscribe} from '../../clube/email/unsubscribe-handler.mjs'
import {emailUnsubscribeUrl} from '../../clube/email/unsubscribe.mjs'
export const config={maxDuration:60}
const respond=(res,status,payload)=>res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}).end(JSON.stringify(payload))
async function allRows(db,table,columns){
  const output=[]
  for(let offset=0;offset<50000;offset+=500){
    const {data,error}=await db.from(table).select(columns).order(table==='clube_email_dispatches'?'dedupe_key':'id'===table?'id':table==='clube_email_preferences'?'student_id':table==='clube_email_templates'?'key':table==='clube_email_settings'?'singleton':table==='clube_admins'?'user_id':table==='clube_profiles'?'id':table==='clube_rewards'?'id':table==='clube_point_events'?'id':table==='clube_redemptions'?'id':'id',{ascending:true}).range(offset,offset+499)
    if(error)throw new Error('query_failed:'+table)
    output.push(...(data||[]))
    if((data||[]).length<500)return output
  }
  throw new Error('too_many_rows')
}
export default async function handler(req,res){
  if(new URL(req.url||'/api/clube/email-daily','https://npv.local').searchParams.get('npv_email_route')==='unsubscribe')return handleClubeEmailUnsubscribe(req,res)
  if(req.method!=='GET')return respond(res,405,{status:'method_not_allowed'})
  const secret=process.env.CRON_SECRET
  if(!secret||secret.length<16)return respond(res,503,{status:'cron_secret_missing'})
  if(req.headers.authorization!==`Bearer ${secret}`)return respond(res,401,{status:'unauthorized'})
  // Dupla trava para que a migração e o deploy nunca iniciem disparos.
  if(process.env.CLUBE_EMAIL_SEND_ENABLED!=='true')return respond(res,200,{status:'disabled',sent:0})
  const dbUrl=process.env.VITE_CLUBE_SUPABASE_URL||process.env.SUPABASE_URL
  const dbKey=process.env.SUPABASE_SERVICE_ROLE_KEY
  const resend=process.env.RESEND_API_KEY
  if(!dbUrl||!dbKey||!resend)return respond(res,503,{status:'missing_server_config'})
  try{
    const db=createClient(dbUrl,dbKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}})
    const {data:settings,error:settingsError}=await db.from('clube_email_settings').select('enabled,catalog_since').eq('singleton',true).single()
    if(settingsError)return respond(res,503,{status:'settings_unavailable'})
    if(settings?.enabled!==true)return respond(res,200,{status:'disabled',sent:0})
    const [profiles,preferences,admins,rewards,events,redemptions,dispatches,templates]=await Promise.all([
      allRows(db,'clube_profiles','id,full_name,email,approved'),
      allRows(db,'clube_email_preferences','student_id,notify_unlocks,notify_new_rewards,created_at,updated_at'),
      allRows(db,'clube_admins','user_id'),
      allRows(db,'clube_rewards','id,name,points,stock,active,test_only,created_at'),
      allRows(db,'clube_point_events','id,student_id,event_type,reference_id,points,is_test,created_at'),
      allRows(db,'clube_redemptions','id,student_id,points,status,is_test'),
      allRows(db,'clube_email_dispatches','dedupe_key'),
      allRows(db,'clube_email_templates','key,name,enabled,subject,headline,body,button_label,active_since')
    ])
    const candidates=eligibleClubeEmails({profiles,preferences,admins,rewards,events,redemptions,dispatches,settings,templates})
    const templateByKey=new Map(templates.map(t=>[t.key,t]))
    let sent=0,failed=0,skipped=0
    // 80/dia reserva margem dentro da cota de 100 envios diários do plano gratuito.
    for(const item of candidates){
      const {error:claimError}=await db.from('clube_email_dispatches').insert({
        dedupe_key:item.duplicateKey,student_id:item.studentId,reward_id:item.reward.id,kind:item.kind,status:'processing'
      })
      if(claimError){
        if(claimError.code==='23505'){skipped++;continue}
        throw new Error('dispatch_log_unavailable')
      }
      try{
        const unsubscribeUrl=emailUnsubscribeUrl(item.studentId,secret)
        const model=templateByKey.get(item.kind)
        const message=model?renderTemplateEmail(item,{template:model,unsubscribeUrl}):emailContent(item,{unsubscribeUrl})
        const response=await fetch('https://api.resend.com/emails',{
          method:'POST',headers:{Authorization:`Bearer ${resend}`,'Content-Type':'application/json'},
          body:JSON.stringify({from:'Não Pense, Vai! <clube@naopensevai.com>',
            to:[item.email],subject:message.subject,html:message.html,text:message.text,
            headers:{
              'List-Unsubscribe':'<'+unsubscribeUrl+'>',
              'List-Unsubscribe-Post':'List-Unsubscribe=One-Click'
            }})
        })
        if(!response.ok){
          await db.from('clube_email_dispatches').update({status:'failed',error_code:`resend_http_${response.status}`})
            .eq('dedupe_key',item.duplicateKey)
          failed++;continue
        }
        const body=await response.json().catch(()=>({}))
        await db.from('clube_email_dispatches').update({status:'sent',sent_at:new Date().toISOString(),
          provider_id:String(body.id||'').slice(0,120)}).eq('dedupe_key',item.duplicateKey)
        sent++
      }catch{
        // O provedor pode ter recebido o e-mail antes da falha de rede: não reenviar automaticamente.
        await db.from('clube_email_dispatches').update({status:'failed',error_code:'network_or_unknown'})
          .eq('dedupe_key',item.duplicateKey)
        failed++
      }
    }
    return respond(res,200,{status:'processed',considered:candidates.length,sent,failed,skipped})
  }catch{
    return respond(res,503,{status:'processing_unavailable'})
  }
}
