import React from 'react'
import {ArrowRight, Award, Gift} from 'lucide-react'
import {memberAchievements} from '../clube/profile/achievements.mjs'
import {MEMBER_LEVELS} from '../clube/profile/memberCardIdentity.mjs'
import {selectNextAvailableReward} from '../clube/profile/nextReward.mjs'
import './ClubeStudentMomentum.css'

const fmt=value=>Number(value||0).toLocaleString('pt-BR')
const safePoints=value=>Math.max(0,Number(value)||0)

/**
 * Somente leitura. Níveis usam pontos conquistados (sem eventos de teste),
 * prêmio usa pontos disponíveis; não grava nem recalcula lançamentos.
 */
export default function ClubeStudentMomentum({events=[],studentId,rewards=[],availablePoints=0,showJourney=true,onProfile,onRewards}){
  if(!studentId)return null
  const achievements=memberAchievements(events,studentId)
  const available=safePoints(availablePoints)
  const reward=selectNextAvailableReward(rewards,available)
  const nextLevel=MEMBER_LEVELS.find(level=>level.level===achievements.level+1)
  const currentLevel=MEMBER_LEVELS.find(level=>level.level===achievements.level)
  if(!showJourney&&!reward)return null
  const unlocked=reward&&available>=Number(reward.points)
  const rewardRemaining=reward?Math.max(0,Number(reward.points)-available):0
  const rewardProgress=reward?Math.min(100,Math.round(available/Number(reward.points)*100)):0
  return <section className="npv-student-momentum" aria-label="Seu nível e sua próxima conquista">
    {showJourney&&<div className="npv-momentum-panel npv-momentum-level">
      <div className="npv-momentum-top"><span className="npv-momentum-icon"><Award size={18}/></span><span className="npv-momentum-label">MINHA TRAJETÓRIA</span></div>
      <div className="npv-momentum-main"><div>
        <span className="npv-momentum-subtitle">Nível atual</span>
        <h2>{currentLevel?currentLevel.name:'Rumo ao Bronze'}</h2>
      </div><span className="npv-momentum-earned">{fmt(achievements.earned)} <small>pts conquistados</small></span></div>
      <div className="npv-momentum-progress"><span role="progressbar" aria-label="Progresso para o próximo nível" aria-valuemin={0} aria-valuemax={100} aria-valuenow={achievements.progress} style={{width:achievements.progress+'%'}}/></div>
      <div className="npv-momentum-bottom"><p>{nextLevel?<>Faltam <strong>{fmt(achievements.remaining)} pontos</strong> para {nextLevel.name}.</>:<><strong>Você alcançou o nível Black!</strong> Parabéns pela trajetória.</>}</p><button type="button" onClick={onProfile}>Ver meu cartão <ArrowRight size={15}/></button></div>
    </div>}
    {reward&&<div className="npv-momentum-panel npv-momentum-reward">
      <div className="npv-momentum-top"><span className="npv-momentum-icon"><Gift size={18}/></span><span className="npv-momentum-label">PRÓXIMA RECOMPENSA</span></div>
      <div className="npv-momentum-main"><div><span className="npv-momentum-subtitle">{unlocked?'Você já tem pontos para':'Uma conquista para buscar'}</span><h2>{reward.name}</h2></div><span className="npv-momentum-earned">{fmt(reward.points)} <small>pts para resgatar</small></span></div>
      <div className="npv-momentum-progress"><span role="progressbar" aria-label="Pontos disponíveis para esta recompensa" aria-valuemin={0} aria-valuemax={100} aria-valuenow={rewardProgress} style={{width:rewardProgress+'%'}}/></div>
      <div className="npv-momentum-bottom"><p>{unlocked?<><strong>Pontos suficientes!</strong> Confira as condições do resgate.</>:<>Faltam <strong>{fmt(rewardRemaining)} pontos disponíveis</strong> para solicitar.</>}</p><button type="button" onClick={onRewards}>Ver prêmios <ArrowRight size={15}/></button></div>
    </div>}
  </section>
}
