// Intensidade de gradiente da capa do desafio. Preserva a cor e o desenho
// atuais em 65%; em 0% remove por completo a camada verde, em 100% reforça.
export const DEFAULT_CHALLENGE_OVERLAY=65

export function normalizeChallengeOverlay(value){
  if(value===undefined||value===null||value==='')return DEFAULT_CHALLENGE_OVERLAY
  const parsed=Number(value)
  return Number.isFinite(parsed)?Math.min(100,Math.max(0,Math.round(parsed))):DEFAULT_CHALLENGE_OVERLAY
}

export function challengeOverlayGradient(value){
  const strength=normalizeChallengeOverlay(value)
  const multiplier=strength/DEFAULT_CHALLENGE_OVERLAY
  const opacity=base=>Math.min(1,Math.round(base*multiplier*1000)/1000)
  return 'linear-gradient(95deg,rgba(5,20,14,'+opacity(.90)+') 0%,rgba(6,22,16,'+
    opacity(.82)+') 40%,rgba(9,28,20,'+opacity(.58)+') 100%)'
}
