import test from 'node:test'
import assert from 'node:assert/strict'
import {HIDDEN_MENTION_NOTICE,isNoticePending} from './storyNotice.mjs'

test('aviso orienta republicação de Story com @ visível sem mencionar rejeição',()=>{
  assert.equal(HIDDEN_MENTION_NOTICE.title,'Marcação não visível')
  assert.match(HIDDEN_MENTION_NOTICE.message,/@naopensevai/)
  assert.match(HIDDEN_MENTION_NOTICE.message,/ganhar seus pontos/)
  assert.match(HIDDEN_MENTION_NOTICE.message,/Se possível/)
  assert.match(HIDDEN_MENTION_NOTICE.message,/Bons treinos!/)
  assert.match(HIDDEN_MENTION_NOTICE.message,/Publique novamente/)
  assert.doesNotMatch(HIDDEN_MENTION_NOTICE.message,/rejeitad|recusad|aprovad/i)
})
test('somente aviso de marcação oculta ainda não reconhecido aparece à aluna',()=>{
  assert.equal(isNoticePending({notice_type:'hidden_mention',acknowledged_at:null}),true)
  assert.equal(isNoticePending({notice_type:'hidden_mention',acknowledged_at:'2026-11-11T12:00:00Z'}),false)
  assert.equal(isNoticePending({notice_type:'other',acknowledged_at:null}),false)
})

import review from '../../api/instagram/review.js'
import activity from '../../api/instagram/activity.js'

const response=()=>({
  statusCode:null,body:'',headers:{},
  setHeader(name,value){this.headers[name]=value;return this},
  writeHead(status,headers={}){this.statusCode=status;Object.assign(this.headers,headers);return this},
  end(text=''){this.body=String(text);return this}
})

test('nenhum aviso administrativo pode ser enviado sem origem valida',async()=>{
  const res=response()
  await review({method:'POST',headers:{},body:{
    event_id:'story-test-001',decision:'notify_hidden_mention'
  }},res)
  assert.equal(res.statusCode,403)
  assert.equal(JSON.parse(res.body).status,'invalid_origin')
})

test('aluno nao pode marcar aviso como lido a partir de origem desconhecida',async()=>{
  const res=response()
  await activity({method:'POST',headers:{},body:{
    event_id:'story-test-001',action:'acknowledge_hidden_mention'
  }},res)
  assert.equal(res.statusCode,403)
})

test('leitura de avisos respeita a integracao desligada, sem inventar Stories',async()=>{
  const previous=process.env.NPV_INSTAGRAM_ENABLED
  process.env.NPV_INSTAGRAM_ENABLED='false'
  try{
    const res=response()
    await activity({method:'GET',headers:{}},res)
    assert.equal(res.statusCode,200)
    assert.deepEqual(JSON.parse(res.body),{available:false,events:[],notices:[]})
  }finally{
    if(previous===undefined)delete process.env.NPV_INSTAGRAM_ENABLED
    else process.env.NPV_INSTAGRAM_ENABLED=previous
  }
})
