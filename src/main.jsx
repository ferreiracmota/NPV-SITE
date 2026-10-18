import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ClubeNPV from './ClubeNPV.jsx'
import ClubeNPVOnline from './ClubeNPVOnline.jsx'
import ClubeSpacingPreview from './ClubeSpacingPreview.jsx'
import { clubeReady } from './clubeSupabase.js'

const params = new URLSearchParams(window.location.search)
const isClubeRoute = window.location.pathname === '/clube' ||
  window.location.pathname.startsWith('/clube/') ||
  params.get('clube') === '1'

// Demonstração disponível apenas quando solicitada explicitamente.
// Uma falha de configuração nunca deve mostrar pontos fictícios como se fossem reais.
function ClubeIndisponivel() {
  return <main style={{
    minHeight: '100vh', display: 'flex', alignItems: 'center',
    justifyContent: 'center', background: '#111913', color: '#f4f7ed',
    padding: 24, fontFamily: 'Inter, system-ui, sans-serif'
  }}>
    <section style={{maxWidth: 460, textAlign: 'center'}}>
      <strong style={{color: '#c0db54', letterSpacing: 1}}>NÃO PENSE, VAI! · CLUBE NPV</strong>
      <h1 style={{fontSize: 29, lineHeight: 1.2, margin: '20px 0 12px'}}>Área temporariamente indisponível</h1>
      <p style={{color: '#cbd2c6', lineHeight: 1.6}}>
        O Clube de Benefícios está passando por uma atualização. Seus pontos e dados
        permanecem protegidos. Tente novamente mais tarde.
      </p>
      <a href="/" style={{display: 'inline-block', color: '#111913', background: '#c0db54',
        borderRadius: 8, padding: '12px 20px', fontWeight: 700, marginTop: 14}}>
        Voltar ao site
      </a>
    </section>
  </main>
}

const page = isClubeRoute
  ? (params.get('espacamento_preview') === '1' ? <ClubeSpacingPreview /> :
    params.get('demo') === '1' ? <ClubeNPV /> :
    clubeReady ? <ClubeNPVOnline /> : <ClubeIndisponivel />)
  : <App />

createRoot(document.getElementById('root')).render(
  <StrictMode>{page}</StrictMode>
)
