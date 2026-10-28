import test from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import {Readable} from 'node:stream'
import {brazilMonthKey,brazilMonthBounds,extractEvents,settings} from '../../api/instagram/_common.mjs'
import webhook from '../../api/instagram/webhook.js'
import link from '../../api/instagram/link.js'
import activity from '../../api/instagram/activity.js'
import admin from '../../api/instagram/admin.js'

const fakeRes=()=>({
  statusCode:null,headers:{},body:'',
  writeHead(status,headers={}){this.statusCode=status;Object.assign(this.headers,headers);return this},
  setHeader(key,value){this.headers[key]=value;return this},
  end(body=''){this.body=String(body);return this}
})
const fakeReq=(method,url,body='')=>{
  const req=Readable.from(body?[Buffer.from(body)]:[])
  req.method=method
  req.url=url
  req.headers={}
  return req
}
const withEnv=async (env,run)=>{
  const old=new Map(Object.keys(env).map(key=>[key,process.env[key]]))
  try{
    for(const [key,value] of Object.entries(env)){
      if(value===null)delete process.env[key]
      else process.env[key]=value
    }
    await run()
  }finally{
    for(const [key,value] of old){
      if(value===undefined)delete process.env[key]
      else process.env[key]=value
    }
  }
}

test('Virada do mês em São Paulo não é confundida com UTC da Vercel',()=>{
  assert.equal(brazilMonthKey('2026-10-01T02:59:59Z'),'2026-09')
  assert.equal(brazilMonthKey('2026-10-01T03:00:00Z'),'2026-10')
  assert.equal(brazilMonthKey('2026-11-01T02:59:59Z'),'2026-10')
  assert.equal(brazilMonthKey('2026-11-01T03:00:00Z'),'2026-11')
  assert.equal(brazilMonthKey('2026-12-31T23:30:00Z'),'2026-12')
  assert.equal(brazilMonthKey('2027-01-01T02:59:59Z'),'2026-12')
})

test('Mês de Stories coincide com o calendário brasileiro, inclusive na virada',()=>{
  assert.deepEqual(brazilMonthBounds('2026-10-01T02:59:59Z'),{
    start:'2026-09-01T03:00:00.000Z',end:'2026-10-01T03:00:00.000Z'
  })
  assert.deepEqual(brazilMonthBounds('2026-10-01T03:00:00Z'),{
    start:'2026-10-01T03:00:00.000Z',end:'2026-11-01T03:00:00.000Z'
  })
  assert.deepEqual(brazilMonthBounds('2026-11-01T02:59:59Z'),{
    start:'2026-10-01T03:00:00.000Z',end:'2026-11-01T03:00:00.000Z'
  })
  assert.deepEqual(brazilMonthBounds('2026-11-01T03:00:00Z'),{
    start:'2026-11-01T03:00:00.000Z',end:'2026-12-01T03:00:00.000Z'
  })
  assert.deepEqual(brazilMonthBounds('2027-01-01T00:00:00Z'),{
    start:'2026-12-01T03:00:00.000Z',end:'2027-01-01T03:00:00.000Z'
  })
})

test('Limites de meses históricos respeitam o fuso e não presumem UTC-3 permanente',()=>{
  assert.deepEqual(brazilMonthBounds('2018-11-04T05:00:00Z'),{
    start:'2018-11-01T03:00:00.000Z',end:'2018-12-01T02:00:00.000Z'
  })
})

test('Webhook GET aceita o token de verificação e devolve o desafio exato',async()=>{
  await withEnv({INSTAGRAM_WEBHOOK_VERIFY_TOKEN:'token-de-teste-local'},async()=>{
    const req=fakeReq('GET','/api/instagram/webhook?hub.mode=subscribe&hub.verify_token=token-de-teste-local&hub.challenge=npv-123')
    const res=fakeRes()
    await webhook(req,res)
    assert.equal(res.statusCode,200)
    assert.equal(res.body,'npv-123')
    assert.equal(res.headers['Content-Type'],'text/plain')
  })
})

test('Webhook GET não revela desafio quando o token é incorreto',async()=>{
  await withEnv({INSTAGRAM_WEBHOOK_VERIFY_TOKEN:'token-de-teste-local'},async()=>{
    const req=fakeReq('GET','/api/instagram/webhook?hub.mode=subscribe&hub.verify_token=errado&hub.challenge=nao-devolver')
    const res=fakeRes()
    await webhook(req,res)
    assert.equal(res.statusCode,403)
    assert.equal(JSON.parse(res.body).status,'invalid_verification')
    assert.doesNotMatch(res.body,/nao-devolver/)
  })
})

test('Enquanto integração não autorizada, POST real e endpoints dos alunos permanecem bloqueados',async()=>{
  await withEnv({NPV_INSTAGRAM_ENABLED:'false'},async()=>{
    for(const handler of [webhook,link,activity,admin]){
      const req=fakeReq(handler===webhook?'POST':'GET','/api/instagram/test')
      const res=fakeRes()
      await handler(req,res)
      assert.equal(res.statusCode,handler===webhook?503:200)
      assert.notEqual(JSON.parse(res.body).available,true)
    }
  })
})

test('Webhook com integração simulada rejeita assinatura inválida sem acessar banco',async()=>{
  const env={
    NPV_INSTAGRAM_ENABLED:'true',NPV_INSTAGRAM_AWARD_ENABLED:'false',
    VITE_CLUBE_SUPABASE_URL:'https://example.supabase.co',
    VITE_CLUBE_SUPABASE_PUBLISHABLE_KEY:'publica-de-teste',
    SUPABASE_SERVICE_ROLE_KEY:'servidor-de-teste',
    INSTAGRAM_APP_ID:'1670483874468146',
    INSTAGRAM_APP_SECRET:'segredo-ficticio-local',
    INSTAGRAM_WEBHOOK_VERIFY_TOKEN:'verificar-ficticio',
    INSTAGRAM_BUSINESS_ID:'17841461793945231'
  }
  await withEnv(env,async()=>{
    assert.equal(settings().award,false)
    assert.equal(settings().actor,null)
    const req=fakeReq('POST','/api/instagram/webhook','{"object":"instagram","entry":[]}')
    req.headers['x-hub-signature-256']='sha256='+('0'.repeat(64))
    const res=fakeRes()
    await webhook(req,res)
    assert.equal(res.statusCode,403)
    assert.equal(JSON.parse(res.body).status,'invalid_signature')
  })
})

test('Webhook autenticado ignora evento de outro destinatário sem consultar dados',async()=>{
  const secret='segredo-ficticio-local'
  const env={
    NPV_INSTAGRAM_ENABLED:'true',NPV_INSTAGRAM_AWARD_ENABLED:'false',
    VITE_CLUBE_SUPABASE_URL:'https://example.supabase.co',
    VITE_CLUBE_SUPABASE_PUBLISHABLE_KEY:'publica-de-teste',
    SUPABASE_SERVICE_ROLE_KEY:'servidor-de-teste',
    INSTAGRAM_APP_ID:'1670483874468146',
    INSTAGRAM_APP_SECRET:secret,
    INSTAGRAM_WEBHOOK_VERIFY_TOKEN:'verificar-ficticio',
    INSTAGRAM_BUSINESS_ID:'17841461793945231'
  }
  await withEnv(env,async()=>{
    const body=JSON.stringify({object:'instagram',entry:[{messaging:[{
      sender:{id:'123456789'},recipient:{id:'999999999'},
      message:{mid:'mid-outro-destinatario',attachments:[{type:'story_mention',payload:{id:'story_123456'}}]}
    }]}]})
    const req=fakeReq('POST','/api/instagram/webhook',body)
    req.headers['x-hub-signature-256']='sha256='+crypto.createHmac('sha256',secret).update(body).digest('hex')
    const res=fakeRes()
    await webhook(req,res)
    assert.equal(res.statusCode,200)
    assert.equal(JSON.parse(res.body).status,'received')
  })
})

test('Duas notificações do mesmo Story compartilham chave estável para deduplicação SQL',()=>{
  const payload={object:'instagram',entry:[{messaging:[{
    sender:{id:'123456789'},recipient:{id:'17841461793945231'},
    message:{mid:'mid-st-001',attachments:[{type:'story_mention',payload:{
      url:'https://lookaside.fbsbx.com/ig_messaging_cdn/?asset_id=17988851035358143&signature=a'
    }}]}
  },{
    sender:{id:'123456789'},recipient:{id:'17841461793945231'},
    message:{mid:'mid-st-002',attachments:[{type:'story_mention',payload:{
      url:'https://lookaside.fbsbx.com/ig_messaging_cdn/?asset_id=17988851035358143&signature=b'
    }}]}
  }]}]}
  const events=extractEvents(payload)
  assert.equal(events.length,2)
  assert.equal(events[0].storyKey,events[1].storyKey)
  assert.equal(events[0].verifiedStory,true)
  assert.notEqual(events[0].id,events[1].id)
})

test('App ID incorreto não autoriza a integração, mesmo com as demais variáveis',()=>{
  const base={
    NPV_INSTAGRAM_ENABLED:'true',NPV_INSTAGRAM_AWARD_ENABLED:'false',
    VITE_CLUBE_SUPABASE_URL:'https://example.supabase.co',
    VITE_CLUBE_SUPABASE_PUBLISHABLE_KEY:'publica-de-teste',
    SUPABASE_SERVICE_ROLE_KEY:'servidor-de-teste',
    INSTAGRAM_APP_SECRET:'segredo-ficticio-local',
    INSTAGRAM_WEBHOOK_VERIFY_TOKEN:'verificar-ficticio',
    INSTAGRAM_BUSINESS_ID:'17841461793945231'
  }
  assert.equal(settings({...base,INSTAGRAM_APP_ID:'4205484039583967'}),null)
  assert.equal(settings({...base,INSTAGRAM_APP_ID:''}),null)
  assert.equal(settings({...base,INSTAGRAM_APP_ID:'1670483874468146'})?.appId,'1670483874468146')
})

test('Homologação exige UUID autorizado e proíbe pontos mesmo com flag indevida',()=>{
  const base={
    NPV_INSTAGRAM_ENABLED:'true',NPV_INSTAGRAM_AWARD_ENABLED:'true',
    NPV_INSTAGRAM_TEST_MODE:'true',
    VITE_CLUBE_SUPABASE_URL:'https://example.supabase.co',
    VITE_CLUBE_SUPABASE_PUBLISHABLE_KEY:'publica-de-teste',
    SUPABASE_SERVICE_ROLE_KEY:'servidor-de-teste',
    INSTAGRAM_APP_ID:'1670483874468146',
    INSTAGRAM_APP_SECRET:'segredo-ficticio-local',
    INSTAGRAM_WEBHOOK_VERIFY_TOKEN:'verificar-ficticio',
    INSTAGRAM_BUSINESS_ID:'17841461793945231'
  }
  assert.equal(settings({...base,NPV_INSTAGRAM_TEST_STUDENT_ID:'sem-id'}),null)
  const cfg=settings({...base,NPV_INSTAGRAM_TEST_STUDENT_ID:'00000000-0000-4000-8000-000000000001'})
  assert.equal(cfg.testOnly,true)
  assert.equal(cfg.award,false)
  assert.equal(cfg.testStudentId,'00000000-0000-4000-8000-000000000001')
})
