import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { createAuth, type AuthConfig } from '../src/auth.ts'
import { createMailer } from '../src/mail.ts'
import { openDatabase } from '../src/data.ts'

test('OAuth/OIDC: state + token + userinfo + session', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'qc-oauth-'))
  const db = openDatabase(join(dir, 'test.db'))
  const config: AuthConfig = {
    roles: ['user'],
    passwordMin: 8,
    sessionDays: 30,
    secureCookie: false,
    oauth: {
      test: {
        authorizationUrl: 'https://idp.example/authorize',
        tokenUrl: 'https://idp.example/token',
        userInfoUrl: 'https://idp.example/me',
        clientId: 'client',
        clientSecret: 'secret',
        scope: 'openid email',
      },
    },
  }
  const calls: string[] = []
  const fetchImpl = (async (input: string | URL | Request) => {
    const url = String(input)
    calls.push(url)
    if (url.includes('/token')) {
      return new Response(JSON.stringify({ access_token: 'access-token' }), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    if (url.includes('/me')) {
      return new Response(JSON.stringify({ email: 'oidc@example.com', email_verified: true }), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    throw new Error(`unexpected fetch: ${url}`)
  }) as typeof fetch
  const auth = createAuth(db, config, createMailer({ transport: 'memory', from: 'test@example.com' }, dir), { fetch: fetchImpl })
  try {
    const started = auth.oauthStart('test', 'http://app.test/auth/callback')
    assert.equal(started.hostname, 'idp.example')
    const state = started.searchParams.get('state')
    assert.ok(state)
    const result = await auth.oauthCallback('test', 'code', state, 'http://app.test/auth/callback')
    assert.equal(result.user.email, 'oidc@example.com')
    assert.equal(result.user.emailVerified, true)
    assert.ok(result.cookie.startsWith('qc_session='))
    assert.deepEqual(calls.sort(), ['https://idp.example/me', 'https://idp.example/token'])
  } finally {
    db.close()
    rmSync(dir, { recursive: true, force: true })
  }
})
