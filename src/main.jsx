import { StrictMode, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { clubeReady } from './clubeSupabase.js'

// Área do Clube só carrega quando a rota /clube é acessada.
// Não muda autenticação ou funções; reduz o JavaScript inicial da home.
const ClubeNPV = lazy(() => import('./ClubeNPV.jsx'))
const ClubeNPVOnline = lazy(() => import('./ClubeNPVOnline.jsx'))
const ClubeInstagramPreview = lazy(() => import('./ClubeInstagramPreview.jsx'))

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
  ? (window.location.pathname === '/clube/instagram-teste' ? <ClubeInstagramPreview /> : params.get('demo') === '1' ? <ClubeNPV /> :
    clubeReady ? <ClubeNPVOnline /> : <ClubeIndisponivel />)
  : <App />

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isClubeRoute
      ? <Suspense fallback={<main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#111913', color: '#f4f7ed', fontFamily: 'Inter,system-ui,sans-serif' }}>Carregando Clube NPV…</main>}>{page}</Suspense>
      : page}
  </StrictMode>
)
