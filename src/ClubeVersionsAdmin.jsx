import React from 'react'
import { BookOpen, CalendarDays, CheckCircle2, ExternalLink, GitCommitHorizontal, Info, Layers3, MonitorSmartphone, PanelTop, ShieldCheck } from 'lucide-react'
import { NPV_RELEASES } from './npvReleaseCatalog.js'
import './ClubeVersionsAdmin.css'

// Metadados inseridos no BUILD pelo Vite: nenhum segredo ou dado de usuário.
const BUILD = typeof __NPV_BUILD_INFO__ !== 'undefined' ? __NPV_BUILD_INFO__ : {}
const isSha = value => typeof value === 'string' && /^[a-f0-9]{40}$/i.test(value)
const formatBuildDate = value => {
  if (!value) return 'Não disponível'
  const date = new Date(value)
  return Number.isFinite(date.getTime())
    ? date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
    : 'Não disponível'
}
const COMPONENT_ICON = { clube: Layers3, widget: PanelTop, site: MonitorSmartphone }

export default function ClubeVersionsAdmin({ onNavigate }) {
  const sha = isSha(BUILD.commit) ? BUILD.commit : null
  const branch = typeof BUILD.branch === 'string' ? BUILD.branch : ''
  const officialHost = typeof window !== 'undefined' && /^(www\\.)?naopensevai\\.com$/i.test(window.location.hostname)

  return <section className="npv-releases" aria-label="Versões e recursos NPV">
    <div className="npv-releases-hero">
      <span className="npv-releases-eyebrow"><ShieldCheck size={15} aria-hidden="true" /> EXCLUSIVO DO ADMINISTRADOR</span>
      <h2>Mapa de versões e funcionalidades</h2>
      <p>Uma referência única para saber qual edição visual está aprovada, quais recursos cada parte oferece e qual código está publicado nesta página.</p>
      <div className="npv-releases-summary" aria-label="Visão rápida das versões">
        <span><Layers3 size={16} aria-hidden="true" /> Clube <strong>v2.1.1</strong></span>
        <span><PanelTop size={16} aria-hidden="true" /> Widget <strong>v2.1.1</strong></span>
        <span><GitCommitHorizontal size={16} aria-hidden="true" /> Site <strong>{sha ? sha.slice(0, 7) : 'build não informado'}</strong></span>
      </div>
    </div>

    <div className="npv-releases-grid">
      {NPV_RELEASES.map(item => {
        const Icon = COMPONENT_ICON[item.id]
        const isSite = item.id === 'site'
        return <article key={item.id} className="npv-releases-card">
          <div className="npv-releases-card-top">
            <span className="npv-releases-icon"><Icon size={22} aria-hidden="true" /></span>
            <span className="npv-releases-version-label">{item.versionKind}</span>
          </div>
          <h3>{item.title}</h3>
          <div className="npv-releases-version-value">{isSite ? (sha ? sha.slice(0, 10) : 'Não numerado') : `v${item.version}`}</div>
          <p className="npv-releases-version-help">{isSite ? 'Commit da publicação visualizada, quando disponível' : `Referência aprovada em ${item.date}`}</p>
          <p className="npv-releases-description">{item.description}</p>
          <h4>O que oferece</h4>
          <ul className="npv-releases-feature-list">{item.features.map(text =>
            <li key={text}><CheckCircle2 size={15} aria-hidden="true" /> <span>{text}</span></li>
          )}</ul>
          <details className="npv-releases-history">
            <summary><BookOpen size={16} aria-hidden="true" /> Alterações de referência</summary>
            <ol>{item.history.map(change =>
              <li key={change.date + change.text}><time>{change.date}</time><span>{change.text}</span></li>
            )}</ol>
          </details>
        </article>
      })}
    </div>

    <div className="npv-releases-build">
      <div className="npv-releases-build-heading">
        <div><span className="npv-releases-eyebrow"><GitCommitHorizontal size={15} aria-hidden="true" /> RASTREABILIDADE</span>
          <h3>Identificação técnica desta publicação</h3>
          <p>Essas informações vêm do código compilado. Não representam consulta em tempo real a novas versões.</p>
        </div>
        <span className="npv-releases-environment">{officialHost ? 'Domínio oficial' : 'Endereço de visualização'}</span>
      </div>
      <dl className="npv-releases-meta">
        <div><dt>Commit do site</dt><dd>{sha || 'Não disponível neste build'}</dd></div>
        <div><dt>Branch</dt><dd>{branch || 'Não informada neste build'}</dd></div>
        <div><dt>Build compilado em</dt><dd><CalendarDays size={15} aria-hidden="true" /> {formatBuildDate(BUILD.builtAt)}</dd></div>
      </dl>
      {sha && <a className="npv-releases-commit-link" href={`https://github.com/ferreiracmota/NPV-SITE/commit/${sha}`} target="_blank" rel="noopener noreferrer">
        Ver commit no GitHub <ExternalLink size={15} aria-hidden="true" />
      </a>}
    </div>

    <div className="npv-releases-note"><Info size={19} aria-hidden="true" />
      <div><strong>Como manter este registro confiável</strong>
        <p>Clube e widget usam versões visuais aprovadas, atualizadas manualmente quando a identidade ou estrutura mudar. O site não tinha uma numeração própria: seu identificador técnico muda automaticamente em cada build. O histórico acima é uma seleção documentada, não um histórico completo de commits.</p>
        {typeof onNavigate === 'function' && <button type="button" onClick={() => onNavigate('widget')}>Abrir configurações do widget <ExternalLink size={14} aria-hidden="true" /></button>}
      </div>
    </div>
  </section>
}
