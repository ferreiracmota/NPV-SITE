import React,{useRef,useState} from 'react'
import {Maximize2,Monitor,RotateCcw,Smartphone} from 'lucide-react'
import {DEFAULT_IMAGE_FRAME,dragImageFrame,imageFrameStyle,normalizeImageFrame} from '../clube/image/framing.mjs'
import {DEFAULT_CHALLENGE_OVERLAY,normalizeChallengeOverlay,challengeOverlayGradient} from '../clube/image/challengeOverlay.mjs'
import './ClubeImageFrameEditor.css'

/**
 * Editor visual reutilizável para capas de desafios e fotos dos produtos.
 * Muda só o enquadramento: o arquivo original nunca é recortado nem regravado.
 */
export default function ClubeImageFrameEditor({
  src='',value=DEFAULT_IMAGE_FRAME,onChange,kind='challenge',
  title='',disabled=false,overlayStrength=DEFAULT_CHALLENGE_OVERLAY,onOverlayChange
}){
  const frame=normalizeImageFrame(value)
  const [layout,setLayout]=useState('mobile')
  const [dragging,setDragging]=useState(false)
  const pointer=useRef(null)
  const previewRef=useRef(null)
  const isChallenge=kind==='challenge'
  const ratio=isChallenge?(layout==='mobile'?2.12:4.4):(layout==='mobile'?1.1:1.7)
  const update=next=>{if(!disabled&&onChange)onChange(normalizeImageFrame(next))}
  const onDown=event=>{
    if(!src||disabled||(event.pointerType==='mouse'&&event.button!==0))return
    const image=previewRef.current?.querySelector('img')
    if(!image?.naturalWidth||!image?.naturalHeight)return
    event.preventDefault()
    pointer.current={id:event.pointerId,startX:event.clientX,startY:event.clientY,frame}
    previewRef.current?.setPointerCapture?.(event.pointerId)
    setDragging(true)
  }
  const onMove=event=>{
    const start=pointer.current
    if(!start||start.id!==event.pointerId||disabled)return
    const image=previewRef.current?.querySelector('img')
    const box=previewRef.current
    if(!image||!box)return
    update(dragImageFrame(start.frame,event.clientX-start.startX,event.clientY-start.startY,
      box.clientWidth,box.clientHeight,image.naturalWidth,image.naturalHeight))
  }
  const finish=event=>{
    if(pointer.current?.id!==event.pointerId)return
    pointer.current=null
    setDragging(false)
    if(previewRef.current?.hasPointerCapture?.(event.pointerId))
      previewRef.current.releasePointerCapture(event.pointerId)
  }
  return <div className={'npv-frame-editor npv-frame-editor-'+kind}>
    <div className="npv-frame-editor-head">
      <span><Maximize2 size={16}/> Ajustar enquadramento</span>
      <div className="npv-frame-editor-layouts" role="group" aria-label="Formato da prévia">
        <button type="button" className={layout==='mobile'?'is-selected':''}
          aria-pressed={layout==='mobile'} onClick={()=>setLayout('mobile')}><Smartphone size={14}/> Celular</button>
        <button type="button" className={layout==='desktop'?'is-selected':''}
          aria-pressed={layout==='desktop'} onClick={()=>setLayout('desktop')}><Monitor size={14}/> Computador</button>
      </div>
    </div>
    {src?<div ref={previewRef}
      className={'npv-frame-editor-preview'+(dragging?' is-dragging':'')}
      style={{aspectRatio:ratio}} role="img"
      aria-label="Prévia do enquadramento. Arraste a foto para ajustar a posição."
      onPointerDown={onDown} onPointerMove={onMove} onPointerUp={finish} onPointerCancel={finish}>
      <img src={src} alt="" draggable={false} style={imageFrameStyle(frame)}/>
      {isChallenge?<><span className="npv-frame-preview-shade" style={{background:challengeOverlayGradient(overlayStrength)}}/>
        <span className="npv-frame-preview-challenge-text"><strong>Metas e desafios</strong><small>{title||'Desafio do mês'}</small></span></>
        :<><span className="npv-frame-preview-stamp">CLUBE NPV ✦</span><span className="npv-frame-preview-corner">NPV</span></>}
      <span className="npv-frame-editor-hint">{dragging?'Ajustando...':'Arraste a foto para enquadrar'}</span>
    </div>:<div className="npv-frame-editor-empty">Selecione uma fotografia para visualizar e ajustar o enquadramento.</div>}
    <div className={'npv-frame-editor-sliders'+(isChallenge?' has-overlay':'')} aria-label="Ajuste fino da fotografia">
      <label>Horizontal <span>{Math.round(frame.x)}%</span>
        <input aria-label="Posição horizontal da imagem" type="range" min="0" max="100" step="1"
          value={frame.x} disabled={disabled||!src} onChange={e=>update({...frame,x:Number(e.target.value)})}/>
      </label>
      <label>Vertical <span>{Math.round(frame.y)}%</span>
        <input aria-label="Posição vertical da imagem" type="range" min="0" max="100" step="1"
          value={frame.y} disabled={disabled||!src} onChange={e=>update({...frame,y:Number(e.target.value)})}/>
      </label>
      <label>Zoom <span>{Math.round(frame.zoom*100)}%</span>
        <input aria-label="Zoom da imagem" type="range" min="100" max="250" step="5"
          value={Math.round(frame.zoom*100)} disabled={disabled||!src}
          onChange={e=>update({...frame,zoom:Number(e.target.value)/100})}/>
      </label>
      {isChallenge&&<label>Intensidade do gradiente <span>{normalizeChallengeOverlay(overlayStrength)}%</span>
        <input aria-label="Intensidade do gradiente verde do desafio" type="range" min="0" max="100" step="1"
          value={normalizeChallengeOverlay(overlayStrength)} disabled={disabled||!src}
          onChange={e=>{if(!disabled)onOverlayChange?.(Number(e.target.value))}}/>
      </label>}
    </div>
    <div className="npv-frame-editor-foot">
      <small>O enquadramento se adapta ao tamanho do cartão. A foto original mantém a qualidade e a proporção.</small>
      <button type="button" onClick={()=>update(DEFAULT_IMAGE_FRAME)} disabled={disabled||!src}
        aria-label="Centralizar imagem e restaurar zoom"><RotateCcw size={15}/> Centralizar</button>
    </div>
  </div>
}
