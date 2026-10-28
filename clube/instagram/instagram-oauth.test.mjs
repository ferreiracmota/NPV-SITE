import test from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import {oauthConfig,createOAuthState,checkOAuthState,encryptToken,decryptToken} from '../../api/instagram/_oauth.mjs'

const base={
  INSTAGRAM_APP_ID:'1670483874468146',
  VITE_CLUBE_SUPABASE_URL:'https://example.supabase.co',
  VITE_CLUBE_SUPABASE_PUBLISHABLE_KEY:'local-public-key',
  SUPABASE_SERVICE_ROLE_KEY:'local-server-placeholder',
  INSTAGRAM_OAUTH_CLIENT_ID:'1234567890987654',
  INSTAGRAM_OAUTH_CLIENT_SECRET:'local-oauth-placeholder',
  INSTAGRAM_OAUTH_STATE_SECRET:'x'.repeat(64),
  INSTAGRAM_TOKEN_ENCRYPTION_KEY:Buffer.alloc(32,17).toString('base64'),
  INSTAGRAM_OAUTH_REDIRECT_URI:'https://www.naopensevai.com/api/instagram/oauth-callback'
}

test('Only expected app and configured redirect are accepted',()=>{
  assert.equal(oauthConfig({...base,INSTAGRAM_APP_ID:'4205484039583967'}),null)
  assert.equal(oauthConfig({...base,INSTAGRAM_OAUTH_REDIRECT_URI:'https://example.com/other'}),null)
  assert.ok(oauthConfig(base))
})

test('OAuth state requires signed nonce and recent timestamp',()=>{
  const now=Date.now(),nonce='b'.repeat(48),id='00000000-0000-4000-8000-000000000001'
  const state=createOAuthState(id,nonce,now,base.INSTAGRAM_OAUTH_STATE_SECRET)
  assert.equal(checkOAuthState(state,nonce,base.INSTAGRAM_OAUTH_STATE_SECRET,now+1000)?.adminId,id)
  assert.equal(checkOAuthState(state,'c'.repeat(48),base.INSTAGRAM_OAUTH_STATE_SECRET,now+1000),null)
  assert.equal(checkOAuthState(state,nonce,base.INSTAGRAM_OAUTH_STATE_SECRET,now+601000),null)
})

test('Encrypted backend data is only readable using matching key',()=>{
  const cfg=oauthConfig(base)
  const value='placeholder-value'
  const encrypted=encryptToken(value,cfg)
  assert.ok(!encrypted.includes(value))
  assert.equal(decryptToken(encrypted,cfg),value)
  assert.throws(()=>decryptToken(encrypted, {...cfg,key:crypto.randomBytes(32)}))
})
