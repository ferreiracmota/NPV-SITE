// O Clube utiliza apenas dia/mês para o presente anual; não armazena ano de nascimento.
export const BIRTHDAY_MONTHS=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
export const BIRTHDAY_DAYS=Array.from({length:31},(_,i)=>String(i+1).padStart(2,'0'))
const pad=n=>String(n).padStart(2,'0')
export function birthdayFromParts(day,month){
 const d=Number(day),m=Number(month)
 if(!Number.isInteger(d)||!Number.isInteger(m)||d<1||m<1||m>12)return ''
 const max=[31,29,31,30,31,30,31,31,30,31,30,31][m-1]
 if(d>max)return ''
 return pad(d)+'-'+pad(m)
}
export function birthdayParts(value){
 if(typeof value!=='string'||!/^([0-9]{2})-([0-9]{2})$/.test(value))return {day:'',month:''}
 const [day,month]=value.split('-')
 return birthdayFromParts(day,month)===value?{day,month}:{day:'',month:''}
}
export function validBirthday(value){
 const {day,month}=birthdayParts(value)
 return Boolean(day&&month)
}
export function validOptionalPhone(value){
 if(typeof value!=='string'||value.length>24)return false
 if(!value.trim())return true
 return /^[+()0-9\s-]+$/.test(value)&&value.replace(/\D/g,'').length>=10&&value.replace(/\D/g,'').length<=15
}
