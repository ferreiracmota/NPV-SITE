import React,{useEffect,useState} from 'react'
import {Check,ChevronDown,Lock,LockKeyhole,RotateCw,Trophy} from 'lucide-react'
import {MEMBER_LEVELS} from '../clube/profile/memberCardIdentity.mjs'
import {birthdayParts} from '../clube/profile/birthday.mjs'
import './ClubeWalletCard.css'

const images={
  1:'/clube/cards/bronze.webp?v=20261030-clean',
  2:'/clube/cards/prata.webp?v=20261030-clean',
  3:'/clube/cards/ouro.webp?v=20261030-clean',
  4:'/clube/cards/platinum.webp?v=20261030-clean',
  5:'/clube/cards/diamante.webp?v=20261030-clean',
  6:'/clube/cards/black.webp?v=20261030-clean'
}
const accents={1:'#e6ad76',2:'#d5e1ed',3:'#e5c378',4:'#b8d0d9',5:'#7de1c5',6:'#e9cf8c'}
const backs={
  1:'/clube/cards/back/bronze.webp?v=20261031-alpha1',
  2:'/clube/cards/back/prata.webp?v=20261031-alpha1',
  3:'/clube/cards/back/ouro.webp?v=20261031-alpha1',
  4:'/clube/cards/back/platinum.webp?v=20261031-alpha1',
  5:'/clube/cards/back/diamante.webp?v=20261031-alpha1',
  6:'/clube/cards/back/black.webp?v=20261031-alpha1'
}
const fmt=n=>Number(n||0).toLocaleString('pt-BR')
const displayName=name=>{
  const parts=String(name||'').trim().split(/\s+/).filter(Boolean)
  return parts.length>1?parts[0]+' '+parts[parts.length-1]:(parts[0]||'Aluna NPV')
}
const memberBirthday=value=>{
  const {day,month}=birthdayParts(value)
  return day&&month?`${day}/${month}`:'Não informada'
}
export default function ClubeWalletCard({profile,achievements}){
  const [flipped,setFlipped]=useState(false)
  const [galleryOpen,setGalleryOpen]=useState(false)
  const [selectedTier,setSelectedTier]=useState(achievements.level||1)
  const otherTiers=MEMBER_LEVELS.filter(item=>item.level!==achievements.level).slice().reverse()
  const choice=MEMBER_LEVELS.find(item=>item.level===selectedTier)||MEMBER_LEVELS[0]
  useEffect(()=>{
    setFlipped(false)
    setSelectedTier(achievements.level||1)
  },[profile?.id,achievements.level])
  return <div className="npv-wallet">
    {achievements.level>0?<React.Fragment>
      <div className="npv-wallet-stack" style={{'--npv-band-count':otherTiers.length,'--npv-accent':accents[achievements.level]}}>
        {otherTiers.map((tier,index)=><button type="button" key={tier.level}
          className={'npv-wallet-band'+(tier.level>achievements.level?' is-locked':' is-earned')}
          style={{'--npv-band-index':index,'--npv-band-inset':`${(otherTiers.length-index)*4}px`,zIndex:index+1}}
          onClick={()=>{setSelectedTier(tier.level);setGalleryOpen(true);setFlipped(false)}}
          aria-label={'Explorar '+tier.name+', desbloqueio aos '+fmt(tier.minimum)+' pontos'}>
          <img src={images[tier.level]} alt="" loading="lazy"/>
          <span>{tier.level>achievements.level?<Lock size={12}/>:<Check size={12}/>} {tier.name}</span>
        </button>)}
        <button type="button" className={'npv-wallet-flip'+(flipped?' is-flipped':'')}
          onClick={()=>setFlipped(f=>!f)} aria-pressed={flipped}
          aria-label={flipped?'Voltar à frente do cartão':'Virar o cartão para consultar sua identificação'}>
          <span className="npv-wallet-flip-inner">
            <span className="npv-wallet-face npv-wallet-front">
              <img src={images[achievements.level]} alt={'Cartão NPV '+achievements.levelName}/>
              <span className="npv-membership-holder">{displayName(profile?.full_name)}</span>
            </span>
            <span className="npv-wallet-face npv-wallet-back npv-wallet-back-art">
              <img src={backs[achievements.level]} alt="" aria-hidden="true"/>
              <span className="npv-wallet-back-value npv-wallet-back-name">{profile?.full_name||'Aluna NPV'}</span>
              <span className="npv-wallet-back-value npv-wallet-back-birthday">{memberBirthday(profile?.birthday_mmdd)}</span>
              <span className="npv-wallet-back-qr-soon">EM BREVE</span>
            </span>
          </span>
        </button>
      </div>
      <p className="npv-wallet-flip-hint"><RotateCw size={15}/>{flipped?'Toque para voltar à frente do cartão.':'Toque no cartão para virar e visualizar seus dados.'}</p>
    </React.Fragment>:<div className="npv-membership-none">
      <LockKeyhole size={24}/><div><strong>Você ainda não possui cartão de nível.</strong>
      <p>Conquiste 2.000 pontos para desbloquear seu primeiro cartão Bronze.</p></div>
    </div>}
    <button type="button" className="npv-wallet-explore-button" aria-expanded={galleryOpen}
      onClick={()=>setGalleryOpen(x=>!x)}><span><Trophy size={17}/>{galleryOpen?'Ocultar coleção':'Explorar níveis e benefícios'}</span>
      <ChevronDown className={galleryOpen?'is-open':''} size={17}/></button>
    {galleryOpen&&<section className="npv-wallet-gallery" aria-label="Galeria de cartões e benefícios">
      <p>Conheça os seis níveis. <strong>As vantagens abaixo são ideias em planejamento, não benefícios já disponíveis.</strong></p>
      <div className="npv-wallet-gallery-grid">
        {MEMBER_LEVELS.map(tier=><button key={tier.level} type="button" onClick={()=>setSelectedTier(tier.level)}
          aria-pressed={selectedTier===tier.level}
          className={'npv-wallet-gallery-item'+(selectedTier===tier.level?' is-selected':'')}>
          <span><strong>{tier.name}</strong><small>{fmt(tier.minimum)} pontos</small><small>{achievements.level===tier.level?'Seu nível':achievements.level>tier.level?'Conquistado':'A conquistar'}</small></span>
        </button>)}
      </div>
      <div className="npv-wallet-benefit-preview">
        <div><strong>{choice.name} · {fmt(choice.minimum)} pontos</strong>
        <p>{choice.benefit}</p>
        <small>Proposta em estudo, sujeita à confirmação de parcerias e regras.</small></div>
        {achievements.level<choice.level?<Lock size={18}/>:<Check size={18}/>}
      </div>
    </section>}
  </div>
}
