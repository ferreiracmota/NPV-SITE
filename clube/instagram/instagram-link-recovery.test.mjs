import test from 'node:test'
import assert from 'node:assert/strict'
import {hashCode} from '../../server/instagram/common.mjs'
import {matchingSender} from '../../server/instagram/link-recovery.mjs'

const issued='2026-11-03T15:20:00.000Z'
const business='17841461793945231'
const code='NPV-123456ABCDEF'
const now=Date.parse('2026-11-03T15:23:00.000Z')
const message=(text,from='1234567891234',created='2026-11-03T15:21:00.000Z')=>({
  message:text,from:{id:from},created_time:created
})

test('recupera somente DM com código exato e remetente real',()=>{
  assert.equal(matchingSender({data:[
    message('Olá!'),
    message('  npv-123456abcdef  ')
  ]},hashCode(code),business,issued,now),'1234567891234')
})

test('nunca vincula código de outra aluna ou texto aproximado',()=>{
  assert.equal(matchingSender({data:[
    message('NPV-111111111111'),
    message('Meu código é '+code)
  ]},hashCode(code),business,issued,now),null)
})

test('mensagem anterior ao código emitido não vale como prova',()=>{
  assert.equal(matchingSender({data:[
    message(code,'1234567891234','2026-11-03T15:17:00.000Z')
  ]},hashCode(code),business,issued,now),null)
})

test('não aceita eco da conta oficial, identidade inválida ou mensagem sem data',()=>{
  assert.equal(matchingSender({data:[
    message(code,business),
    message(code,'sem-id'),
    {message:code,from:{id:'1234567891234'}}
  ]},hashCode(code),business,issued,now),null)
})

test('não aceita hash inválido nem mensagens futuras',()=>{
  assert.equal(matchingSender({data:[message(code)]},'invalid',business,issued,now),null)
  assert.equal(matchingSender({data:[
    message(code,'1234567891234','2026-11-03T15:26:00.000Z')
  ]},hashCode(code),business,issued,now),null)
})

test('A recuperação usa somente o remetente do Direct, mesmo com conta privada',()=>{
  const sample={data:[
    message('NPV-123456ABCDEF','17840000123456789')
  ]}
  assert.equal(matchingSender(sample,hashCode(code),business,issued,now),'17840000123456789')
})
