/* SOMENTE preview: respostas fictícias para componentes reais da área do aluno.
   Não utiliza token real, não grava nada e bloqueia métodos mutáveis das APIs. */
import {currentNpvMonth} from '../clube/strava/challengeProgress.mjs'
const monthKey=currentNpvMonth()
const realFetch=window.fetch.bind(window)
window.fetch=(input,init={})=>{
 const href=typeof input==='string'?input:input instanceof URL?input.href:input?.url||''
 const path=href.startsWith('http')?new URL(href).pathname:href.split('?')[0]
 if(!path.startsWith('/api/'))return realFetch(input,init)
 const method=(init.method||'GET').toUpperCase()
 let response={}
 if(path==='/api/strava/status'&&method==='GET'){
   response={connected:true,disabled:false,connectionRecorded:true,
     monthly:{monthKey,km:28.6},
     activities:[
       {id:'r1',name:'Corrida matinal',sport_type:'Run',type:'Run',km:10.2,date:new Date().toISOString().slice(0,10)},
       {id:'r2',name:'Caminhada',sport_type:'Walk',type:'Walk',km:6.4,date:new Date().toISOString().slice(0,10)},
       {id:'r3',name:'Corrida',sport_type:'Run',type:'Run',km:12,date:new Date().toISOString().slice(0,10)}
     ],
     credit:{status:'ok',credited_now:0,challenge_credited_now:0}}
 }else if(path==='/api/instagram/link'&&method==='GET'){
   response={connected:false,available:true,status:'disconnected'}
 }else if(path==='/api/instagram/link'&&method!=='GET'){
   response={connected:false,available:true,status:'disconnected',message:'Apenas demonstração'}
 }else{
   response={success:false,available:false,message:'Recurso não executado na demonstração'}
 }
 return Promise.resolve(new Response(JSON.stringify(response),{
   status:200,headers:{'Content-Type':'application/json'}
 }))
}
document.addEventListener('DOMContentLoaded',()=>{
 const badge=document.createElement('div')
 badge.textContent='PREVIEW DE TESTE · DADOS FICTÍCIOS · NENHUMA ALTERAÇÃO REAL'
 badge.setAttribute('role','status')
 Object.assign(badge.style,{
  position:'fixed',zIndex:'99999',bottom:'9px',right:'9px',
  borderRadius:'8px',background:'#203a28',border:'1px solid #b4d66d',
  color:'#f8ffef',font:'700 10px Inter,system-ui,sans-serif',
  letterSpacing:'.03em',padding:'9px 11px',boxShadow:'0 5px 22px #0003',
  maxWidth:'min(390px,calc(100vw - 20px))',textAlign:'center',
  pointerEvents:'none'
 })
 document.body.appendChild(badge)
})
