import assert from 'node:assert/strict'
import {chromium,devices} from 'playwright'

const base='http://127.0.0.1:4173'
const browser=await chromium.launch({headless:true})
const cases=[
 {name:'desktop',context:{viewport:{width:1440,height:900}}},
 {name:'iPhone 13 (emulação)',context:{...devices['iPhone 13']}},
 {name:'Android Pixel 7 (emulação)',context:{...devices['Pixel 7']}}
]
let failures=0
for(const item of cases){
 const context=await browser.newContext(item.context)
 const page=await context.newPage()
 const exceptions=[]
 page.on('pageerror',error=>exceptions.push(error.message))
 const check=async(name,run)=>{
  try{await run();console.log('PASS',item.name,name)}
  catch(error){failures++;console.error('FAIL',item.name,name,error.message)}
 }
 await check('home carrega e vidro aprovado',async()=>{
  await page.goto(base+'/',{waitUntil:'domcontentloaded'})
  await page.locator('.npv-floating-club').waitFor()
  assert.equal(await page.locator('.npv-fw-shell').count(),1)
  const style=await page.locator('.npv-fw-shell').evaluate(el=>{
    const c=getComputedStyle(el)
    return {blur:c.backdropFilter||c.webkitBackdropFilter,border:c.borderColor,background:c.backgroundImage}
  })
  assert(style.blur.includes('5px'),style.blur)
  assert(style.border.includes('160, 160, 160'),style.border)
  assert(style.background.includes('0.4'),style.background)
 })
 await check('widget abre; clique interno preserva; clique externo fecha',async()=>{
  const widget=page.locator('.npv-floating-club')
  await page.locator('.npv-fw-toggle').click()
  assert(await widget.evaluate(el=>el.classList.contains('npv-floating-club--expanded')))
  await page.locator('.npv-fw-expanded-content .npv-fw-ranking').click()
  assert(await widget.evaluate(el=>el.classList.contains('npv-floating-club--expanded')))
  await page.mouse.click(10,Math.round(item.context.viewport?.height/2||350))
  await page.waitForTimeout(120)
  assert(!(await widget.evaluate(el=>el.classList.contains('npv-floating-club--expanded'))))
 })
 await check('widget fecha pelo ESC e pelo botão original',async()=>{
  const toggle=page.locator('.npv-fw-toggle')
  await toggle.click()
  await page.keyboard.press('Escape')
  assert(!(await page.locator('.npv-floating-club').evaluate(el=>el.classList.contains('npv-floating-club--expanded'))))
  await toggle.click()
  await toggle.click()
  assert(!(await page.locator('.npv-floating-club').evaluate(el=>el.classList.contains('npv-floating-club--expanded'))))
 })
 await check('menu Área de Alunos mantém interior; fecha fora e ESC',async()=>{
  const summary=page.locator('summary[aria-label="Abrir opções da Área do Aluno"]:visible').first()
  await summary.click()
  let details=page.locator('details:has(summary[aria-label="Abrir opções da Área do Aluno"]):visible').first()
  assert(await details.evaluate(el=>el.open))
  const nav=page.locator('nav[aria-label="Opções da Área do Aluno"]:visible').first()
  await nav.click({position:{x:3,y:3}})
  assert(await details.evaluate(el=>el.open))
  await page.mouse.click(8,Math.round((item.context.viewport?.height||844)/2))
  assert(!(await details.evaluate(el=>el.open)))
  await summary.click()
  await page.keyboard.press('Escape')
  assert(!(await details.evaluate(el=>el.open)))
  const hrefs=await nav.locator('a').evaluateAll(a=>a.map(x=>x.getAttribute('href')))
  assert(hrefs.includes('/clube'))
  assert(hrefs.some(href=>href?.includes('hotmart')))
 })
 if(item.name==='desktop'){
  await check('menu CONTATO desktop fecha fora e ESC',async()=>{
   const toggle=page.locator('button[aria-controls="desktop-contact-options"]')
   await toggle.click()
   assert(await page.locator('#desktop-contact-options').isVisible())
   await page.mouse.click(10,350)
   assert(!(await page.locator('#desktop-contact-options').count()))
   await toggle.click()
   await page.keyboard.press('Escape')
   assert(!(await page.locator('#desktop-contact-options').count()))
  })
 }else{
  await check('menu hambúrguer fecha fora e ESC',async()=>{
   const toggle=page.locator('button[aria-controls="mobile-navigation"]')
   await toggle.click()
   assert(await page.locator('#mobile-navigation').isVisible())
   await page.mouse.click(10,350)
   assert(!(await page.locator('#mobile-navigation').count()))
   await toggle.click()
   await page.keyboard.press('Escape')
   assert(!(await page.locator('#mobile-navigation').count()))
  })
 }
 await check('link Clube navega /clube',async()=>{
  const summary=page.locator('summary[aria-label="Abrir opções da Área do Aluno"]:visible').first()
  await summary.click()
  await page.locator('nav[aria-label="Opções da Área do Aluno"]:visible a[href="/clube"]').click()
  await page.waitForURL('**/clube')
  assert.equal(new URL(page.url()).pathname,'/clube')
  assert((await page.locator('body').innerText()).includes('Clube'))
 })
 await check('sem exceções JavaScript',async()=>assert.deepEqual(exceptions,[]))
 await context.close()
}
await browser.close()
if(failures){console.error('Browser QA failures:',failures);process.exitCode=1}
else console.log('NPV browser QA PASS: desktop, iPhone emulation, Android emulation')
