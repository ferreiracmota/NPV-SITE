// Modelos editáveis do Clube NPV. Apenas texto + variáveis conhecidas; nenhum HTML editável.
export const EMAIL_PRESETS={
 reward_unlocked:{name:'Recompensa desbloqueada',event:'Pontos suficientes para resgatar um prêmio'},
 new_reward:{name:'Prêmio novo na lojinha',event:'Novo prêmio disponível no catálogo'},
 challenge_completed:{name:'Desafio concluído',event:'Desafio mensal confirmado'},
 birthday:{name:'Aniversário',event:'Pontos de aniversário registrados'},
 birthday_inactive:{name:'Aniversário — Ex-aluna',event:'Mensagem anual com consentimento, sem pontos'},
 renewal:{name:'Renovação confirmada',event:'Pontos de renovação registrados'},
 referral:{name:'Indicação convertida',event:'Pontos de indicação registrada'}
}
export const SUPPORTED_NEW_EMAILS=Object.keys(EMAIL_PRESETS).filter(k=>!['reward_unlocked','new_reward'].includes(k))
export const TEMPLATE_FIELDS=['name','subject','headline','body','button_label','enabled']
export const defaultFor=key=>({
 key,name:EMAIL_PRESETS[key]?.name||'Aviso do Clube NPV',
 subject:{
  challenge_completed:'Seu desafio foi concluído no Clube NPV!',
  birthday:'Feliz aniversário! Seus pontos chegaram 💚',
  birthday_inactive:'Feliz aniversário, {{primeiro_nome}}! 💚',
  renewal:'Sua renovação vale pontos no Clube NPV',
  referral:'Sua indicação rendeu pontos!'
 }[key]||'Novidade no Clube NPV',
 headline:{
  challenge_completed:'Desafio concluído!',
  birthday:'Feliz aniversário!',
  birthday_inactive:'Um novo ciclo cheio de conquistas!',
  renewal:'Sua constância vale pontos!',
  referral:'Sua indicação fez a diferença!'
 }[key]||'Uma conquista para comemorar!',
 body:{
  challenge_completed:'Oi, {{primeiro_nome}}! 💚\n\nVocê concluiu um desafio do Clube e recebeu {{pontos_evento}} pontos. Continue em movimento!',
  birthday:'Oi, {{primeiro_nome}}! 💚\n\nFeliz aniversário! Seu Clube NPV registrou {{pontos_evento}} pontos para você.',
  birthday_inactive:'Oi, {{primeiro_nome}}! 💚\n\nPassando para desejar um aniversário especial e um novo ciclo cheio de saúde, movimento e conquistas. Foi muito bom ter você com a gente e seguimos torcendo por você!\n\nCom carinho, equipe Não Pense, Vai! ✈️',
  renewal:'Oi, {{primeiro_nome}}! 💚\n\nSua renovação foi confirmada e você recebeu {{pontos_evento}} pontos. Obrigado por continuar com a gente!',
  referral:'Oi, {{primeiro_nome}}! 💚\n\nSua indicação foi convertida e você recebeu {{pontos_evento}} pontos. Obrigado por fazer o Clube crescer!'
 }[key]||'Oi, {{primeiro_nome}}! 💚\n\nVocê tem uma novidade no Clube NPV.',
 button_label:key==='birthday_inactive'?'Visitar nosso site':'Acessar meu Clube',enabled:false
})
const escapeHtml=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
export function validateTemplate(data){
 if(!data||typeof data!=='object'||!EMAIL_PRESETS[data.key])return 'Tipo de aviso inválido.'
 const limits={name:80,subject:180,headline:160,body:2000,button_label:60}
 for(const [field,max] of Object.entries(limits)){
  if(typeof data[field]!=='string'||data[field].trim().length< (field==='button_label'?2:3)||data[field].length>max)return 'Verifique o campo '+field+'.'
 }
 if(typeof data.enabled!=='boolean')return 'Status inválido.'
 const concat=[data.subject,data.headline,data.body,data.button_label].join(' ')
 const used=concat.match(/\{\{[^}]*\}\}/g)||[]
 if(used.some(v=>!['{{primeiro_nome}}','{{premio}}','{{pontos}}','{{saldo}}','{{pontos_evento}}'].includes(v)))return 'Variável desconhecida no modelo.'
 return ''
}
export function renderTemplateEmail(candidate,{template,unsubscribeUrl=''}={}){
 const vars={
  primeiro_nome:candidate.firstName||'Aluna',
  premio:candidate.reward?.name||'Prêmio NPV',
  pontos:Number(candidate.reward?.points||0).toLocaleString('pt-BR'),
  saldo:Number(candidate.available||0).toLocaleString('pt-BR'),
  pontos_evento:Number(candidate.eventPoints||0).toLocaleString('pt-BR')
 }
 const substitute=s=>String(s||'').replace(/\{\{(\w+)\}\}/g,(whole,key)=>Object.hasOwn(vars,key)?String(vars[key]):whole)
 const plain=s=>substitute(s).replace(/[\r\n]+/g,' ').trim()
 const bodyText=substitute(template.body)
 const safeBody=escapeHtml(bodyText).replace(/\r?\n/g,'<br>')
 const safeUnsubscribe=unsubscribeUrl&&/^https:\/\/www\.naopensevai\.com\/api\/clube\/email-unsubscribe\?/.test(unsubscribeUrl)?escapeHtml(unsubscribeUrl):''
 const optout=safeUnsubscribe?'<a href="'+safeUnsubscribe+'" style="color:#555">Cancelar avisos por e-mail</a>':''
 const subject=plain(template.subject)
 const button=escapeHtml(plain(template.button_label))
 const inactive=template.key==='birthday_inactive'
 const destination=inactive?'https://www.naopensevai.com/':'https://www.naopensevai.com/clube'
 const footerNote=inactive?'Uma mensagem de carinho da Não Pense, Vai!':'Prêmios sujeitos à disponibilidade e confirmação do pedido. Este é um aviso sobre os benefícios do Clube NPV.'
 const headline=escapeHtml(plain(template.headline))
 const html='<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#f4f4f1;font-family:Arial,Helvetica,sans-serif;color:#111"><main style="max-width:560px;margin:32px auto;padding:32px;background:#fff;border-radius:16px"><p style="font-size:12px;letter-spacing:1px;font-weight:700">NÃO PENSE, VAI! ✦ CLUBE DE BENEFÍCIOS</p><h1 style="font-size:28px;line-height:1.2">'+headline+'</h1><p style="line-height:1.7">'+safeBody+'</p><a href="'+destination+'" style="display:inline-block;background:#131313;color:#fff;text-decoration:none;padding:14px 20px;border-radius:8px;font-weight:bold">'+button+'</a><p style="font-size:12px;color:#666;line-height:1.6;margin-top:28px">'+footerNote+' '+optout+'</p></main></body></html>'
 const text=bodyText+'\n\n'+plain(template.button_label)+': '+destination+(safeUnsubscribe?'\nCancelar avisos: '+unsubscribeUrl:'')
 return {subject,html,text}
}
