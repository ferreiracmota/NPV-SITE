// Somente cadastros reais de alunos devem contar como pendências ou gerar push.
// O perfil do administrador pode permanecer approved=false sem precisar ser aprovado.
export async function isActionableRegistration(svc,id){
 const [profile,admin]=await Promise.all([
  svc.from('clube_profiles').select('approved').eq('id',id).maybeSingle(),
  svc.from('clube_admins').select('user_id').eq('user_id',id).maybeSingle()
 ])
 return !profile.error&&profile.data?.approved===false&&!admin.error&&!admin.data
}

export async function countActionableRegistrations(svc){
 // Exclui TODOS os administradores, sem depender de quem está logado.
 const {data:admins,error:adminError}=await svc.from('clube_admins').select('user_id').limit(1001)
 if(adminError||!Array.isArray(admins)||admins.length>1000)return null
 let query=svc.from('clube_profiles').select('id',{count:'exact',head:true}).eq('approved',false)
 if(admins.length){
  const ids=admins.map(row=>row.user_id)
  if(ids.some(id=>typeof id!=='string'||!/^[0-9a-f-]{36}$/i.test(id)))return null
  query=query.not('id','in',`(${ids.join(',')})`)
 }
 const {count,error}=await query
 return error?null:count
}
