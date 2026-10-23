import { useState } from 'react'
import './NPVPlatformShowcase.css'

/**
 * Vitrine do Preview: a gravação já contém o aparelho e um fundo branco.
 * Preserva a própria gravação, sem desenhar uma segunda moldura de celular.
 * Se o vídeo original ainda não estiver publicado, mantém apenas o texto aprovado.
 */
export default function NPVPlatformShowcase({ onViewPlans }) {
  const [videoUnavailable, setVideoUnavailable] = useState(false)

  return (
    <section id="como-funciona" className={`npv-showcase${videoUnavailable ? " npv-showcase--without-video" : ""}`} aria-labelledby="npv-showcase-title">
      <div className="npv-showcase__inner">
        {!videoUnavailable && <div className="npv-showcase__media">
          <div className="npv-showcase__video-shell">
            <video
              className="npv-showcase__video"
              src="/videos/npv-plataforma-por-dentro.mp4"
              autoPlay
              muted
              playsInline
              loop
              preload="metadata"
              onError={() => setVideoUnavailable(true)}
              aria-label="Demonstração real da plataforma Não Pense, Vai! em um celular"
            />
          </div>
          <div className="npv-showcase__media-caption">UMA PLATAFORMA COMPLETA · ONDE VOCÊ ESTIVER</div>
        </div>}
        <div className="npv-showcase__copy">
          <span className="npv-showcase__eyebrow"><span aria-hidden="true" /> VEJA POR DENTRO</span>
          <h2 id="npv-showcase-title">TUDO ISSO NA <em>PALMA DA SUA MÃO.</em> <span>ATUALIZADO MENSALMENTE.</span></h2>
          <p>Treinos por nível e objetivo, vídeos de execução e conteúdos para transformar sua rotina. Tudo organizado em um só lugar, com <strong>novidades a cada 5 semanas.</strong></p>
          <div className="npv-showcase__points" aria-label="Vantagens da plataforma">
            <span><b>01</b> TREINOS E PLANILHAS</span>
            <span><b>02</b> VÍDEOS E ORIENTAÇÃO</span>
            <span><b>03</b> CONTEÚDO RENOVADO</span>
          </div>
          <button type="button" className="npv-showcase__cta" onClick={onViewPlans}>
            CONHEÇA A PLATAFORMA <span aria-hidden="true">↗</span>
          </button>
        </div>
      </div>
    </section>
  )
}
