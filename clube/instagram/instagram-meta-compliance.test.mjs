import test from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import {parseMetaSignedRequest} from '../../server/instagram/meta-compliance.mjs'

const secret='placeholder-meta-instagram-secret'
const make=(obj,key=secret)=>{
  const payload=Buffer.from(JSON.stringify(obj)).toString('base64url')
  const sig=crypto.createHmac('sha256',key).update(payload).digest('base64url')
  return sig+'.'+payload
}
test('Meta signed_request verifies signature and scoped user identifier',()=>{
  const signed=make({algorithm:'HMAC-SHA256',user_id:'17841461793945231'})
  assert.equal(parseMetaSignedRequest(signed,secret),'17841461793945231')
  assert.equal(parseMetaSignedRequest(signed,'not-the-secret'),null)
  assert.equal(parseMetaSignedRequest(signed.slice(1),secret),null)
  assert.equal(parseMetaSignedRequest(make({algorithm:'HMAC-SHA1',user_id:'17841461793945231'}),secret),null)
  assert.equal(parseMetaSignedRequest(make({algorithm:'HMAC-SHA256',user_id:'../../../secrets'}),secret),null)
  assert.equal(parseMetaSignedRequest('',secret),null)
})
