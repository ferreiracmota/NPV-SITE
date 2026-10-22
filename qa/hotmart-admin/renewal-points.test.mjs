import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {calculateRenewalPoints} from '../../clube/hotmart-admin/renewalPoints.mjs'

const verified=(cycles,rest={})=>({
  plan:'mensal',renewal_cycles:cycles,
  payment_history_complete:true,
  recurring_audit:'payment_recurrences_identified',
  link_status:'pending_no_clube_profile',linked:false,...rest
})
test('primeira compra, nenhuma renovação: zero pontos previstos',()=>{
 assert.deepEqual(
   Object.fromEntries(Object.entries(calculateRenewalPoints(verified(0),400)).filter(([key])=>['total','renewals','rate','credited'].includes(key))),
   {renewals:0,total:0,rate:400,credited:false})
})
test('segunda cobrança paga: 1 renovação x 400',()=>assert.equal(calculateRenewalPoints(verified(1),400).total,400))
test('terceira cobrança paga: 2 renovações x 400, sem crédito duplicado',()=>assert.equal(calculateRenewalPoints(verified(2),400).total,800))
test('taxa editável no Clube: sem valor fixo no cálculo',()=>assert.equal(calculateRenewalPoints(verified(3),250).total,750))
test('sem prova de recorrências, não inventar total',()=>{
 assert.equal(calculateRenewalPoints(verified(0,{recurring_audit:'not_verified'}),400).total,null)
 assert.equal(calculateRenewalPoints(verified(0,{payment_history_complete:false}),400).total,null)
 assert.equal(calculateRenewalPoints(verified(null),400).total,null)
})
test('sem regra carregada, não interpretar como zero pontos',()=>{
 assert.equal(calculateRenewalPoints(verified(2),null).total,null)
 assert.equal(calculateRenewalPoints(verified(2),undefined).total,null)
})
test('trimestral mantém observação de competências, sem crédito automático',()=>{
 const c=calculateRenewalPoints(verified(1,{plan:'trimestral',linked:true,link_status:'linked'}),400)
 assert.equal(c.total,400)
 assert.equal(c.reason,'quarterly_installments')
 assert.equal(c.credited,false)
})
test('não concede pontos no cliente, código de cálculo é puro e sem credenciais',()=>{
 const src=readFileSync(new URL('../../clube/hotmart-admin/renewalPoints.mjs',import.meta.url),'utf8')
 assert.doesNotMatch(src,/\.(insert|update|upsert|delete|rpc|fetch)\(/)
 const ui=readFileSync(new URL('../../src/ClubeHotmartAdmin.jsx',import.meta.url),'utf8')
 assert.match(ui,/renewalPointRate/)
 assert.match(ui,/não creditado|não lançado no extrato/)
 assert.doesNotMatch(ui,/HOTMART_CLIENT_SECRET|SUPABASE_SERVICE_ROLE_KEY/)
})
