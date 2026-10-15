import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ClubeNPV from './ClubeNPV.jsx'
import ClubeNPVReal from './ClubeNPVReal.jsx'
import { clubeReady } from './clubeSupabase.js'

const isClubePreview = window.location.pathname === '/clube' ||
  window.location.pathname.startsWith('/clube/') ||
  new URLSearchParams(window.location.search).get('clube') === '1'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isClubePreview ? (clubeReady ? <ClubeNPVReal /> : <ClubeNPV />) : <App />}
  </StrictMode>,
)
