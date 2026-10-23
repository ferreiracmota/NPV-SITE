import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import './NPVInsidePreview.css'

/**
 * Apresentação editorial da plataforma usando imagens dos módulos já presentes no site.
 * Não finge ser captura da Hotmart ou do painel: o mock do Clube está identificado.
 * Nenhuma operação é feita em contas, pontos ou assinaturas.
 */
const VIEWS = [
  { key: 'treinos', tab: '01 · TREINOS', short: 'Treinos' },
  { key: 'videos', tab: '02 · VÍDEOS', short: 'Vídeos' },
  { key: 'clube', tab: '03 · BENEFÍCIOS', short: 'Clube' }
]

const ICONS = {
  check: <svg aria-hidden="true" viewBox="0 0 20 20" width="17" height="17" fill="none"><path d="m4 10 4 4 8-8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  arrow: <ArrowRight size={20} strokeWidth={2} aria-hidden="true" />
}

function CheckItem({children}) {
  return <li><span className="npv-inside-check">{ICONS.check}</span><span>{children}</span></li>
}

export default function NPVInsidePreview({academyImage, executionVideo, clubImage, onViewPlans}) {
  const [active, setActive] = useState('treinos')
  const handleTabKey = (event, index) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    let next = event.key === 'Home' ? 0 : event.key === 'End' ? VIEWS.length - 1
      : (index + (event.key === 'ArrowRight' ? 1 : -1) + VIEWS.length) % VIEWS.length
    setActive(VIEWS[next].key)
    document.getElementById('npv-inside-tab-' + VIEWS[next].key)?.focus()
  }
  return <section id="por-dentro" className="npv-inside-section" aria-labelledby="npv-inside-title">
    <div className="npv-inside-container">
      <div className="npv-inside-heading">
        <div>
          <span className="npv-inside-kicker"><span aria-hidden="true" className="npv-inside-dot"/> DESCUBRA A PLATAFORMA</span>
          <h2 id="npv-inside-title">O SEU PRÓXIMO PASSO <span>COMEÇA AQUI.</span></h2>
        </div>
        <p>Treinos, orientação e benefícios em uma experiência que acompanha a sua evolução. Veja como o conteúdo é organizado — e o que você encontra antes de assinar.</p>
      </div>
      <div className="npv-inside-frame">
        <div className="npv-inside-tabs" role="tablist" aria-label="Recursos da plataforma">
          {VIEWS.map((view,index)=><button
            type="button" key={view.key} id={'npv-inside-tab-'+view.key}
            role="tab" aria-selected={active===view.key}
            aria-controls="npv-inside-panel"
            tabIndex={active===view.key?0:-1}
            onClick={()=>setActive(view.key)} onKeyDown={event=>handleTabKey(event,index)}
            className={'npv-inside-tab'+(active===view.key?' active':'')}
          ><span className="npv-inside-tab-full">{view.tab}</span><span className="npv-inside-tab-short">{view.short}</span></button>)}
        </div>
        <div id="npv-inside-panel" role="tabpanel" aria-labelledby={'npv-inside-tab-'+active} tabIndex={0} className="npv-inside-panel" key={active}>
          {active==='treinos' && <>
            <div className="npv-inside-media">
              <img src={academyImage} alt="Captura do material Academia Intermediário Emagrecimento, enviada para o Preview NPV" loading="lazy" decoding="async"/>
              <div className="npv-inside-media-tag">MATERIAL REAL DA PLATAFORMA <ArrowRight size={17} strokeWidth={2} aria-hidden="true" /></div>
            </div>
            <div className="npv-inside-copy">
              <span className="npv-inside-step">01 / ORGANIZAÇÃO</span>
              <h3>TREINE COM <em>DIREÇÃO.</em></h3>
              <p>Encontre conteúdos para diferentes níveis, objetivos e rotinas. As planilhas e os módulos ajudam você a saber o que fazer em cada treino.</p>
              <ul><CheckItem>Treinos de academia por nível e objetivo</CheckItem><CheckItem>Planilhas e materiais de apoio</CheckItem><CheckItem>Corrida, Express e outras modalidades</CheckItem></ul>
              <button type="button" className="npv-inside-cta" onClick={onViewPlans}>CONHECER OS PLANOS {ICONS.arrow}</button>
            </div>
          </>}
          {active==='videos' && <>
            <div className="npv-inside-media npv-inside-media-video">
              <video src={executionVideo} autoPlay muted loop playsInline preload="auto" aria-label="Vídeo real de execução de exercício no ambiente NPV, reproduzido automaticamente" />
            </div>
            <div className="npv-inside-copy">
              <span className="npv-inside-step">02 / EXECUÇÃO</span>
              <h3>SAIBA COMO <em>FAZER.</em></h3>
              <p>Além das planilhas, a plataforma reúne vídeos vinculados aos exercícios para apoiar a execução dos movimentos.</p>
              <ul><CheckItem>Vídeos de demonstração de exercícios</CheckItem><CheckItem>Conteúdo organizado por treino</CheckItem><CheckItem>Orientações para acompanhar sua rotina</CheckItem></ul>
              <button type="button" className="npv-inside-cta" onClick={onViewPlans}>CONHECER OS PLANOS {ICONS.arrow}</button>
            </div>
          </>}
          {active==='clube' && <>
            <div className="npv-inside-media npv-inside-media-clube">
              <img src={clubImage} alt="Exemplo visual do painel do Clube de Benefícios NPV: atividades, pontos e recompensas" loading="lazy" decoding="async"/>
            </div>
            <div className="npv-inside-copy">
              <span className="npv-inside-step">03 / RECOMPENSAS</span>
              <h3>TREINE. EVOLUA. <em>CONQUISTE.</em></h3>
              <p>O Clube de Benefícios NPV permite acompanhar atividades, acumular pontos nas ações elegíveis e conhecer recompensas disponíveis.</p>
              <ul><CheckItem>Atividades e extrato de pontos</CheckItem><CheckItem>Desafios e recompensas</CheckItem><CheckItem>Benefícios de parceiros</CheckItem></ul>
              <a href="https://www.naopensevai.com/clube" className="npv-inside-cta" target="_blank" rel="noopener noreferrer">CONHECER O CLUBE {ICONS.arrow}</a>
            </div>
          </>}
        </div>
      </div>
      <div className="npv-inside-footnote"><span>01—03</span> Capturas e vídeo enviados para o Preview. A imagem do Clube é demonstrativa e seus pontos não representam saldos reais.</div>
    </div>
  </section>
}
