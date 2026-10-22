import React, { useRef, useState, useEffect } from 'react'
import './NPVModuleShowcase.css'

const GROUPS = [
  { id: 'todos', label: 'Todos os conteúdos' },
  { id: 'treino', label: 'Treinos' },
  { id: 'nutricao', label: 'Nutrição' },
  { id: 'bemestar', label: 'Bem-estar & extras' },
]
const MODULES = [
  { key: 'academia', title: 'Academia', detail: 'Iniciante · Intermediário · Avançado', group: 'treino' },
  { key: 'atualizacao', title: 'Novos ciclos', detail: 'Conteúdos atualizados regularmente', group: 'treino' },
  { key: 'dieta', title: 'Planilha de dieta', detail: 'Materiais para diferentes objetivos', group: 'nutricao' },
  { key: 'mobilidade', title: 'Mobilidade', detail: 'Movimentos para cuidar do corpo', group: 'bemestar' },
  { key: 'receitas', title: 'Receitas fit', detail: 'Ideias para variar a alimentação', group: 'nutricao' },
  { key: 'corrida', title: 'Corrida', detail: 'Orientações para começar e evoluir', group: 'treino' },
  { key: 'planilha', title: 'Planilhas', detail: 'Organização do seu treinamento', group: 'treino' },
  { key: 'musas', title: 'Treino das musas', detail: 'Conteúdos de treino e inspiração', group: 'treino' },
  { key: 'mentalidade', title: 'Mentalidade', detail: 'Hábitos, motivação e performance', group: 'bemestar' },
  { key: 'express', title: 'Treino Express', detail: 'Opções práticas para a sua rotina', group: 'treino' },
  { key: 'moda', title: 'Moda em Movimento', detail: 'Estilo e referências fitness', group: 'bemestar' },
  { key: 'profissionais', title: 'Especialistas', detail: 'Dicas de diferentes profissionais', group: 'bemestar' },
]

export default function NPVModuleShowcase({ images, onExplore, onViewPlans }) {
  const [group, setGroup] = useState('todos')
  const [position, setPosition] = useState(0)
  const rail = useRef(null)
  const entries = MODULES.map((module, index) => ({...module, image: images[index]}))
    .filter(module => group === 'todos' || module.group === group)

  useEffect(() => {
    setPosition(0)
    if (rail.current) rail.current.scrollLeft = 0
  }, [group])

  const scrollRail = direction => {
    const target = rail.current
    if (!target) return
    const firstCard = target.querySelector('.npv-mod-card')
    const width = firstCard?.getBoundingClientRect().width || 240
    const gap = parseFloat(getComputedStyle(target).columnGap) || 16
    target.scrollBy({ left: direction * (width + gap), behavior: 'smooth' })
  }

  const syncPosition = () => {
    if (!rail.current) return
    const firstCard = rail.current.querySelector('.npv-mod-card')
    const width = firstCard?.getBoundingClientRect().width || 240
    const gap = parseFloat(getComputedStyle(rail.current).columnGap) || 16
    setPosition(Math.min(entries.length - 1, Math.max(0, Math.round(rail.current.scrollLeft / (width + gap)))))
  }

  return <section className="npv-mod-section" aria-labelledby="npv-mod-heading" id="conteudos">
    <div className="npv-mod-container">
      <div className="npv-mod-header">
        <div>
          <div className="npv-mod-eyebrow"><span/> SUA JORNADA, DO SEU JEITO</div>
          <h2 id="npv-mod-heading">COMPLETO? <em>NÃO, ALÉM!</em></h2>
        </div>
        <div className="npv-mod-header-side">
          <p>De onde você está até onde quer chegar: encontre treinos, materiais e orientações para diferentes momentos da sua rotina.</p>
          <button type="button" className="npv-mod-text-link" onClick={onExplore}>Conhecer por dentro <span aria-hidden="true">↗</span></button>
        </div>
      </div>

      <div className="npv-mod-toolbar">
        <div className="npv-mod-filters" role="group" aria-label="Filtrar conteúdos da NPV">
          {GROUPS.map(choice=><button type="button" key={choice.id} aria-pressed={group === choice.id}
            className={'npv-mod-filter'+(group===choice.id?' active':'')}
            onClick={()=>setGroup(choice.id)}>{choice.label}</button>)}
        </div>
        <div className="npv-mod-navigation" aria-label="Navegar pelos módulos">
          <span className="npv-mod-count" aria-live="polite">{String(position+1).padStart(2,'0')} <span>/ {String(entries.length).padStart(2,'0')}</span></span>
          <button type="button" aria-label="Módulos anteriores" onClick={()=>scrollRail(-1)} disabled={position===0}>←</button>
          <button type="button" aria-label="Próximos módulos" onClick={()=>scrollRail(1)} disabled={position>=entries.length-1}>→</button>
        </div>
      </div>

      <div className="npv-mod-rail" ref={rail} onScroll={syncPosition} tabIndex={0} role="region"
        aria-label="Galeria de módulos — deslize ou use as setas para explorar">
        {entries.map((item,index)=><article className="npv-mod-card" key={item.key}>
          <div className="npv-mod-art">
            <img src={item.image} alt={'Capa do módulo '+item.title} loading={index<4?'eager':'lazy'}
              decoding="async" draggable="false"/>
          </div>
          <div className="npv-mod-meta">
            <span className="npv-mod-card-category">{item.group==='treino'?'TREINAMENTO':item.group==='nutricao'?'ALIMENTAÇÃO':'BEM-ESTAR & EXTRAS'}</span>
            <h3>{item.title}</h3>
            <p>{item.detail}</p>
          </div>
        </article>)}
      </div>

      <div className="npv-mod-footer">
        <p>Do treino às escolhas do dia a dia. <strong>Tudo para continuar evoluindo.</strong></p>
        <button type="button" className="npv-mod-cta" onClick={onViewPlans}>VER PLANOS <span aria-hidden="true">↗</span></button>
      </div>
    </div>
  </section>
}
