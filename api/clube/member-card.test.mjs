import test from 'node:test'
import assert from 'node:assert/strict'
import {handleMemberCard} from './member-card.js'
const makeResponse=()=>({code:0,headers:{},body:null,writeHead(code,headers){this.code=code;this.headers=headers;return this},end(body){this.body=JSON.parse(body);return this}})
const mockClient=({id='u1',email='maria@example.com',approved=true,profileEmail=email}={})=>({
 auth:{getUser:async()=>({data:{user:{id,email}},error:null})},
 from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:{id,email:profileEmail,approved},error:null})})})})
})
test('nega sem token e não acessa Hotmart',async()=>{
 const res=makeResponse()
 await handleMemberCard({method:'GET',headers:{}},res)
 assert.equal(res.code,401)
})
test('bloqueia exibição se email do clube difere do email autenticado',async()=>{
 const res=makeResponse()
 await handleMemberCard({method:'GET',headers:{authorization:'Bearer '+('a'.repeat(20))}},res,{
  env:{SUPABASE_URL:'https://example.supabase.co',SUPABASE_PUBLISHABLE_KEY:'pub'},
  createClientFn:()=>mockClient({profileEmail:'outro@example.com'}),
  loadSnapshot:()=>{throw Error('must-not-query')}
 })
 assert.equal(res.code,403)
})
test('com acesso válido retorna somente status e próxima cobrança da própria aluna',async()=>{
 const res=makeResponse()
 await handleMemberCard({method:'GET',headers:{authorization:'Bearer '+('a'.repeat(20))}},res,{
  env:{SUPABASE_URL:'https://example.supabase.co',SUPABASE_PUBLISHABLE_KEY:'pub'},
  createClientFn:()=>mockClient(),
  loadSnapshot:async()=>({complete:true,synced_at:'2026-10-30T15:00:00Z',
   subscriptions:[{subscriber_email:'outra@example.com',status:'ACTIVE',next_charge_at:'2027-05-01'},{subscriber_email:'maria@example.com',status:'ACTIVE',next_charge_at:'2026-11-30'}]})
 })
 assert.equal(res.code,200)
 assert.deepEqual(Object.keys(res.body).sort(),['checked_at','next_charge_at','status'])
 assert.equal(res.body.next_charge_at,'2026-11-30')
 assert.equal(res.headers['Cache-Control'].includes('no-store'),true)
})
test('Hotmart indisponível não inventa vencimento',async()=>{
 const res=makeResponse()
 await handleMemberCard({method:'GET',headers:{authorization:'Bearer '+('a'.repeat(20))}},res,{
  env:{SUPABASE_URL:'https://example.supabase.co',SUPABASE_PUBLISHABLE_KEY:'pub'},
  createClientFn:()=>mockClient(),loadSnapshot:async()=>{throw Error('api_unavailable')}
 })
 assert.equal(res.code,200);assert.equal(res.body.status,'unavailable');assert.equal(res.body.next_charge_at,null)
})
