import test from 'node:test'
import assert from 'node:assert/strict'
import {DEFAULT_CHALLENGE_OVERLAY,normalizeChallengeOverlay,challengeOverlayGradient} from './challengeOverlay.mjs'
test('intensidade padrão preserva o gradiente original',()=>{
 assert.equal(DEFAULT_CHALLENGE_OVERLAY,65)
 assert.equal(normalizeChallengeOverlay(null),65)
 assert.equal(challengeOverlayGradient(65),
  'linear-gradient(95deg,rgba(5,20,14,0.9) 0%,rgba(6,22,16,0.82) 40%,rgba(9,28,20,0.58) 100%)')
})
test('0% remove o verde sem alterar a fotografia original',()=>{
 const gradient=challengeOverlayGradient(0)
 assert.match(gradient,/rgba\(5,20,14,0\)/)
 assert.match(gradient,/rgba\(6,22,16,0\)/)
 assert.match(gradient,/rgba\(9,28,20,0\)/)
})
test('100% fortalece o gradiente sem gerar opacidade inválida',()=>{
 assert.equal(normalizeChallengeOverlay(120),100)
 assert.equal(normalizeChallengeOverlay(-3),0)
 const gradient=challengeOverlayGradient(100)
 assert.match(gradient,/rgba\(5,20,14,1\)/)
 assert.match(gradient,/rgba\(6,22,16,1\)/)
 assert.match(gradient,/rgba\(9,28,20,0.892\)/)
})
test('valor salvo e valores inválidos são normalizados',()=>{
 assert.equal(normalizeChallengeOverlay('27'),27)
 assert.equal(normalizeChallengeOverlay('abc'),65)
 assert.equal(normalizeChallengeOverlay(Infinity),65)
})
