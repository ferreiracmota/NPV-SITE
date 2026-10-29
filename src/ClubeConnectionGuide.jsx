import React from 'react'
import {ArrowRight,CheckCircle2,Footprints,Instagram,Link2,ShieldCheck,Sparkles} from 'lucide-react'
import './ClubeConnectionGuide.css'

// Exclusivo para a área da aluna: leitura dos estados reais, sem creditar pontos,
// guardar informações de perfil ou iniciar autorizações automaticamente.
export default function ClubeConnectionGuide({instagram,strava,onInstagram,onStrava}){
  const ig=instagram||{checked:false,connected:false,available:false}
  const s=strava||{checked:false,connected:false,disabled:false}
  const igReady=ig.checked&&ig.connected
  const stReady=s.checked&&s.connected
  const complete=igReady&&stReady
  const knownCount=Number(igReady)+Number(stReady)
  const items=[
    {key:'instagram',title:'Instagram',help:'Marque @naopensevai nos Stories para participar.',Icon:Instagram,
      ready:igReady,checking:!ig.checked,disabled:ig.checked&&!ig.connected&&!ig.available,
      error:!!ig.error,
      action:onInstagram,actionLabel:'Ver Instagram'},
    {key:'strava',title:'Strava',help:'Acompanhe sua corrida, caminhada e os desafios.',Icon:Footprints,
      ready:stReady,checking:!s.checked,disabled:s.checked&&!s.connected&&s.disabled,
      error:!!s.error,
      action:onStrava,actionLabel:'Ver Strava'}
  ]
  return <section className={'npv-connect-guide'+(complete?' npv-connect-complete':'')} aria-label="Conexões do Clube NPV">
    <div className="npv-connect-heading">
      <div className="npv-connect-symbol"><Sparkles size={20} aria-hidden="true"/></div>
      <div className="npv-connect-heading-text">
        <span className="npv-connect-kicker">SEU CLUBE, MAIS COMPLETO</span>
        <h2>{complete?'Tudo conectado! ✦':'Aproveite melhor seu Clube ✦'}</h2>
        {!complete&&<p>Conecte suas contas e aproveite as experiências do NPV, sem precisar procurar por onde começar.</p>}
      </div>
      <span className="npv-connect-count" aria-label={knownCount+' de 2 contas conectadas'}>{knownCount}/2 <span>conexões</span></span>
    </div>
    <div className="npv-connect-items">
      {items.map(({key,title,help,Icon,ready,checking,disabled,error,action,actionLabel})=>
        <div className={'npv-connect-item'+(ready?' is-connected':'')} key={key}>
          <div className="npv-connect-app-icon"><Icon size={21} aria-hidden="true"/></div>
          <div className="npv-connect-copy">
            <div className="npv-connect-title-row"><strong>{title}</strong><span className={'npv-connect-state'+(ready?' is-connected':'')} aria-live="polite">
              {ready?<><CheckCircle2 size={13}/> Conectado</>:checking?'Verificando...':error?'Verificação pendente':disabled?'Em preparação':'Não conectado'}
            </span></div>
            {!complete&&!ready&&<p>{help}</p>}
          </div>
          {!ready&&!complete&&<button type="button" className="npv-connect-action" onClick={action} aria-label={actionLabel}>{checking||disabled||error?'Ver detalhes':key==='instagram'?'Vincular':'Conectar'}<ArrowRight size={15}/></button>}
        </div>
      )}
    </div>
    {!complete&&<p className="npv-connect-footnote"><ShieldCheck size={14} aria-hidden="true"/> As conexões são opcionais e seguras. Pontos e participações seguem as regras de validação do Clube.</p>}
    {complete&&<p className="npv-connect-footnote"><Link2 size={14} aria-hidden="true"/> Conexões verificadas. Continue participando dos desafios e atividades!</p>}
  </section>
}
