import React,{useEffect,useState} from 'react'
import {Check,Eye,EyeOff,Palette,Save,ShieldCheck} from 'lucide-react'
import './ClubeAppearanceAdmin.css'

export default function ClubeAppearanceAdmin({settings,onSave}){
  const [draft,setDraft]=useState(settings)
  const [saving,setSaving]=useState(false)
  const [feedback,setFeedback]=useState('')
  useEffect(()=>{setDraft(settings);setFeedback('')},[settings.theme,settings.show_journey,settings.show_achievements])
  const changed=draft.theme!==settings.theme||draft.show_journey!==settings.show_journey||draft.show_achievements!==settings.show_achievements
  async function save(event){
    event.preventDefault()
    if(saving||!changed)return
    setSaving(true);setFeedback('')
    try{
      await onSave(draft)
      setFeedback('Alterações salvas! A nova configuração será aplicada às contas do Clube.')
    }catch{
      setFeedback('Não foi possível salvar. Confira sua conexão e tente novamente.')
    }finally{setSaving(false)}
  }
  return <section className="npv-appearance-admin" aria-label="Aparência e seções do perfil">
    <header><span><Palette size={17}/> PERSONALIZAÇÃO DO CLUBE</span><h2>Aparência e perfil</h2><p>Escolha como o Clube aparece para todos os alunos. Os ajustes são globais e podem ser revertidos a qualquer momento.</p></header>
    <form onSubmit={save}>
      <fieldset className="npv-appearance-fieldset">
        <legend>Tema para todos os alunos</legend>
        <div className="npv-appearance-themes">
          <label className={'npv-appearance-theme-choice'+(draft.theme==='dark'?' is-selected':'')}>
            <input type="radio" name="appearance-theme" checked={draft.theme==='dark'} onChange={()=>setDraft(d=>({...d,theme:'dark'}))}/>
            <span className="npv-appearance-swatch is-dark"><i/><i/><i/></span>
            <strong>Preto premium</strong><small>Fundo grafite, texto claro e detalhes NPV</small>
            {draft.theme==='dark'&&<Check size={17} aria-hidden="true"/>}
          </label>
          <label className={'npv-appearance-theme-choice'+(draft.theme==='light'?' is-selected':'')}>
            <input type="radio" name="appearance-theme" checked={draft.theme==='light'} onChange={()=>setDraft(d=>({...d,theme:'light'}))}/>
            <span className="npv-appearance-swatch is-light"><i/><i/><i/></span>
            <strong>Branco clássico</strong><small>Fundo claro e visual original do Clube</small>
            {draft.theme==='light'&&<Check size={17} aria-hidden="true"/>}
          </label>
        </div>
      </fieldset>
      <fieldset className="npv-appearance-fieldset">
        <legend>Seções do Perfil</legend>
        <p>Você pode ocultar as seções independentes. Meus dados e Minhas conexões permanecem acessíveis.</p>
        <label className="npv-appearance-switch-row">
          <span className="npv-appearance-switch-icon">{draft.show_journey?<Eye size={19}/>:<EyeOff size={19}/>}</span>
          <span className="npv-appearance-switch-copy"><strong>Minha trajetória</strong><small>Cartão de nível, pilha de cartões, progresso e lista dos níveis.</small></span>
          <input type="checkbox" checked={draft.show_journey} onChange={e=>setDraft(d=>({...d,show_journey:e.target.checked}))} aria-label="Mostrar Minha trajetória"/>
        </label>
        <label className="npv-appearance-switch-row">
          <span className="npv-appearance-switch-icon">{draft.show_achievements?<Eye size={19}/>:<EyeOff size={19}/>}</span>
          <span className="npv-appearance-switch-copy"><strong>Minhas conquistas</strong><small>Troféus e insígnias conquistados pelo aluno.</small></span>
          <input type="checkbox" checked={draft.show_achievements} onChange={e=>setDraft(d=>({...d,show_achievements:e.target.checked}))} aria-label="Mostrar Minhas conquistas"/>
        </label>
      </fieldset>
      <footer><p><ShieldCheck size={16}/> A configuração não exclui pontos, cartões ou conquistas: apenas altera o que é exibido.</p>
        <button type="submit" disabled={!changed||saving}><Save size={17}/>{saving?'Salvando...':'Salvar aparência'}</button></footer>
      {feedback&&<p className="npv-appearance-feedback" role="status">{feedback}</p>}
    </form>
  </section>
}
