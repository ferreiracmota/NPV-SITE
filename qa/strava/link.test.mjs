import test from 'node:test'
import assert from 'node:assert/strict'
import { seal, unseal, settings, cookie, COOKIE_STATE, COOKIE_LINK } from '../../api/strava/link-core.mjs'
import connect from '../../api/strava/connect.js'
import status from '../../api/strava/status.js'

const SECRET='long-fake-test-secret-a45e8f0d4782cf37'
const OWNER='aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa'
const STRANGER='bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb'
// Fixação em 2026-10-14 tornou o teste de Strava obsoleto após 7 dias.
// Usa uma atividade fictícia recente sem alterar qualquer lógica de produção.
const MOCK_ACTIVITY_DATE=new Date(Date.now()-2*86400000).toISOString().slice(0,10)
function setup(){
  const originals={}
  for(const key of ['STRAVA_CLIENT_ID','STRAVA_CLIENT_SECRET','STRAVA_PILOT_CALLBACK_URL','VITE_CLUBE_SUPABASE_URL','VITE_CLUBE_SUPABASE_PUBLISHABLE_KEY']) originals[key]=process.env[key]
  Object.assign(process.env,{
    STRAVA_CLIENT_ID:'999999',
    STRAVA_CLIENT_SECRET:SECRET,
    STRAVA_PILOT_CALLBACK_URL:'https://npv-preview.vercel.app/api/strava/pilot',
    VITE_CLUBE_SUPABASE_URL:'https://testproject.supabase.co',
    VITE_CLUBE_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_fake_test_key'
  })
  return ()=>Object.keys(originals).forEach(k=>{if(originals[k]===undefined)delete process.env[k];else process.env[k]=originals[k]})
}
const request=(method,path,opts={})=>({
 method,url:path,
 headers:{
   ...(method==='POST'?{origin:'https://npv-preview.vercel.app'}:{}),
   authorization:'Bearer fake-but-valid-for-mock-jwt',
   ...(opts.headers||{})
 }
})
const response=()=>({
 code:null,headers:{},body:'',
 setHeader(k,v){this.headers[k]=v},
 writeHead(status,headers={}){this.code=status;this.headers={...this.headers,...headers}},
 end(v=''){this.body=v},
 data(){return JSON.parse(this.body)}
})
const cookieOnly=full=>String(full).split(';')[0]
test('AES-GCM cookie is authenticated; rejects corruption, no plaintext token',()=>{
  const payload={user:OWNER,refresh:'really_private_refresh'}
  const value=seal(payload,SECRET)
  assert.deepEqual(unseal(value,SECRET),payload)
  assert.equal(value.includes('really_private_refresh'),false)
  assert.equal(unseal(value.slice(0,-4)+'abcd',SECRET),null)
  assert.equal(unseal(value,'wrong-secret-that-is-strong-enough'),null)
  assert.match(cookie(COOKIE_LINK,'x',30),/HttpOnly; Secure; SameSite=Lax/)
})

test('OAuth can link a Strava user to this NPV login and show real (mocked) km without storing activities',async()=>{
  const restore=setup()
  const originalFetch=globalThis.fetch
  let currentUser=OWNER, calls=[]
  globalThis.fetch=async(url,options={})=>{
    const u=String(url);calls.push(u)
    if(u.endsWith('/auth/v1/user'))return {ok:true,json:async()=>({id:currentUser})}
    if(u.endsWith('/oauth/token'))return {ok:true,json:async()=>({
      access_token:'fake-access',refresh_token:'fake-refresh',
      expires_at:Math.floor(Date.now()/1000)+21600,
      athlete:{id:12345}
    })}
    if(u.includes('/api/v3/athlete/activities'))return {ok:true,json:async()=>[
      {id:12345,start_date_local:MOCK_ACTIVITY_DATE+'T08:00:00',sport_type:'Run',distance:7090,map:{polyline:'must-not-leak'}}
    ]}
    if(u.endsWith('/oauth/revoke'))return {ok:true}
    throw Error('unexpected '+u)
  }
  try{
    const start=response()
    await connect(request('POST','/api/strava/connect'),start)
    assert.equal(start.code,200)
    const authorize=new URL(start.data().authorize_url)
    assert.equal(authorize.hostname,'www.strava.com')
    assert.equal(authorize.searchParams.get('redirect_uri'),'https://npv-preview.vercel.app/api/strava/connect')
    const state=authorize.searchParams.get('state')
    const oauthCookie=cookieOnly(start.headers['Set-Cookie'])
    assert.ok(oauthCookie.startsWith(COOKIE_STATE+'='))
    const callback=response()
    await connect(request('GET','/api/strava/connect?state='+state+'&code=fake-authorization-code&scope=activity%3Aread',{
      headers:{cookie:oauthCookie}
    }),callback)
    assert.equal(callback.code,303)
    assert.equal(callback.headers.Location,'/clube?strava=connected')
    const cookies=callback.headers['Set-Cookie']
    assert.ok(Array.isArray(cookies))
    const linkCookie=cookieOnly(cookies.find(x=>x.startsWith(COOKIE_LINK+'=')))
    assert.ok(linkCookie)
    const own=response()
    await status(request('GET','/api/strava/status',{headers:{cookie:linkCookie}}),own)
    assert.equal(own.code,200)
    assert.deepEqual(own.data().activities,[{date:MOCK_ACTIVITY_DATE,sport:'Run',km:7.09}])
    assert.equal(own.data().connected,true)
    assert.equal(own.body.includes('fake-access'),false)
    assert.equal(own.body.includes('polyline'),false)
    assert.equal(calls.some(x=>x.includes('supabase.co/rest/v1')),false)

    // Outra conta NPV no mesmo navegador não pode ver nem controlar o atleta anterior.
    currentUser=STRANGER
    const stranger=response()
    await status(request('GET','/api/strava/status',{headers:{cookie:linkCookie}}),stranger)
    assert.equal(stranger.code,200)
    assert.equal(stranger.data().connected,false)
    currentUser=OWNER

    const disconnect=response()
    await status(request('POST','/api/strava/status',{headers:{cookie:linkCookie}}),disconnect)
    assert.equal(disconnect.code,200)
    assert.equal(disconnect.data().connected,false)
    assert.equal(disconnect.data().revoked,true)
    assert.ok(disconnect.headers['Set-Cookie'].includes('Max-Age=0'))
  }finally{globalThis.fetch=originalFetch;restore()}
})

test('OAuth callback without a valid state cookie cannot accept a forged code',async()=>{
  const restore=setup()
  try{
    const res=response()
    await connect(request('GET','/api/strava/connect?state=attacker&code=steal&scope=activity%3Aread'),res)
    assert.equal(res.code,303)
    assert.equal(res.headers.Location,'/clube?strava=expired')
  }finally{restore()}
})

test('Anonymous caller cannot start link to Strava',async()=>{
  const restore=setup(),originalFetch=globalThis.fetch
  globalThis.fetch=async()=>({ok:false})
  try{
    const res=response()
    await connect({method:'POST',url:'/api/strava/connect',headers:{origin:'https://npv-preview.vercel.app'}},res)
    assert.equal(res.code,401)
  }finally{globalThis.fetch=originalFetch;restore()}
})
