// Regras de visualização: não credita pontos, não armazena atividades do Strava.
const SPORTS = new Set(['Run','Walk','Ride']);
export const ELIGIBLE_CHALLENGE_SPORTS = Object.freeze(['Run','Walk','Ride']);

export function currentNpvMonth(now=new Date()){
  const parts = new Intl.DateTimeFormat('en-US',{
    timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit'
  }).formatToParts(now);
  const year = Number(parts.find(x=>x.type==='year')?.value);
  const month = Number(parts.find(x=>x.type==='month')?.value);
  if(!Number.isInteger(year)||!Number.isInteger(month)||month<1||month>12)throw new Error('Invalid calendar');
  return `${year}-${String(month).padStart(2,'0')}`;
}
export function activityWindow(now=new Date()){
  const monthKey=currentNpvMonth(now);
  const [y,m]=monthKey.split('-').map(Number);
  // Um dia de margem cobre diferenças entre UTC e horário local de atividades.
  const monthStart=Math.floor(Date.UTC(y,m-1,1)/1000)-86400;
  const sevenDaysAgo=Math.floor(now.getTime()/1000)-7*86400;
  return {monthKey,after:Math.min(monthStart,sevenDaysAgo),before:Math.floor(now.getTime()/1000),sevenDaysAgo};
}
export function monthlyActivitySummary(items,monthKey){
  if(!Array.isArray(items)||!/^20\d\d-(0[1-9]|1[0-2])$/.test(monthKey))throw new TypeError('Invalid month activity input');
  const seen=new Set();
  let meters=0,activityCount=0;
  for(const item of items){
    if(!item||typeof item.start_date_local!=='string'
      ||item.start_date_local.slice(0,7)!==monthKey
      ||!SPORTS.has(item.sport_type)
      ||typeof item.distance!=='number'||!Number.isFinite(item.distance)||item.distance<0)continue;
    const id=item.id==null?null:String(item.id);
    if(id!==null&&seen.has(id))continue;
    if(id!==null)seen.add(id);
    meters+=item.distance;activityCount++;
  }
  return {monthKey,km:Math.round(meters/10)/100,activityCount};
}
export function recentActivities(items,now=new Date()){
  if(!Array.isArray(items))throw new TypeError('Invalid activity input');
  const cutoff=now.getTime()-7*86400000;
  const seen=new Set();
  return items.filter(item=>{
    if(!item||typeof item.start_date_local!=='string')return false;
    const id=item.id==null?null:String(item.id);
    if(id!==null&&seen.has(id))return false;
    if(id!==null)seen.add(id);
    const rawDate=typeof item.start_date==='string'?item.start_date:
      item.start_date_local+'Z';
    const stamp=Date.parse(rawDate);
    return Number.isFinite(stamp)&&stamp>=cutoff&&stamp<=now.getTime()+3600000;
  });
}
export function challengeBar(km,goalKm){
  const distance=Number(km);
  const goal=Number(goalKm);
  if(!Number.isFinite(distance)||distance<0)return {valid:false,ratio:0,percentage:0,completed:false};
  if(!Number.isFinite(goal)||goal<=0)return {valid:false,ratio:0,percentage:0,completed:false};
  const ratio=Math.min(1,Math.max(0,distance/goal));
  return {valid:true,ratio,percentage:Math.round(ratio*100),completed:distance>=goal};
}
