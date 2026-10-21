import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import handler from '../../api/hotmart/identify.js'

const invoke=async({method='GET',authorization}={})=>{
 const req={method,url:'/api/hotmart/identify?mode=catalog',headers:{authorization}}
 let result={status:null,headers:null,body:null}
 const res={
  writeHead(status,headers){result.status=status;result.headers=headers;return this},
  end(body){result.body=body?JSON.parse(body):null;return this}
 }
 await handler(req,res)
 return result
}
test('endpoint real: recusa sem token, sem consultar o banco ou a Hotmart',async()=>{
 const prior=process.env.HOTMART_IDENTIFY_SECRET
 try{
  process.env.HOTMART_IDENTIFY_SECRET='segredo-do-teste-interno'
  for(const authorization of [undefined,'Bearer errado','Basic teste']){
   const r=await invoke({authorization})
   assert.equal(r.status,401)
   assert.equal(r.body.status,'unauthorized')
   assert.equal(r.headers['Cache-Control'],'no-store')
  }
 }finally{
  if(prior===undefined)delete process.env.HOTMART_IDENTIFY_SECRET
  else process.env.HOTMART_IDENTIFY_SECRET=prior
 }
})
test('endpoint real: só aceita GET',async()=>{
 const r=await invoke({method:'POST'})
 assert.equal(r.status,405)
})
test('endpoint real: com autenticação mas sem credenciais Hotmart retorna 503',async()=>{
 const keys=['HOTMART_IDENTIFY_SECRET','HOTMART_CLIENT_ID','HOTMART_CLIENT_SECRET','HOTMART_BASIC_TOKEN']
 const original=Object.fromEntries(keys.map(k=>[k,process.env[k]]))
 try{
  process.env.HOTMART_IDENTIFY_SECRET='senha-apenas-teste'
  for(const key of keys.slice(1))delete process.env[key]
  const r=await invoke({authorization:'Bearer senha-apenas-teste'})
  assert.equal(r.status,503)
  assert.equal(r.body.status,'hotmart_connection_required')
 }finally{
  for(const [key,val] of Object.entries(original)){
   if(val===undefined)delete process.env[key]
   else process.env[key]=val
  }
 }
})
test('auditoria: identificação sem operações que escrevem pontos, perfis, assinaturas ou resgates',()=>{
 const src=readFileSync(new URL('../../api/hotmart/identify.js',import.meta.url),'utf8')
 assert.doesNotMatch(src,/\.insert\(|\.update\(|\.upsert\(|\.delete\(|\.rpc\(|\.createUser\(|\.signUp\(/)
 assert.match(src,/if\(!env\.HOTMART_IDENTIFY_SECRET/)
 assert.match(src,/isAuthentic\(req\.headers\.authorization/)
 assert.match(src,/Cache-Control.*no-store/)
 assert.match(src,/pointsAwarded:0/)
 assert.match(src,/initialSyncOnly:true/)
})
