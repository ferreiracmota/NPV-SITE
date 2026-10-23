import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import './NPVPlatformShowcase.css'

/**
 * A própria gravação já contém o celular em fundo branco.
 * O MP4 preserva a qualidade original.
 * A animacao da MESMA gravacao opera em loop mesmo com autoplay bloqueado.
 */
export default function NPVPlatformShowcase({ onViewPlans }) {
  const videoRef = useRef(null)
  const [playbackState, setPlaybackState] = useState('loading')
  const [videoUnavailable, setVideoUnavailable] = useState(false)

  // Safari pode negar autoplay mesmo sem audio. A alternativa animada
  // continua em movimento, sem exigir clique.
  const requestPlayback = useCallback(() => {
    const video = videoRef.current
    if (!video || videoUnavailable) return
    video.muted = true
    video.defaultMuted = true
    video.setAttribute('muted', '')
    video.setAttribute('playsinline', '')
    video.setAttribute('webkit-playsinline', '')
    try {
      const result = video.play()
      if (result?.catch) {
        result.catch(() => setPlaybackState(state => state === 'playing' ? state : 'paused'))
      }
    } catch {
      setPlaybackState('paused')
    }
  }, [videoUnavailable])

  useEffect(() => {
    const video = videoRef.current
    if (!video || videoUnavailable) return

    const resumeWhenVisible = () => {
      if (document.visibilityState !== 'hidden') requestPlayback()
    }
    const observer = typeof IntersectionObserver !== 'undefined'
      ? new IntersectionObserver(entries => {
        if (entries.some(entry => entry.isIntersecting)) resumeWhenVisible()
      }, { threshold: 0.15 })
      : null

    if (observer) observer.observe(video)
    else resumeWhenVisible()

    document.addEventListener('visibilitychange', resumeWhenVisible)
    window.addEventListener('pageshow', resumeWhenVisible)
    return () => {
      observer?.disconnect()
      document.removeEventListener('visibilitychange', resumeWhenVisible)
      window.removeEventListener('pageshow', resumeWhenVisible)
    }
  }, [requestPlayback, videoUnavailable])

  return (
    <section id="como-funciona" className="npv-showcase" aria-labelledby="npv-showcase-title">
      <div className="npv-showcase__inner">
        <div className="npv-showcase__media">
          <div className="npv-showcase__video-shell">
            <img
              className="npv-showcase__poster"
              src="/videos/npv-plataforma-loop.webp"
              alt="Demonstração animada da plataforma Não Pense, Vai! no celular"
              decoding="async"
              loading="lazy"
              onError={event => {
                event.currentTarget.onerror = null
                event.currentTarget.src = '/videos/npv-plataforma-poster.jpg'
              }}
            />
            {!videoUnavailable && (
              <video
                ref={videoRef}
                className={`npv-showcase__video${playbackState === 'playing' ? ' npv-showcase__video--playing' : ''}`}
                poster="/videos/npv-plataforma-poster.jpg"
                autoPlay
                muted
                playsInline
                loop
                preload="metadata"
                onLoadedMetadata={requestPlayback}
                onCanPlay={requestPlayback}
                onPlaying={() => setPlaybackState('playing')}
                onTimeUpdate={event => {
                  if (event.currentTarget.currentTime > 0.1) setPlaybackState('playing')
                }}
                onWaiting={() => setPlaybackState('waiting')}
                onPause={() => setPlaybackState('paused')}
                onError={() => {
                  setPlaybackState('unavailable')
                  setVideoUnavailable(true)
                }}
                aria-label="Demonstração em vídeo da plataforma Não Pense, Vai! no celular"
              >
                <source src="/videos/npv-plataforma-original-20261023.mp4" type="video/mp4" />
              </video>
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
            CONHEÇA A PLATAFORMA <ArrowRight size={19} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  )
}
