import test from 'node:test'
import assert from 'node:assert/strict'
import {HIDDEN_MENTION_NOTICE,isNoticePending} from './storyNotice.mjs'

test('aviso orienta republicação de Story com @ visível sem mencionar rejeição',()=>{
  assert.equal(HIDDEN_MENTION_NOTICE.title,'Marcação não visível')
  assert.match(HIDDEN_MENTION_NOTICE.message,/@naopensevai/)
  assert.match(HIDDEN_MENTION_NOTICE.message,/ganhar os pontos/)
  assert.match(HIDDEN_MENTION_NOTICE.message,/Publique novamente/)
  assert.doesNotMatch(HIDDEN_MENTION_NOTICE.message,/rejeitad|recusad|aprovad/i)
})
test('somente aviso de marcação oculta ainda não reconhecido aparece à aluna',()=>{
  assert.equal(isNoticePending({notice_type:'hidden_mention',acknowledged_at:null}),true)
  assert.equal(isNoticePending({notice_type:'hidden_mention',acknowledged_at:'2026-11-11T12:00:00Z'}),false)
  assert.equal(isNoticePending({notice_type:'other',acknowledged_at:null}),false)
})
