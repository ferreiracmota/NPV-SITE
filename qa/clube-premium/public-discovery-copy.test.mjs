import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const source=readFileSync(new URL('../../src/ClubePublicLanding.jsx',import.meta.url),'utf8')
const css=readFileSync(new URL('../../src/ClubePublicLanding.css',import.meta.url),'utf8')
const activities=source.split('const activities=[')[1]?.split('\n]')[0]||''
const levelGrid=source.split('<div className="npv-clube-public-level-grid">')[1]?.split('</div>\n         </div>')[0]||''
test('Site público mostra os três exemplos aprovados sem números de pontos',()=>{
 for(const label of ['Corrida ou caminhada no Strava','Treinos','Desafios concluídos'])assert.ok(activities.includes(label),label)
 assert.equal((activities.match(/title:/g)||[]).length,3)
 assert.doesNotMatch(activities,/Renovação|Story|pts|\+400|\+200|\+2|value:/)
 assert.match(source,/activities\.map\(\(\{icon:Icon,title,details\}\)/)
 assert.doesNotMatch(source,/\{value\}/)
})
test('Cartões de níveis não expõem quantidades de pontos na lista pública',()=>{
 assert.match(levelGrid,/MEMBER_LEVELS\.map/)
 assert.match(levelGrid,/level\.name/)
 assert.doesNotMatch(levelGrid,/level\.minimum|<small>|fmt\(level\.minimum\)/)
 assert.match(source,/seu próximo cartão é desbloqueado automaticamente/)
})
test('Preços de recompensa e CTAs comerciais são preservados',()=>{
 assert.match(source,/\{fmt\(r\.points\)\} pontos/)
 assert.match(source,/href="\/\#planos"/)
 assert.match(source,/href="\/clube"/)
})
test('Layout mantém três colunas no desktop e coluna única no celular',()=>{
 assert.match(css,/\.npv-clube-public-point-grid\{display:grid;grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/)
 assert.match(css,/@media\(max-width:720px\)/)
 assert.match(css,/\.npv-clube-public-point-grid\{grid-template-columns:1fr/)
})
