import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ClubeNPV from './ClubeNPV.jsx'

const isClubePreview = window.location.pathname === '/clube' ||
  window.location.pathname.startsWith('/clube/') ||
  new URLSearchParams(window.location.search).get('clube') === '1'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isClubePreview ? <ClubeNPV /> : <App />}
  </StrictMode>,
)
