import test from 'node:test'
import assert from 'node:assert/strict'
import {isActionableRegistration,countActionableRegistrations} from '../../clube/push/pending-registrations.mjs'

const ADMIN='8ca4adab-ba37-4c54-a11e-d1cb218d3375'
const STUDENT='cccccccc-cccc-4ccc-8ccc-cccccccccccc'
const ADMIN2='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
function fakeDb(profiles=[],admins=[],failAdmins=false){
 return {from(table){
  if(table==='clube_admins')return {select:()=>({
   limit:async()=>({data:admins.map(user_id=>({user_id})),error:failAdmins?{message:'unavailable'}:null}),
   eq:(_field,id)=>({maybeSingle:async()=>({data:admins.includes(id)?{user_id:id}:null,error:failAdmins?{message:'unavailable'}:null})})
  })}
  if(table==='clube_profiles')return {select:(_fields,options={})=>{
   if(options.head){
    let excluded=[]
    const q={
     eq:()=>q,
     not:(field,op,expression)=>{
      assert.equal(field,'id')
      assert.equal(op,'in')
      excluded=expression.slice(1,-1).split(',')
      return q
     },
     then:(resolve,reject)=>Promise.resolve({
      count:profiles.filter(p=>!p.approved&&!excluded.includes(p.id)).length,error:null
     }).then(resolve,reject)
    }
    return q
   }
   return {eq:(_field,id)=>({maybeSingle:async()=>({data:profiles.find(p=>p.id===id)||null,error:null})})}
  }}
  throw Error('unexpected_table_'+table)
 }}
}
test('administrador não vira aluno pendente nem recebe aviso falso',async()=>{
 const db=fakeDb([{id:ADMIN,approved:false}],[ADMIN])
 assert.equal(await countActionableRegistrations(db),0)
 assert.equal(await isActionableRegistration(db,ADMIN),false)
})
test('alunos reais pendentes permanecem contados e notificáveis',async()=>{
 const db=fakeDb([{id:ADMIN,approved:false},{id:STUDENT,approved:false},{id:ADMIN2,approved:false}],[ADMIN,ADMIN2])
 assert.equal(await countActionableRegistrations(db),1)
 assert.equal(await isActionableRegistration(db,STUDENT),true)
 assert.equal(await isActionableRegistration(db,ADMIN2),false)
})
test('cadastros aprovados e ausentes não geram alertas',async()=>{
 const db=fakeDb([{id:STUDENT,approved:true}],[])
 assert.equal(await countActionableRegistrations(db),0)
 assert.equal(await isActionableRegistration(db,STUDENT),false)
 assert.equal(await isActionableRegistration(db,ADMIN),false)
})
test('falha ao consultar administradores nunca infla o sininho',async()=>{
 const db=fakeDb([{id:ADMIN,approved:false}],[ADMIN],true)
 assert.equal(await countActionableRegistrations(db),null)
 assert.equal(await isActionableRegistration(db,ADMIN),false)
})
