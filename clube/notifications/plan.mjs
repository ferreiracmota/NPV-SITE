export const validReward = r => Boolean(r && r.active === true && r.test_only === false && Number(r.stock) > 0 && Number(r.points) > 0)
const toTime = x => new Date(x).getTime()
const sum = a => a.reduce((n,x)=>n+Number(x.points||0),0)
const id = x => x.student_id + ':' + x.reward_id + ':' + x.kind

// Plano deterministico: nenhuma chamada de rede, nenhum dado de contato nos resultados.
export function planClubeEmail({profiles,preferences,rewards,events,redemptions,deliveries,admins,liveAfter,now=Date.now()}) {
  const activated=toTime(liveAfter)
  if(!Number.isFinite(activated)||activated>now) return []
  const adminIds = new Set(admins.map(a=>a.user_id))
  const existing = new Set(deliveries.map(id))
  const planned=[]
  for(const p of profiles) {
    if(!p.approved || !p.email || adminIds.has(p.id)) continue
    const pref=preferences.find(x=>x.student_id===p.id)
    if(!pref || (!pref.reward_ready&&!pref.new_reward)) continue
    const consent=toTime(pref.opted_in_at)
    if(!Number.isFinite(consent)||consent>now) continue
    const since=Math.max(consent,activated)
    const personEvents=events.filter(e=>e.student_id===p.id&&!e.is_test)
    const balance=sum(personEvents)
    const before=sum(personEvents.filter(e=>toTime(e.created_at)<since))
    const postPositive=personEvents.some(e=>toTime(e.created_at)>=since && Number(e.points)>0)
    const reserved=sum(redemptions.filter(x=>x.student_id===p.id&&x.status==='pending'&&!x.is_test))
    const available=Math.max(0,balance-reserved)
    for(const r of rewards) {
      if(!validReward(r))continue
      const isNew=pref.new_reward && toTime(r.created_at)>=since
      const hasUnlocked=pref.reward_ready && postPositive && before < Number(r.points) && available>=Number(r.points)
      const kind=isNew?'new_reward':(hasUnlocked?'reward_ready':null)
      if(!kind) continue
      const x={student_id:p.id,reward_id:r.id,kind}
      if(existing.has(id(x)))continue
      planned.push({ ...x,recipient:p.email,first_name:(p.full_name||'').trim().split(/\s+/)[0]||'aluna',
        reward_name:r.name,points:Number(r.points)})
    }
  }
  return planned
}
