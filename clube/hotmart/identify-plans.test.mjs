import test from 'node:test'
import assert from 'node:assert/strict'
import {readProductPlans} from './identify-core.mjs'
const UCODE='11111111-1111-4111-8111-111111111111'
const env={HOTMART_CLIENT_ID:'fixture-id',HOTMART_CLIENT_SECRET:'fixture-secret',HOTMART_BASIC_TOKEN:'fixture-basic'}
const request=(pages)=>async url=>{
 const link=String(url)
 if(link.includes('oauth/token'))return {ok:true,json:async()=>({access_token:'fixture-access'})}
 const next=new URL(link).searchParams.get('page_token')
 return {ok:true,json:async()=>pages[next||'first']}
}
test('planos oficiais mensal e trimestral via UCODE sem acessar assinantes',async()=>{
 const calls=[]
 const base=request({first:{items:[
  {code:'plano-mensal',name:'Mensal',periodicity:'MONTHLY',payment_mode:'ASSINATURA',max_installments:1},
  {code:'plano-trimestral',name:'Trimestral',periodicity:'QUARTERLY',payment_mode:'ASSINATURA',max_installments:3}
 ],page_info:{}}})
 const result=await readProductPlans(env,UCODE,async (...args)=>{
  calls.push(String(args[0]))
  return base(...args)
 })
 assert.equal(result.ucode,UCODE)
 assert.deepEqual(result.plans.map(x=>x.periodicity),['MONTHLY','QUARTERLY'])
 assert.equal(result.plans[1].maxInstallments,3)
 assert.equal(result.plans[1].numericPlanId,null)
 assert.equal(result.complete,true)
 assert.ok(calls.some(x=>x.endsWith('/products/'+UCODE+'/plans?max_results=20')))
 assert.ok(calls.every(x=>!x.includes('/subscriptions')))
})
test('página seguinte dos planos é lida sem duplicação',async()=>{
 const result=await readProductPlans(env,UCODE,request({
 first:{items:[{code:'p1',periodicity:'MONTHLY'}],page_info:{next_page_token:'next'}},
 next:{items:[{code:'p2',periodicity:'QUARTERLY'}],page_info:{}}
 }))
 assert.deepEqual(result.plans.map(x=>x.code),['p1','p2'])
 assert.equal(result.hasMore,false)
})
test('catálogo parcial é sinalizado, não declarado completo',async()=>{
 let n=0
 const result=await readProductPlans(env,UCODE,async url=>{
  if(String(url).includes('oauth/token'))return {ok:true,json:async()=>({access_token:'fixture-access'})}
  n++
  return {ok:true,json:async()=>({items:[],page_info:{next_page_token:'page-'+n}})}
 })
 assert.equal(result.complete,false)
 assert.equal(result.hasMore,true)
 assert.equal(n,3)
})
test('UCODE inválido e falha da API não produzem dados fictícios',async()=>{
 await assert.rejects(()=>readProductPlans(env,'produto-inventado'),/invalid_product_ucode/)
 await assert.rejects(()=>readProductPlans(env,UCODE,async url=>
  String(url).includes('oauth/token')?
    {ok:true,json:async()=>({access_token:'fixture-access'})}:
    {ok:false,status:503}),/hotmart_read_unavailable_503/)
})
