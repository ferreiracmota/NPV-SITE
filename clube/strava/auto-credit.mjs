// Um unico criterio para o desafio e para a pontuacao real por km.
// As atividades sao lidas da API Strava somente na requisicao do aluno.
export const STRAVA_SPORTS = Object.freeze(['Run','Walk','Ride']);
export function eligibleMonthMetrics(items,monthKey,enabledSports=STRAVA_SPORTS){
 if(!Array.isArray(items) || !/^20\d\d-(0[1-9]|1[0-2])$/.test(monthKey))
  throw new TypeError('Invalid Strava month summary');
 const allowed=new Set(STRAVA_SPORTS.filter(s=>enabledSports.includes(s)));
 const seen=new Set();
 let totalMeters=0,activityCount=0;
 for(const item of items){
  if(!item || (typeof item.id!=='number' && typeof item.id!=='string')
     || typeof item.start_date_local!=='string'
     || item.start_date_local.slice(0,7)!==monthKey
     || item.manual===true || !allowed.has(item.sport_type)
     || typeof item.distance!=='number' || !Number.isFinite(item.distance)
     || item.distance<=0) continue;
  const id=String(item.id);
  if(seen.has(id))continue;
  seen.add(id);
  totalMeters+=item.distance;
  activityCount++;
 }
 const meters=Math.max(0,Math.floor(totalMeters));
 return {monthKey,meters,km:Math.round(meters/10)/100,activityCount};
}
