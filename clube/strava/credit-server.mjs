// O navegador nao recebe service_role; atividades e tokens Strava nunca sao gravados.
// O RPC privado concilia mensalmente os creditos sob lock transacional.
import {createClient} from '@supabase/supabase-js';
import {eligibleMonthMetrics,STRAVA_SPORTS} from './auto-credit.mjs';
export async function reconcileStravaPoints(studentId,activities,monthKey){
 const url=process.env.VITE_CLUBE_SUPABASE_URL||process.env.SUPABASE_URL;
 const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)throw new Error('supabase_backend_unavailable');
 const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
 const {data:settings,error:settingsError}=await db.from('clube_km_settings')
  .select('points_per_km,eligible_sports').eq('singleton',true).maybeSingle();
 if(settingsError||!settings||!Number.isFinite(Number(settings.points_per_km)))
  throw new Error('km_settings_unavailable');
 const enabled=Array.isArray(settings.eligible_sports)
  ?settings.eligible_sports:STRAVA_SPORTS;
 const monthly=eligibleMonthMetrics(activities,monthKey,enabled);
 const {data,error}=await db.rpc('clube_sync_strava_month',{
  p_student_id:studentId,p_month_key:monthKey,p_eligible_meters:monthly.meters
 });
 if(error||!data||!['ok','not_eligible'].includes(data.status))
  throw new Error('km_credit_unavailable'+(error?.code?':'+error.code:''));
 return {monthly,credit:data};
}
