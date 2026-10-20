import { chromium, webkit } from 'playwright';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const SITE = 'https://www.naopensevai.com/';
const OUT = 'qa/artifacts/mobile-premium';
mkdirSync(OUT, { recursive: true });
const source = readFileSync('src/App.css', 'utf8');
const marker = '/* NPV mobile premium — ajustes isolados, sem impacto visual em >= 768px. */';
if (!source.includes(marker)) throw new Error('Marcador de CSS ausente.');
const cssOverride = source.slice(source.indexOf(marker)) + '\n@media(max-width:767px){.npv-floating-club{right:max(12px,env(safe-area-inset-right,0px));bottom:max(12px,env(safe-area-inset-bottom,0px));}}\n';

const viewports = [
  [320,568],[360,740],[375,812],[390,844],[414,896],[430,932],
  [768,1024],[1024,768],[1440,900]
];
const reports = [];
const errors = [];
const selectors = [
  'header', '#inicio', '#inicio h1', '#inicio h1 > span:nth-child(3)',
  '#inicio a.glow-button', '#planos', '#planos .npv-plan-card', '#faq',
  '#instagram', '.npv-floating-club'
];

async function snapshot(browserType, engineName, w, h, refined) {
  const context = await browserType.newContext({
    viewport: { width: w, height: h },
    isMobile: w < 768,
    hasTouch: w < 768,
    deviceScaleFactor: 1,
    reducedMotion: 'reduce'
  });
  const page = await context.newPage();
  const issues = [];
  page.on('pageerror', err => issues.push('js:' + String(err.message).slice(0,160)));
  try {
    await page.goto(SITE, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.locator('#inicio h1').waitFor({ state: 'visible', timeout: 30000 });
    // A mesma versão pública é o controle dos dois cenários. A versão
    // refinada recebe somente os estilos alterados no ramo de preview.
    if (refined) await page.addStyleTag({ content: cssOverride });
    await page.waitForTimeout(1800);
    const values = await page.evaluate(selectors => {
      const css = el => {
        if (!el) return null;
        const s = getComputedStyle(el), r = el.getBoundingClientRect();
        return {
          fontSize:s.fontSize,lineHeight:s.lineHeight,
          marginTop:s.marginTop,paddingTop:s.paddingTop,paddingBottom:s.paddingBottom,
          display:s.display,position:s.position,
          width:Math.round(r.width),height:Math.round(r.height),
          left:Math.round(r.left),right:Math.round(r.right)
        };
      };
      const answer = {
        viewportWidth:innerWidth,
        documentWidth:document.documentElement.scrollWidth,
        bodyWidth:document.body.scrollWidth,
        css: Object.fromEntries(selectors.map(selector=>[selector, css(document.querySelector(selector))])),
        links: Array.from(document.querySelectorAll('#planos a[href]')).map(x=>x.getAttribute('href')),
        media: Array.from(document.querySelectorAll('#inicio video')).map(v=>({
          src:v.currentSrc||v.querySelector('source')?.src,
          muted:v.muted,playsInline:v.playsInline,readyState:v.readyState
        }))
      };
      return answer;
    }, selectors);
    const baseName = [engineName,w,refined?'refinado':'original'].join('-');
    await page.screenshot({ path:join(OUT,baseName+'-hero.png'), fullPage:false, animations:'disabled' });
    if ([390,320,768,1440].includes(w)) {
      for(const section of ['#planos','#instagram','.npv-partners-viewport','footer']) {
        const locator=page.locator(section).first();
        if(await locator.count()){
          const target=section.replace(/[.#]/g,'') || 'section';
          await locator.screenshot({ path:join(OUT,baseName+'-'+target+'.png'), timeout:20000, animations:'disabled' }).catch(e=>issues.push('screenshot-'+target+': '+e.message.slice(0,120)));
        }
      }
    }
    if (w < 768) {
      const menu = page.locator('button[aria-controls="mobile-navigation"]').first();
      await menu.click();
      const opened = await page.locator('#mobile-navigation').isVisible();
      await page.locator('#inicio h1').click({force:true});
      const closed = !(await page.locator('#mobile-navigation').isVisible());
      if (!opened || !closed) issues.push('menu-mobile-abertura-fechamento');
      const details = page.locator('header details').first();
      await details.locator('summary').click();
      const studentOpened = await details.getAttribute('open') !== null;
      await page.locator('#inicio h1').click({force:true});
      const studentClosed = await details.getAttribute('open') === null;
      if (!studentOpened || !studentClosed) issues.push('area-alunos-abertura-fechamento');
    }
    const report={ engineName, width:w,height:h,version:refined?'refinado':'original',...values, issues };
    reports.push(report);
    return report;
  } catch(err) {
    errors.push({engineName,width:w,height:h,refined,error:String(err.stack||err).slice(0,600)});
    return null;
  } finally {
    await context.close();
  }
}

const desktopPairs = [];
for(const [engineName,browserType,widths] of [
  ['chromium',chromium,viewports],
  ['webkit',webkit,[[390,844],[430,932]]]
]) {
  const browser = await browserType.launch({headless:true});
  try{
    for(const [w,h] of widths) {
      const before = await snapshot(browser,engineName,w,h,false); // context created below
      const after = await snapshot(browser,engineName,w,h,true);
      if(before&&after) {
        // Desktop não deve receber sequer uma alteração computada do CSS.
        if(w>=768) {
          const b=JSON.stringify(before.css),a=JSON.stringify(after.css);
          if(b!==a) errors.push({engineName,width:w,error:'regressao-style-desktop',before:before.css,after:after.css});
          desktopPairs.push({w,identicalStyle:b===a});
        }
        if(after.documentWidth > w+2 && after.documentWidth>before.documentWidth+2) {
          errors.push({engineName,width:w,error:'novo-overflow-horizontal',before:before.documentWidth,after:after.documentWidth});
        }
        if(after.links.join('|')!==before.links.join('|'))errors.push({engineName,width:w,error:'links-de-planos-modificados'});
      }
    }
  } finally {
    await browser.close();
  }
}
const report={site:SITE,mode:'site-oficial + injeção local dos CSS da prévia',viewports,reports,desktopPairs,errors,generatedAt:new Date().toISOString()};
writeFileSync(join(OUT,'report.json'),JSON.stringify(report,null,2));
writeFileSync(join(OUT,'README.txt'),[
  'Comparativo visual NPV — produção (original) x CSS do ramo de prévia (refinado).',
  'O site oficial NUNCA foi alterado durante este teste.',
  'As capturas mobile Chromium usam emulação de toque; WebKit emula comportamento Safari,',
  'mas não substituem teste físico de iPhone/Android.',
  'Vídeos e conteúdo dinâmico podem aparecer em quadros distintos.',
  'Arquivos com -original- e -refinado- mostram o mesmo enquadramento/largura.',
  'Consulte report.json para resultados de largura, menus, links e regressões.'
].join('\n'));
console.log(JSON.stringify({cases:reports.length,errors,desktopPairs},null,2));
if(errors.length) process.exitCode=1;
