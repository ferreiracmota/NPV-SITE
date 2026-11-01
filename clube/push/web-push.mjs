// RFC 8291 / RFC 8188 Web Push AES128GCM + RFC 8292 VAPID.
// Biblioteca padrão Node: nenhuma assinatura, fornecedor ou pacote adicional.
import {createCipheriv,createECDH,createPrivateKey,hkdfSync,randomBytes,sign} from 'node:crypto'

const b64=x=>Buffer.from(x).toString('base64url')
const from64=x=>Buffer.from(x,'base64url')
const hkdf=(secret,salt,info,size)=>Buffer.from(hkdfSync('sha256',secret,salt,info,size))
const pushHosts=new Set(['fcm.googleapis.com','updates.push.services.mozilla.com','push.apple.com'])
export function allowedPushEndpoint(value){
 try{
  const u=new URL(value)
  if(u.protocol!=='https:'||u.username||u.password||u.port)return false
  const host=u.hostname.toLowerCase()
  return pushHosts.has(host)||host.endsWith('.push.apple.com')||host.endsWith('.notify.windows.com')
 }catch{return false}
}
export function buildEncryptedPushBody(message,keys,{serverECDH=createECDH('prime256v1'),salt=randomBytes(16)}={}){
 const receiver=from64(keys.p256dh),auth=from64(keys.auth)
 if(receiver.length!==65||receiver[0]!==4||auth.length!==16)throw Error('invalid_push_keys')
 try{serverECDH.getPublicKey()}catch{serverECDH.generateKeys()}
 const sender=serverECDH.getPublicKey(undefined,'uncompressed')
 const shared=serverECDH.computeSecret(receiver)
 const secret=hkdf(shared,auth,Buffer.concat([Buffer.from('WebPush: info\0'),receiver,sender]),32)
 const cek=hkdf(secret,salt,Buffer.from('Content-Encoding: aes128gcm\0'),16)
 const nonce=hkdf(secret,salt,Buffer.from('Content-Encoding: nonce\0'),12)
 const payload=Buffer.concat([Buffer.from(message,'utf8'),Buffer.from([2])])
 if(payload.length>3800)throw Error('push_payload_too_large')
 const cipher=createCipheriv('aes-128-gcm',cek,nonce)
 const ciphertext=Buffer.concat([cipher.update(payload),cipher.final(),cipher.getAuthTag()])
 const size=Buffer.alloc(4);size.writeUInt32BE(4096)
 return Buffer.concat([salt,size,Buffer.from([sender.length]),sender,ciphertext])
}
function authorization(endpoint,publicKey,privateKey){
 const publicBytes=from64(publicKey),privateBytes=from64(privateKey)
 if(publicBytes.length!==65||publicBytes[0]!==4||privateBytes.length!==32)throw Error('invalid_vapid_keys')
 const jwk={kty:'EC',crv:'P-256',
  x:b64(publicBytes.subarray(1,33)),y:b64(publicBytes.subarray(33,65)),d:b64(privateBytes)}
 const input=b64(JSON.stringify({typ:'JWT',alg:'ES256'}))+'.'+b64(JSON.stringify({
  aud:new URL(endpoint).origin,exp:Math.floor(Date.now()/1000)+12*3600,
  sub:'https://www.naopensevai.com'
 }))
 const signature=sign('sha256',Buffer.from(input),{
  key:createPrivateKey({key:jwk,format:'jwk'}),dsaEncoding:'ieee-p1363'
 })
 return 'vapid t='+input+'.'+b64(signature)+', k='+publicKey
}
export async function sendWebPush(subscription,body,{publicKey,privateKey,fetchFn=fetch}={}){
 if(!allowedPushEndpoint(subscription.endpoint))throw Error('invalid_push_endpoint')
 const payload=buildEncryptedPushBody(body,subscription.keys)
 const response=await fetchFn(subscription.endpoint,{method:'POST',headers:{
  Authorization:authorization(subscription.endpoint,publicKey,privateKey),
  'Content-Encoding':'aes128gcm',
  'Content-Type':'application/octet-stream',
  'TTL':'3600',
  'Urgency':'normal'
 },body:payload,signal:AbortSignal.timeout(10000)})
 if(!response.ok){const error=new Error('push_provider_rejected');error.statusCode=response.status;throw error}
 return true
}
