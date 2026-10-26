import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { createApp } from '../src/app.ts'
import { html, raw } from '../src/html.ts'

const notesRoot = fileURLToPath(new URL('../../examples/notes', import.meta.url))

function setCookies(response: Response): string[] {
  const headers = response.headers as Headers & { getSetCookie?: () => string[] }
  return headers.getSetCookie?.() ?? [response.headers.get('set-cookie') ?? '']
}

function sessionCookie(response: Response): string {
  const cookie = setCookies(response).filter(Boolean).at(-1) ?? ''
  return cookie.split(';')[0]
}

function csrfFrom(htmlText: string): string {
  const match = htmlText.match(/name="_csrf" value="([^"]+)"/)
  assert.ok(match, '缺少 CSRF hidden input')
  return match[1]
}

function post(path: string, cookie: string, data: Record<string, string>): Request {
  return new Request(`http://test${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      cookie,
    },
    body: new URLSearchParams(data),
  })
}

test('html 默认转义，raw 才允许原样输出', () => {
  const out = String(html`<p>${'<script>alert(1)</script>'}</p>`)
  assert.match(out, /&lt;script&gt;/)
  assert.equal(String(html`<p>${raw('<b>ok</b>')}</p>`), '<p><b>ok</b></p>')
})

test('notes: 注册 / 登录态 / CSRF / 个人笔记 / 删除 / 退出', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'qc-notes-'))
  process.env.QC_DB_PATH = join(dir, 'test.db')
  process.env.QC_DEV = '0'

  const app = await createApp(notesRoot)
  try {
    const health = await app.handle(new Request('http://test/health'))
    assert.equal(health.status, 200)
    assert.deepEqual(await health.json(), { ok: true, uptime: Math.round(process.uptime()), db: 'ok' })

    const anonHome = await app.handle(new Request('http://test/'))
    assert.equal(anonHome.status, 303)
    assert.match(anonHome.headers.get('location') ?? '', /^\/login\?next=/)

    const registerPage = await app.handle(new Request('http://test/register'))
    assert.equal(registerPage.status, 200)
    const registerHtml = await registerPage.text()
    const registerCookie = sessionCookie(registerPage)
    const registerCsrf = csrfFrom(registerHtml)
    assert.ok(registerCookie.startsWith('qc_session='))

    const invalid = await app.handle(post('/actions/auth/register', registerCookie, {
      _csrf: registerCsrf,
      email: 'bad@example.com',
      password: 'short',
    }))
    assert.equal(invalid.status, 422)
    const invalidHtml = await invalid.text()
    assert.match(invalidHtml, /至少 8 个字符/)
    assert.match(invalidHtml, /value="bad@example.com"/)

    const registered = await app.handle(post('/actions/auth/register', registerCookie, {
      _csrf: registerCsrf,
      email: 'a@example.com',
      password: 'correct-horse',
    }))
    assert.equal(registered.status, 303)
    const authCookie = sessionCookie(registered)
    assert.ok(authCookie.startsWith('qc_session='))
    assert.notEqual(authCookie, registerCookie)

    const home = await app.handle(new Request('http://test/', { headers: { cookie: authCookie } }))
    assert.equal(home.status, 200)
    const homeHtml = await home.text()
    assert.match(homeHtml, /a@example.com/)
    const csrf = csrfFrom(homeHtml)

    const missingCsrf = await app.handle(post('/actions/notes/create', authCookie, {
      title: '没有 CSRF',
      body: '应该被拒绝',
    }))
    assert.equal(missingCsrf.status, 403)

    const created = await app.handle(post('/actions/notes/create', authCookie, {
      _csrf: csrf,
      title: '第一则',
      body: '内容',
    }))
    assert.equal(created.status, 303)

    const row = app.db.one<{ id: number; title: string; user_id: number }>('select id, title, user_id from notes where title = ?', ['第一则'])
    assert.ok(row)
    assert.equal(row.user_id, 1)

    const detail = await app.handle(new Request(`http://test/notes/${row.id}`, { headers: { cookie: authCookie } }))
    assert.equal(detail.status, 200)
    assert.match(await detail.text(), /第一则/)

    const deleted = await app.handle(post('/actions/notes/delete', authCookie, {
      _csrf: csrf,
      id: String(row.id),
    }))
    assert.equal(deleted.status, 303)
    assert.equal(app.db.one('select id from notes where id = ?', [row.id]), null)

    const missing = await app.handle(new Request(`http://test/notes/${row.id}`, { headers: { cookie: authCookie } }))
    assert.equal(missing.status, 404)

    const loggedOut = await app.handle(post('/actions/auth/logout', authCookie, { _csrf: csrf }))
    assert.equal(loggedOut.status, 303)
    const afterLogout = await app.handle(new Request('http://test/', { headers: { cookie: authCookie } }))
    assert.equal(afterLogout.status, 303)

    const loginPage = await app.handle(new Request('http://test/login'))
    const loginCookie = sessionCookie(loginPage)
    const loginCsrf = csrfFrom(await loginPage.text())
    const loggedIn = await app.handle(post('/actions/auth/login', loginCookie, {
      _csrf: loginCsrf,
      email: 'a@example.com',
      password: 'correct-horse',
    }))
    assert.equal(loggedIn.status, 303)
    const reloginCookie = sessionCookie(loggedIn)
    const reloginHome = await app.handle(new Request('http://test/', { headers: { cookie: reloginCookie } }))
    assert.equal(reloginHome.status, 200)
  } finally {
    app.close()
    rmSync(dir, { recursive: true, force: true })
  }
})
