import React,{useEffect,useState} from 'react'
import {Check,ChevronDown,Lock,LockKeyhole,QrCode,RotateCw,Trophy} from 'lucide-react'
import {MEMBER_LEVELS} from '../clube/profile/memberCardIdentity.mjs'
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
const statusText={
  loading:'Consultando assinatura',active:'Assinatura ativa',delayed:'Pagamento em atraso',
  inactive:'Assinatura inativa',unlinked:'Sem vínculo confirmado',unavailable:'Consulta indisponível'
}
const fmt=n=>Number(n||0).toLocaleString('pt-BR')
const displayName=name=>{
  const parts=String(name||'').trim().split(/\s+/).filter(Boolean)
  return parts.length>1?parts[0]+' '+parts[parts.length-1]:(parts[0]||'Aluna NPV')
}
const nextCharge=value=>{
  if(!value)return 'Não informada'
  const date=new Date(value)
  return Number.isFinite(date.getTime())?
    date.toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo',day:'2-digit',month:'2-digit',year:'numeric'}):
    'Não informada'
}
export default function ClubeWalletCard({profile,email,session,achievements}){
  const [flipped,setFlipped]=useState(false)
  const [galleryOpen,setGalleryOpen]=useState(false)
  const [selectedTier,setSelectedTier]=useState(achievements.level||1)
  const [subscription,setSubscription]=useState({status:'loading',next_charge_at:null})
  const otherTiers=MEMBER_LEVELS.filter(item=>item.level!==achievements.level).slice().reverse()
  const choice=MEMBER_LEVELS.find(item=>item.level===selectedTier)||MEMBER_LEVELS[0]
  useEffect(()=>{
    setFlipped(false)
    setSelectedTier(achievements.level||1)
  },[profile?.id,achievements.level])
  useEffect(()=>{
    const controller=new AbortController()
    if(!session?.access_token||!profile?.id){
      setSubscription({status:'unavailable',next_charge_at:null})
      return()=>controller.abort()
    }
    setSubscription({status:'loading',next_charge_at:null})
    fetch('/api/clube/member-card',{
      headers:{Authorization:'Bearer '+session.access_token},signal:controller.signal,cache:'no-store'
    }).then(async response=>{
      if(!response.ok)throw Error('unavailable')
      return response.json()
    }).then(body=>{
      if(controller.signal.aborted)return
      setSubscription({
        status:statusText[body.status]?body.status:'unavailable',
        next_charge_at:body.status==='active'?body.next_charge_at||null:null
      })
    }).catch(()=>{if(!controller.signal.aborted)setSubscription({status:'unavailable',next_charge_at:null})})
    return()=>controller.abort()
  },[profile?.id,session?.access_token])
  return <div className="npv-wallet">
    <header className="npv-wallet-intro">
      <div><span>CARTEIRA DIGITAL NPV ✦</span><h2>Minha coleção de cartões</h2>
        <p>Conquiste novos níveis e descubra suas próximas vantagens.</p></div>
      {achievements.level>0&&<span className="npv-wallet-current-tag">Nível {achievements.level} · {achievements.levelName}</span>}
    </header>
    {achievements.level>0?<React.Fragment>
      <div className="npv-wallet-stack" style={{'--npv-band-count':otherTiers.length,'--npv-accent':accents[achievements.level]}}>
        {otherTiers.map((tier,index)=><button type="button" key={tier.level}
          className={'npv-wallet-band'+(tier.level>achievements.level?' is-locked':' is-earned')}
          style={{'--npv-band-index':index,zIndex:index+1}}
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
            <span className="npv-wallet-face npv-wallet-back">
              <span className="npv-wallet-back-head"><strong>NPV ✦ CLUBE</strong><span>{achievements.levelName.toUpperCase()}</span></span>
              <span className="npv-wallet-back-grid">
                <span><small>NOME COMPLETO</small><strong>{profile?.full_name||'Aluna NPV'}</strong></span>
                <span><small>E-MAIL DE ACESSO</small><strong>{email||'Não informado'}</strong></span>
                <span><small>SITUAÇÃO NA HOTMART</small><strong>{statusText[subscription.status]||statusText.unavailable}</strong></span>
                <span><small>PRÓXIMA COBRANÇA</small><strong>{subscription.status==='active'?nextCharge(subscription.next_charge_at):'Não informada'}</strong></span>
              </span>
              <span className="npv-wallet-back-bottom">
                <span className="npv-wallet-qr"><QrCode size={26}/><small>QR CODE EM BREVE</small></span>
                <span className="npv-wallet-back-note">Carteirinha pessoal. Validação em parceiros será disponibilizada futuramente.</span>
              </span>
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
          <img src={images[tier.level]} loading="lazy" alt={'Cartão '+tier.name}/>
          <span><strong>{tier.name}</strong><small>{fmt(tier.minimum)} pts · {achievements.level===tier.level?'Atual':achievements.level>tier.level?'Conquistado':'Bloqueado'}</small></span>
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
