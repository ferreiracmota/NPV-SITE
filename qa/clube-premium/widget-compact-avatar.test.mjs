import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const js=readFileSync(new URL('../../src/ClubeFloatingWidget.jsx',import.meta.url),'utf8')
const css=readFileSync(new URL('../../src/ClubeFloatingWidget.css',import.meta.url),'utf8')

test('Avatar do ranking do widget carrega com prioridade e mantém inicial durante download',()=>{
 assert.match(js,/function RankingAvatar\(\{entry,index\}\)/)
 assert.match(js,/loading="eager" decoding="async"/)
 assert.match(js,/onLoad=\{\(\)=>setLoadedPhoto\(photo\)\}/)
 assert.match(js,/onError=\{\(\)=>setLoadedPhoto\(''\)\}/)
 assert.match(js,/const loaded=Boolean\(photo\)&&loadedPhoto===photo/)
 assert.match(js,/className="npv-fw-avatar-initial"/)
 assert.match(js,/className=\{'npv-fw-avatar-photo'\+\(loaded\?' is-loaded':''\)\}/)
})
test('Ambas as versões do ranking usam o mesmo avatar robusto, sem duplicar downloads no JSX',()=>{
 assert.match(js,/function RankingPreview\(\{compact=false,ranking=\[\]\}\)/)
 assert.match(js,/ranking\.slice\(0,compact\?2:3\)/)
 assert.match(js,/<RankingAvatar entry=\{entry\} index=\{index\}\/>/)
 assert.match(js,/RankingPreview compact ranking=\{config\.ranking\}/)
 assert.match(js,/<RankingPreview ranking=\{config\.ranking\}\/>/)
})
test('Fallback sempre visível com foto posicionada acima, sem mudar animação do carrossel',()=>{
 assert.match(css,/\.npv-floating-club \.npv-fw-avatar-initial\{/)
 assert.match(css,/\.npv-floating-club \.npv-fw-avatar-photo\{/)
 assert.match(css,/\.npv-floating-club \.npv-fw-avatar-photo\.is-loaded\{opacity:1\}/)
 assert.match(js,/setInterval\(\(\)=>\{/)
 assert.match(js,/\},2000\)/)
})
