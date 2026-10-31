import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const root=file=>readFileSync(new URL('../../'+file,import.meta.url),'utf8')
const ui=root('src/ClubePublicLanding.jsx')
const css=root('src/ClubePublicLanding.css')
const activitySection=ui.split('<section className="npv-clube-public-points">')[1]?.split('<section id="premios"')[0]||''
const activityDefinitions=ui.split('const activities=[')[1]?.split('export default function')[0]||''
const levelSection=ui.split('<section id="niveis"')[1]?.split('<section className="npv-clube-public-final"')[0]||''

test('A vitrine pública apresenta Strava, treinos e desafios sem revelar quantidades de pontos',()=>{
 for(const title of ['Corrida ou caminhada no Strava','Treinos e constância','Desafios concluídos'])assert.ok(activityDefinitions.includes(title),title)
 assert.equal((activitySection.match(/<article key=\{title\}>/g)||[]).length,1)
 assert.doesNotMatch(activitySection,/value|pts\s*\/|\+\d+|\d+\s*pontos/i)
 assert.doesNotMatch(activityDefinitions,/Story marcando|Renovação confirmada/i)
})

test('Treino comum não é anunciado como crédito automático de pontos',()=>{
 assert.match(activitySection,/Treinos comuns da plataforma, por si só, não geram pontos automaticamente/)
 assert.match(activitySection,/validação de cada atividade/)
})

test('Os seis níveis preservam a identidade sem divulgar metas numéricas',()=>{
 assert.match(levelSection,/MEMBER_LEVELS\.map/)
 assert.match(levelSection,/alcançada, você avança de nível/)
 assert.doesNotMatch(levelSection,/level\.minimum|fmt\(level\.minimum\)|<small>/)
 assert.match(css,/\.npv-clube-public-level-grid>div/)
})

test('Página pública preserva planos, recompensas e autenticação original',()=>{
 assert.match(ui,/href="\/#planos"/)
 assert.match(ui,/href="\/clube"/)
 assert.match(ui,/rewards\.map/)
 assert.match(ui,/fmt\(r\.points\)/)
})
