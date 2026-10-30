import test from 'node:test'
import assert from 'node:assert/strict'
import {birthdayFromParts,birthdayParts,validBirthday,validOptionalPhone} from './birthday.mjs'

test('dia e mês válidos e sem ano de nascimento',()=>{
 assert.equal(birthdayFromParts('15','03'),'15-03')
 assert.deepEqual(birthdayParts('15-03'),{day:'15',month:'03'})
 assert.equal(validBirthday('29-02'),true)
 assert.equal(validBirthday('31-04'),false)
 assert.equal(validBirthday('31-02'),false)
 assert.equal(validBirthday('00-12'),false)
 assert.equal(validBirthday('22-13'),false)
 assert.equal(validBirthday('15/03'),false)
 assert.equal(validBirthday('2026-03-15'),false)
})
test('WhatsApp é opcional, mas precisa ser válido quando preenchido',()=>{
 assert.equal(validOptionalPhone(''),true)
 assert.equal(validOptionalPhone('(31) 99999-9999'),true)
 assert.equal(validOptionalPhone('31999999999'),true)
 assert.equal(validOptionalPhone('1234'),false)
 assert.equal(validOptionalPhone('<script>'),false)
})
