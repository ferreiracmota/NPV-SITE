import test from 'node:test'
import assert from 'node:assert/strict'
import {createECDH,createDecipheriv,hkdfSync,randomBytes,createPublicKey,verify} from 'node:crypto'
import {allowedPushEndpoint,buildEncryptedPushBody,sendWebPush} from '../../clube/push/web-push.mjs'
const hk=(ikm,salt,info,len)=>Buffer.from(hkdfSync('sha256',ikm,salt,info,len))
test('Criptografia Web Push RFC 8291 permite destinatário recuperar conteúdo',()=>{
 const client=createECDH('prime256v1');client.generateKeys()
 const auth=randomBytes(16),receiver=client.getPublicKey(),payload='Novo pedido NPV'
 const body=buildEncryptedPushBody(payload,{p256dh:receiver.toString('base64url'),auth:auth.toString('base64url')})
 const salt=body.subarray(0,16),rs=body.readUInt32BE(16),pubLen=body[20]
 assert.equal(rs,4096);assert.equal(pubLen,65)
 const serverPub=body.subarray(21,21+pubLen),cipher=body.subarray(21+pubLen)
 const shared=client.computeSecret(serverPub)
 const ikm=hk(shared,auth,Buffer.concat([Buffer.from('WebPush: info\0'),receiver,serverPub]),32)
 const cek=hk(ikm,salt,Buffer.from('Content-Encoding: aes128gcm\0'),16)
 const nonce=hk(ikm,salt,Buffer.from('Content-Encoding: nonce\0'),12)
 const decipher=createDecipheriv('aes-128-gcm',cek,nonce)
 decipher.setAuthTag(cipher.subarray(-16))
 const plain=Buffer.concat([decipher.update(cipher.subarray(0,-16)),decipher.final()])
 assert.equal(plain.at(-1),2)
 assert.equal(plain.subarray(0,-1).toString('utf8'),payload)
})
test('VAPID envia cabeçalhos válidos, endpoint seguro e assinatura ES256',async()=>{
 const vapid=createECDH('prime256v1');vapid.generateKeys()
 const client=createECDH('prime256v1');client.generateKeys()
 const publicKey=vapid.getPublicKey().toString('base64url'),privateKey=vapid.getPrivateKey().toString('base64url')
 let called=false
 const resp=await sendWebPush({endpoint:'https://web.push.apple.com/1/send/abc',keys:{
  p256dh:client.getPublicKey().toString('base64url'),auth:randomBytes(16).toString('base64url')
 }},'Teste NPV',{publicKey,privateKey,fetchFn:async(url,options)=>{
  called=true
  assert.equal(url,'https://web.push.apple.com/1/send/abc')
  assert.equal(options.headers['Content-Encoding'],'aes128gcm')
  const match=options.headers.Authorization.match(/^vapid t=([\w.-]+), k=([\w-]+)$/)
  assert.ok(match)
  assert.equal(match[2],publicKey)
  const [jwtHead,jwtClaims,jwtSignature]=match[1].split('.')
  const jwk={kty:'EC',crv:'P-256',x:vapid.getPublicKey().subarray(1,33).toString('base64url'),
    y:vapid.getPublicKey().subarray(33).toString('base64url')}
  const signatureOk=verify('sha256',Buffer.from(jwtHead+'.'+jwtClaims),{
   key:createPublicKey({key:jwk,format:'jwk'}),dsaEncoding:'ieee-p1363'
  },Buffer.from(jwtSignature,'base64url'))
  assert.equal(signatureOk,true)
  return {ok:true,status:201}
 }})
 assert.equal(resp,true);assert.equal(called,true)
})
test('Bloqueia endpoint arbitrário para impedir SSRF',()=>{
 for(const url of ['http://web.push.apple.com/x','https://localhost/x',
 'https://169.254.169.254/metadata','https://web.push.apple.com.evil.test/x',
 'https://web.push.apple.com:8443/x','ftp://web.push.apple.com/x'])
 assert.equal(allowedPushEndpoint(url),false,url)
 for(const url of ['https://web.push.apple.com/x','https://fcm.googleapis.com/fcm/send/abc',
 'https://updates.push.services.mozilla.com/wpush/v2/x'])
 assert.equal(allowedPushEndpoint(url),true,url)
})
