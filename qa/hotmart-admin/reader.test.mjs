import test from 'node:test'
import assert from 'node:assert/strict'
import {
 PRODUCT,canonicalEmail,hotmartDate,pages,normalizeSubscriber,sortedSubscriptions,
 subscriptionSnapshot,paymentOverview,subscriberPayments,matchIdentity,metricsFor
} from '../../clube/hotmart-admin/reader.mjs'
import {handleHotmartAdminStatus} from '../../api/clube/hotmart-admin.js'
const PID=6304828,UCODE=PRODUCT.ucode
const subscriber=(id,status='ACTIVE',plan=1155921,email='cliente@example.invalid')=>({
 subscriber_code:'SUB-'+id,status,subscriber:{name:'Cliente Fictício '+id,email},
 product:{id:PID,ucode:UCODE,name:'NPV Teste'},plan:{id:plan,recurrency_period:plan===1155921?30:90},
 accession_date:1791000000000,date_next_charge:1794000000000
})
const env={VITE_CLUBE_SUPABASE_URL:'https://fixture.supabase.co',
 VITE_CLUBE_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_fixture',
 HOTMART_CLIENT_ID:'fixture_id',HOTMART_CLIENT_SECRET:'fixture_secret',
 HOTMART_BASIC_TOKEN:'fixture_basic',HOTMART_ALLOWED_PRODUCT_IDS:'6304828'}
const jwt='Bearer test-token-mock-value-not-real'
function mockAuth({authorized=true,exists=true}={}){
 const calls=[]
 function createClientFn(url,key){
  calls.push(key)
  return {auth:{getUser:async()=>({data:{user:exists?{id:'u1'}:null},error:null})},
    from(table){
     assert.equal(table,'clube_admins')
     return {select(){return {eq(){return {maybeSingle:async()=>({
      data:authorized?{user_id:'u1'}:null,error:null})}}}}}
    }
  }
 }
 return {createClientFn,calls}
}
async function invoke({auth=mockAuth(),url='/api/clube/hotmart-admin?refresh=1',
 credentials=env,reader=async()=>({complete:true,synced_at:new Date().toISOString(),
 subscriptions:sortedSubscriptions([subscriber(1),subscriber(2,'DELAYED')])}),
 identity=async rows=>({rows:rows.map(x=>({...x,link_status:'not_linked'})),verified:true}),
 paymentReader=async()=>paymentOverview([{transaction:'TEST1',status:'COMPLETE',approved_date:1791000000000}]),
 method='GET',authorization=jwt}={}){
 const result={status:null,body:null,headers:null}
 const res={writeHead(code,headers){result.status=code;result.headers=headers;return this},
 end(body){result.body=JSON.parse(body)}}
 await handleHotmartAdminStatus({method,url,headers:{authorization}},res,
  {env:credentials,reader,identity,createClientFn:auth.createClientFn,paymentReader})
 return {...result,authCalls:auth.calls}
}
test('datas oficiais em segundos, milissegundos e ISO',()=>{
 assert.equal(hotmartDate(1791000000),hotmartDate(1791000000000))
 assert.equal(hotmartDate('2026-10-03T00:00:00Z'),'2026-10-03T00:00:00.000Z')
 assert.equal(hotmartDate(null),null)
})
test('assinatura ativa tem prioridade; histórico mantém todas situações separadas',()=>{
 const rows=sortedSubscriptions([
 subscriber(1,'CANCELLED_BY_CUSTOMER'),subscriber(2,'INACTIVE'),
 subscriber(3,'DELAYED'),subscriber(4,'CANCELLED_BY_ADMIN'),subscriber(5,'ACTIVE')
 ])
 assert.equal(rows.length,5)
 assert.equal(rows[0].status,'ACTIVE')
 assert.equal(rows[0].plan,'mensal')
 assert.equal(rows[1].status!=='ACTIVE',true)
 assert.deepEqual(metricsFor(rows,{identityVerified:false}).status_counts,{
 ACTIVE:1,DELAYED:1,INACTIVE:1,CANCELLED_BY_ADMIN:1,CANCELLED_BY_CUSTOMER:1
 })
})
test('planos oficiais só são rotulados quando IDs e periodicidades batem',()=>{
 assert.equal(normalizeSubscriber(subscriber(1,'ACTIVE',1155920)).plan,'trimestral')
 assert.equal(normalizeSubscriber({...subscriber(1),plan:{id:123,recurrency_period:30}}).plan,'desconhecido')
 assert.equal(normalizeSubscriber({...subscriber(1),product:{id:999,ucode:UCODE}}),null)
 assert.equal(normalizeSubscriber({...subscriber(1),product:{id:PID,ucode:'inventado'}}),null)
})
test('identidade exige email canônico, Auth confirmado e perfil aprovado',()=>{
 const rows=sortedSubscriptions([subscriber(1,'ACTIVE',1155921,'client@example.invalid')])
 const profiles=[{id:'u1',email:'client@example.invalid',approved:true}]
 assert.equal(matchIdentity(rows,profiles,[{id:'u1',email:'client@example.invalid',email_confirmed_at:new Date().toISOString()}])[0].link_status,'linked')
 assert.equal(matchIdentity(rows,profiles,[{id:'u1',email:'client@example.invalid'}])[0].link_status,'email_unconfirmed')
 assert.equal(matchIdentity(rows,profiles,[{id:'u1',email:'wrong@example.invalid',email_confirmed_at:new Date().toISOString()}])[0].link_status,'identity_mismatch')
 assert.equal(matchIdentity(rows,[...profiles,{id:'u2',email:'client@example.invalid'}],[])[0].link_status,'conflict')
 assert.equal(matchIdentity(rows,[],[])[0].link_status,'not_linked')
 assert.equal(canonicalEmail(' TEST@Example.Invalid '),'test@example.invalid')
})
test('pendência só conta assinaturas ativas sem vínculo, não 45 históricos',()=>{
 const rows=[
 {...normalizeSubscriber(subscriber(1,'ACTIVE')),link_status:'not_linked'},
 {...normalizeSubscriber(subscriber(2,'ACTIVE')),link_status:'linked'},
 {...normalizeSubscriber(subscriber(3,'INACTIVE')),link_status:'not_linked'}
 ]
 const m=metricsFor(rows,{identityVerified:true})
 assert.deepEqual([m.active,m.pending,m.linked,m.historical,m.renewed],[2,1,1,3,null])
 assert.equal(metricsFor(rows,{identityVerified:false}).pending,null)
})
test('páginas completas, inclusive 3 páginas de assinaturas',async()=>{
 let count=0
 const source=async u=>{
  count++
  const cursor=new URL(u).searchParams.get('page_token')
  return {ok:true,json:async()=>({
   items:[subscriber(count,'ACTIVE')],
   page_info:{next_page_token:cursor==='p2'?null:cursor==='p1'?'p2':'p1'}
  })}
 }
 const rows=await pages('https://developers.hotmart.com/payments/api/v1/subscriptions', 'fixture',source)
 assert.equal(rows.length,3)
 assert.equal(count,3)
})
test('repetição de cursor, 429 e página incompleta falham fechados',async()=>{
 const repeat=async()=>({ok:true,json:async()=>({items:[],page_info:{next_page_token:'A'}})})
 await assert.rejects(()=>pages('https://developers.hotmart.com/payments/api/v1/subscriptions','fixture',repeat),/hotmart_page_repeated/)
 await assert.rejects(()=>pages('https://developers.hotmart.com/payments/api/v1/subscriptions','fixture',
  async()=>({ok:false,status:429})),/hotmart_http_429/)
 await assert.rejects(()=>pages('https://developers.hotmart.com/payments/api/v1/subscriptions','fixture',
  async()=>({ok:true,json:async()=>({items:[],page_info:{next_page_token:'B'}})}),{limit:1}),/hotmart_pages_incomplete/)
})
test('consulta de inventário não usa date_next_charge como filtro e não baixa outros produtos',async()=>{
 const urls=[]
 const fetcher=async(url)=>{
  urls.push(String(url))
  if(String(url).includes('/oauth/token'))return {ok:true,json:async()=>({access_token:'fixture_access'})}
  return {ok:true,json:async()=>({items:[subscriber(1)],page_info:{}})}
 }
 const result=await subscriptionSnapshot(env,fetcher)
 assert.equal(result.subscriptions.length,1)
 assert.equal(result.complete,true)
 const url=new URL(urls.find(u=>u.includes('/subscriptions')))
 assert.equal(url.searchParams.get('product_id'),'6304828')
 assert.equal(url.searchParams.has('date_next_charge'),false)
})
test('COMPLETE com approved_date é pago, mas não gera renovação elegível',()=>{
 const p=paymentOverview([
 {status:'COMPLETE',transaction:'T1',approved_date:1791000000000,recurrency_number:2},
 {status:'OVERDUE',transaction:'T2',approved_date:null,recurrency_number:3},
 {status:'REFUNDED',transaction:'T3',approved_date:1791000000000,recurrency_number:2}
 ])
 assert.equal(p.confirmed_payments,1)
 assert.equal(p.renewal_status,'not_verified')
 assert.deepEqual(p.by_status,{COMPLETE:1,OVERDUE:1,REFUNDED:1})
})
test('histórico array real e resposta paginada suportados, sem adiantar pontos',async()=>{
 const base=()=>({ok:true,json:async()=>({access_token:'token_fake'})})
 const fetcher=async u=>{
  if(String(u).includes('/oauth/token'))return base()
  return {ok:true,json:async()=>[{transaction:'A1',status:'APPROVED',approved_date:1791000000}]}
 }
 const result=await subscriberPayments(env,'SUB-1',fetcher)
 assert.equal(result.confirmed_payments,1)
 assert.equal(result.renewal_status,'not_verified')
})
test('endpoint recusa anônimos/estudantes antes de consultar Hotmart',async()=>{
 let calls=0
 const reader=async()=>{calls++;throw new Error('never') }
 assert.equal((await invoke({authorization:null,reader})).status,401)
 assert.equal((await invoke({auth:mockAuth({authorized:false}),reader})).status,403)
 assert.equal(calls,0)
})
test('endpoint preparado sem chaves retorna pendência real, não zeros inventados',async()=>{
 const r=await invoke({credentials:{VITE_CLUBE_SUPABASE_URL:env.VITE_CLUBE_SUPABASE_URL,
  VITE_CLUBE_SUPABASE_PUBLISHABLE_KEY:env.VITE_CLUBE_SUPABASE_PUBLISHABLE_KEY}})
 assert.equal(r.status,200)
 assert.equal(r.body.status,'awaiting_integration')
 assert.equal(r.body.metrics,null)
})
test('endpoint server-side transmite somente após admin, sem cache público',async()=>{
 const r=await invoke()
 assert.equal(r.status,200)
 assert.equal(r.body.metrics.active,1)
 assert.equal(r.body.metrics.pending,1)
 assert.equal(r.body.metrics.renewed,null)
 assert.equal(r.body.subscriptions.length,2)
 assert.equal(r.headers['Cache-Control'],'no-store, private')
})
test('pagamentos acessíveis somente para assinatura do produto autorizado',async()=>{
 let p=0
 const paymentReader=async()=>{p++;return paymentOverview([{status:'COMPLETE',transaction:'X1',approved_date:1791000000}])}
 const no=await invoke({url:'/api/clube/hotmart-admin?action=payments&subscriber_code=SUB-999&refresh=1',paymentReader})
 assert.equal(no.status,404)
 assert.equal(p,0)
 const yes=await invoke({url:'/api/clube/hotmart-admin?action=payments&subscriber_code=SUB-1&refresh=1',paymentReader})
 assert.equal(yes.status,200)
 assert.equal(yes.body.confirmed_payments,1)
 assert.equal(yes.body.confirmed_renewals,null)
 assert.equal(p,1)
})
test('falha após snapshot entrega apenas última leitura em estado stale',async()=>{
 await invoke()
 const r=await invoke({reader:async()=>{throw Error('temporary 503')}})
 assert.equal(r.status,200)
 assert.equal(r.body.status,'stale')
 assert.ok(r.body.synced_at)
})
test('nenhum cadastro, credito, webhook ou rpc é executado nesta rota',async()=>{
 const {readFileSync}=await import('node:fs')
 const src=readFileSync(new URL('../../api/clube/hotmart-admin.js',import.meta.url),'utf8')
 assert.doesNotMatch(src,/\.(insert|upsert|update|delete|rpc|createUser)\s*\(/)
 assert.match(src,/auth\.getUser/)
 assert.match(src,/administrator\?\.user_id/)
})

test('vínculo real simulado: servidor usa service role só depois da autorização e exige Auth confirmado',async()=>{
 const hits=[]
 const clientFn=(url,key)=>{
  hits.push(key)
  if(key==='fixture_service_role')return {
   from(table){assert.equal(table,'clube_profiles');return {
    select(){return {limit:async()=>({data:[{
     id:'verified-user',email:'cliente@example.invalid',approved:true
    }],count:1,error:null})}}
   }},
   auth:{admin:{getUserById:async(id)=>{
    assert.equal(id,'verified-user')
    return {data:{user:{id,email:'cliente@example.invalid',email_confirmed_at:'2026-10-01T00:00:00Z'}},error:null}
   }}}
  }
  return {auth:{getUser:async()=>({data:{user:{id:'admin-123'}},error:null})},
   from(table){assert.equal(table,'clube_admins');return {select(){return {eq(){return {
    maybeSingle:async()=>({data:{user_id:'admin-123'},error:null})}}}}}}
  }
 }
 const response={status:null,body:null}
 const res={writeHead(status){response.status=status;return this},
  end(data){response.body=JSON.parse(data)}}
 const reader=async()=>({complete:true,synced_at:'2026-10-21T10:00:00Z',
  subscriptions:sortedSubscriptions([subscriber(1,'ACTIVE')])})
 await handleHotmartAdminStatus(
  {method:'GET',url:'/api/clube/hotmart-admin?refresh=1',headers:{authorization:jwt}},
  res,{env:{...env,SUPABASE_SERVICE_ROLE_KEY:'fixture_service_role'},createClientFn:clientFn,reader})
 assert.equal(response.status,200)
 assert.equal(response.body.identity_verified,true)
 assert.equal(response.body.subscriptions[0].link_status,'linked')
 assert.equal(response.body.metrics.pending,0)
 assert.deepEqual(hits,[env.VITE_CLUBE_SUPABASE_PUBLISHABLE_KEY,'fixture_service_role'])
})
