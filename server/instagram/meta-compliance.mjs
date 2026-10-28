// Meta: desautorização, solicitação de exclusão e status público.
// Mesmo com a integração de Stories desativada, o usuário consegue revogar
// o acesso e exigir exclusão dos dados derivados do Instagram.
import crypto from 'node:crypto'
import {adminDb,json} from '../../api/instagram/_common.mjs'
import {baseConfig} from './_oauth.mjs'

const SITE='https://www.naopensevai.com'
const regexId=/^\d{5,40}$/
const regexCode=/^[a-f0-9]{32}$/

export function parseMetaSignedRequest(value,secret){
  if(typeof secret!=='string'||!secret||typeof value!=='string'||value.length>8192)return null
  const match=/^([a-zA-Z0-9_-]{32,100})\.([a-zA-Z0-9_-]{16,6000})$/.exec(value)
  if(!match)return null
  try{
    const provided=Buffer.from(match[1],'base64url')
    const expected=crypto.createHmac('sha256',secret).update(match[2],'utf8').digest()
    if(provided.length!==expected.length||!crypto.timingSafeEqual(provided,expected))return null
    const obj=JSON.parse(Buffer.from(match[2],'base64url').toString('utf8'))
    if(String(obj.algorithm||'').toUpperCase()!=='HMAC-SHA256'
       ||!regexId.test(String(obj.user_id||'')))return null
    return String(obj.user_id)
  }catch{return null}
}

async function readSignedRequest(req){
  const body=req.body
  if(body&&typeof body==='object'&&!Buffer.isBuffer(body))
    return typeof body.signed_request==='string'?body.signed_request:null
  if(typeof body==='string')
    return new URLSearchParams(body).get('signed_request')
  if(Buffer.isBuffer(body))
    return new URLSearchParams(body.toString('utf8')).get('signed_request')
  let size=0,raw=''
  for await(const chunk of req){
    size+=chunk.length
    if(size>16384)throw new Error('payload_too_large')
    raw+=chunk.toString('utf8')
  }
  return new URLSearchParams(raw).get('signed_request')
}

async function eraseInstagramRecords(db,userId){
  // Apenas dados da integração Instagram; o histórico financeiro/de pontos
  // do Clube não é removido por um callback sem autenticação do próprio Clube.
  const {data:links,error:lookupError}=await db.from('clube_instagram_links')
    .select('student_id').eq('instagram_scoped_id',userId)
  if(lookupError)throw lookupError
  const students=[...new Set((links||[]).map(x=>x.student_id).filter(Boolean))]
  for(const studentId of students){
    for(const name of ['clube_instagram_demo_messages','clube_instagram_link_codes']){
      const {error}=await db.from(name).delete().eq('student_id',studentId)
      if(error)throw error
    }
  }
  for(const [name,key] of [
    ['clube_instagram_story_events','instagram_scoped_id'],
    ['clube_instagram_links','instagram_scoped_id'],
    ['clube_instagram_business_auth','instagram_user_id']
  ]){
    const {error}=await db.from(name).delete().eq(key,userId)
    if(error)throw error
  }
}

export async function metaCompliance(req,res,operation){
  const cfg=baseConfig()
  if(!cfg)return json(res,503,{error:'database_not_ready'})
  const db=adminDb(cfg)
  if(operation==='deletion-status'){
    if(req.method!=='GET')return json(res,405,{error:'method_not_allowed'})
    const code=new URL(req.url||'/',SITE).searchParams.get('code')||''
    if(!regexCode.test(code))return json(res,404,{error:'request_not_found'})
    const {data,error}=await db.from('clube_instagram_data_requests')
      .select('confirmation_code,status,created_at,completed_at')
      .eq('confirmation_code',code).maybeSingle()
    if(error)return json(res,503,{error:'status_unavailable'})
    if(!data)return json(res,404,{error:'request_not_found'})
    const answer={
      confirmation_code:data.confirmation_code,status:data.status,
      requested_at:data.created_at,completed_at:data.completed_at
    }
    if((req.headers.accept||'').includes('text/html')){
      res.writeHead(200,{
        'Content-Type':'text/html; charset=utf-8',
        'Cache-Control':'private, no-store',
        'X-Content-Type-Options':'nosniff'
      })
      return res.end('<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><main style="max-width:640px;margin:10vh auto;font:16px Arial,sans-serif;padding:24px"><h1>Não Pense, Vai! — Exclusão de dados do Instagram</h1><p>Protocolo: <strong>'+code+'</strong></p><p>Situação: <strong>'+data.status+'</strong></p><p>Este protocolo confirma exclusivamente o tratamento dos dados da integração Instagram. Para outros dados da plataforma, consulte nossos Termos de Uso.</p></main></body></html>')
    }
    return json(res,200,answer)
  }
  if(!['deauthorize','data-deletion'].includes(operation))return json(res,404,{error:'route_not_found'})
  if(req.method!=='POST'){
    res.setHeader('Allow','POST')
    return json(res,405,{error:'method_not_allowed'})
  }
  const secret=process.env.INSTAGRAM_OAUTH_CLIENT_SECRET
  if(!secret)return json(res,503,{error:'instagram_secret_not_configured'})
  let signed
  try{signed=await readSignedRequest(req)}catch{return json(res,413,{error:'payload_invalid'})}
  const userId=parseMetaSignedRequest(signed,secret)
  if(!userId)return json(res,400,{error:'invalid_signed_request'})
  if(operation==='deauthorize'){
    try{
      await eraseInstagramRecords(db,userId)
      return json(res,200,{status:'disconnected'})
    }catch{return json(res,503,{error:'revocation_not_completed'})}
  }
  const code=crypto.randomBytes(16).toString('hex')
  const subjectDigest=crypto.createHmac('sha256',secret).update(userId).digest('hex')
  const {error:createdError}=await db.from('clube_instagram_data_requests').insert({
    confirmation_code:code,subject_digest:subjectDigest,status:'processing'
  })
  if(createdError)return json(res,503,{error:'deletion_unavailable'})
  try{
    await eraseInstagramRecords(db,userId)
    const {error}=await db.from('clube_instagram_data_requests').update({
      status:'completed',completed_at:new Date().toISOString()
    }).eq('confirmation_code',code)
    if(error)throw error
  }catch{
    await db.from('clube_instagram_data_requests').update({status:'failed'}).eq('confirmation_code',code)
    return json(res,503,{error:'deletion_not_completed'})
  }
  return json(res,200,{
    url:SITE+'/api/instagram/data-deletion/status?code='+code,
    confirmation_code:code
  })
}
