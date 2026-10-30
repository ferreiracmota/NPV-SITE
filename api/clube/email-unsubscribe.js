// Solicitação de cancelamento por link assinado; GET apenas exibe confirmação
// (prefetch de provedores não cancela) e POST confirma inclusive via one-click.
import {createClient} from '@supabase/supabase-js'
import {validEmailUnsubscribeToken} from '../../clube/email/unsubscribe.mjs'
const headers={
  'Content-Type':'text/html; charset=utf-8',
  'Cache-Control':'private, no-store, max-age=0',
  'X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY',
  'Referrer-Policy':'no-referrer',
  'Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'"
}
function page(res,code,title,body,form=''){
  res.writeHead(code,headers)
  return res.end(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="font:16px system-ui;background:#f5f5f3;color:#171717;display:grid;place-items:center;min-height:95vh"><main style="background:white;border-radius:16px;max-width:460px;padding:30px;margin:20px"><h1 style="font-size:24px">${title}</h1><p>${body}</p>${form}<p><a href="https://www.naopensevai.com/clube">Voltar ao Clube NPV</a></p></main></body></html>`)
}
export default async function handler(req,res){
  if(req.method!=='GET'&&req.method!=='POST'){
    res.writeHead(405,{...headers,Allow:'GET, POST'});return res.end('Método não permitido')
  }
  const secret=process.env.CRON_SECRET
  let url
  try{url=new URL(req.url,'https://www.naopensevai.com')}catch{return page(res,400,'Link inválido','Solicite um novo aviso para cancelar o recebimento.')}
  const student=url.searchParams.get('student')
  const token=url.searchParams.get('token')
  if(!validEmailUnsubscribeToken(student,token,secret))
    return page(res,400,'Link inválido','Não foi possível validar o cancelamento.')
  if(req.method==='GET'){
    const action='/api/clube/email-unsubscribe?student='+encodeURIComponent(student)+'&token='+encodeURIComponent(token)
    return page(res,200,'Avisos por e-mail','Deseja deixar de receber os avisos de pontos e novos prêmios do Clube NPV?',
      '<form method="post" action="'+action+'"><button type="submit" style="border:0;background:#171717;color:white;padding:14px 20px;border-radius:8px;cursor:pointer">Cancelar avisos por e-mail</button></form>')
  }
  const dbUrl=process.env.VITE_CLUBE_SUPABASE_URL||process.env.SUPABASE_URL
  const dbKey=process.env.SUPABASE_SERVICE_ROLE_KEY
  if(!dbUrl||!dbKey)return page(res,503,'Serviço indisponível','Tente novamente mais tarde.')
  try{
    const db=createClient(dbUrl,dbKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}})
    const {error}=await db.from('clube_email_preferences').upsert({
      student_id:student,notify_unlocks:false,notify_new_rewards:false,
      updated_at:new Date().toISOString()
    },{onConflict:'student_id'})
    if(error)throw error
    return page(res,200,'Avisos cancelados','Você não receberá mais e-mails de pontos suficientes ou novos prêmios. Seus pontos e o acesso ao Clube continuam iguais.')
  }catch{
    return page(res,503,'Não foi possível cancelar','Tente novamente mais tarde.')
  }
}
