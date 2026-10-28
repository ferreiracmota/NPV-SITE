import test from 'node:test'
import assert from 'node:assert/strict'
import {hasMessageSubscription,findInstagramSubscription} from '../../server/instagram/diagnostics.mjs'

test('Meta app webhook subscriptions recognize Instagram messages and exact callback',()=>{
  const data={data:[
    {object:'page',fields:[{name:'messages'}],callback_url:'https://other.example/page'},
    {object:'instagram',fields:[{name:'messages',version:'v26.0'}],
      callback_url:'https://www.naopensevai.com/api/instagram/webhook'}
  ]}
  assert.deepEqual(findInstagramSubscription(data),{registered:true,messages:true,callback:true})
  assert.equal(hasMessageSubscription(data,'instagram'),true)
})

test('Other objects and incorrect callbacks never count as configured',()=>{
  assert.deepEqual(findInstagramSubscription({data:[{object:'page',fields:[{name:'messages'}]}]}),
    {registered:false,messages:false,callback:null})
  assert.deepEqual(findInstagramSubscription({data:[
    {object:'instagram',fields:[],callback_url:'https://wrong.example/webhook'}
  ]}),{registered:true,messages:false,callback:false})
  assert.deepEqual(findInstagramSubscription({data:[
    {object:'instagram',fields:[{name:'messages'}]}
  ]}),{registered:true,messages:true,callback:null})
})

test('Instagram per-account subscription parses string fields and ignores unrelated fields',()=>{
  assert.equal(hasMessageSubscription({data:[{subscribed_fields:['messages','comments']}]}),true)
  assert.equal(hasMessageSubscription({data:[{subscribed_fields:['comments']}]}),false)
  assert.equal(hasMessageSubscription({data:[]}),false)
})
