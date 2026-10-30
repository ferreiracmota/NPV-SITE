import test from 'node:test'
import assert from 'node:assert/strict'
import {runBirthdayDay} from './birthdayRunner.mjs'
const when=new Date('2026-10-30T13:00:00.000Z')
const user={id:'0f6ae9dd-2222-4444-8888-b3ec443af9a1',full_name:'Maria',email:'maria@example.com',approved:true,birthday_mmdd:'30-10',birthday_exstudent_opt_in:true}
function fakeDb({profile=user,free=false,preference={},rpcAnswer='credited'}={}){
 const data={
  clube_profiles:profile?[profile]:[],
  clube_admins:[],
  clube_birthday_free_access:free?[{student_id:user.id,enabled:true}]:[],
  clube_email_preferences:preference?.student_id?[preference]:[]
 }
 let calls=0
 return {get calls(){return calls},
  from(table){return {select(){return {order(){return {range(){return Promise.resolve({data:data[table]||[],error:null})}}}}}}},
  auth:{admin:{async getUserById(id){assert.equal(id,user.id);return {data:{user:{id,email:user.email,email_confirmed_at:'2026-01-01T12:00:00Z'}},error:null}}}},
  async rpc(name,args){assert.equal(name,'clube_credit_birthday_once');assert.equal(args.p_student_id,user.id);calls++;return {data:rpcAnswer,error:null}}
 }
}
const subscriptions=s=>({complete:true,subscriptions:s})
const active={subscriber_email:user.email,status:'ACTIVE'}
const cancelled={subscriber_email:user.email,status:'CANCELLED_BY_CUSTOMER'}
test('nenhum aniversário hoje: não consulta Hotmart nem concede pontos',async()=>{
 const db=fakeDb({profile:{...user,birthday_mmdd:'01-01'}})
 let n=0
 const v=await runBirthdayDay(db,{}, {now:when,loadSnapshot:async()=>{n++;return subscriptions([active])}})
 assert.equal(v.status,'no_birthdays');assert.equal(n,0);assert.equal(db.calls,0)
})
test('assinatura ativa: credita uma vez pela RPC e oferece e-mail ativo',async()=>{
 const db=fakeDb()
 const v=await runBirthdayDay(db,{}, {now:when,loadSnapshot:async()=>subscriptions([active])})
 assert.equal(v.credited,1);assert.deepEqual(v.activeIds,[user.id]);assert.deepEqual(v.inactive,[])
 assert.equal(db.calls,1)
})
test('crédito anual já registrado não se repete, mas mantém aniversário elegível',async()=>{
 const db=fakeDb({rpcAnswer:'already_awarded'})
 const v=await runBirthdayDay(db,{}, {now:when,loadSnapshot:async()=>subscriptions([active])})
 assert.equal(v.credited,0);assert.deepEqual(v.activeIds,[user.id])
})
test('ex-aluna com consentimento só recebe parabéns sem crédito',async()=>{
 const db=fakeDb()
 const v=await runBirthdayDay(db,{}, {now:when,loadSnapshot:async()=>subscriptions([cancelled])})
 assert.equal(v.credited,0);assert.deepEqual(v.activeIds,[]);assert.deepEqual(v.inactive,[user.id]);assert.equal(db.calls,0)
})
test('Hotmart indisponível: não envia ex-alunas; acesso gratuito autorizado continua elegível',async()=>{
 const loadSnapshot=async()=>{throw Error('hotmart_offline')}
 const db=fakeDb()
 const a=await runBirthdayDay(db,{}, {now:when,loadSnapshot})
 assert.equal(a.credited,0);assert.equal(a.inactive.length,0)
 const freeDb=fakeDb({free:true})
 const b=await runBirthdayDay(freeDb,{}, {now:when,loadSnapshot})
 assert.equal(b.credited,1);assert.deepEqual(b.activeIds,[user.id]);assert.equal(b.status,'free_only_hotmart_unavailable')
})
