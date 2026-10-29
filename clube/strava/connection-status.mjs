// Somente metadados de vínculo verificado: jamais persiste tokens Strava.
import {createClient} from '@supabase/supabase-js'
export async function recordStravaConnectionStatus(studentId,connected){
 if(!/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(studentId||''))return false
 const url=process.env.VITE_CLUBE_SUPABASE_URL||process.env.SUPABASE_URL
 const key=process.env.SUPABASE_SERVICE_ROLE_KEY
 if(!url||!key){console.error('[strava] status persistence unavailable: backend configuration');return false}
 try{
  const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}})
  const at=new Date().toISOString()
  const {error}=await db.from('clube_strava_connection_status').upsert({
   student_id:studentId,connected:connected===true,verified_at:at,updated_at:at
  },{onConflict:'student_id'})
  if(error)console.error('[strava] status persistence failed:',error.code||'database_error')
  return !error
 }catch{console.error('[strava] status persistence failed: unexpected error');return false}
}
