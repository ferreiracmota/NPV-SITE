import test from 'node:test'
import assert from 'node:assert/strict'
import {handleClubeProfileUpdate} from '../../clube/profile/profile-handler.mjs'
import {handleClubeEmailUnsubscribe} from '../../clube/email/unsubscribe-handler.mjs'
import studentConnections from '../../api/clube/student-connections.js'
import emailDaily from '../../api/clube/email-daily.js'

test('handlers consolidados oferecem exports nomeados para a Vercel',()=>{
  assert.equal(typeof handleClubeProfileUpdate,'function')
  assert.equal(typeof handleClubeEmailUnsubscribe,'function')
  assert.equal(typeof studentConnections,'function')
  assert.equal(typeof emailDaily,'function')
})
