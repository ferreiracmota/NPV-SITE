import React,{useState} from 'react'
import {createRoot} from 'react-dom/client'
import ClubeHotmartAdmin from '../../src/ClubeHotmartAdmin.jsx'
import '../../src/ClubeNPV.css'
import '../../src/ClubeNPVOnline.css'
import '../../src/ClubeV211.css'
const TEST_SESSION={access_token:'test-token-mock-value-not-real'}
function Harness(){
  const [admin,setAdmin]=useState(true)
  window.__NPV_SET_ADMIN__=setAdmin
  return <div className="clube-shell">
    <div className="clube-container">
      <aside className="clube-sidebar">
        <div className="clube-side-label">MINHA NAVEGAÇÃO</div>
        <nav className="clube-nav"><button>Visão geral</button><button>Alunos</button>
          {admin&&<button className="active">Hotmart — Assinaturas</button>}
          <button>Histórico</button></nav>
      </aside>
      <main className="clube-main">
        {admin&&<div className="clube-intro"><div><div className="clube-eyebrow">PAINEL DE GESTÃO</div>
          <h1>Hotmart — Assinaturas</h1><p>Gerencie assinaturas com segurança.</p></div></div>}
        <ClubeHotmartAdmin session={TEST_SESSION} isAdmin={admin}/>
      </main>
    </div>
  </div>
}
createRoot(document.getElementById('root')).render(<Harness/>)
