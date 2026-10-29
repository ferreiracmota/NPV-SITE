// Atualiza apenas metadados da conexao Strava, nunca token ou atividades.
// Falhas de armazenamento nao interrompem OAuth nem a leitura individual.
import {createClient} from '@supabase/supabase-js'
export async function recordStravaConnection(user,connected,{env=process.env,clock=()=>new Date()}={}){
 if(!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(String(user||''))||typeof connected!=='boolean')return false
 const url=env.VITE_CLUBE_SUPABASE_URL||env.SUPABASE_URL
 const key=env.SUPABASE_SERVICE_ROLE_KEY
 if(!url||!key)return false
 try{
   const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}})
   const at=clock().toISOString()
   const {error}=await db.from('clube_strava_connection_status').upsert({
     student_id:user,connected,verified_at:connected?at:null,updated_at:at
   },{onConflict:'student_id'})
   return !error
 }catch{return false}
}
