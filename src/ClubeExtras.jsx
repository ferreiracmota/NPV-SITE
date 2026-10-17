import React from 'react'
import { ArrowRight, ExternalLink, Pencil, Plus, Tag, X, Check } from 'lucide-react'
import parceiro1 from './assets/Parceiro1.PNG'
import parceiro2 from './assets/Parceiro2.PNG'
import parceiro3 from './assets/Parceiro3.PNG'
import parceiro4 from './assets/Parceiro4.PNG'
import parceiro5 from './assets/Parceiro5.PNG'
import './ClubeExtras.css'

const logoMap = { parceiro1, parceiro2, parceiro3, parceiro4, parceiro5 }
export const logoOptions = [
  ['','Imagem por endereço (URL)'], ['parceiro1','Logo original: Cafezin Lounge'],
  ['parceiro2','Logo original: Cia do Esporte'], ['parceiro3','Logo original: TF Sports Running Betim'],
  ['parceiro4','Logo original: NF Moda Fitness'], ['parceiro5','Logo original: Ciladas Burger']
]
export const safePartnerUrl = value => typeof value === 'string' && /^https:\/\/[^\s]+$/i.test(value.trim()) ? value.trim() : ''
export function partnerLogo(partner) {
  if(logoMap[partner.logo_key]) return logoMap[partner.logo_key]
  const value=partner.logo_url?.trim()||''
  if(value === '/parceiros/logo-liquidz.svg') return value
  return safePartnerUrl(value)
}
export function BenefitNotice({rewards,points,onOpen}) {
  // Somente prêmios reais, ativos e em estoque. Demonstrações não desbloqueiam benefícios.
  const ready=(rewards||[]).filter(x=>x.active && !x.test_only && x.stock>0 && x.points<=points)
    .sort((a,b)=>a.points-b.points)
  if(!ready.length) return null
  const first=ready[0]
  return <section className="npv-benefit-alert" aria-live="polite">
    <span className="npv-benefit-alert-icon"><Tag size={21}/></span>
    <div><strong>Você já pode resgatar uma recompensa!</strong>
      <p>Seu saldo permite solicitar <b>{first.name}</b>{ready.length>1?` e mais ${ready.length-1} opção(ões)`:''}. Aproveite seus pontos no Clube NPV.</p>
    </div>
    <button type="button" onClick={onOpen}>Ver recompensas <ArrowRight size={17}/></button>
  </section>
}
export function PartnerCards({partners=[],admin=false,limit=null,onEdit}) {
  const list=(admin ? partners : partners.filter(x=>x.active))
    .slice().sort((a,b)=>a.position-b.position||a.name.localeCompare(b.name,'pt-BR'))
    .slice(0,limit||undefined)
  return <div className="npv-partners-grid">
    {list.length===0&&<p className="npv-partners-empty">Novos benefícios de parceiros serão divulgados aqui.</p>}
    {list.map(item=>{
      const logo=partnerLogo(item)
      const url=safePartnerUrl(item.link_url)
      return <article key={item.id} className={`npv-partner-card ${!item.active?'npv-partner-inactive':''}`}>
        {!admin&&url?<a className="npv-partner-logo npv-partner-logo-link" href={url} target="_blank" rel="noopener noreferrer" aria-label={`Abrir página de ${item.name}`}>
          {logo?<img src={logo} alt={item.name} loading="lazy"/>:<strong>{item.name?.slice(0,2).toUpperCase()}</strong>}
        </a>:<div className="npv-partner-logo">{logo?<img src={logo} alt={`Logo ${item.name}`} loading="lazy"/>:<strong>{item.name?.slice(0,2).toUpperCase()}</strong>}</div>}
        <div className="npv-partner-info">
          <strong>{item.name}</strong>
          {item.discount_percent!=null ? <b className="npv-partner-discount">{item.discount_percent}% de desconto</b>:
            <span className="npv-partner-detail">Consulte os benefícios</span>}
          {item.coupon_code&&<span className="npv-partner-coupon">Cupom: <b>{item.coupon_code}</b></span>}
          {item.details&&<p>{item.details}</p>}
          {admin&&!item.active&&<small className="npv-partner-off">Oculto para alunos</small>}
        </div>
        {admin?<button type="button" className="npv-partner-action" onClick={()=>onEdit?.(item)}><Pencil size={15}/> Editar parceiro</button>:
          url?<a className="npv-partner-action" href={url} target="_blank" rel="noopener noreferrer" aria-label={`Visitar ${item.name}`}>Ver parceiro <ExternalLink size={15}/></a>:null}
      </article>
    })}
  </div>
}
export function PartnerEditor({draft,setDraft,onSave,onClose,busy}) {
  return <div className="clube-modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)onClose()}}>
    <section className="clube-modal" role="dialog" aria-modal="true" aria-labelledby="partner-edit-title">
      <div className="clube-modal-top"><div><small>PARCERIAS NPV</small><h2 id="partner-edit-title">{draft.id?'Editar parceiro':'Cadastrar parceiro'}</h2></div>
        <button type="button" disabled={busy} onClick={onClose} aria-label="Fechar"><X size={20}/></button></div>
      <form className="clube-form" onSubmit={onSave}>
        <label>Nome do parceiro<input required minLength={2} maxLength={90} value={draft.name} onChange={e=>setDraft(d=>({...d,name:e.target.value}))}/></label>
        <label>Link para Instagram ou site do parceiro<input required type="url" placeholder="https://www.instagram.com/..." value={draft.link_url} onChange={e=>setDraft(d=>({...d,link_url:e.target.value}))}/></label>
        <div className="npv-shop-fields">
          <label>Desconto confirmado (%)<input type="number" min={1} max={100} step={1} placeholder="Deixe vazio se não confirmado" value={draft.discount_percent??''} onChange={e=>setDraft(d=>({...d,discount_percent:e.target.value}))}/></label>
          <label>Cupom (opcional)<input maxLength={60} value={draft.coupon_code} onChange={e=>setDraft(d=>({...d,coupon_code:e.target.value}))}/></label>
        </div>
        <label>Logo já existente<select value={draft.logo_key} onChange={e=>setDraft(d=>({...d,logo_key:e.target.value}))}>{logoOptions.map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
        <label>Endereço da imagem da logo (se não escolher uma existente)<input placeholder="https://..." value={draft.logo_url} onChange={e=>setDraft(d=>({...d,logo_url:e.target.value}))}/></label>
        <label>Condições ou detalhes (opcional)<textarea maxLength={250} rows={2} value={draft.details} onChange={e=>setDraft(d=>({...d,details:e.target.value}))}/></label>
        <label>Ordem de exibição<input type="number" min={0} max={10000} step={1} value={draft.position} onChange={e=>setDraft(d=>({...d,position:e.target.value}))}/></label>
        <label className="npv-shop-check"><input type="checkbox" checked={draft.active} onChange={e=>setDraft(d=>({...d,active:e.target.checked}))}/> Mostrar este parceiro aos alunos</label>
        <p className="npv-partner-hint">Informe o percentual apenas depois de confirmar a oferta com o parceiro. A área é apenas informativa e não desconta pontos.</p>
        <button disabled={busy} className="clube-btn clube-btn-primary clube-btn-full" type="submit">{busy?'Salvando...':'Salvar parceiro'} <Check size={16}/></button>
      </form>
    </section>
  </div>
}
