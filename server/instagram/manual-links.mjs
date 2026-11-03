// Vínculo de Instagram declarado pelo administrador não equivale à conexão via API.
// Nunca inventa instagram_scoped_id nem concede pontos automaticamente.
export function instagramConnectionView(metaLink,manualLink){
  if(metaLink)return {
    connected:true,meta_connected:true,connection_mode:'meta',
    instagram_username:null,verified_at:metaLink.verified_at
  }
  if(manualLink)return {
    connected:true,meta_connected:false,connection_mode:'manual',
    instagram_username:manualLink.username,verified_at:manualLink.approved_at
  }
  return {connected:false,meta_connected:false,connection_mode:null,
    instagram_username:null,verified_at:null}
}

export function mergeAdminInstagramLinks(metaLinks=[],manualLinks=[]){
  const byStudent=new Map()
  for(const link of metaLinks)byStudent.set(link.student_id,{
    student_id:link.student_id,verified_at:link.verified_at,mode:'meta'
  })
  for(const link of manualLinks){
    if(!byStudent.has(link.student_id))byStudent.set(link.student_id,{
      student_id:link.student_id,verified_at:link.approved_at,
      mode:'manual',username:link.username
    })
  }
  return [...byStudent.values()]
}
