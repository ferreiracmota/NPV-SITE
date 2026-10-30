import test from 'node:test'
import assert from 'node:assert/strict'
import {readdirSync,readFileSync} from 'node:fs'
import path from 'node:path'
const root=new URL('../../',import.meta.url)
const apiDir=new URL('../../api/',import.meta.url)
const functionFiles=[]
for(const folder of ['clube','instagram','strava']){
  const dir=path.join(apiDir.pathname,folder)
  for(const file of readdirSync(dir))if(file.endsWith('.js'))functionFiles.push(folder+'/'+file)
}
const vercel=JSON.parse(readFileSync(new URL('../../vercel.json',import.meta.url),'utf8'))
test('no maximo 12 serverless functions no plano Hobby',()=>{
  assert.equal(functionFiles.length,12,'rotas: '+functionFiles.join(', '))
})
test('rotas publicas anteriores mantem URL via rewrites, sem novas funcoes',()=>{
  for(const [from,to] of [
    ['/api/clube/profile','/api/clube/student-connections?npv_profile_route=update'],
    ['/api/clube/email-unsubscribe','/api/clube/email-daily?npv_email_route=unsubscribe']
  ]){
    assert.ok(vercel.rewrites.some(r=>r.source===from&&r.destination===to),from)
  }
  assert.ok(!functionFiles.includes('clube/profile.js'))
  assert.ok(!functionFiles.includes('clube/email-unsubscribe.js'))
})
test('cron diario nao muda de rota nem de horario',()=>{
  const email=vercel.crons.find(x=>x.path==='/api/clube/email-daily')
  assert.equal(email?.schedule,'0 13 * * *')
})
