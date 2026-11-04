// Enquadramento visual não destrutivo: a fotografia original continua intacta.
const clamp=(value,min,max)=>Math.min(max,Math.max(min,value))
const numeric=(value,fallback)=>value===null||value===undefined||value===''?fallback:Number(value)
const rounded=value=>Math.round(value*100)/100

export const DEFAULT_IMAGE_FRAME=Object.freeze({x:50,y:50,zoom:1})

export function normalizeImageFrame(frame){
  const safe=frame&&typeof frame==='object'?frame:{}
  const x=numeric(safe.x,50),y=numeric(safe.y,50),zoom=numeric(safe.zoom,1)
  return {
    x:rounded(clamp(Number.isFinite(x)?x:50,0,100)),
    y:rounded(clamp(Number.isFinite(y)?y:50,0,100)),
    zoom:rounded(clamp(Number.isFinite(zoom)?zoom:1,1,2.5))
  }
}

export function imageFrameFromRow(row,kind='image'){
  const prefix=kind==='cover'?'cover':'image'
  return normalizeImageFrame({
    x:row?.[prefix+'_position_x'],
    y:row?.[prefix+'_position_y'],
    zoom:row?.[prefix+'_zoom']
  })
}

export function imageFramePayload(frame,kind='image'){
  const prefix=kind==='cover'?'cover':'image'
  const f=normalizeImageFrame(frame)
  return {[prefix+'_position_x']:f.x,[prefix+'_position_y']:f.y,[prefix+'_zoom']:f.zoom}
}

export function imageFrameStyle(frame){
  const f=normalizeImageFrame(frame)
  // object-position + transform-origin com o mesmo foco mantêm
  // as bordas cobertas ao aumentar o zoom, sem deformar pixels.
  return {
    objectFit:'cover',
    objectPosition:f.x+'% '+f.y+'%',
    transform:'scale('+f.zoom+')',
    transformOrigin:f.x+'% '+f.y+'%'
  }
}

// Converte movimento em pixels na posição de 0-100% do conteúdo excedente.
// Respeita foto retrato/paisagem e a proporção real do cartão.
export function dragImageFrame(frame,deltaX,deltaY,viewWidth,viewHeight,imageWidth,imageHeight){
  const f=normalizeImageFrame(frame)
  const w=Number(viewWidth),h=Number(viewHeight),iw=Number(imageWidth),ih=Number(imageHeight)
  if(![w,h,iw,ih].every(n=>Number.isFinite(n)&&n>0))return f
  const coverScale=Math.max(w/iw,h/ih)
  const extraW=Math.max(0,iw*coverScale*f.zoom-w)
  const extraH=Math.max(0,ih*coverScale*f.zoom-h)
  return normalizeImageFrame({
    x:extraW>0.1?f.x-Number(deltaX||0)*100/extraW:f.x,
    y:extraH>0.1?f.y-Number(deltaY||0)*100/extraH:f.y,
    zoom:f.zoom
  })
}
