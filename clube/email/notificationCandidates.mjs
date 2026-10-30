// Lógica pura: nenhuma consulta ou envio de e-mail neste arquivo.
export function eligibleClubeEmails({profiles=[],preferences=[],admins=[],rewards=[],events=[],redemptions=[],dispatches=[],settings={}},now=Date.now()){
  if(settings?.enabled!==true)return []
  const opt=new Map(preferences.map(p=>[p.student_id,p]))
  const adminsSet=new Set(admins.map(x=>x.user_id))
  const sent=new Set(dispatches.map(x=>x.dedupe_key))
  const liveRewards=rewards.filter(r=>r.active===true&&Number(r.stock)>0&&r.test_only!==true&&Number(r.points)>0)
  const approved=profiles.filter(p=>p.approved===true&&!adminsSet.has(p.id)&&/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(p.email||''))
  const result=[]
  for(const member of approved){
    const pref=opt.get(member.id)
    // Avisos operacionais habilitados para alunos aprovados por padrão.
    // Preferências registradas de cancelamento continuam sendo respeitadas.
    const notifyUnlocks=pref?.notify_unlocks!==false
    const notifyNewRewards=pref?.notify_new_rewards!==false
    if(!notifyUnlocks&&!notifyNewRewards)continue
    const studentEvents=events.filter(e=>e.student_id===member.id&&e.is_test!==true)
    const total=studentEvents.reduce((s,e)=>s+Number(e.points||0),0)
    const reserved=redemptions.filter(e=>e.student_id===member.id&&e.status==='pending'&&e.is_test!==true)
      .reduce((s,e)=>s+Number(e.points||0),0)
    const available=Math.max(0,total-reserved)
    const common={studentId:member.id,email:member.email,firstName:(member.full_name||'').trim().split(/\s+/)[0]||'Aluna',available}
    if(notifyNewRewards){
      // Marco de ativação evita qualquer disparo retroativo de prêmios antigos.
      const since=Math.max(Date.parse(settings.catalog_since||'')||now,Date.parse(pref?.created_at||'')||0)
      const fresh=liveRewards.filter(r=>(Date.parse(r.created_at||'')||0)>since)
        .sort((a,b)=>String(b.created_at||'').localeCompare(String(a.created_at||'')))
      const reward=fresh.find(r=>!sent.has('new:'+member.id+':'+r.id))
      if(reward){
        result.push({...common,kind:'new_reward',reward,duplicateKey:'new:'+member.id+':'+reward.id})
      }
    }
    if(notifyUnlocks){
      // Só um ganho real após a ativação pode cruzar o limiar de pontos.
      // Não notificar premiações já disponíveis antes de ligar a rotina.
      const since=Math.max(Date.parse(settings.catalog_since||'')||now,Date.parse(pref?.created_at||'')||0)
      const recentGain=studentEvents.filter(e=>(Date.parse(e.created_at||'')||0)>since)
        .reduce((s,e)=>s+Number(e.points||0),0)
      const previous=Math.max(0,available-recentGain)
      const unlocked=liveRewards.filter(r=>available>=Number(r.points)&&previous<Number(r.points)
        &&!sent.has('unlock:'+member.id+':'+r.id))
        .sort((a,b)=>Number(b.points)-Number(a.points))
      const reward=unlocked.find(r=>!result.some(x=>x.studentId===member.id&&x.reward.id===r.id))
      if(reward){
        result.push({...common,kind:'reward_unlocked',reward,duplicateKey:'unlock:'+member.id+':'+reward.id})
      }
    }
  }
  // Um aviso de cada tipo por pessoa a cada execução; máximo global antes do envio.
  return result.slice(0,80)
}
export function emailContent(candidate,{unsubscribeUrl=''}={}){
  const escape=s=>String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]))
  const name=escape(candidate.firstName),prize=escape(candidate.reward.name)
  const points=Number(candidate.reward.points).toLocaleString('pt-BR')
  const available=Number(candidate.available).toLocaleString('pt-BR')
  const unlocked=candidate.kind==='reward_unlocked'
  const subject=unlocked?'Você já pode resgatar um prêmio no Clube NPV!':'Tem novidade na lojinha do Clube NPV!'
  const title=unlocked?'Seus pontos viraram uma conquista!':'Olha a novidade que chegou!'
  const phrase=unlocked?`Você tem ${available} pontos disponíveis e já alcançou os ${points} pontos necessários para o prêmio <strong>${prize}</strong>.`
    :`O prêmio <strong>${prize}</strong> chegou à lojinha por ${points} pontos. Confira no Clube se você já pode resgatar!`
  const text=unlocked?`Oi, ${candidate.firstName}! Você tem ${available} pontos e já pode solicitar o prêmio ${candidate.reward.name} (${points} pontos). Acesse https://www.naopensevai.com/clube. A disponibilidade é confirmada no momento do pedido.`
    :`Oi, ${candidate.firstName}! Chegou à lojinha do Clube NPV: ${candidate.reward.name}, por ${points} pontos. Acesse https://www.naopensevai.com/clube para conferir.`
  const safeUnsubscribe=unsubscribeUrl&&/^https:\/\/www\.naopensevai\.com\/api\/clube\/email-unsubscribe\?/.test(unsubscribeUrl)?escape(unsubscribeUrl):''
  const footer=safeUnsubscribe?`<a href="${safeUnsubscribe}" style="color:#555">Cancelar avisos por e-mail</a>`:''
  const textWithOptout= text+(safeUnsubscribe?' Para cancelar estes avisos: '+unsubscribeUrl:'')
  const html=`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"></head><body style="margin:0;background:#f4f4f1;font-family:Arial,Helvetica,sans-serif;color:#111"><main style="max-width:560px;margin:32px auto;padding:32px;background:#fff;border-radius:16px"><p style="font-size:12px;letter-spacing:1px;font-weight:700">NÃO PENSE, VAI! ✦ CLUBE DE BENEFÍCIOS</p><h1 style="font-size:28px;line-height:1.2">${title}</h1><p>Oi, ${name}! 💚</p><p style="line-height:1.7">${phrase}</p><a href="https://www.naopensevai.com/clube" style="display:inline-block;background:#131313;color:#fff;text-decoration:none;padding:14px 20px;border-radius:8px;font-weight:bold">Ver a lojinha do Clube</a><p style="font-size:12px;color:#666;line-height:1.6;margin-top:28px">Prêmios sujeitos à disponibilidade e confirmação do pedido. Este é um aviso sobre os benefícios do seu Clube NPV. ${footer}</p></main></body></html>`
  return {subject,html,text:textWithOptout}
}
