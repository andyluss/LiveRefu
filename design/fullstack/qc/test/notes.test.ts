import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { createApp } from '../src/app.ts'
import { html, raw } from '../src/html.ts'
import { createMailer } from '../src/mail.ts'
import { fromStandard } from '../src/validate.ts'
import { saveUpload } from '../src/upload.ts'
import { formValues } from '../src/form.ts'

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

test('StandardSchema 适配与上传限制', async () => {
  const schema = fromStandard<string>({
    '~standard': {
      version: 1,
      vendor: 'test',
      validate(value) {
        return value === 'ok' ? { value } : { issues: [{ message: 'bad', path: ['field'] }] }
      },
    },
  })
  assert.equal(schema.parse('ok'), 'ok')
  assert.throws(() => schema.parse('no'))

  const asyncSchema = fromStandard<string>({
    '~standard': {
      version: 1,
      vendor: 'test',
      async validate(value) {
        return value === 'ok' ? { value } : { issues: [{ message: 'bad' }] }
      },
    },
  })
  assert.equal(await asyncSchema.parse('ok'), 'ok')

  const form = new FormData()
  form.set('email', 'a@example.com')
  assert.deepEqual(formValues(form, ['email', 'missing']), { email: 'a@example.com', missing: '' })

  const dir = mkdtempSync(join(tmpdir(), 'qc-upload-'))
  const file = new File(['hello'], 'a.txt', { type: 'text/plain' })
  const saved = await saveUpload(file, { dir, maxBytes: 100, types: ['text/plain'] })
  assert.equal(saved.size, 5)
  assert.ok(saved.path.startsWith(dir))
  await assert.rejects(() => saveUpload(new File(['x'], 'a.exe', { type: 'application/x-msdownload' }), { dir, types: ['text/plain'] }))
  await assert.rejects(() => saveUpload(new File(['bad'], 'bad.txt', { type: 'text/plain' }), { dir, scan: async () => { throw new Error('virus') } }))
  rmSync(dir, { recursive: true, force: true })
})

test('API mail transport 发送 JSON', async () => {
  const original = globalThis.fetch
  let captured: any = null
  globalThis.fetch = (async (url: string, init: any) => {
    captured = { url, init, body: JSON.parse(init.body) }
    return new Response('{}', { status: 200 })
  }) as typeof fetch
  try {
    const mailer = createMailer({ transport: 'api', from: 'a@example.com', endpoint: 'https://mail.example/send', token: 't' }, process.cwd())
    await mailer.send({ to: 'b@example.com', subject: 'hi', text: 'body' })
    assert.equal(captured.url, 'https://mail.example/send')
    assert.equal(captured.body.to, 'b@example.com')
    assert.equal(captured.init.headers.authorization, 'Bearer t')
  } finally {
    globalThis.fetch = original
  }
})

test('html 默认转义，raw 才允许原样输出', () => {
  const out = String(html`<p>${'<script>alert(1)</script>'}</p>`)
  assert.match(out, /&lt;script&gt;/)
  assert.equal(String(html`<p>${raw('<b>ok</b>')}</p>`), '<p><b>ok</b></p>')
})

test('notes: 注册 / 登录态 / CSRF / 个人笔记 / 删除 / 退出', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'qc-notes-'))
  process.env.QC_DB_PATH = join(dir, 'test.db')
  process.env.QC_DEV = '0'

  const mailer = createMailer({ transport: 'memory', from: 'test@example.com' }, notesRoot)
  const app = await createApp(notesRoot, { mailer })
  try {
    const health = await app.handle(new Request('http://test/health'))
    assert.equal(health.status, 200)
    assert.ok(health.headers.get('x-request-id'))
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

    const verifyMail = app.mailer!.messages!.find(message => message.subject.includes('验证'))
    assert.ok(verifyMail, '注册后应发送验证邮件')
    const verifyTokenMatch = verifyMail.text.match(/token=([^\s]+)/)
    assert.ok(verifyTokenMatch)
    const verify = await app.handle(new Request(`http://test/verify?token=${verifyTokenMatch[1]}`))
    assert.equal(verify.status, 200)
    assert.equal(app.db.one<{ email_verified: number }>('select email_verified from qc_users where email = ?', ['a@example.com'])?.email_verified, 1)

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

    const forgotPage = await app.handle(new Request('http://test/forgot', { headers: { cookie: reloginCookie } }))
    const forgotCsrf = csrfFrom(await forgotPage.text())
    const forgot = await app.handle(post('/actions/auth/forgot', reloginCookie, {
      _csrf: forgotCsrf,
      email: 'a@example.com',
    }))
    assert.equal(forgot.status, 303)
    assert.ok(app.mailer?.messages?.length, '应该发送重置邮件')
    const mail = app.mailer!.messages!.at(-1)!
    const tokenMatch = mail.text.match(/token=([^\s]+)/)
    assert.ok(tokenMatch, '邮件应包含 token')
    const resetToken = decodeURIComponent(tokenMatch[1])

    const resetPage = await app.handle(new Request(`http://test/reset?token=${encodeURIComponent(resetToken)}`, { headers: { cookie: reloginCookie } }))
    const resetCsrf = csrfFrom(await resetPage.text())
    const reset = await app.handle(post('/actions/auth/reset', reloginCookie, {
      _csrf: resetCsrf,
      token: resetToken,
      password: 'new-password',
    }))
    assert.equal(reset.status, 303)

    assert.throws(() => app.auth!.login('a@example.com', 'correct-horse'))
    const newLogin = app.auth!.login('a@example.com', 'new-password')
    assert.ok(newLogin.cookie.startsWith('qc_session='))
  } finally {
    app.close()
    rmSync(dir, { recursive: true, force: true })
  }
})
