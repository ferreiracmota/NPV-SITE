import test from 'node:test'
import assert from 'node:assert/strict'
import { discoverMissingPayments } from './discovery.mjs'
const env={HOTMART_CLIENT_ID:'test',HOTMART_CLIENT_SECRET:'test',HOTMART_BASIC_TOKEN:'test',HOTMART_ALLOWED_PRODUCT_IDS:'1111111'}
const START='2026-10-20T00:00:00.000Z'
const AFTER=Date.parse('2026-10-21T00:00:00.000Z')
const BEFORE=Date.parse('2026-09-01T00:00:00.000Z')
function fixtures({period=30,ucode='allowed-ucode',purchases}={}) {
 const rpc=[],saved=[]
 const product={product_id:1111111,product_ucode:'allowed-ucode',monthly_plan_ids:[99]}
 const db={
  rpc:async (...args)=>{rpc.push(args);return {error:null}},
  from(name){
   if(name==='clube_hotmart_products')return {select(){return {eq:async()=>({data:[product],error:null})}}}
   if(name==='clube_hotmart_sync_state')return {
    select:async()=>({data:[],error:null}),
    upsert:async row=>{saved.push(row);return {error:null}}
   }
   throw Error('unexpected table: '+name)
  }
 }
 const api=async url=>{
  let data
  if(String(url).includes('oauth/token'))data={access_token:'fake-token'}
  else if(String(url).endsWith('/purchases'))data=purchases||[
   {transaction:'HP-MONTHLY-2',approved_date:AFTER,recurrency_number:2,
    purchase_subscription:true,status:'APPROVED'},
   {transaction:'HP-INITIAL',approved_date:AFTER,recurrency_number:1,
    purchase_subscription:true,status:'APPROVED'},
   {transaction:'HP-PAST',approved_date:BEFORE,recurrency_number:3,
    purchase_subscription:true,status:'APPROVED'}
  ]
  else data={items:[{subscriber_code:'SUB-1',
   product:{id:1111111,ucode},plan:{id:99,recurrency_period:period},
   subscriber:{email:'aluno@example.com'}}],page_info:{next_page_token:'page2'}}
  return {ok:true,json:async()=>data}
 }
 return {db,api,rpc,saved}
}
test('recupera mensalidade paga após marco e nunca a inicial ou histórica',async()=>{
 const f=fixtures()
 const r=await discoverMissingPayments(f.db,env,START,f.api)
 assert.equal(r.processed,1)
 assert.equal(f.rpc.length,1)
 assert.equal(f.rpc[0][1].p_transaction,'HP-MONTHLY-2')
 assert.equal(f.rpc[0][1].p_verified_subscriber_email,'aluno@example.com')
 assert.equal(f.saved[0].page_token,'page2')
})
test('plano trimestral não gera descobertas de renovação',async()=>{
 const f=fixtures({period:90})
 const r=await discoverMissingPayments(f.db,env,START,f.api)
 assert.equal(r.processed,0)
 assert.equal(f.rpc.length,0)
})
test('produto incompatível não gera vínculo nem bônus',async()=>{
 const f=fixtures({ucode:'outro-produto'})
 const r=await discoverMissingPayments(f.db,env,START,f.api)
 assert.equal(r.processed,0)
})
test('falha na API não avança cursor nem lança pontos',async()=>{
 const f=fixtures()
 await assert.rejects(()=>discoverMissingPayments(f.db,env,START,async()=>({ok:false})))
 assert.equal(f.saved.length,0)
 assert.equal(f.rpc.length,0)
})
test('reembolso conhecido pela API vira evento terminal auditável',async()=>{
 const f=fixtures({purchases:[{transaction:'HP-RF',approved_date:AFTER,recurrency_number:2,
  purchase_subscription:true,status:'REFUNDED'}]})
 const r=await discoverMissingPayments(f.db,env,START,f.api)
 assert.equal(r.processed,1)
 assert.equal(f.rpc[0][1].p_event_type,'PURCHASE_REFUNDED')
 assert.equal(f.rpc[0][1].p_purchase_verified,false)
})
