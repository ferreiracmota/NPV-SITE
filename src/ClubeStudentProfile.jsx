import React,{useEffect,useMemo,useState} from 'react'
import {ArrowRight,Check,Download,Instagram,Mail,Phone,ShieldCheck,Trophy,UserRound,Wallet,Medal,Footprints,CalendarDays,Activity} from 'lucide-react'
import {firstNameOf,memberAchievements} from '../clube/profile/achievements.mjs'
import {BIRTHDAY_MONTHS,BIRTHDAY_DAYS,birthdayParts,birthdayFromParts,validOptionalPhone} from '../clube/profile/birthday.mjs'
import './ClubeStudentProfile.css'

const fmt=n=>Number(n||0).toLocaleString('pt-BR')
const joined=date=>date?new Date(date).toLocaleDateString('pt-BR',{month:'short',year:'numeric'}):'—'
function drawCard(name,progress,date){
  const canvas=document.createElement('canvas')
  canvas.width=1000;canvas.height=1050
  const c=canvas.getContext('2d')
  if(!c)throw new Error('canvas_unavailable')
  const bg=c.createLinearGradient(0,0,1000,1050)
  bg.addColorStop(0,'#111b15');bg.addColorStop(1,'#284936')
  c.fillStyle=bg;c.fillRect(0,0,1000,1050)
  const text=(value,x,y,size=34,color='#ffffff',weight='600')=>{
    c.fillStyle=color;c.font=weight+' '+size+'px Arial, sans-serif';c.fillText(String(value),x,y)
  }
  c.textBaseline='alphabetic'
  text('NÃO PENSE, VAI!   ✦   CLUBE DE BENEFÍCIOS',66,95,24,'#e1edce','700')
  c.strokeStyle='rgba(255,255,255,.20)';c.beginPath();c.moveTo(66,125);c.lineTo(934,125);c.stroke()
  c.fillStyle='#3e5b47';c.beginPath();c.arc(135,245,64,0,Math.PI*2);c.fill()
  text(firstNameOf(name).charAt(0).toLocaleUpperCase('pt-BR'),113,267,68,'#e4f3b9','800')
  const normalized=String(name||'Aluna NPV').trim()
  const display=normalized.length>27?normalized.slice(0,26)+'…':normalized
  text(display,232,229,42,'#ffffff','800')
  text('NÍVEL '+progress.level+'  ·  '+progress.levelName.toLocaleUpperCase('pt-BR'),232,275,25,'#cfe9a8','700')
  text('SUA EVOLUÇÃO É SUA CONQUISTA',66,391,25,'#cfe9a8','700')
  text(fmt(progress.earned)+' PONTOS CONQUISTADOS',66,456,42,'#ffffff','800')
  c.fillStyle='rgba(255,255,255,.17)';c.fillRect(66,490,868,14)
  c.fillStyle='#c4e451';c.fillRect(66,490,868*progress.progress/100,14)
  text(progress.next===null?'Nível máximo alcançado':'Faltam '+fmt(progress.remaining)+' pontos para o próximo nível',66,544,23,'#dbe8d7','500')
  c.strokeStyle='rgba(255,255,255,.18)';c.beginPath();c.moveTo(66,588);c.lineTo(934,588);c.stroke()
  const stats=[['DESAFIOS',fmt(progress.challenges)],['TROFÉUS',fmt(progress.trophies)],['MEMBRO DESDE',joined(date).toLocaleUpperCase('pt-BR')]]
  stats.forEach((s,i)=>{const x=66+i*300;text(s[1],x,697,i===2?27:52,'#dcf394','800');text(s[0],x,743,19,'#e3e8de','700')})
  text('Sua jornada continua. Começar antes de estar pronto.',66,886,25,'#dce9d6','500')
  text('NPV ✦',805,962,42,'#c4e451','800')
  return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('png_unavailable')),'image/png'))
}
export default function ClubeStudentProfile({profile,email,events=[],session,onSaved,onInstagram,onStrava}){
  const [name,setName]=useState(profile?.full_name||'')
  const [phone,setPhone]=useState(profile?.phone||'')
  const [birthdayDay,setBirthdayDay]=useState(birthdayParts(profile?.birthday_mmdd).day)
  const [birthdayMonth,setBirthdayMonth]=useState(birthdayParts(profile?.birthday_mmdd).month)
  const [birthdayExOptIn,setBirthdayExOptIn]=useState(profile?.birthday_exstudent_opt_in===true)
  const [saving,setSaving]=useState(false)
  const [notice,setNotice]=useState('')
  const [exporting,setExporting]=useState(false)
  useEffect(()=>{setName(profile?.full_name||'');setPhone(profile?.phone||'');setBirthdayDay(birthdayParts(profile?.birthday_mmdd).day);setBirthdayMonth(birthdayParts(profile?.birthday_mmdd).month);setBirthdayExOptIn(profile?.birthday_exstudent_opt_in===true);setNotice('')},[profile?.id,profile?.full_name,profile?.phone,profile?.birthday_mmdd,profile?.birthday_exstudent_opt_in])
  const achievements=useMemo(()=>memberAchievements(events,profile?.id),[events,profile?.id])
  const yearJoined=joined(profile?.created_at)
  async function save(e){
    e.preventDefault()
    if(saving||!session?.access_token)return
    const birthday=birthdayFromParts(birthdayDay,birthdayMonth)
    if(!birthday){setNotice('Informe um dia e mês de nascimento válidos.');return}
    if(!validOptionalPhone(phone)){setNotice('Confira o WhatsApp informado.');return}
    setSaving(true);setNotice('')
    try{
      const response=await fetch('/api/clube/profile',{method:'PATCH',headers:{Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},body:JSON.stringify({full_name:name.trim(),phone:phone.trim(),birthday_mmdd:birthday,birthday_exstudent_opt_in:birthdayExOptIn})})
      const payload=await response.json()
      if(!response.ok)throw new Error(payload.error||'profile_update_failed')
      onSaved?.(payload.profile)
      setNotice('Seu perfil foi atualizado!')
    }catch{setNotice('Não foi possível salvar. Confira seus dados e tente novamente.')}
    finally{setSaving(false)}
  }
  async function downloadCard(){
    if(exporting)return
    setExporting(true)
    try{
      const blob=await drawCard(profile?.full_name,achievements,profile?.created_at)
      const file=new File([blob],'meu-perfil-npv.png',{type:'image/png'})
      if(navigator.canShare?.({files:[file]})&&navigator.share){
        try{await navigator.share({files:[file],title:'Minha evolução no Clube NPV'});return}
        catch(e){if(e?.name==='AbortError')return}
      }
      const url=URL.createObjectURL(blob)
      const a=document.createElement('a');a.href=url;a.download='meu-perfil-npv.png';document.body.appendChild(a);a.click();a.remove()
      setTimeout(()=>URL.revokeObjectURL(url),2000)
    }catch{setNotice('Não foi possível gerar a imagem agora. Você pode tirar um print do cartão.')}
    finally{setExporting(false)}
  }
  return <section className="npv-profile-page" aria-label="Meu perfil NPV">
    <header className="npv-profile-heading"><span>MINHA CONTA NPV ✦</span><h1>Meu perfil</h1><p>Suas conquistas, seu ritmo e sua história no Clube.</p></header>
    <div className="npv-profile-hero" aria-label="Cartão pessoal de conquistas, sem dados de contato">
      <div className="npv-profile-hero-head"><span>✦ NÃO PENSE, VAI! <b>CLUBE DE BENEFÍCIOS</b></span><ShieldCheck size={21}/></div>
      <div className="npv-profile-identity"><span className="npv-profile-initial" aria-hidden="true">{firstNameOf(profile?.full_name).charAt(0).toLocaleUpperCase('pt-BR')}</span><div><span className="npv-profile-kicker">MEMBRO NÃO PENSE, VAI!</span><h2>{profile?.full_name||'Aluna NPV'}</h2><span className="npv-profile-level">Nível {achievements.level} · {achievements.levelName}</span></div></div>
      <div className="npv-profile-progress"><div className="npv-profile-progress-line"><strong>{fmt(achievements.earned)} pontos conquistados</strong><span>{achievements.next===null?'Nível máximo':achievements.progress+'%'}</span></div><div className="npv-profile-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={achievements.progress} aria-label="Progresso para o próximo nível"><span style={{width:achievements.progress+'%'}}/></div><small>{achievements.next===null?'Você alcançou o nível Sem limites!':'Faltam '+fmt(achievements.remaining)+' pontos para o próximo nível'}</small></div>
      <div className="npv-profile-stat-grid">
        <div><Trophy size={22}/><strong>{fmt(achievements.challenges)}</strong><small>Desafios concluídos</small></div>
        <div><Medal size={22}/><strong>{fmt(achievements.trophies)}</strong><small>Troféus</small></div>
        <div><CalendarDays size={22}/><strong className="npv-profile-date">{yearJoined}</strong><small>Membro desde</small></div>
      </div>
      <div className="npv-profile-card-foot"><span>Sua evolução é sua conquista.</span><strong>NPV ✦</strong></div>
    </div>
    <div className="npv-profile-share"><p>Esse cartão mostra apenas suas conquistas. Nome, nível e marcos de progresso são visíveis; seu e-mail, telefone e aniversário nunca entram na imagem.</p><button type="button" onClick={downloadCard} disabled={exporting}><Download size={16}/>{exporting?'Preparando imagem...':'Compartilhar / baixar cartão'}</button></div>
    <section className="npv-profile-panel" aria-label="Troféus e conquistas"><div className="npv-profile-panel-title"><div><h2>Minhas conquistas</h2><p>Os troféus aparecem conforme os registros reais do Clube.</p></div><Trophy size={20}/></div><div className="npv-profile-trophies">{achievements.badges.map(t=><div key={t.id} className={'npv-profile-trophy'+(t.earned?' is-earned':'')}><span><Medal size={20}/></span><strong>{t.name}</strong><small>{t.help}</small></div>)}</div></section>
    <section className="npv-profile-panel" aria-label="Meus dados pessoais"><div className="npv-profile-panel-title"><div><h2>Meus dados</h2><p>Essas informações ficam na sua conta e não aparecem no cartão.</p></div><UserRound size={20}/></div><form className="npv-profile-form" onSubmit={save}><label>Nome completo<input required minLength={3} maxLength={80} autoComplete="name" value={name} onChange={e=>setName(e.target.value)}/></label><label>E-mail de acesso <span>(não editável aqui)</span><div className="npv-profile-readonly"><Mail size={16}/>{email||'—'}</div></label><label>Data de nascimento <span>(dia e mês)</span><span className="npv-birthday-inputs"><select aria-label="Dia do nascimento" required value={birthdayDay} onChange={e=>setBirthdayDay(e.target.value)}><option value="">Dia</option>{BIRTHDAY_DAYS.map(d=><option key={d} value={d}>{d}</option>)}</select><select aria-label="Mês do nascimento" required value={birthdayMonth} onChange={e=>setBirthdayMonth(e.target.value)}><option value="">Mês</option>{BIRTHDAY_MONTHS.map((m,i)=><option key={m} value={String(i+1).padStart(2,'0')}>{m}</option>)}</select></span><small>Usaremos esta data para lembrar do seu aniversário.</small></label><label>WhatsApp <span>(opcional)</span><input type="tel" autoComplete="tel" maxLength={24} placeholder="(31) 99999-9999" value={phone} onChange={e=>setPhone(e.target.value)}/></label><label className="npv-birthday-optin"><input type="checkbox" checked={birthdayExOptIn} onChange={e=>setBirthdayExOptIn(e.target.checked)}/><span>Quero receber e-mail de parabéns mesmo se não estiver assinando. <small>Opcional. Nenhum ponto é concedido quando a assinatura estiver inativa.</small></span></label><button type="submit" className="npv-profile-save" disabled={saving}><Check size={16}/>{saving?'Salvando...':'Salvar meus dados'}</button>{notice&&<p className="npv-profile-notice" role="status">{notice}</p>}</form></section>
    <section className="npv-profile-panel" aria-label="Conexões do Clube"><div className="npv-profile-panel-title"><div><h2>Minhas conexões</h2><p>Gerencie suas atividades e Stories.</p></div><Activity size={20}/></div><div className="npv-profile-connections"><button onClick={onInstagram} type="button"><Instagram size={19}/> Instagram e Stories <ArrowRight size={17}/></button><button onClick={onStrava} type="button"><Footprints size={19}/> Strava e desafios <ArrowRight size={17}/></button></div></section>
  </section>
}
