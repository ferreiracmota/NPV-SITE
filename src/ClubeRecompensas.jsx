import React, { useState } from 'react'
import {
  ArrowRight, Check, CheckCircle2, Clock3, Droplets, Gift, Package,
  Pencil, Plus, Shirt, ShoppingBag, Ticket, Trash2, X, CupSoda
} from 'lucide-react'
import './ClubeRecompensas.css'

export const RECOMPENSAS_INICIAIS = [
  { id:'camiseta', name:'Camiseta NPV', category:'Exclusivo NPV', points:1000, stock:4, icon:'shirt', theme:'ink', active:true, description:'Camiseta esportiva do Clube NPV. Produto ilustrativo.' },
  { id:'coqueteleira', name:'Coqueteleira NPV', category:'Exclusivo NPV', points:450, stock:7, icon:'cup', theme:'lime', active:true, description:'Coqueteleira para sua rotina de treino. Produto ilustrativo.' },
  { id:'snacks', name:'Kit snacks parceiro', category:'Parceiros', points:700, stock:5, icon:'package', theme:'pink', active:true, description:'Exemplo de kit de snacks; depende de acordo com parceiros.' },
  { id:'hidratacao', name:'Kit de hidratação', category:'Parceiros', points:600, stock:3, icon:'water', theme:'sky', active:true, description:'Exemplo de kit para hidratação; ainda sem oferta real.' },
  { id:'desconto', name:'Benefício especial', category:'Benefícios', points:300, stock:10, icon:'ticket', theme:'cream', active:true, description:'Exemplo de benefício futuro em loja parceira.' }
]
const tipos = ['shirt','cup','package','water','ticket','gift']
const styles = ['ink','lime','pink','sky','cream']
const money = n => Number(n||0).toLocaleString('pt-BR')
const uid = () => typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `re-${Date.now()}-${Math.random()}`
const iconMap = { shirt:Shirt, cup:CupSoda, package:Package, water:Droplets, ticket:Ticket, gift:Gift }
const newReward = () => ({id:null,name:'',category:'Exclusivo NPV',points:500,stock:5,icon:'gift',theme:'lime',active:true,description:''})
const datePt = date => new Date(date).toLocaleDateString('pt-BR',{day:'2-digit',month:'short',year:'numeric'})
const allPoints = (ledger,id) => ledger.filter(e=>e.studentId===id && new Date(e.date).getFullYear()===new Date().getFullYear()).reduce((n,e)=>n+e.amount,0)
const holdPoints = (redemptions,id) => redemptions.filter(x=>x.studentId===id&&x.status==='pending').reduce((n,x)=>n+x.points,0)
function RewardCard({reward,available,onRequest,isAdmin=false,onEdit}) {
  const Icon = iconMap[reward.icon] || Gift
  const enough = available >= reward.points
  const soldOut = reward.stock <= 0
  return <article className="npv-shop-card">
    <div className={`npv-shop-art npv-shop-art-${styles.includes(reward.theme)?reward.theme:'lime'}`}>
      <span className="npv-shop-art-stamp">CLUBE NPV <span>✦</span></span>
      <Icon aria-hidden="true" strokeWidth={1.25} size={87} />
      <span className="npv-shop-art-corner">01 / NPV</span>
    </div>
    <div className="npv-shop-info">
      <span className="npv-shop-category">{reward.category}</span>
      <h3>{reward.name}</h3>
      <div className="npv-shop-price"><strong>{money(reward.points)}</strong><span>pontos</span></div>
      {isAdmin?
        <div className="npv-shop-foot">
          <span className={`npv-shop-stock ${soldOut||!reward.active?'npv-shop-stock-off':''}`}>{!reward.active?'Inativo':soldOut?'Esgotado':`${reward.stock} em estoque`}</span>
          <button type="button" className="npv-shop-edit" onClick={()=>onEdit(reward)}><Pencil size={15}/> Editar</button>
        </div>
      :
        <div className="npv-shop-foot">
          <span className={`npv-shop-stock ${!enough||soldOut?'npv-shop-stock-off':''}`}>{soldOut?'Indisponível':enough?'Disponível para solicitar':`Faltam ${money(reward.points-available)} pontos`}</span>
          <button type="button" disabled={!enough||soldOut} className="npv-shop-request" onClick={()=>onRequest(reward)}>
            {soldOut?'Indisponível':enough?'Solicitar resgate':'Acumule pontos'} {enough&&!soldOut&&<ArrowRight size={15}/>}
          </button>
        </div>
      }
    </div>
  </article>
}
export default function ClubeRecompensas({isAdmin,mode='catalog',demo,setDemo,current,students,balance,onNotice,onViewAll}) {
  const [dialog,setDialog] = useState(null)
  const [draft,setDraft] = useState(newReward)
  const [confirmation,setConfirmation] = useState(null)
  const {ledger=[],rewards=[],redemptions=[]}=demo
  const visible = rewards.filter(x=>x.active)
  const available = Math.max(0,balance(current?.id)-holdPoints(redemptions,current?.id))
  const viewRewards = mode==='featured'?visible.slice(0,4):visible
  const requests = [...redemptions].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt))
  const studentRequests = requests.filter(x=>x.studentId===current?.id)
  const pending = requests.filter(x=>x.status==='pending')
  function requestReward(reward) {
    if (isAdmin||!current||!reward.active||reward.stock<=0) return
    const fresh = rewards.find(x=>x.id===reward.id)
    if (!fresh||fresh.stock<=0||available<fresh.points) {onNotice('Saldo insuficiente ou item indisponível nesta demonstração.');return}
    if (redemptions.some(x=>x.studentId===current.id&&x.rewardId===reward.id&&x.status==='pending')) {onNotice('Você já tem uma solicitação pendente para esse item.');return}
    setConfirmation(reward)
  }
  function confirmRequest() {
    const reward=confirmation, actual=rewards.find(x=>x.id===reward?.id)
    if (isAdmin||!current||!actual||!actual.active||actual.stock<=0||available<actual.points) {onNotice('Não foi possível solicitar esse resgate.');setConfirmation(null);return}
    const request={id:uid(),rewardId:actual.id,rewardName:actual.name,studentId:current.id,points:actual.points,status:'pending',createdAt:new Date().toISOString()}
    setDemo(d=>({...d,redemptions:[request,...(d.redemptions||[])]}))
    setConfirmation(null);onNotice('Solicitação fictícia registrada! Aguarde a aprovação do administrador.')
  }
  function resolveRequest(req,action) {
    if (!isAdmin||req.status!=='pending') return
    const item=rewards.find(x=>x.id===req.rewardId)
    if (action==='approved'&&(!item||item.stock<1||allPoints(ledger,req.studentId)<req.points)) {
      onNotice('Não é possível aprovar: verifique estoque e saldo do aluno.');return
    }
    const now=new Date().toISOString()
    setDemo(d=>({
      ...d,
      rewards: action==='approved' ? d.rewards.map(x=>x.id===req.rewardId?{...x,stock:x.stock-1}:x):d.rewards,
      redemptions:(d.redemptions||[]).map(x=>x.id===req.id?{...x,status:action,resolvedAt:now}:x),
      ledger: action==='approved' ? [{id:uid(),studentId:req.studentId,ruleId:'resgate',amount:-req.points,note:`Resgate aprovado: ${req.rewardName} (teste)`,date:now},...d.ledger] : d.ledger
    }))
    onNotice(action==='approved'?'Resgate fictício aprovado; pontos debitados e estoque atualizado.':'Solicitação fictícia recusada; pontos liberados.')
  }
  function edit(reward) {setDraft({...reward});setDialog('editor')}
  function openCreate() {setDraft(newReward());setDialog('editor')}
  function save(e) {
    e.preventDefault()
    const clean=draft.name.trim(),points=Number(draft.points),stock=Number(draft.stock)
    if(clean.length<3||!Number.isSafeInteger(points)||points<1||points>100000||!Number.isSafeInteger(stock)||stock<0||stock>100000) {
      onNotice('Informe nome, custo inteiro positivo e estoque inteiro não negativo.');return
    }
    const reward={...draft,id:draft.id||uid(),name:clean,category:draft.category.trim()||'Benefícios',description:draft.description.trim(),points,stock,icon:tipos.includes(draft.icon)?draft.icon:'gift',theme:styles.includes(draft.theme)?draft.theme:'lime'}
    setDemo(d=>({...d,rewards:draft.id?d.rewards.map(x=>x.id===draft.id?reward:x):[...d.rewards,reward]}))
    setDialog(null);onNotice('Recompensa fictícia salva no catálogo.')
  }
  const title=mode==='featured'?'Troque seus pontos':'Vitrine de recompensas'
  return <section className={`npv-shop ${mode==='featured'?'npv-shop-featured':''}`} aria-label="Lojinha de pontos do Clube NPV">
    <div className="npv-shop-heading">
      <div><div className="npv-shop-eyebrow"><ShoppingBag size={15}/> LOJINHA DO CLUBE NPV</div><h2>{title}<span> ✦</span></h2><p>{isAdmin?'Gerencie os prêmios fictícios e as solicitações de resgate.':'Escolha uma conquista e use seus pontos para solicitá-la.'}</p></div>
      {isAdmin ? <button className="clube-btn clube-btn-primary" type="button" onClick={openCreate}><Plus size={17}/> Novo prêmio</button>
      : mode==='featured' ? <button className="npv-shop-view-all" type="button" onClick={onViewAll}>Ver catálogo <ArrowRight size={16}/></button>
      : <div className="npv-shop-balance">Disponível para solicitações <strong>{money(available)} pts</strong></div>}
    </div>
    <div className="npv-shop-grid">
      {(isAdmin?rewards:viewRewards).map(item=><RewardCard key={item.id} reward={item} available={available} isAdmin={isAdmin} onRequest={requestReward} onEdit={edit}/>)}
    </div>
    {!isAdmin&&viewRewards.length===0&&<div className="npv-shop-empty">Em breve, novas recompensas.</div>}
    {!isAdmin&&<p className="npv-shop-demo-note">Produtos, preços em pontos e estoques ilustrativos. A solicitação nesta prévia não envia pedidos reais.</p>}
    {mode==='catalog' && <div className="npv-shop-requests">
      <div className="npv-shop-requests-head"><div><h3>{isAdmin?'Solicitações para aprovação':'Meus resgates'}</h3><p>{isAdmin?'Aprove ou recuse os pedidos dos alunos fictícios.':'Pedidos de demonstração e seu andamento.'}</p></div>{isAdmin&&<span className="npv-shop-pending-count">{pending.length} pendentes</span>}</div>
      {(isAdmin?requests:studentRequests).length===0&&<p className="npv-shop-no-requests">Nenhuma solicitação por enquanto.</p>}
      {(isAdmin?requests:studentRequests).map(req=><div className="npv-shop-request-row" key={req.id}>
        <span className="npv-shop-request-icon"><Gift size={20}/></span>
        <div className="npv-shop-request-text"><strong>{req.rewardName}</strong>{isAdmin&&<span>{students.find(x=>x.id===req.studentId)?.name||'Aluno fictício'}</span>}<small>{datePt(req.createdAt)} · {money(req.points)} pts</small></div>
        <span className={`npv-shop-status npv-shop-status-${req.status}`}>{req.status==='pending'?'Aguardando':req.status==='approved'?'Aprovado':'Recusado'}</span>
        {isAdmin&&req.status==='pending'&&<div className="npv-shop-resolve"><button type="button" title="Aprovar resgate" onClick={()=>resolveRequest(req,'approved')}><Check size={16}/> Aprovar</button><button type="button" title="Recusar resgate" onClick={()=>resolveRequest(req,'rejected')}><X size={16}/> Recusar</button></div>}
      </div>)}
    </div>}
    {mode==='catalog'&&isAdmin&&<p className="npv-shop-demo-note">Ao aprovar um pedido fictício, o sistema desconta pontos no histórico e uma unidade do estoque. Pedidos pendentes reservam pontos para evitar solicitações simultâneas.</p>}
    {confirmation&&<div className="clube-modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setConfirmation(null)}}><section className="clube-modal npv-shop-confirm" role="dialog" aria-modal="true" aria-labelledby="npv-shop-confirm-title">
      <div className="clube-modal-top"><div><small>SOLICITAÇÃO DE TESTE</small><h2 id="npv-shop-confirm-title">Solicitar resgate?</h2></div><button type="button" onClick={()=>setConfirmation(null)} aria-label="Fechar"><X size={20}/></button></div>
      <div className="npv-shop-confirm-body"><strong>{confirmation.name}</strong><p>Este pedido será enviado apenas ao painel administrativo fictício. Nenhum produto será entregue.</p><div className="npv-shop-confirm-price"><span>Valor solicitado</span><strong>{money(confirmation.points)} pontos</strong></div><p>Os pontos ficarão reservados até a decisão. Serão descontados somente se o administrador aprovar.</p><button className="clube-btn clube-btn-primary clube-btn-full" onClick={confirmRequest}><Check size={17}/> Confirmar solicitação de teste</button></div>
    </section></div>}
    {dialog==='editor'&&<div className="clube-modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setDialog(null)}}><section className="clube-modal" role="dialog" aria-modal="true" aria-labelledby="npv-shop-editor-title">
      <div className="clube-modal-top"><div><small>CATÁLOGO · DEMONSTRAÇÃO</small><h2 id="npv-shop-editor-title">{draft.id?'Editar recompensa':'Novo prêmio fictício'}</h2></div><button type="button" onClick={()=>setDialog(null)} aria-label="Fechar"><X size={21}/></button></div>
      <form className="clube-form" onSubmit={save}>
        <label>Nome do prêmio<input maxLength="75" value={draft.name} onChange={e=>setDraft(d=>({...d,name:e.target.value}))} required placeholder="Ex.: Garrafa NPV"/></label>
        <label>Categoria<input maxLength="45" value={draft.category} onChange={e=>setDraft(d=>({...d,category:e.target.value}))}/></label>
        <div className="npv-shop-fields"><label>Custo em pontos<input min="1" max="100000" type="number" step="1" value={draft.points} onChange={e=>setDraft(d=>({...d,points:e.target.value}))} required/></label><label>Estoque fictício<input min="0" max="100000" type="number" step="1" value={draft.stock} onChange={e=>setDraft(d=>({...d,stock:e.target.value}))} required/></label></div>
        <div className="npv-shop-fields"><label>Ilustração<select value={draft.icon} onChange={e=>setDraft(d=>({...d,icon:e.target.value}))}>{tipos.map(x=><option value={x} key={x}>{({shirt:'Camiseta',cup:'Coqueteleira',package:'Kit',water:'Hidratação',ticket:'Cupom',gift:'Presente'})[x]}</option>)}</select></label><label>Cor<select value={draft.theme} onChange={e=>setDraft(d=>({...d,theme:e.target.value}))}>{styles.map(x=><option key={x} value={x}>{({ink:'Preto',lime:'Verde',pink:'Rosa',sky:'Azul',cream:'Creme'})[x]}</option>)}</select></label></div>
        <label>Descrição<textarea rows="2" maxLength="250" value={draft.description} onChange={e=>setDraft(d=>({...d,description:e.target.value}))} placeholder="Detalhes do benefício"/></label>
        <label className="npv-shop-check"><input type="checkbox" checked={draft.active} onChange={e=>setDraft(d=>({...d,active:e.target.checked}))}/> Visível aos alunos</label>
        <button className="clube-btn clube-btn-primary clube-btn-full" type="submit"><Check size={18}/> Salvar recompensa fictícia</button>
      </form>
    </section></div>}
  </section>
}
