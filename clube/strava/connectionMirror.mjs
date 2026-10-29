// O Strava mantém a credencial OAuth somente em cookie cifrado no navegador.
// Esta tabela registra apenas confirmação do vínculo, jamais tokens ou atividade.
import {createClient} from '@supabase/supabase-js'
export async function recordStravaConnection(studentId,connected){
  if(!/^[0-9a-f-]{36}$/i.test(studentId||'')||typeof connected!=='boolean')return false
  const url=process.env.VITE_CLUBE_SUPABASE_URL||process.env.SUPABASE_URL
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY
  if(!url||!key)return false
  try{
    const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}})
    const now=new Date().toISOString()
    const {error}=await db.from('clube_strava_connection_status').upsert({
      student_id:studentId,connected,verified_at:connected?now:null,updated_at:now
    },{onConflict:'student_id'})
    return !error
  }catch{return false}
}
