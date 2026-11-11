// Mensagem educativa unica para o aviso de Story com marcacao escondida.
// Nao equivale a rejeicao, nem altera pontos ou o status do Story.
export const HIDDEN_MENTION_NOTICE=Object.freeze({
  type:'hidden_mention',
  title:'Marcação não visível',
  message:'Adoramos que você marcou a @naopensevai! 💚 Para ganhar os pontos, precisamos que a marcação apareça no Story. Publique novamente deixando o @ visível, combinado?',
  action:'Entendi',
  adminAction:'Avisar: marcação oculta'
})

export const isNoticePending=notice=>
  notice?.notice_type===HIDDEN_MENTION_NOTICE.type
  &&!notice?.acknowledged_at
