import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
const require=createRequire(import.meta.url)
const {chromium,webkit}=require('/tmp/npv-playwright/node_modules/playwright')
const url='http://127.0.0.1:4179/qa/hotmart-admin/harness.html'
const statuses=['ACTIVE','ACTIVE','DELAYED','INACTIVE','CANCELLED_BY_ADMIN','CANCELLED_BY_CUSTOMER']
const rows=statuses.map((status,i)=>({
 id:'SUB-'+i,subscriber_code:'SUB-'+i,
 subscriber_name:'Aluno Fictício '+i,subscriber_email:'aluno'+i+'@example.invalid',
 product_name:'Plataforma NPV (teste)',plan:i%2?'trimestral':'mensal',plan_label:i%2?'Trimestral':'Mensal',
 status,link_status:i===0?'linked':'not_linked',
 next_charge_at:i<2?'2026-11-20T00:00:00.000Z':null,
 last_paid_at:null,points:null
}))
const payload={status:'ready',source:'hotmart_official',subscriptions:rows,
 synced_at:new Date().toISOString(),identity_verified:true,
 metrics:{active:2,linked:1,pending:1,renewed:null,historical:6,status_counts:{}}}
let checked=0
for(const [browserName,driver] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await driver.launch({headless:true})
 try{
  for(const width of [320,390,768,1440]){
   const ctx=await browser.newContext({viewport:{width,height:840}})
   const page=await ctx.newPage()
   const errors=[]
   page.on('pageerror',error=>errors.push(error.message))
   await page.route('**/api/clube/hotmart-admin**',route=>{
    const rq=route.request()
    assert.equal(rq.method(),'GET')
    assert.equal(rq.headers().authorization,'Bearer test-token-mock-value-not-real')
    const q=new URL(rq.url())
    const payment=q.searchParams.get('action')==='payments'
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(payment?{
     status:'read_only',subscriber_code:q.searchParams.get('subscriber_code'),
     history:[{status:'COMPLETE',transaction:'FAKE-TRANSACTION',approved_at:'2026-10-01T00:00:00.000Z',
      payment_type:'PIX',recurrence_number:2}],
     confirmed_payments:1,last_paid_at:'2026-10-01T00:00:00.000Z',renewal_status:'not_verified',
     confirmed_renewals:null,points_awarded:null
    }:payload)})
   })
   await page.goto(url,{waitUntil:'networkidle'})
   await page.getByRole('heading',{name:'Assinaturas ativas agora'}).waitFor()
   assert.equal(await page.locator('.npv-hotmart-active-item').count(),2)
   assert.deepEqual((await page.locator('.npv-hotmart-metric>strong').allTextContents()).map(x=>x.trim()),['2','1','1','—'])
   assert.equal(await page.locator('.npv-hotmart-table tbody tr').count(),6)
   await page.getByLabel('Filtrar por situação').selectOption('DELAYED')
   assert.equal(await page.locator('.npv-hotmart-table tbody tr').count(),1)
   await page.getByLabel('Filtrar por situação').selectOption('todas')
   await page.getByLabel('Filtrar por plano').selectOption('trimestral')
   assert.equal(await page.locator('.npv-hotmart-table tbody tr').count(),3)
   await page.getByLabel('Filtrar por plano').selectOption('todos')
   await page.getByPlaceholder('Pesquisar assinante, e-mail ou produto').fill('aluno1@example.invalid')
   assert.equal(await page.locator('.npv-hotmart-table tbody tr').count(),1)
   await page.getByPlaceholder('Pesquisar assinante, e-mail ou produto').fill('')
   await page.getByLabel('Filtrar por vínculo').selectOption('linked')
   assert.equal(await page.locator('.npv-hotmart-table tbody tr').count(),1)
   await page.getByLabel('Filtrar por vínculo').selectOption('todos')
   await page.getByRole('button',{name:'Ver pagamentos'}).first().click()
   await page.getByText(/FAKE-TRANSACTION/).count() // histories don't display ids
   await page.getByText(/COMPLETE ·/).first().waitFor()
   const d=await page.evaluate(()=>{
    const table=document.querySelector('.npv-hotmart-table-wrap')
    table.scrollLeft=120
    return {doc:document.documentElement.scrollWidth,viewport:window.innerWidth,
     table:table.scrollWidth,view:table.clientWidth,scroll:table.scrollLeft}
   })
   assert.ok(d.doc<=d.viewport+1,JSON.stringify({browserName,width,d}))
   if(width<=768){assert.ok(d.table>d.view+30);assert.ok(d.scroll>10)}
   assert.deepEqual(errors,[])
   checked++
   await ctx.close()
  }
 }finally{await browser.close()}
}
console.log('PASS: '+checked+' cenários reais simulados; status, filtro por email/plano/vínculo, pagamentos e rolagem touch')
