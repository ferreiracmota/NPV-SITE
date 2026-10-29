import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {hotmartDate,normalizeSubscription,summarizePayments,pageAll,readLiveSnapshot,
 resolveVerifiedLinks,buildMetrics} from '../../clube/hotmart-admin/reader.mjs'

const env={
 HOTMART_CLIENT_ID:'fake-client',HOTMART_CLIENT_SECRET:'fake-secret',
 HOTMART_BASIC_TOKEN:'fake-basic',HOTMART_ALLOWED_PRODUCT_IDS:'6304828',
 VITE_CLUBE_SUPABASE_URL:'https://fixture.example.invalid'
}
const statuses=[
 ...Array(2).fill('ACTIVE'),...Array(6).fill('DELAYED'),
 ...Array(8).fill('INACTIVE'),...Array(15).fill('CANCELLED_BY_ADMIN'),
 ...Array(14).fill('CANCELLED_BY_CUSTOMER')
]
const raw=statuses.map((status,i)=>({
 subscriber_code:'FAKE-SUB-'+String(i+1).padStart(3,'0'),
 subscriber:{name:'Pessoa de teste '+i,email:'fake'+i+'@example.invalid'},
 product:{id:6304828,name:'NPV TEST',ucode:'588a8af3-ca54-4745-9420-47e5d45d51e0'},
 plan:{id:i<39?1155921:1155920,recurrency_period:i<39?30:90},
 status,date_next_charge:1770000000000,accession_date:1760000000
}))
const requests=[]
function fakeFetch(url,config={}){
 const s=String(url)
 requests.push({host:new URL(s).hostname,path:new URL(s).pathname,method:config.method||'GET'})
 if(s.includes('/security/oauth/token'))return Promise.resolve({ok:true,json:async()=>({access_token:'fake-access'})})
 if(s.includes('/payments/api/v1/subscriptions?')){
  const tok=new URL(s).searchParams.get('page_token')
  const part=tok==='page-3'?raw.slice(40):tok==='page-2'?raw.slice(20,40):raw.slice(0,20)
  const next=tok==='page-3'?null:tok==='page-2'?'page-3':'page-2'
  return Promise.resolve({ok:true,json:async()=>({items:part,page_info:{next_page_token:next}})})
 }
 if(s.includes('/purchases')){
  return Promise.resolve({ok:true,json:async()=>[
   {transaction:'FAKE-TR-1',status:'COMPLETE',approved_date:1790000000,recurrency_number:1},
   {transaction:'FAKE-TR-2',status:'OVERDUE',approved_date:null,recurrency_number:2},
   {transaction:'FAKE-TR-3',status:'REFUNDED',approved_date:1790200000,recurrency_number:3}
  ]})
 }
 throw Error('unexpected_mock_request')
}
test('45 histórico completo, 2 ativos, pendentes desconhecidos se identidade indisponível',async()=>{
 requests.length=0
 const snap=await readLiveSnapshot(env,{fetcher:fakeFetch})
 assert.equal(snap.status,'synced')
 assert.equal(snap.metrics.total,45)
 assert.equal(snap.metrics.active,2)
 assert.equal(snap.metrics.statuses.DELAYED,6)
 assert.equal(snap.metrics.statuses.CANCELLED_BY_ADMIN,15)
 assert.equal(snap.metrics.statuses.CANCELLED_BY_CUSTOMER,14)
 assert.equal(snap.metrics.statuses.INACTIVE,8)
 assert.equal(snap.metrics.linked,null)
 assert.equal(snap.metrics.pending,null)
 assert.equal(snap.metrics.renewed,null)
 assert.equal(snap.subscriptions.filter(x=>x.plan==='mensal').length,39)
 assert.equal(snap.subscriptions.filter(x=>x.plan==='trimestral').length,6)
 assert.equal(snap.subscriptions[0].status,'ACTIVE')
 assert.equal(snap.subscriptions[0].last_payment_status,'COMPLETE')
 assert.equal(snap.subscriptions[0].confirmed_payments,1)
 assert.ok(snap.complete)
 assert.equal(requests.filter(x=>x.path==='/payments/api/v1/subscriptions').length,3)
 assert.equal(requests.filter(x=>x.path.endsWith('/purchases')).length,45)
 assert.ok(requests.every(x=>x.method==='GET'||x.path.endsWith('/security/oauth/token')))
 assert.ok(requests.every(x=>x.host==='developers.hotmart.com'||x.host==='api-sec-vlc.hotmart.com'))
})
test('não converter 77 cobranças pagas em renovações elegíveis',()=>{
 const arr=[
 {status:'APPROVED',approved_date:1790000000,recurrency_number:1},
 {status:'COMPLETE',approved_date:1790100000000,recurrency_number:2,payment_type:'INSTALLMENT'},
 {status:'REFUNDED',approved_date:1790200000000,recurrency_number:3},
 {status:'CHARGEBACK',approved_date:1790300000000,recurrency_number:4},
 {status:'OVERDUE',approved_date:0,recurrency_number:5}
 ]
 const sum=summarizePayments(arr)
 assert.equal(sum.confirmed_payments,2)
 assert.equal(sum.refunded_payments,1)
 assert.equal(sum.chargebacks,1)
 assert.equal(sum.points_status,'not_verified')
 assert.equal(hotmartDate(1790100000),hotmartDate(1790100000000))
})
test('não criar vínculo por e-mail do assinante sem identidade Supabase confirmada',async()=>{
 const list=[normalizeSubscription(raw[0]),normalizeSubscription(raw[1])]
 const state=await resolveVerifiedLinks(list,{env,createClientFn:()=>({})})
 assert.equal(state.complete,false)
 assert.equal(list[0].link_status,'verification_unavailable')
 assert.equal(buildMetrics(list,{identityComplete:false}).pending,null)
})
test('vínculo e pendência restrita a assinaturas ativas quando Auth confirmado',async()=>{
 const list=[normalizeSubscription(raw[0]),normalizeSubscription(raw[1]),normalizeSubscription(raw[20])]
 const fakeSvc={
  from:table=>table==='clube_point_events'
    ?{select:()=>({eq:()=>({order:()=>({
      range:async()=>({data:[{id:'e1',points:820},{id:'e2',points:-150}],error:null})
    })})})}
    :{select:()=>({range:async()=>({data:[{id:'user-01',email:'fake0@example.invalid',approved:true}],error:null})})},
  auth:{admin:{getUserById:async()=>({data:{user:{id:'user-01',email:'fake0@example.invalid',email_confirmed_at:'2026-01-01T00:00:00Z'}},error:null})}}
 }
 const state=await resolveVerifiedLinks(list,{env:{...env,SUPABASE_SERVICE_ROLE_KEY:'fixture'},createClientFn:()=>fakeSvc})
 const result=buildMetrics(list,{identityComplete:state.complete})
 assert.equal(state.complete,true)
 assert.equal(result.active,2)
 assert.equal(result.linked,1)
 assert.equal(result.pending,1)
 assert.equal(list[0].link_status,'linked')
 assert.equal(list[0].clube_balance,670)
 assert.equal(list[1].link_status,'pending_no_clube_profile')
})
test('conflito de e-mails e confirmação não atribuem vínculo incorreto',async()=>{
 const list=[normalizeSubscription(raw[0])]
 const db={
  from:()=>({select:()=>({range:async()=>({data:[
   {id:'u1',email:'fake0@example.invalid',approved:true},
   {id:'u2',email:'fake0@example.invalid',approved:true}
  ],error:null})})}),
  auth:{admin:{getUserById:async()=>{throw Error('should not query ambiguous auth')}}}
 }
 await resolveVerifiedLinks(list,{env:{...env,SUPABASE_SERVICE_ROLE_KEY:'fixture'},createClientFn:()=>db})
 assert.equal(list[0].link_status,'conflict_multiple_profiles')
 assert.equal(list[0].linked,false)
})
test('paginação incompleta ou cursor repetido falha sem publicar totais parciais',async()=>{
 const token='fake'
 const url='https://developers.hotmart.com/payments/api/v1/subscriptions?product_id=6304828'
 const looping=async()=>({ok:true,json:async()=>({items:[],page_info:{next_page_token:'cursor-1'}})})
 await assert.rejects(()=>pageAll(url,token,looping),/pagination_cycle/)
 let cursor=0
 const long=async()=>({ok:true,json:async()=>({items:[],page_info:{next_page_token:'next-'+(++cursor)}})})
 await assert.rejects(()=>pageAll(url,token,long,{maxPages:2}),/pagination_incomplete/)
})
test('API 429 / 503, forma inválida e alteração de plano inesperada falham fechadas',async()=>{
 const url='https://developers.hotmart.com/payments/api/v1/subscriptions?product_id=6304828'
 await assert.rejects(()=>pageAll(url,'fake',async()=>({ok:false,status:429})),/rate_limited/)
 await assert.rejects(()=>pageAll(url,'fake',async()=>({ok:false,status:503})),/api_unavailable/)
 await assert.rejects(()=>pageAll(url,'fake',async()=>({ok:true,json:async()=>({bad:'shape'})})),/page_invalid/)
 assert.equal(normalizeSubscription({...raw[0],plan:{id:1155920,recurrency_period:30}}),null)
 assert.equal(normalizeSubscription({...raw[0],product:{id:10}}),null)
})
test('guardas de segurança não contêm gravação de saldos, perfis, eventos ou dados',()=>{
 const src=readFileSync(new URL('../../clube/hotmart-admin/reader.mjs',import.meta.url),'utf8')
 const api=readFileSync(new URL('../../api/clube/hotmart-admin.js',import.meta.url),'utf8')
 assert.doesNotMatch(src,/\.(insert|update|delete|upsert|rpc)\(/)
 assert.doesNotMatch(api,/\.(insert|update|delete|upsert|rpc)\(/)
 assert.doesNotMatch(src,/console\.(log|error)|fs\.writeFile/)
 assert.doesNotMatch(api,/console\.(log|error)|fs\.writeFile/)
 assert.match(api,/getUser\(token\)/)
 assert.match(api,/from\('clube_admins'\)/)
 assert.match(api,/HOTMART_ADMIN_READONLY_ENABLED/)
})
