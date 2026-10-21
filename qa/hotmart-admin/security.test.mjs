import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {handleHotmartAdminStatus} from '../../api/clube/hotmart-admin.js'

const ID='10000000-0000-4000-8000-000000000001'
const TOKEN='test-token-mock-value-not-real'
const env={VITE_CLUBE_SUPABASE_URL:'https://fixture.supabase.co',
 VITE_CLUBE_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_fixture_test'}
function fakeDb({user={id:ID},admin={user_id:ID},authError=null,roleError=null}={}){
 const actions=[]
 const createClientFn=(_url,_key,config)=>{
  actions.push({operation:'create',hasBearer:Boolean(config.global?.headers?.Authorization)})
  return {
   auth:{getUser:async(token)=>{actions.push({operation:'getUser',token});return {data:{user},error:authError}}},
   from(table){actions.push({operation:'from',table});return {
     select(fields){actions.push({operation:'select',fields});return {
       eq(field,value){actions.push({operation:'eq',field,value});return {
         maybeSingle:async()=>({data:admin,error:roleError})
       }}
     }}
   }}
  }
 }
 return {createClientFn,actions}
}
async function request({method='GET',authorization='Bearer '+TOKEN,mock=fakeDb(),variables=env,loadSnapshot=undefined,url='/api/clube/hotmart-admin'}={}){
 let result={status:null,headers:{},body:null}
 const res={writeHead(code,headers){result.status=code;result.headers=headers;return this},
  end(body){result.body=JSON.parse(body);return this}}
 await handleHotmartAdminStatus({method,url,headers:{authorization}},res,
  {createClientFn:mock.createClientFn,env:variables,...(loadSnapshot?{loadSnapshot}:{})})
 return {...result,actions:mock.actions}
}
test('1 nenhuma autorização é rejeitada antes de consultar a base',async()=>{
 const mock=fakeDb()
 const r=await request({authorization:null,mock})
 assert.equal(r.status,401);assert.equal(mock.actions.length,0)
})
test('2 token de formato inválido é rejeitado',async()=>{
 const r=await request({authorization:'Bearer a'})
 assert.equal(r.status,401)
})
test('3 POST e métodos mutantes não podem operar',async()=>{
 for(const method of ['POST','PATCH','PUT','DELETE']){
  const r=await request({method})
  assert.equal(r.status,405)
 }
})
test('4 token inexistente no Auth real nunca autoriza',async()=>{
 const r=await request({mock:fakeDb({user:null,authError:{message:'invalid'}})})
 assert.equal(r.status,401)
})
test('5 usuário comum autenticado é proibido',async()=>{
 const r=await request({mock:fakeDb({admin:null})})
 assert.equal(r.status,403)
})
test('6 cargo de terceiro não concede acesso',async()=>{
 const r=await request({mock:fakeDb({admin:{user_id:'another-user'}})})
 assert.equal(r.status,403)
})
test('7 falha da consulta administrativa fecha o acesso',async()=>{
 const r=await request({mock:fakeDb({roleError:{message:'db failed'}})})
 assert.equal(r.status,503)
})
test('8 configuração ausente fecha sem dados',async()=>{
 const r=await request({variables:{}})
 assert.equal(r.status,503)
})
test('9 admin autorizado vê apenas estado sem integração e não números falsos',async()=>{
 const r=await request()
 assert.equal(r.status,200);assert.equal(r.body.status,'awaiting_integration')
 assert.equal(r.body.message,'Aguardando integração com a Hotmart')
 assert.equal(r.body.metrics,null)
 assert.deepEqual(r.body.subscriptions,[])
 assert.equal(r.body.synced_at,null)
 assert.equal(r.headers['Cache-Control'],'no-store, private')
 assert.equal(r.headers.Vary,'Authorization')
 assert.deepEqual(r.actions.filter(x=>x.operation==='from').map(x=>x.table),['clube_admins'])
})
test('10 API não consulta Hotmart, não lança pontos e não contém service role',()=>{
 const server=readFileSync(new URL('../../api/clube/hotmart-admin.js',import.meta.url),'utf8')
 assert.doesNotMatch(server,/HOTMART_CLIENT_|HOTMART_BASIC_|HOTMART_HOTTOK|SERVICE_ROLE_KEY/)
 assert.doesNotMatch(server,/\.(insert|update|delete|upsert|rpc)\(/)
 const client=readFileSync(new URL('../../src/ClubeHotmartAdmin.jsx',import.meta.url),'utf8')
 assert.match(client,/Authorization:'Bearer '\+session\.access_token/)
 assert.match(client,/if\(!isAdmin\)return null/)
 assert.doesNotMatch(client,/service_role|VITE_HOTMART_/)
})
test('11 navegação somente admin e logo depois de Alunos, sem tocar tela aluno',()=>{
 const src=readFileSync(new URL('../../src/ClubeNPVOnline.jsx',import.meta.url),'utf8')
 const menu=src.slice(src.indexOf('<nav className="clube-nav">'),src.indexOf('<nav className="clube-nav">')+1300)
 const alunos=menu.indexOf("tab==='alunos'")
 const hotmart=menu.indexOf("tab==='hotmart'")
 assert.ok(alunos>=0&&hotmart>alunos)
 assert.match(menu,/\{isAdmin&&<button className=\{tab==='hotmart'/)
 assert.match(src,/\{tab==='hotmart'&&isAdmin&&<ClubeHotmartAdmin/)
 const studentNav=src.slice(src.indexOf('aria-label="Navegação do Clube NPV"'),
  src.indexOf('aria-label="Navegação do Clube NPV"')+700)
 assert.doesNotMatch(studentNav,/hotmart/i)
})

test('12 endpoint não chama Hotmart para aluno não administrador mesmo quando configurado',async()=>{
 let queries=0
 const q=async()=>{queries++;throw new Error('not allowed')}
 const r=await request({mock:fakeDb({admin:null}),variables:{
  ...env,HOTMART_ADMIN_READONLY_ENABLED:'true',HOTMART_ALLOWED_PRODUCT_IDS:'6304828'
 },loadSnapshot:q})
 assert.equal(r.status,403)
 assert.equal(queries,0)
})
test('13 admin autorizado recebe números e nomes apenas após leitura bem-sucedida',async()=>{
 const rows=[{id:'fake-1',subscriber_name:'Pessoa fictícia',subscriber_email:'fixture@example.invalid',
  status:'ACTIVE',plan:'mensal',link_status:'pending_no_clube_profile'}]
 const snapshot={
  status:'synced',synced_at:'2026-10-21T18:00:00Z',complete:true,
  metrics:{active:1,linked:0,pending:1,renewed:null,total:1,statuses:{ACTIVE:1}},
  subscriptions:rows
 }
 const r=await request({variables:{...env,HOTMART_ADMIN_READONLY_ENABLED:'true',
  HOTMART_ALLOWED_PRODUCT_IDS:'6304828'},loadSnapshot:async()=>snapshot,url:'/api/clube/hotmart-admin?refresh=1'})
 assert.equal(r.status,200)
 assert.equal(r.body.metrics.active,1)
 assert.equal(r.body.metrics.renewed,null)
 assert.equal(r.body.subscriptions[0].subscriber_name,'Pessoa fictícia')
 assert.equal(r.headers['Cache-Control'],'private, no-store, max-age=0')
})
test('14 snapshot incompleto nunca se apresenta como sincronizado',async()=>{
 const r=await request({variables:{...env,HOTMART_ADMIN_READONLY_ENABLED:'true',
  HOTMART_ALLOWED_PRODUCT_IDS:'6304828'},loadSnapshot:async()=>({status:'synced',complete:false,subscriptions:[],metrics:{active:0}}),url:'/api/clube/hotmart-admin?refresh=1'})
 // se há cache bem-sucedido, mostramos STALE; jamais zero de resposta incompleta
 assert.ok(r.status===503||(r.status===200&&r.body.status==='stale'))
 assert.notEqual(r.body.status,'synced')
})
test('15 uma allowlist errada não chama nenhuma API Hotmart',async()=>{
 let count=0
 const r=await request({variables:{...env,HOTMART_ADMIN_READONLY_ENABLED:'true',
  HOTMART_ALLOWED_PRODUCT_IDS:'999999'},loadSnapshot:async()=>{count++;return null}})
 assert.equal(r.status,503)
 assert.equal(count,0)
})
