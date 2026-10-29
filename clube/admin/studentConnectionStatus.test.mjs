import test from 'node:test'
import assert from 'node:assert/strict'
import {instagramAdminStatus,stravaAdminStatus} from './studentConnectionStatus.mjs'
const now=Date.parse('2026-10-29T18:00:00Z')
test('Instagram exibe só vínculo confirmado',()=>{
 assert.equal(instagramAdminStatus(null).label,'Não vinculado')
 assert.equal(instagramAdminStatus({verified_at:'2026-10-29T17:00:00Z'}).label,'Vinculado')
 assert.equal(instagramAdminStatus(null,false).key,'unknown')
})
test('Strava sem espelho não é marcado como desconectado',()=>{
 assert.equal(stravaAdminStatus(null).key,'unknown')
 assert.equal(stravaAdminStatus({connected:false,verified_at:null,updated_at:'2026-10-29T17:00:00Z'},true,now).key,'disconnected')
})
test('Strava só conectado se verificado recentemente',()=>{
 assert.equal(stravaAdminStatus({connected:true,verified_at:'2026-10-29T17:00:00Z'},true,now).key,'connected')
 assert.equal(stravaAdminStatus({connected:true,verified_at:'2026-09-20T17:00:00Z'},true,now).key,'stale')
 assert.equal(stravaAdminStatus({connected:true,verified_at:null,updated_at:'bad-date'},true,now).key,'unknown')
})
