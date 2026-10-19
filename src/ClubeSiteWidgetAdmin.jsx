import React,{useEffect,useMemo,useState} from 'react'
import {CheckCircle2,Eye,EyeOff,ImagePlus,Save,Send,SlidersHorizontal,Trash2,AlertCircle} from 'lucide-react'
import {clubeSupabase as supabase} from './clubeSupabase.js'
import ClubeFloatingWidget from './ClubeFloatingWidget.jsx'
import {DEFAULT_WIDGET,WIDGET_BUCKET,WIDGET_SCOPE,normalizeWidget,widgetPublicImage} from './ClubeSiteWidgetConfig.js'
import {partnerLogo} from './ClubeExtras.jsx'
import './ClubeSiteWidgetAdmin.css'

const persist=x=>{
 const normalized=normalizeWidget(x)
 return {
  enabled:normalized.enabled,
  ranking:normalized.ranking.map(row=>({id:row.id,name:row.name,points:row.points,avatar_path:row.avatar_path})),
  reward_ids:normalized.reward_ids,
  partner_ids:normalized.partner_ids,
  logo_path:normalized.logo_path,
  visual:normalized.visual
 }
}
const cleanName=(s)=>String(s||'').trim()
const normalizeRows=rows=>(rows||[]).filter(Boolean)
const makePreview=(model,rewards,partners)=>{
 const x=normalizeWidget(model)
 return {...x,
  rewards:x.reward_ids.map(id=>rewards.find(r=>r.id===id)).filter(r=>r&&(r.active||r.showcase)),
  partners:x.partner_ids.map(id=>partners.find(p=>p.id===id)).filter(p=>p&&p.active)
 }
}
export default function ClubeSiteWidgetAdmin({rewards=[],partners=[]}){
 const [draft,setDraft]=useState(DEFAULT_WIDGET)
 const targetIsProduction=WIDGET_SCOPE==='production'
 const targetName=targetIsProduction?'site oficial':'Preview'
 const [published,setPublished]=useState(null)
 const [loading,setLoading]=useState(true)
 const [busy,setBusy]=useState(false)
 const [uploading,setUploading]=useState('')
 const [message,setMessage]=useState('')
 const [error,setError]=useState('')
 const eligibleRewards=useMemo(()=>normalizeRows(rewards).filter(x=>x.active||x.showcase),[rewards])
 const eligiblePartners=useMemo(()=>normalizeRows(partners).filter(x=>x.active),[partners])
 const preview=useMemo(()=>makePreview(draft,eligibleRewards,eligiblePartners),[draft,eligibleRewards,eligiblePartners])
 const setField=(field,value)=>{setMessage('');setDraft(x=>({...x,[field]:value}))}
 const setVisual=(field,value)=>{setMessage('');setDraft(x=>({...x,visual:{...x.visual,[field]:value}}))}
 useEffect(()=>{
  let alive=true
  ;(async()=>{
   try{
    if(!supabase)throw new Error('Cliente do Clube indisponível')
    const {data,error:dbError}=await supabase.from('clube_site_widget_settings')
      .select('scope,draft,published').eq('scope',WIDGET_SCOPE).maybeSingle()
    if(dbError)throw dbError
    if(alive&&data){
     setDraft(normalizeWidget(data.draft))
     setPublished(data.published?normalizeWidget(data.published):null)
    }
   }catch(e){
    if(alive)setError('Não foi possível carregar as configurações. Confirme a sessão de administrador e tente novamente.')
   }finally{if(alive)setLoading(false)}
  })()
  return()=>{alive=false}
 },[])
 const rankEdit=(i,field,value)=>{
  setMessage('')
  setDraft(x=>({...x,ranking:x.ranking.map((row,j)=>j===i?{...row,[field]:value}:row)}))
 }
 const selectId=(field,id)=>{
  setMessage('')
  setDraft(x=>({...x,[field]:x[field].includes(id)?x[field].filter(y=>y!==id):[...x[field],id]}))
 }
 const upload=async(file,field,index)=>{
  if(!file)return
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>4*1024*1024||file.size===0){
   setError('Envie uma imagem JPG, PNG ou WebP de até 4 MB.');return
  }
  const type=file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg'
  const key=`site-widget-${WIDGET_SCOPE}/${crypto.randomUUID()}.${type}`
  const token=field+(index??'')
  setUploading(token);setError('');setMessage('')
  try{
   const {error:uploadError}=await supabase.storage.from(WIDGET_BUCKET).upload(key,file,{contentType:file.type,upsert:false})
   if(uploadError)throw uploadError
   if(field==='logo_path')setField('logo_path',key)
   else rankEdit(index,'avatar_path',key)
   setMessage(`Imagem enviada. Clique em Salvar rascunho e Publicar para disponibilizá-la no ${targetName}.`)
  }catch{setError('Falha no envio da imagem. Verifique o acesso de administrador e tente novamente.')}
  finally{setUploading('')}
 }
 const validate=()=>{
  if(draft.ranking.length!==3||draft.ranking.some(r=>cleanName(r.name).length<2||cleanName(r.name).length>55||!Number.isInteger(Number(r.points))||Number(r.points)<0||Number(r.points)>10000000)){
   throw new Error('Informe três nomes ilustrativos (2 a 55 caracteres) e pontuações inteiras entre 0 e 10 milhões.')
  }
  if(new Set(draft.ranking.map(r=>cleanName(r.name).toLowerCase())).size<3)throw new Error('Cada participante fictício precisa ter um nome diferente.')
  if(draft.reward_ids.length>4||draft.partner_ids.length>5)throw new Error('Selecione até quatro recompensas e cinco parceiros.')
  if(draft.reward_ids.some(id=>!eligibleRewards.some(r=>r.id===id))||draft.partner_ids.some(id=>!eligiblePartners.some(p=>p.id===id)))throw new Error('Há itens selecionados que não estão disponíveis. Revise os produtos e parceiros.')
  return persist(draft)
 }
 const save=async(publish)=>{
  if(busy||loading||uploading)return
  setError('');setMessage('')
  try{
   const model=validate()
   setBusy(true)
   const payload={scope:WIDGET_SCOPE,draft:model,updated_at:new Date().toISOString()}
   if(publish)payload.published=model
   const {data,error:dbError}=await supabase.from('clube_site_widget_settings')
    .upsert(payload,{onConflict:'scope'}).select('scope,draft,published').single()
   if(dbError)throw dbError
   if(publish)setPublished(normalizeWidget(data.published))
   setMessage(publish?
    `Configuração publicada no ${targetName}. O widget atualizará na próxima consulta ou após recarregar a página.`:
    'Rascunho salvo com sucesso. O widget público ainda usa a última publicação.')
  }catch(e){setError(e.message||'Falha ao salvar: revise os dados e sua autorização de administrador.')}
  finally{setBusy(false)}
 }
 const logoUrl=widgetPublicImage(supabase,draft.logo_path)
 return <section className="npv-widget-admin" aria-label="Widget do Site">
  <div className="npv-widget-admin-head">
   <div><span className="npv-widget-admin-eyebrow">{targetIsProduction?'CLUBE NPV · SITE OFICIAL':'CLUBE NPV · AMBIENTE DE TESTE'}</span><h2>Widget do site</h2><p>Configure o mini widget da página inicial, sem deploys adicionais. Rascunho e versão publicada são independentes.</p></div>
   <span className="npv-widget-admin-mode">{targetIsProduction?'SITE OFICIAL':'PREVIEW ISOLADO'}</span>
  </div>
  {loading?<p role="status">Carregando configurações do widget...</p>:<>
   {error&&<p role="alert" className="npv-widget-admin-error"><AlertCircle size={16}/>{error}</p>}
   {message&&<p role="status" className="npv-widget-admin-success"><CheckCircle2 size={16}/>{message}</p>}
   <div className="npv-widget-admin-grid">
    <div className="npv-widget-admin-controls">
     <div className="npv-widget-admin-panel">
      <h3><Eye size={17}/> Exibição na página inicial</h3>
      <label className="npv-widget-admin-switch"><input type="checkbox" checked={draft.enabled} onChange={e=>setField('enabled',e.target.checked)}/><span>{draft.enabled?`Widget ativado no ${targetName}`:`Widget desativado no ${targetName}`}</span></label>
      <small>Desativar só ocultará o widget no site de teste depois de publicar.</small>
     </div>
     <div className="npv-widget-admin-panel">
      <h3>Ranking demonstrativo</h3>
      <p>Estes nomes e pontuações são exemplos. Nunca serão consultados alunos reais.</p>
      {draft.ranking.map((person,index)=><div className="npv-widget-rank-editor" key={person.id}>
       <strong>{index+1}º exemplo</strong>
       <div className="npv-widget-admin-fields"><label>Nome ilustrativo<input maxLength={55} value={person.name} onChange={e=>rankEdit(index,'name',e.target.value)}/></label>
       <label>Pontos fictícios<input type="number" min={0} max={10000000} step={1} value={person.points} onChange={e=>rankEdit(index,'points',e.target.value)}/></label></div>
       <div className="npv-widget-upload-line">{person.avatar_path&&widgetPublicImage(supabase,person.avatar_path)&&<img src={widgetPublicImage(supabase,person.avatar_path)} alt="" className="npv-widget-thumb"/>}
        <label className="npv-widget-file"><ImagePlus size={15}/>{uploading==='avatar_path'+index?'Enviando...':'Enviar foto fictícia'}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={!!uploading} onChange={e=>{upload(e.target.files?.[0],'avatar_path',index);e.target.value=''}}/></label>
        {person.avatar_path&&<button type="button" onClick={()=>rankEdit(index,'avatar_path','')}><Trash2 size={13}/> Remover foto</button>}
       </div>
      </div>)}
     </div>
     <div className="npv-widget-admin-panel">
      <h3>Recompensas da lojinha</h3><p>Selecione até quatro produtos já cadastrados. Fotos existentes serão reutilizadas.</p>
      {eligibleRewards.length?eligibleRewards.map(item=><label className="npv-widget-choice" key={item.id}>
       <input type="checkbox" disabled={!draft.reward_ids.includes(item.id)&&draft.reward_ids.length>=4} checked={draft.reward_ids.includes(item.id)} onChange={()=>selectId('reward_ids',item.id)}/>
       {widgetPublicImage(supabase,item.image_path)&&<img className="npv-widget-thumb" alt="" src={widgetPublicImage(supabase,item.image_path)}/>}
       <span><strong>{item.name}</strong><small>{Number(item.points).toLocaleString('pt-BR')} pontos</small></span>
      </label>):<p>Cadastre primeiro produtos na área Recompensas.</p>}
     </div>
     <div className="npv-widget-admin-panel">
      <h3>Parceiros e descontos</h3><p>Selecione até cinco parceiros ativos. Descontos não cadastrados não serão inventados.</p>
      {eligiblePartners.length?eligiblePartners.map(item=><label className="npv-widget-choice" key={item.id}>
       <input type="checkbox" disabled={!draft.partner_ids.includes(item.id)&&draft.partner_ids.length>=5} checked={draft.partner_ids.includes(item.id)} onChange={()=>selectId('partner_ids',item.id)}/>
       {partnerLogo(item)&&<img className="npv-widget-thumb" alt="" src={partnerLogo(item)}/>}
       <span><strong>{item.name}</strong><small>{item.discount_percent?item.discount_percent+'% de desconto':'Conferir condição no Clube'}</small></span>
      </label>):<p>Cadastre primeiro parceiros na área Parceiros.</p>}
     </div>
     <div className="npv-widget-admin-panel">
      <h3><SlidersHorizontal size={17}/> Aparência do vidro</h3>
      <p>Os valores iniciais são os do modelo aprovado (40% e blur 5px).</p>
      <div className="npv-widget-admin-fields">
       <label>Cor do vidro<input type="color" value={draft.visual.glass_color} onChange={e=>setVisual('glass_color',e.target.value)}/></label>
       <label>Cor dos textos<input type="color" value={draft.visual.text_color} onChange={e=>setVisual('text_color',e.target.value)}/></label>
       <label>Cor da borda<input type="color" value={draft.visual.border_color} onChange={e=>setVisual('border_color',e.target.value)}/></label>
       <label>Opacidade: {draft.visual.opacity}%<input type="range" min="15" max="90" value={draft.visual.opacity} onChange={e=>setVisual('opacity',Number(e.target.value))}/></label>
       <label>Desfoque: {draft.visual.blur}px<input type="range" min="0" max="25" value={draft.visual.blur} onChange={e=>setVisual('blur',Number(e.target.value))}/></label>
       <label>Opacidade da borda: {draft.visual.border_opacity}%<input type="range" min="0" max="100" value={draft.visual.border_opacity} onChange={e=>setVisual('border_opacity',Number(e.target.value))}/></label>
      </div>
      <button className="npv-widget-admin-reset" type="button" onClick={()=>setField('visual',DEFAULT_WIDGET.visual)}>Restaurar visual aprovado</button>
     </div>
     <div className="npv-widget-admin-panel">
      <h3>Logo do widget</h3>
      <div className="npv-widget-upload-line">
       {logoUrl&&<img className="npv-widget-thumb" src={logoUrl} alt="Logo atual do widget"/>}
       <label className="npv-widget-file"><ImagePlus size={15}/>{uploading==='logo_path'?'Enviando...':'Enviar ou substituir logo'}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={!!uploading} onChange={e=>{upload(e.target.files?.[0],'logo_path');e.target.value=''}}/></label>
       {draft.logo_path&&<button type="button" onClick={()=>setField('logo_path','')}><Trash2 size={13}/> Logo original</button>}
      </div>
     </div>
    </div>
    <div className="npv-widget-admin-preview-area">
     <div className="npv-widget-admin-panel npv-widget-admin-preview-panel">
      <h3><Eye size={17}/> Prévia do rascunho</h3>
      <p>Visualização instantânea. Clique no widget para expandir ou recolher.</p>
      <div className="npv-widget-admin-preview-surface">
       <ClubeFloatingWidget configOverride={preview} forceVisible/>
      </div>
      {!draft.enabled&&<p className="npv-widget-admin-off"><EyeOff size={14}/> Desativado: aparecerá apenas nesta prévia administrativa.</p>}
      <p className="npv-widget-admin-published">Última publicação no {targetName}: {published?(published.enabled?'Widget ligado':'Widget desligado'):`Nenhuma. O padrão aprovado continua visível no ${targetName}.`}</p>
     </div>
    </div>
   </div>
   <div className="npv-widget-admin-footer">
    <button className="npv-widget-admin-save" disabled={busy||!!uploading} onClick={()=>save(false)}><Save size={17}/>{busy?'Processando...':'Salvar rascunho'}</button>
    <button className="npv-widget-admin-publish" disabled={busy||!!uploading} onClick={()=>save(true)}><Send size={17}/>{busy?'Processando...':`Publicar no ${targetName}`}</button>
    <small>As alterações publicadas são lidas do Supabase, sem novo deploy. Configurações do Preview e do site oficial são independentes.</small>
   </div>
  </>}
 </section>
}
