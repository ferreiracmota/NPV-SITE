import test from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import {
  hashCode,makeCode,signatureValid,validInstagramWebhookSignature,extractEvents,settings
} from '../../api/instagram/_common.mjs'

test('Código temporário é imprevisível e pode ser armazenado apenas como hash',()=>{
  const a=makeCode(),b=makeCode()
  assert.match(a,/^NPV-[A-F0-9]{12}$/)
  assert.notEqual(a,b)
  assert.match(hashCode(a),/^[a-f0-9]{64}$/)
  assert.notEqual(hashCode(a),a)
})
test('Meta: assinatura SHA-256 valida o corpo exato; alteração é rejeitada',()=>{
  const raw=Buffer.from('{"object":"instagram","entry":[]}')
  const secret='chave-de-teste'
  const sig='sha256='+crypto.createHmac('sha256',secret).update(raw).digest('hex')
  assert.equal(signatureValid(raw,sig,secret),true)
  assert.equal(signatureValid(Buffer.from('{"entry":[]}'),sig,secret),false)
  assert.equal(signatureValid(raw,'sha256='+('0'.repeat(64)),secret),false)
  assert.equal(signatureValid(raw,null,secret),false)
})
test('Distingue código de DM e menção real; ignora respostas e mensagens comuns',()=>{
  const data={object:'instagram',entry:[{id:'12345678',messaging:[
    {sender:{id:'77777777'},recipient:{id:'12345678'},message:{mid:'m_001',text:'NPV-012345ABCDEF'}},
    {sender:{id:'77777777'},recipient:{id:'12345678'},message:{mid:'m_002',text:'oi'}},
    {sender:{id:'77777777'},recipient:{id:'12345678'},message:{mid:'m_003',attachments:[{type:'story_mention',payload:{id:'story_9812'}}]}},
    {sender:{id:'77777777'},recipient:{id:'12345678'},message:{mid:'m_004',is_echo:true,attachments:[{type:'story_mention'}]}}
  ]}]}
  assert.deepEqual(extractEvents(data),[
    {kind:'code',sender:'77777777',recipient:'12345678',code:'NPV-012345ABCDEF'},
    {kind:'story',sender:'77777777',recipient:'12345678',id:'m_003',storyKey:'story:story_9812',verifiedStory:true}
  ])
})
test('Webhook HMAC aceita apenas credenciais oficiais',()=>{
  const body=Buffer.from('mensagem')
  const sig=k=>'sha256='+crypto.createHmac('sha256',k).update(body).digest('hex')
  const a='a'.repeat(32),b='b'.repeat(32),c='c'.repeat(32)
  assert.equal(validInstagramWebhookSignature(body,sig(a),a,b),true)
  assert.equal(validInstagramWebhookSignature(body,sig(b),a,b),true)
  assert.equal(validInstagramWebhookSignature(body,sig(c),a,b),false)
  assert.equal(validInstagramWebhookSignature(body,sig(b),a,null),false)
})

test('Não confunde uma resposta de Story com menção a @naopensevai',()=>{
  const data={object:'instagram',entry:[{messaging:[{
    sender:{id:'77777777'},recipient:{id:'12345678'},message:{mid:'m_004',
    attachments:[{type:'story_reply',payload:{id:'abc'}}]}
  }]}]}
  assert.equal(extractEvents(data).length,0)
})
test('Falha fechada sem credenciais e ativação explícita',()=>{
  assert.equal(settings({NPV_INSTAGRAM_ENABLED:'false'}),null)
  assert.equal(settings({NPV_INSTAGRAM_ENABLED:'true',INSTAGRAM_APP_SECRET:'x'}),null)
})

test('CDN do Story: usa asset_id estável; apenas MID exige revisão',()=>{
  const payload={object:'instagram',entry:[{messaging:[
    {sender:{id:'77777777'},recipient:{id:'12345678'},message:{
      mid:'m_cdn',attachments:[{type:'story_mention',payload:{
        url:'https://lookaside.fbsbx.com/ig_messaging_cdn/?asset_id=17988851035358143&signature=abc'
      }}]
    }},
    {sender:{id:'77777777'},recipient:{id:'12345678'},message:{
      mid:'m_unknown',attachments:[{type:'story_mention',payload:{url:'https://example.test/file'}}]
    }}
  ]}]}
  const events=extractEvents(payload)
  assert.equal(events[0].storyKey,'asset:17988851035358143')
  assert.equal(events[0].verifiedStory,true)
  assert.equal(events[1].storyKey,'event:m_unknown')
  assert.equal(events[1].verifiedStory,false)
})

test('Evento de Story por referral só conta quando identificado inequivocamente',()=>{
  const payload={object:'instagram',entry:[{messaging:[{
    sender:{id:'77777777'},recipient:{id:'12345678'},
    message:{mid:'m_referral'},referral:{source:'STORY_MENTION',story:{id:'17893310459898765'}}
  }]}]}
  assert.deepEqual(extractEvents(payload),[{
    kind:'story',sender:'77777777',recipient:'12345678',id:'m_referral',
    storyKey:'story:17893310459898765',verifiedStory:true
  }])
})
