import test from 'node:test'
import assert from 'node:assert/strict'
import { planClubeEmail } from './plan.mjs'
const t0='2026-10-29T13:00:00.000Z'
const t1='2026-10-29T14:00:00.000Z'
const t2='2026-10-29T15:00:00.000Z'
const t3='2026-10-29T16:00:00.000Z'
const student='student-1',prize='reward-1'
const base=()=>({
  liveAfter:t0,now:new Date(t3).getTime(),
  profiles:[{id:student,full_name:'Aluna Teste',email:'aluna@example.com',approved:true}],
  preferences:[{student_id:student,reward_ready:true,new_reward:true,opted_in_at:t1}],
  rewards:[{id:prize,name:'Camiseta NPV',active:true,stock:2,points:1000,test_only:false,created_at:t0}],
  events:[{student_id:student,points:800,created_at:t0,is_test:false},{student_id:student,points:400,created_at:t2,is_test:false}],
  redemptions:[],deliveries:[],admins:[]
})
test('novo saldo destrava recompensa, sem disparo retroativo',()=>{
  const args=base(),items=planClubeEmail(args)
  assert.equal(items.length,1)
  assert.equal(items[0].kind,'reward_ready')
  args.deliveries=[{student_id:student,reward_id:prize,kind:'reward_ready',status:'sent'}]
  assert.equal(planClubeEmail(args).length,0)
})
test('ignora prêmios sem estoque, inativos, demonstrativos e teste',()=>{
  for(const change of [{stock:0},{active:false},{test_only:true},{points:0}]) {
    const args=base();Object.assign(args.rewards[0],change)
    assert.equal(planClubeEmail(args).length,0)
  }
})
test('não dispara sem consentimento ou para conta não aprovada e administrador',()=>{
  const args=base()
  args.preferences=[];assert.equal(planClubeEmail(args).length,0)
  args.preferences=base().preferences;args.profiles[0].approved=false
  assert.equal(planClubeEmail(args).length,0)
  args.profiles[0].approved=true;args.admins=[{user_id:student}]
  assert.equal(planClubeEmail(args).length,0)
})
test('não divulga prêmios antigos como novidades após o opt-in',()=>{
  const args=base();args.preferences[0].reward_ready=false
  assert.equal(planClubeEmail(args).length,0)
  args.rewards[0].created_at=t2
  const items=planClubeEmail(args);assert.equal(items.length,1)
  assert.equal(items[0].kind,'new_reward')
})
test('não considera lançamentos e resgates de teste e respeita reservas',()=>{
  const args=base()
  args.events[1].is_test=true
  assert.equal(planClubeEmail(args).length,0)
  args.events[1].is_test=false
  args.redemptions=[{student_id:student,points:300,status:'pending',is_test:false}]
  assert.equal(planClubeEmail(args).length,0)
})
test('não dispara ao aceitar alertas depois de já ter pontos suficientes',()=>{
  const args=base();args.events=[{student_id:student,points:1500,created_at:t0,is_test:false}]
  assert.equal(planClubeEmail(args).length,0)
})
