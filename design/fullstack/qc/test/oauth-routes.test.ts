import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { createApp } from '../src/app.ts'
import { createMailer } from '../src/mail.ts'
import type { AuthConfig } from '../src/auth.ts'

const notesRoot = fileURLToPath(new URL('../../examples/notes', import.meta.url))

test('OAuth 通用路由：开始与回调', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'qc-oauth-routes-'))
  process.env.QC_DB_PATH = join(dir, 'test.db')
  process.env.QC_DEV = '0'
  const config: AuthConfig = {
    roles: ['user'],
    passwordMin: 8,
    sessionDays: 30,
    secureCookie: false,
    mail: { transport: 'memory', from: 'test@example.com' },
    oauth: {
      test: {
        authorizationUrl: 'https://idp.example/authorize',
        tokenUrl: 'https://idp.example/token',
        userInfoUrl: 'https://idp.example/me',
        clientId: 'client',
        clientSecret: 'secret',
      },
    },
  }
  const fetchImpl = (async (input: string | URL | Request) => {
    const url = String(input)
    if (url.includes('/token')) return new Response(JSON.stringify({ access_token: 'token' }), { status: 200 })
    if (url.includes('/me')) return new Response(JSON.stringify({ email: 'route@example.com', email_verified: true }), { status: 200 })
    throw new Error(`unexpected fetch ${url}`)
  }) as typeof fetch
  const app = await createApp(notesRoot, {
    authConfig: config,
    mailer: createMailer({ transport: 'memory', from: 'test@example.com' }, dir),
    fetch: fetchImpl,
  })
  try {
    const start = await app.handle(new Request('http://test/api/auth/oauth/test'))
    assert.equal(start.status, 303)
    const location = start.headers.get('location')!
    const state = new URL(location).searchParams.get('state')
    assert.ok(state)

    const callback = await app.handle(new Request(`http://test/api/auth/oauth/test/callback?code=abc&state=${encodeURIComponent(state)}`))
    assert.equal(callback.status, 303)
    assert.ok(callback.headers.get('set-cookie')?.includes('qc_session='))
    assert.equal(app.db.one<{ email: string }>('select email from qc_users where email = ?', ['route@example.com'])?.email, 'route@example.com')
  } finally {
    app.close()
    rmSync(dir, { recursive: true, force: true })
  }
})
