import React from 'react'
import {ArrowUpRight, ArrowRight, Award, Gift, Sparkles, CheckCircle2} from 'lucide-react'
import {memberAchievements} from '../clube/profile/achievements.mjs'
import {MEMBER_LEVELS} from '../clube/profile/memberCardIdentity.mjs'
import {selectNextAvailableReward} from '../clube/profile/nextReward.mjs'
import './ClubeStudentMomentum.css'

const fmt=value=>Number(value||0).toLocaleString('pt-BR')
const safePoints=value=>Math.max(0,Number(value)||0)
const levelArtwork={
  1:'/clube/cards/bronze.webp?v=20261030-clean',
  2:'/clube/cards/prata.webp?v=20261030-clean',
  3:'/clube/cards/ouro.webp?v=20261030-clean',
  4:'/clube/cards/platinum.webp?v=20261030-clean',
  5:'/clube/cards/diamante.webp?v=20261030-clean',
  6:'/clube/cards/black.webp?v=20261030-clean'
}
const levelSlug={1:'bronze',2:'prata',3:'ouro',4:'platinum',5:'diamante',6:'black'}

/**
 * Conteúdo compartilhado entre a página real do aluno e o preview visual.
 * O nível utiliza pontos conquistados; o prêmio utiliza saldo disponível.
 * Não muda lançamentos, estoque, pontuação ou permissões.
 */
export default function ClubeStudentMomentum({
  events=[],studentId,rewards=[],availablePoints=0,showJourney=true,
  rewardImageUrl=()=>'',onProfile=()=>{},onRewards=()=>{},
  showLevel=true,showReward=true
}){
  if(!studentId)return null
  const achievements=memberAchievements(events,studentId)
  const available=safePoints(availablePoints)
  const reward=selectNextAvailableReward(rewards,available)
  const nextLevel=MEMBER_LEVELS.find(level=>level.level===achievements.level+1)
  const currentLevel=MEMBER_LEVELS.find(level=>level.level===achievements.level)
  const visualLevel=currentLevel?.level||1
  const missingNext=nextLevel?safePoints(achievements.remaining):0
  const levelTarget=nextLevel?.minimum||currentLevel?.minimum||2000
  const image=reward?rewardImageUrl(reward.image_path)||'':''
  const unlocked=reward&&available>=Number(reward.points)
  const rewardRemaining=reward?Math.max(0,Number(reward.points)-available):0
  const rewardProgress=reward?Math.min(100,Math.round(available/Number(reward.points)*100)):0
  const levelVisible=showJourney&&showLevel
  const rewardVisible=showReward&&Boolean(reward)
  if(!levelVisible&&!rewardVisible)return null
  return <section className={'npv-student-momentum'+(levelVisible&&!rewardVisible?' has-only-level':'')+(!levelVisible&&rewardVisible?' has-only-reward':'')} aria-label="Seu nível e sua próxima conquista">
    {levelVisible&&<article className={'npv-momentum-feature npv-momentum-tier is-'+levelSlug[visualLevel]}>
      <div className="npv-momentum-ambient" aria-hidden="true"/>
      <div className="npv-momentum-overline"><span className="npv-momentum-overline-mark"><Award size={15}/></span> SUA TRAJETÓRIA <Sparkles size={12} className="npv-momentum-sparkle"/></div>
      <div className="npv-momentum-tier-layout">
        <div className="npv-momentum-tier-copy">
          <p className="npv-momentum-kicker">Seu cartão atual</p>
          <h2>{currentLevel?currentLevel.name:'Rumo ao Bronze'}</h2>
          <div className="npv-momentum-earnings"><strong>{fmt(achievements.earned)}</strong><span>pontos conquistados</span></div>
        </div>
        <div className="npv-momentum-tier-art">
          <div className="npv-momentum-tier-art-glow" aria-hidden="true"/>
          <img src={levelArtwork[visualLevel]} alt={'Imagem do cartão '+(currentLevel?.name||'Bronze')} loading="eager"/>
        </div>
      </div>
      <div className="npv-momentum-tier-footer">
        <div className="npv-momentum-meter-head"><span>{nextLevel?'PRÓXIMO NÍVEL':'NÍVEL MÁXIMO'}</span><strong>{nextLevel?nextLevel.name:'Black'}</strong></div>
        <div className="npv-momentum-meter"><span role="progressbar" aria-label="Progresso para o próximo nível" aria-valuemin={0} aria-valuemax={100} aria-valuenow={achievements.progress} style={{width:achievements.progress+'%'}}/></div>
        <div className="npv-momentum-tier-bottom">
          <p>{nextLevel?<>Faltam <strong>{fmt(missingNext)} pontos</strong> para o seu próximo cartão.</>:<><CheckCircle2 size={14}/> Você chegou ao nível máximo!</>}</p>
          <button type="button" onClick={onProfile} aria-label="Ver detalhes da minha trajetória">Ver trajetória <ArrowUpRight size={15}/></button>
        </div>
      </div>
    </article>}
    {rewardVisible&&<article className="npv-momentum-feature npv-momentum-gift">
      <div className="npv-momentum-overline"><span className="npv-momentum-overline-mark"><Gift size={15}/></span> PRÓXIMA RECOMPENSA</div>
      <div className="npv-momentum-gift-layout">
        <div className="npv-momentum-gift-copy">
          <p className="npv-momentum-kicker">{unlocked?'Sua conquista está ao alcance':'Um objetivo para conquistar'}</p>
          <h2>{reward.name}</h2>
          <div className="npv-momentum-price"><strong>{fmt(reward.points)}</strong><span>pontos</span></div>
        </div>
        <div className="npv-momentum-product-art">
          {image?<img src={image} alt={'Foto de '+reward.name} loading="eager"/>:<Gift size={59} strokeWidth={1.25} aria-hidden="true"/>}
        </div>
      </div>
      <div className="npv-momentum-gift-footer">
        <div className="npv-momentum-meter-head"><span>SEU PROGRESSO PARA RESGATAR</span><strong>{rewardProgress}%</strong></div>
        <div className="npv-momentum-meter"><span role="progressbar" aria-label="Pontos disponíveis para esta recompensa" aria-valuemin={0} aria-valuemax={100} aria-valuenow={rewardProgress} style={{width:rewardProgress+'%'}}/></div>
        <div className="npv-momentum-gift-bottom">
          <p>{unlocked?<><CheckCircle2 size={14}/> Pontos suficientes! Confira as condições.</>:<>Faltam <strong>{fmt(rewardRemaining)} pontos disponíveis</strong>.</>}</p>
          <button type="button" onClick={onRewards}>Ver prêmios <ArrowRight size={15}/></button>
        </div>
      </div>
    </article>}
  </section>
}
