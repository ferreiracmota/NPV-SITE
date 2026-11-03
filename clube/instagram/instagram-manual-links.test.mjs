import test from 'node:test'
import assert from 'node:assert/strict'
import {instagramConnectionView,mergeAdminInstagramLinks} from '../../server/instagram/manual-links.mjs'

test('vínculo manual é identificado sem se passar pela API da Meta',()=>{
 const view=instagramConnectionView(null,{username:'m_gobboo',approved_at:'2026-11-03T19:00:00Z'})
 assert.equal(view.connected,true)
 assert.equal(view.meta_connected,false)
 assert.equal(view.connection_mode,'manual')
 assert.equal(view.instagram_username,'m_gobboo')
})

test('vínculo oficial substitui a apresentação manual, sem duplicidade',()=>{
 const verified={verified_at:'2026-11-03T20:00:00Z'}
 const view=instagramConnectionView(verified,{username:'albq.iasmin',approved_at:'2026-11-03T19:00:00Z'})
 assert.equal(view.connection_mode,'meta')
 assert.equal(view.meta_connected,true)
 assert.equal(view.instagram_username,null)
 const admin=mergeAdminInstagramLinks([{student_id:'a',verified_at:verified.verified_at}],
    [{student_id:'a',username:'albq.iasmin',approved_at:'2026-11-03T19:00:00Z'}])
 assert.equal(admin.length,1)
 assert.equal(admin[0].mode,'meta')
 assert.equal('instagram_scoped_id' in admin[0],false)
})

test('conexões manuais aparecem separadamente no administrativo',()=>{
 const admin=mergeAdminInstagramLinks([],[
  {student_id:'a',username:'albq.iasmin',approved_at:'2026-11-03T19:00:00Z'},
  {student_id:'b',username:'m_gobboo',approved_at:'2026-11-03T19:01:00Z'}
 ])
 assert.equal(admin.length,2)
 assert.equal(admin[0].mode,'manual')
 assert.equal(admin[1].username,'m_gobboo')
})

test('sem vínculos o estado permanece desconectado',()=>{
 const view=instagramConnectionView(null,null)
 assert.equal(view.connected,false)
 assert.equal(view.connection_mode,null)
})
