import test from 'node:test'
import assert from 'node:assert/strict'
import {HIDDEN_MENTION_NOTICE,canSendHiddenMentionNotice} from './storyNotice.mjs'

const id='11111111-1111-4111-8111-111111111111'
test('aviso só pode ser solicitado para Story vinculado e ainda em análise',()=>{
  assert.equal(canSendHiddenMentionNotice({status:'review',student_id:id}),true)
  assert.equal(canSendHiddenMentionNotice({status:'review',student_id:null}),false)
  assert.equal(canSendHiddenMentionNotice({status:'credited',student_id:id}),false)
  assert.equal(canSendHiddenMentionNotice({status:'rejected',student_id:id}),false)
})
test('mensagem é clara, curta e não promete crédito automático',()=>{
  assert.equal(HIDDEN_MENTION_NOTICE.title,'Marcação não visível')
  assert.match(HIDDEN_MENTION_NOTICE.message,/@naopensevai/)
  assert.match(HIDDEN_MENTION_NOTICE.message,/publique novamente/)
  assert.match(HIDDEN_MENTION_NOTICE.message,/pontos/)
})
