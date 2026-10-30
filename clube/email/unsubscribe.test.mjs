import test from 'node:test'
import assert from 'node:assert/strict'
import {emailUnsubscribeToken,validEmailUnsubscribeToken,emailUnsubscribeUrl} from './unsubscribe.mjs'
const id='aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa'
const different='bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb'
const secret='local-fake-secret-long-and-not-real'
test('token de cancelamento autenticado e vinculado a cada aluna',()=>{
 const token=emailUnsubscribeToken(id,secret)
 assert.match(token,/^[0-9a-f]{64}$/)
 assert.equal(validEmailUnsubscribeToken(id,token,secret),true)
 assert.equal(validEmailUnsubscribeToken(different,token,secret),false)
 assert.equal(validEmailUnsubscribeToken(id,token,'local-fake-other-secret-long'),false)
 assert.equal(validEmailUnsubscribeToken(id,token.slice(0,-1)+'x',secret),false)
})
test('URL somente do dominio oficial e sem revelar segredo',()=>{
 const url=emailUnsubscribeUrl(id,secret)
 assert.equal(new URL(url).origin,'https://www.naopensevai.com')
 assert.equal(new URL(url).pathname,'/api/clube/email-unsubscribe')
 assert.equal(new URL(url).searchParams.get('student'),id)
 assert.ok(!url.includes(secret))
})
test('nao permite identificador invalido nem segredo fraco',()=>{
 assert.throws(()=>emailUnsubscribeToken('fake',secret))
 assert.throws(()=>emailUnsubscribeToken(id,'curto'))
})
