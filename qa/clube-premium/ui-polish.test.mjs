import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const read=path=>readFileSync(new URL('../../'+path,import.meta.url),'utf8')
const page=read('src/ClubeNPVOnline.jsx')
const polish=read('src/ClubeStudentPolish.css')
const card=read('src/ClubeWalletCard.jsx')
const walletCss=read('src/ClubeWalletCard.css')
const profile=read('src/ClubeStudentProfile.jsx')

test('Refinamento visual restrito à área do aluno; não reestiliza o administrador',()=>{
 assert.match(polish,/\.clube-shell\.clube-live-student/)
 assert.match(polish,/\.npv-theme-light/)
 assert.doesNotMatch(polish,/\.clube-live-admin/)
 assert.match(page,/import '\.\/ClubeStudentPolish\.css'/)
})

test('Cinco abas mantêm a navegação; títulos Prêmios e Extrato coerentes',()=>{
 assert.match(page,/aria-label="Meu perfil"/)
 assert.match(page,/aria-label="Recompensas"/)
 assert.match(page,/aria-label="Histórico de pontos"/)
 assert.match(page,/Prêmios do Clube/)
 assert.match(page,/SEU SALDO DE PONTOS/)
 assert.match(page,/npv-nav-desktop">Extrato/)
})

test('Extrato com agrupamento mensal não altera eventos, valores ou pontos',()=>{
 assert.match(page,/const activityList=\(rows,showMember=false,groupByMonth=false\)/)
 assert.match(page,/const ordered=groupByMonth\?\[\.\.\.rows\]\.sort/)
 assert.match(page,/statementMonth\(x\.created_at\)/)
 assert.match(page,/activityList\(isAdmin\?data\.events:mine,isAdmin,!isAdmin\)/)
 assert.match(page,/\{x\.points>0\?'\+':''\}\{format\(x\.points\)\}/)
})

test('As artes dos cartões, a virada e o QR futuro permanecem intocados',()=>{
 assert.match(card,/npv-wallet-flip/)
 assert.match(card,/npv-wallet-back-qr-soon/)
 assert.match(card,/\/clube\/cards\/back\/bronze.webp/)
 assert.match(walletCss,/\.npv-wallet-flip-inner/)
 assert.match(profile,/showJourney&&/)
 assert.match(profile,/showAchievements&&/)
})

test('Respeita movimento reduzido e tamanhos tocáveis',()=>{
 assert.match(polish,/@media\(prefers-reduced-motion:reduce\)/)
 assert.match(polish,/min-height:44px/)
 assert.match(polish,/min-height:49px/)
 assert.match(polish,/\.clube-main-footer/)
})
