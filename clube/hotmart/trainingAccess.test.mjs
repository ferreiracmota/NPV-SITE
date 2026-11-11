import test from 'node:test'
import assert from 'node:assert/strict'
import {NPV_HOTMART_TRAINING_URL} from './trainingAccess.mjs'

test('botao Treinos encaminha para a area de membros oficial NPV',()=>{
  const destination=new URL(NPV_HOTMART_TRAINING_URL)
  assert.equal(destination.protocol,'https:')
  assert.equal(destination.hostname,'hotmart.com')
  assert.equal(destination.pathname,'/en/club/naopensevai')
  assert.equal(destination.search,'')
  assert.equal(destination.hash,'')
})

test('acesso direto nao exige token, email, checkout ou credencial no link',()=>{
  assert.doesNotMatch(NPV_HOTMART_TRAINING_URL,/(?:token|password|email|checkout|session|affiliate|access_token|sso)/i)
})
