// API privada de modelos, prévias e testes; reaproveita /api/clube/student-connections.
import {createClient} from '@supabase/supabase-js'
import {EMAIL_PRESETS,SUPPORTED_NEW_EMAILS,defaultFor,validateTemplate,renderTemplateEmail} from './templateEngine.mjs'
const reply=(res,status,obj)=>res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'private, no-store','Vary':'Authorization','X-Content-Type-Options':'nosniff'}).end(JSON.stringify(obj))
const sample=(email='')=>({firstName:'Aluna',email,available:2000,eventPoints:400,reward:{name:'Garrafinha NPV',points:1500,id:null}})
const clean=x=>String(x||'').trim()
export async function handleClubeEmailAdmin(req,res){
 if(!['GET','POST','PATCH'].includes(req.method))return reply(res,405,{status:'method_not_allowed'})
 const bearer=req.headers?.authorization
 if(typeof bearer!=='string'||!/^Bearer [A-Za-z0-9._~-]{16,4096}$/.test(bearer))return reply(res,401,{status:'unauthorized'})
 const url=process.env.VITE_CLUBE_SUPABASE_URL||process.env.SUPABASE_URL
 const publishable=process.env.VITE_CLUBE_SUPABASE_PUBLISHABLE_KEY||process.env.SUPABASE_PUBLISHABLE_KEY
 const service=process.env.SUPABASE_SERVICE_ROLE_KEY
 if(!url||!publishable||!service)return reply(res,503,{status:'configuration_unavailable'})
 try{
  const reader=createClient(url,publishable,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{headers:{Authorization:bearer}}})
  const {data:auth,error:authError}=await reader.auth.getUser(bearer.slice(7))
  if(authError||!auth?.user?.id)return reply(res,401,{status:'unauthorized'})
  const {data:admin,error:roleError}=await reader.from('clube_admins').select('user_id').eq('user_id',auth.user.id).maybeSingle()
  if(roleError)return reply(res,503,{status:'authorization_unavailable'})
  if(admin?.user_id!==auth.user.id)return reply(res,403,{status:'forbidden'})
  const db=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}})
  if(req.method==='GET'){
   const [templatesResult,dispatchesResult]=await Promise.all([
    db.from('clube_email_templates').select('key,name,enabled,subject,headline,body,button_label,active_since,updated_at').order('created_at',{ascending:true}),
    db.from('clube_email_dispatches').select('student_id,kind,status,created_at,sent_at,error_code').order('created_at',{ascending:false}).limit(30)
   ])
   if(templatesResult.error||dispatchesResult.error)return reply(res,503,{status:'templates_unavailable'})
   const ids=[...new Set((dispatchesResult.data||[]).map(x=>x.student_id).filter(Boolean))]
   let members={}
   if(ids.length){
    const {data}=await db.from('clube_profiles').select('id,full_name,email').in('id',ids)
    members=Object.fromEntries((data||[]).map(x=>[x.id,{name:x.full_name,email:x.email}]))
   }
   return reply(res,200,{status:'ok',templates:templatesResult.data||[],presets:EMAIL_PRESETS,dispatches:(dispatchesResult.data||[]).map(x=>({...x,member:members[x.student_id]||null}))})
  }
  if(!req.body||typeof req.body!=='object'||JSON.stringify(req.body).length>7500)return reply(res,400,{status:'invalid_payload'})
  const mode=clean(req.body.action)
  if(req.method==='POST'&&mode==='create'){
   const key=clean(req.body.key)
   if(!SUPPORTED_NEW_EMAILS.includes(key))return reply(res,400,{status:'unsupported_trigger'})
   const base=defaultFor(key)
   const {data,error}=await db.from('clube_email_templates').insert({...base,active_since:new Date().toISOString()}).select('key').single()
   if(error)return reply(res,error.code==='23505'?409:503,{status:error.code==='23505'?'already_exists':'create_failed'})
   return reply(res,201,{status:'created',key:data.key})
  }
  if(req.method==='PATCH'&&mode==='save'){
   const body=req.body.template
   const err=validateTemplate(body)
   if(err)return reply(res,400,{status:'invalid_template',message:err})
   // Segurança: um modelo para ex-alunas nunca é ativado sem consulta de assinatura
   // e consentimento de comunicação implementados e verificados no backend.
   if(body.key==='birthday_inactive'&&body.enabled)return reply(res,409,{status:'inactive_birthday_automation_not_ready',message:'O aviso de ex-alunas permanece desativado até a integração de assinatura e permissão de contato.'})
   const {data:old,error:fetchError}=await db.from('clube_email_templates').select('enabled').eq('key',body.key).maybeSingle()
   if(fetchError||!old)return reply(res,404,{status:'template_not_found'})
   const next={name:clean(body.name),subject:clean(body.subject),headline:clean(body.headline),body:clean(body.body),button_label:clean(body.button_label),enabled:body.enabled,updated_at:new Date().toISOString()}
   if(!old.enabled&&next.enabled)next.active_since=new Date().toISOString()
   const {error}=await db.from('clube_email_templates').update(next).eq('key',body.key)
   if(error)return reply(res,503,{status:'save_failed'})
   return reply(res,200,{status:'saved'})
  }
  if(req.method==='POST'&&mode==='test'){
   const key=clean(req.body.key)
   if(!EMAIL_PRESETS[key])return reply(res,400,{status:'unsupported_trigger'})
   const {data:template,error}=await db.from('clube_email_templates').select('*').eq('key',key).maybeSingle()
   if(error||!template)return reply(res,404,{status:'template_not_found'})
   // O teste vai SOMENTE para o e-mail da conta administrativa autenticada.
   if(!auth.user.email||!process.env.RESEND_API_KEY)return reply(res,503,{status:'mail_not_configured'})
   const msg=renderTemplateEmail(sample(auth.user.email),{template})
   const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+process.env.RESEND_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({from:'Não Pense, Vai! <clube@naopensevai.com>',to:[auth.user.email],subject:'[TESTE NPV] '+msg.subject,html:msg.html,text:'SIMULAÇÃO DE MODELO — '+msg.text})})
   if(!response.ok)return reply(res,502,{status:'test_send_failed'})
   return reply(res,200,{status:'test_sent',recipient:auth.user.email})
  }
  return reply(res,400,{status:'invalid_action'})
 }catch{return reply(res,503,{status:'email_admin_unavailable'})}
}
