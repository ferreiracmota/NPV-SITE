import test from 'node:test'
import assert from 'node:assert/strict'
import {instagramAdminStatus,stravaAdminStatus} from './connectionStatus.mjs'
const now=Date.parse('2026-10-29T15:00:00Z')
test('Instagram: vinculo verificado e token global validado = ativo',()=>{
 assert.equal(instagramAdminStatus({verified_at:'2026-10-28T12:00:00Z'},
  {expires_at:'2026-12-27T00:00:00Z'},{configured:true,now}).status,'active')
})
test('Instagram: vinculo sem integracao atual nao e marcado ativo',()=>{
 assert.equal(instagramAdminStatus({verified_at:'2026-10-28T12:00:00Z'},
  {expires_at:'2026-10-28T00:00:00Z'},{configured:true,now}).status,'linked')
 assert.equal(instagramAdminStatus(null,null,{configured:true,now}).status,'disconnected')
})
test('Strava: sem registro historico = desconhecido, jamais desconectado',()=>{
 assert.equal(stravaAdminStatus(null,{now}).status,'unknown')
})
test('Strava: verificado recentemente ativo, antigo apenas vinculado',()=>{
 assert.equal(stravaAdminStatus({connected:true,verified_at:'2026-10-28T12:00:00Z'},{now}).status,'active')
 assert.equal(stravaAdminStatus({connected:true,verified_at:'2026-09-01T12:00:00Z'},{now}).status,'linked')
 assert.equal(stravaAdminStatus({connected:false,verified_at:'2026-10-28T12:00:00Z'},{now}).status,'disconnected')
})
