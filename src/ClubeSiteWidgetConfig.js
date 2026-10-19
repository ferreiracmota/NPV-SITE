// Dados exclusivamente demonstrativos: nunca consultar perfis/placares reais.
// Falha fechada: em um eventual deploy no dominio oficial, nao ler jamais o rascunho de testes.
// O escopo production so sera liberado depois de homologacao e migracao especifica.
export const WIDGET_SCOPE=typeof window!=='undefined'
  && /^(www\.)?naopensevai\.com$/i.test(window.location.hostname)
  ? 'production' : 'preview'
export const WIDGET_BUCKET='clube-npv-recompensas'
export const DEFAULT_WIDGET={
 enabled:true,
 ranking:[
  {id:'exemplo-a',name:'Aluno exemplo A',points:1260,avatar_path:''},
  {id:'exemplo-b',name:'Aluno exemplo B',points:980,avatar_path:''},
  {id:'exemplo-c',name:'Aluno exemplo C',points:740,avatar_path:''}
 ],
 reward_ids:[],partner_ids:[],logo_path:'',
 visual:{glass_color:'#111111',opacity:40,blur:5,border_color:'#a0a0a0',border_opacity:35,text_color:'#fcfcfc'},
 rewards:[],partners:[]
}
export function normalizeWidget(source){
 const x=source&&typeof source==='object'?source:{}
 const v=x.visual&&typeof x.visual==='object'?x.visual:{}
 const color=(value,fallback)=>/^#[0-9a-f]{6}$/i.test(value||'')?value:fallback
 const bound=(v,min,max,fallback)=>Number.isFinite(Number(v))?Math.min(max,Math.max(min,Number(v))):fallback
 const names=Array.isArray(x.ranking)?x.ranking:DEFAULT_WIDGET.ranking
 return {
  ...DEFAULT_WIDGET,
  enabled:typeof x.enabled==='boolean'?x.enabled:true,
  ranking:names.slice(0,3).map((row,i)=>({
   id:String(row?.id||'exemplo-'+i).slice(0,80),
   name:String(row?.name||'Aluno exemplo '+(i+1)).slice(0,55),
   points:Math.round(bound(row?.points,0,10000000,0)),
   avatar_path:String(row?.avatar_path||'').slice(0,400)
  })),
  reward_ids:Array.isArray(x.reward_ids)?x.reward_ids.filter(id=>typeof id==='string').slice(0,4):[],
  partner_ids:Array.isArray(x.partner_ids)?x.partner_ids.filter(id=>typeof id==='string').slice(0,5):[],
  logo_path:String(x.logo_path||'').slice(0,400),
  rewards:Array.isArray(x.rewards)?x.rewards.slice(0,4):[],
  partners:Array.isArray(x.partners)?x.partners.slice(0,5):[],
  visual:{
   glass_color:color(v.glass_color,DEFAULT_WIDGET.visual.glass_color),
   opacity:bound(v.opacity,15,90,40),
   blur:bound(v.blur,0,25,5),
   border_color:color(v.border_color,DEFAULT_WIDGET.visual.border_color),
   border_opacity:bound(v.border_opacity,0,100,35),
   text_color:color(v.text_color,DEFAULT_WIDGET.visual.text_color)
  }
 }
}
export const toRgb=(hex)=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)).join(',')
export function widgetGlassStyle(visual){
 const v=visual||DEFAULT_WIDGET.visual, baseline=DEFAULT_WIDGET.visual
 if(Object.keys(baseline).every(k=>v[k]===baseline[k]))return undefined
 return {
  background:`rgba(${toRgb(v.glass_color)},${v.opacity/100})`,
  backdropFilter:`blur(${v.blur}px)`,
  WebkitBackdropFilter:`blur(${v.blur}px)`,
  borderColor:`rgba(${toRgb(v.border_color)},${v.border_opacity/100})`,
  '--npv-widget-text':v.text_color
 }
}
export function widgetPublicImage(supabase,path){
 if(!supabase||typeof path!=='string'||!(/^(site-widget-preview\/[a-zA-Z0-9/_-]+|images\/[a-f0-9-]{36})\.(png|jpe?g|webp)$/.test(path)))return ''
 return supabase.storage.from(WIDGET_BUCKET).getPublicUrl(path).data.publicUrl
}
