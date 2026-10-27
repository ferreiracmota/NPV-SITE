// Vinculação verificável por DM oficial. Nunca pede senha do Instagram nem aceita @ como prova.
import {json,settings,adminDb,authorizedMember,checkOrigin,hashCode,makeCode} from './_common.mjs'

export default async function handler(req,res){
  if(!['GET','POST','DELETE'].includes(req.method)){
    res.setHeader('Allow','GET, POST, DELETE')
    return json(res,405,{status:'method_not_allowed'})
  }
  const cfg=settings()
  if(!cfg)return json(res,200,{
    available:false,connected:false,
    status:'meta_configuration_required',
    message:'Integração real com Meta ainda não autorizada/configurada.'
  })
  if(req.method!=='GET'&&!checkOrigin(req))return json(res,403,{status:'invalid_origin'})
  let member
  try{member=await authorizedMember(req,cfg)}
  catch{return json(res,503,{status:'club_auth_unavailable'})}
  if(!member)return json(res,401,{status:'club_login_required',message:'Entre no Clube com sua conta aprovada.'})
  const {db,id}=member
  try{
    if(req.method==='GET'){
      const [linkResult,codeResult,historyResult]=await Promise.all([
        db.from('clube_instagram_links').select('verified_at').eq('student_id',id).maybeSingle(),
        db.from('clube_instagram_link_codes').select('expires_at').eq('student_id',id).maybeSingle(),
        db.from('clube_instagram_story_events').select('created_at,points,status')
          .eq('student_id',id).eq('status','credited')
          .gte('created_at',new Date(Date.UTC(new Date().getFullYear(),new Date().getMonth(),1)).toISOString())
      ])
      if(linkResult.error||codeResult.error||historyResult.error)
        return json(res,503,{status:'instagram_database_setup_required'})
      return json(res,200,{
        available:true,connected:Boolean(linkResult.data),
        verified_at:linkResult.data?.verified_at||null,
        pending_until:codeResult.data?.expires_at||null,
        credited_stories:(historyResult.data||[]).length,
        credited_points:(historyResult.data||[]).reduce((s,x)=>s+x.points,0),
        note:'Somente dados confirmados pelo servidor são exibidos.'
      })
    }
    if(req.method==='DELETE'){
      const [a,b]=await Promise.all([
        db.from('clube_instagram_link_codes').delete().eq('student_id',id),
        db.from('clube_instagram_links').delete().eq('student_id',id)
      ])
      if(a.error||b.error)return json(res,503,{status:'unlink_failed'})
      return json(res,200,{connected:false,status:'disconnected'})
    }
    const {data:existing,error:readError}=await db.from('clube_instagram_link_codes')
      .select('created_at').eq('student_id',id).maybeSingle()
    if(readError)return json(res,503,{status:'instagram_database_setup_required'})
    if(existing?.created_at&&Date.now()-Date.parse(existing.created_at)<60000)
      return json(res,429,{status:'too_soon',message:'Aguarde um minuto antes de gerar outro código.'})
    const code=makeCode()
    const {error}=await db.from('clube_instagram_link_codes').upsert({
      student_id:id,code_hash:hashCode(code),
      created_at:new Date().toISOString(),expires_at:new Date(Date.now()+10*60000).toISOString()
    },{onConflict:'student_id'})
    if(error)return json(res,503,{status:'code_unavailable'})
    return json(res,200,{status:'pending',code,expires_in_seconds:600,
      instagram_dm_url:'https://ig.me/m/naopensevai',
      message:'Envie este código por mensagem direta para @naopensevai. Não envie sua senha.'})
  }catch{return json(res,503,{status:'integration_unavailable'})}
}
