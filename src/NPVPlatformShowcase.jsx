import { useState } from 'react'
import './NPVPlatformShowcase.css'

/**
 * A própria gravação já contém o celular em fundo branco.
 * Mantemos um quadro real do vídeo como prévia para iOS/Safari,
 * conexões lentas e navegadores que bloqueiam autoplay.
 */
export default function NPVPlatformShowcase({ onViewPlans }) {
  const [videoStarted, setVideoStarted] = useState(false)
  const [videoUnavailable, setVideoUnavailable] = useState(false)

  return (
    <section id="como-funciona" className="npv-showcase" aria-labelledby="npv-showcase-title">
      <div className="npv-showcase__inner">
        <div className="npv-showcase__media">
          <div className="npv-showcase__video-shell">
            <img
              className="npv-showcase__poster"
              src="/videos/npv-plataforma-poster.jpg"
              alt="Celular mostrando a plataforma Não Pense, Vai! por dentro"
              decoding="async"
            />
            {!videoUnavailable && (
              <video
                className={`npv-showcase__video${videoStarted ? ' npv-showcase__video--started' : ''}`}
                src="/videos/npv-plataforma-por-dentro.mp4"
                autoPlay
                muted
                playsInline
                loop
                preload="auto"
                onLoadedData={event => {
                  const result = event.currentTarget.play()
                  if (result?.catch) result.catch(() => {})
                }}
                onTimeUpdate={event => {
                  if (event.currentTarget.currentTime > 0.15) setVideoStarted(true)
                }}
                onWaiting={() => setVideoStarted(false)}
                onStalled={() => setVideoStarted(false)}
                onError={() => {
                  setVideoStarted(false)
                  setVideoUnavailable(true)
                }}
                aria-label="Demonstração real da plataforma Não Pense, Vai! em um celular"
              />
            )}
          </div>
          <div className="npv-showcase__media-caption">UMA PLATAFORMA COMPLETA · ONDE VOCÊ ESTIVER</div>
        </div>
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
