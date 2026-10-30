// Assinatura privada para cancelamento, sem expor credenciais ou exigir login.
import {createHmac,timingSafeEqual} from 'node:crypto'
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const HEX=/^[0-9a-f]{64}$/i
const scopedSecret=secret=>{
  if(typeof secret!=='string'||secret.length<16)throw new Error('missing email secret')
  return createHmac('sha256',secret).update('NPV-clube-email-unsubscribe-v1').digest()
}
export function emailUnsubscribeToken(studentId,secret){
  if(!UUID.test(studentId||''))throw new TypeError('invalid student')
  return createHmac('sha256',scopedSecret(secret)).update(studentId.toLowerCase()).digest('hex')
}
export function validEmailUnsubscribeToken(studentId,token,secret){
  if(!UUID.test(studentId||'')||!HEX.test(token||''))return false
  try{
    const expected=Buffer.from(emailUnsubscribeToken(studentId,secret),'hex')
    return timingSafeEqual(expected,Buffer.from(token,'hex'))
  }catch{return false}
}
export function emailUnsubscribeUrl(studentId,secret){
  const u=new URL('https://www.naopensevai.com/api/clube/email-unsubscribe')
  u.searchParams.set('student',studentId)
  u.searchParams.set('token',emailUnsubscribeToken(studentId,secret))
  return u.toString()
}
