// Texto único do aviso: moderação manual, não decide nem credita o Story.
export const HIDDEN_MENTION_NOTICE={
  title:'Marcação não visível',
  message:'Adoramos seu Story! 💚 Só um detalhe: o @naopensevai ficou escondido. Para ganhar os pontos, publique novamente com a marcação visível.'
}
export const canSendHiddenMentionNotice=story=>
  story?.status==='review'
  &&typeof story?.student_id==='string'
  &&/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(story.student_id)
