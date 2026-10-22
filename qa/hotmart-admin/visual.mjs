import assert from 'node:assert/strict'
import {mkdir} from 'node:fs/promises'
import {createRequire} from 'node:module'
const require=createRequire(import.meta.url)
const {chromium,webkit}=require('/tmp/npv-playwright/node_modules/playwright')
const base='http://127.0.0.1:4179/qa/hotmart-admin/harness.html'
const folder='qa/artifacts/hotmart-admin'
await mkdir(folder,{recursive:true})
let checked=0
for(const [browserName,browserType] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await browserType.launch({headless:true})
 try{
  for(const width of [320,390,768,1440]){
   const context=await browser.newContext({viewport:{width,height:850},deviceScaleFactor:1})
   const page=await context.newPage()
   const errors=[]
   page.on('pageerror',error=>errors.push(error.message))
   await page.route('**/api/clube/hotmart-admin',async route=>{
    const request=route.request()
    assert.equal(request.method(),'GET')
    assert.equal(request.headers().authorization,'Bearer test-token-mock-value-not-real')
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
      status:'awaiting_integration',message:'Aguardando integração com a Hotmart',
      metrics:null,subscriptions:[],synced_at:null
    })})
   })
   await page.goto(base,{waitUntil:'networkidle'})
   await page.locator('.npv-hotmart-pending').getByText('Aguardando integração com a Hotmart').waitFor()
   assert.equal(await page.getByRole('heading',{name:'Hotmart — Assinaturas'}).count(),1)
   assert.equal(await page.getByRole('region',{name:'Tabela de assinaturas com rolagem horizontal'}).count(),1)
   if(width<=768){
     const scrolling=await page.locator('.npv-hotmart-table-wrap').evaluate(element=>{
       const before={visible:element.clientWidth,content:element.scrollWidth}
       element.scrollLeft=180
       return {...before,after:element.scrollLeft}
     })
     assert.ok(scrolling.content>scrolling.visible+40,JSON.stringify({browserName,width,scrolling}))
     assert.ok(scrolling.after>10,JSON.stringify({browserName,width,scrolling}))
   }
   assert.equal(await page.locator('.npv-hotmart-metric>strong').count(),4)
   assert.deepEqual(await page.locator('.npv-hotmart-metric>strong').allTextContents(),['—','—','—','—'])
   assert.equal(await page.locator('.npv-hotmart-table tbody tr').count(),1)
   await page.getByPlaceholder('Pesquisar assinante, e-mail ou produto').fill('qualquer pesquisa')
   await page.getByLabel('Filtrar por plano').selectOption('trimestral')
   await page.getByLabel('Filtrar por situação').selectOption('ACTIVE')
   assert.ok(await page.getByText('Nenhum registro encontrado para os filtros selecionados.').isVisible())
   await page.getByPlaceholder('Pesquisar assinante, e-mail ou produto').fill('')
   await page.getByLabel('Filtrar por plano').selectOption('todos')
   await page.getByLabel('Filtrar por situação').selectOption('todas')
   const dims=await page.evaluate(()=>({width:window.innerWidth,scroll:document.documentElement.scrollWidth}))
   assert.ok(dims.scroll<=dims.width+1,JSON.stringify({browserName,width,dims}))
   await page.screenshot({path:folder+'/'+browserName+'-'+width+'.png',fullPage:true})
   assert.deepEqual(errors,[])
   // Quando não-admin, a aba e a consulta desaparecem.
   await page.evaluate(()=>window.__NPV_SET_ADMIN__(false))
   await page.locator('.npv-hotmart-admin').waitFor({state:'detached'})
   assert.equal(await page.locator('.npv-hotmart-admin').count(),0)
   await context.close()
   checked++
  }
  // Verificação 403: a interface não apresenta dados sem confirmação do servidor.
  const context=await browser.newContext({viewport:{width:390,height:850}})
  const page=await context.newPage()
  await page.route('**/api/clube/hotmart-admin',route=>route.fulfill({
    status:403,contentType:'application/json',body:JSON.stringify({status:'forbidden'})
  }))
  await page.goto(base,{waitUntil:'networkidle'})
  await page.getByText('Acesso administrativo não autorizado').waitFor()
  assert.equal(await page.locator('.npv-hotmart-metric>strong').first().textContent(),'—')
  await context.close()
  // Resposta realista e inteiramente fictícia: 2 ativos e histórico heterogêneo.
  const context2=await browser.newContext({viewport:{width:390,height:850}})
  const page2=await context2.newPage()
  const fakeRows=[
   {id:'X1',subscriber_name:'Aluno de teste A',subscriber_email:'a@example.invalid',status:'ACTIVE',
    plan:'mensal',plan_label:'Mensal',product_name:'NPV teste',link_status:'linked',
    last_paid_at:'2026-10-20T12:00:00Z',next_charge_at:'2026-11-20T12:00:00Z'},
   {id:'X2',subscriber_name:'Aluno de teste B',subscriber_email:'b@example.invalid',status:'ACTIVE',
    plan:'trimestral',plan_label:'Trimestral',product_name:'NPV teste',link_status:'pending_no_clube_profile'},
   {id:'X3',subscriber_name:'Aluno antigo fictício',subscriber_email:'c@example.invalid',status:'CANCELLED_BY_ADMIN',
    plan:'mensal',plan_label:'Mensal',product_name:'NPV teste',link_status:'pending_no_clube_profile'}
  ]
  await page2.route('**/api/clube/hotmart-admin',route=>route.fulfill({
   status:200,contentType:'application/json',body:JSON.stringify({
    status:'synced',synced_at:'2026-10-21T18:00:00Z',identity_complete:true,
    metrics:{active:2,linked:1,pending:1,renewed:null,total:3,
     statuses:{ACTIVE:2,DELAYED:0,INACTIVE:0,CANCELLED_BY_ADMIN:1,CANCELLED_BY_CUSTOMER:0,OTHER:0}},
    subscriptions:fakeRows
   })
  }))
  await page2.goto(base,{waitUntil:'networkidle'})
  await page2.getByText('Dados consultados na Hotmart').waitFor()
  assert.deepEqual((await page2.locator('.npv-hotmart-metric>strong').allTextContents()),['2','1','1','—'])
  assert.equal(await page2.locator('.npv-hotmart-table tbody tr').count(),3)
  assert.equal(await page2.locator('.npv-hotmart-row-active').count(),2)
  await page2.getByLabel('Filtrar por situação').selectOption('CANCELLED_BY_ADMIN')
  assert.equal(await page2.locator('.npv-hotmart-table tbody tr').count(),1)
  await page2.getByLabel('Filtrar por situação').selectOption('todas')
  await page2.getByLabel('Filtrar por plano').selectOption('trimestral')
  assert.equal(await page2.locator('.npv-hotmart-table tbody tr').count(),1)
  await page2.getByLabel('Filtrar por plano').selectOption('todos')
  await page2.getByPlaceholder('Pesquisar assinante, e-mail ou produto').fill('b@example.invalid')
  assert.equal(await page2.locator('.npv-hotmart-table tbody tr').count(),1)
  const dims2=await page2.evaluate(()=>({width:window.innerWidth,scroll:document.documentElement.scrollWidth}))
  assert.ok(dims2.scroll<=dims2.width+1,JSON.stringify({browserName,dims2}))
  const t=await page2.locator('.npv-hotmart-table-wrap').evaluate(el=>{el.scrollLeft=200;return el.scrollLeft})
  assert.ok(t>10)
  await context2.close()
 }finally{await browser.close()}
}
console.log('PASS: '+checked+' viewports desktop/mobile em Chromium e WebKit, filtros, autenticação simulada, responsividade e sem erros JS')
