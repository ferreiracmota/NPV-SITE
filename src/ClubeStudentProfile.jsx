import React,{useEffect,useMemo,useState} from 'react'
import {ArrowRight,Check,Download,Instagram,Mail,Phone,ShieldCheck,LockKeyhole,Trophy,UserRound,Wallet,Medal,Footprints,CalendarDays,Activity} from 'lucide-react'
import {firstNameOf,memberAchievements} from '../clube/profile/achievements.mjs'
import {BIRTHDAY_MONTHS,BIRTHDAY_DAYS,birthdayParts,birthdayFromParts,validOptionalPhone} from '../clube/profile/birthday.mjs'
import './ClubeStudentProfile.css'

const fmt=n=>Number(n||0).toLocaleString('pt-BR')
const joined=date=>date?new Date(date).toLocaleDateString('pt-BR',{month:'short',year:'numeric'}):'—'
const CARD_IMAGES={
  1:'/clube/cards/bronze.webp',
  2:'/clube/cards/prata.webp',
  3:'/clube/cards/ouro.webp',
  4:'/clube/cards/platinum.webp',
  5:'/clube/cards/diamante.webp',
  6:'/clube/cards/black.webp'
}
function memberDisplayName(name){
  const parts=String(name||'').trim().split(/\\s+/).filter(Boolean)
  return parts.length>1?parts[0]+' '+parts[parts.length-1]:(parts[0]||'Aluna NPV')
}
async function drawCard(name,progress){
  const source=CARD_IMAGES[progress.level]
  if(!source)throw new Error('no_membership_card')
  const image=new Image()
  image.src=source
  await new Promise((resolve,reject)=>{
    if(image.complete&&image.naturalWidth){resolve();return}
    image.onload=resolve
    image.onerror=()=>reject(new Error('card_image_unavailable'))
  })
  const canvas=document.createElement('canvas')
  canvas.width=image.naturalWidth;canvas.height=image.naturalHeight
  const ctx=canvas.getContext('2d')
  if(!ctx)throw new Error('canvas_unavailable')
  ctx.drawImage(image,0,0)
  const size=Math.round(canvas.width*.025)
  ctx.font='600 '+size+'px Arial, sans-serif'
  ctx.textBaseline='top'
  const display=memberDisplayName(name)
  const maxWidth=canvas.width*.42
  const textWidth=Math.min(ctx.measureText(display).width,maxWidth)
  const x=canvas.width*.065,y=canvas.height*.115
  ctx.fillStyle='rgba(8,12,11,.38)'
  ctx.beginPath()
  ctx.roundRect(x-size*.5,y-size*.4,textWidth+size, size*2, size*.34)
  ctx.fill()
  ctx.shadowColor='rgba(0,0,0,.85)'
  ctx.shadowBlur=6
  ctx.fillStyle='#fffdf5'
  ctx.fillText(display,x,y,maxWidth)
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
    if(exporting||achievements.level===0)return
    setExporting(true)
    try{
      const blob=await drawCard(profile?.full_name,achievements)
      const file=new File([blob],'cartao-npv-'+achievements.levelName.toLowerCase()+'.png',{type:'image/png'})
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
    <section className="npv-membership-section" aria-label="Evolução e cartão de membro NPV">
      {achievements.level>0?
        <div className="npv-membership-front" aria-label={`Cartão NPV ${achievements.levelName}, nível ${achievements.level}, de ${memberDisplayName(profile?.full_name)}`}>
          <img className="npv-membership-art" src={CARD_IMAGES[achievements.level]} alt={`Cartão premium ${achievements.levelName} do Clube NPV`}/>
          <span className="npv-membership-holder">{memberDisplayName(profile?.full_name)}</span>
        </div>
      :<div className="npv-membership-none">
          <LockKeyhole size={24}/><div><strong>Você ainda não possui cartão de nível.</strong><p>Conquiste 2.000 pontos para desbloquear seu primeiro cartão Bronze.</p></div>
        </div>}
      <div className="npv-membership-stats">
        <div className="npv-profile-progress">
          <div className="npv-profile-progress-line"><strong>{fmt(achievements.earned)} pontos conquistados</strong><span>{achievements.next===null?'Nível máximo':achievements.progress+'%'}</span></div>
          <div className="npv-profile-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={achievements.progress} aria-label="Progresso para o próximo nível"><span style={{width:achievements.progress+'%'}}/></div>
          <small>{achievements.next===null?'Você alcançou o nível Black!':'Faltam '+fmt(achievements.remaining)+' pontos para '+(achievements.level===0?'Bronze':({1:'Prata',2:'Ouro',3:'Platinum',4:'Diamante',5:'Black'}[achievements.level]))}</small>
        </div>
        <div className="npv-profile-stat-grid">
          <div><Trophy size={22}/><strong>{fmt(achievements.challenges)}</strong><small>Desafios concluídos</small></div>
          <div><Medal size={22}/><strong>{fmt(achievements.trophies)}</strong><small>Troféus</small></div>
          <div><CalendarDays size={22}/><strong className="npv-profile-date">{yearJoined}</strong><small>Membro desde</small></div>
        </div>
      </div>
    </section>
    <div className="npv-profile-share"><p>{achievements.level===0?'Seu primeiro cartão premium será liberado ao conquistar 2.000 pontos.': 'Seu cartão mostra seu nome e a categoria conquistada. Telefone, e-mail e aniversário não aparecem na frente do cartão.'}</p>{achievements.level>0&&<button type="button" onClick={downloadCard} disabled={exporting}><Download size={16}/>{exporting?'Preparando imagem...':'Compartilhar / baixar cartão'}</button>}</div>
    <section className="npv-profile-panel" aria-label="Troféus e conquistas"><div className="npv-profile-panel-title"><div><h2>Minhas conquistas</h2><p>Os troféus aparecem conforme os registros reais do Clube.</p></div><Trophy size={20}/></div><div className="npv-profile-trophies">{achievements.badges.map(t=><div key={t.id} className={'npv-profile-trophy'+(t.earned?' is-earned':'')}><span><Medal size={20}/></span><strong>{t.name}</strong><small>{t.help}</small></div>)}</div></section>
    <section className="npv-profile-panel" aria-label="Meus dados pessoais"><div className="npv-profile-panel-title"><div><h2>Meus dados</h2><p>Essas informações ficam na sua conta e não aparecem no cartão.</p></div><UserRound size={20}/></div><form className="npv-profile-form" onSubmit={save}><label>Nome completo<input required minLength={3} maxLength={80} autoComplete="name" value={name} onChange={e=>setName(e.target.value)}/></label><label>E-mail de acesso <span>(não editável aqui)</span><div className="npv-profile-readonly"><Mail size={16}/>{email||'—'}</div></label><label>Data de nascimento <span>(dia e mês)</span><span className="npv-birthday-inputs"><select aria-label="Dia do nascimento" required value={birthdayDay} onChange={e=>setBirthdayDay(e.target.value)}><option value="">Dia</option>{BIRTHDAY_DAYS.map(d=><option key={d} value={d}>{d}</option>)}</select><select aria-label="Mês do nascimento" required value={birthdayMonth} onChange={e=>setBirthdayMonth(e.target.value)}><option value="">Mês</option>{BIRTHDAY_MONTHS.map((m,i)=><option key={m} value={String(i+1).padStart(2,'0')}>{m}</option>)}</select></span><small>Usaremos esta data para lembrar do seu aniversário.</small></label><label>WhatsApp <span>(opcional)</span><input type="tel" autoComplete="tel" maxLength={24} placeholder="(31) 99999-9999" value={phone} onChange={e=>setPhone(e.target.value)}/></label><label className="npv-birthday-optin"><input type="checkbox" checked={birthdayExOptIn} onChange={e=>setBirthdayExOptIn(e.target.checked)}/><span>Quero receber e-mail de parabéns mesmo se não estiver assinando. <small>Opcional. Nenhum ponto é concedido quando a assinatura estiver inativa.</small></span></label><button type="submit" className="npv-profile-save" disabled={saving}><Check size={16}/>{saving?'Salvando...':'Salvar meus dados'}</button>{notice&&<p className="npv-profile-notice" role="status">{notice}</p>}</form></section>
    <section className="npv-profile-panel" aria-label="Conexões do Clube"><div className="npv-profile-panel-title"><div><h2>Minhas conexões</h2><p>Gerencie suas atividades e Stories.</p></div><Activity size={20}/></div><div className="npv-profile-connections"><button onClick={onInstagram} type="button"><Instagram size={19}/> Instagram e Stories <ArrowRight size={17}/></button><button onClick={onStrava} type="button"><Footprints size={19}/> Strava e desafios <ArrowRight size={17}/></button></div></section>
  </section>
}
