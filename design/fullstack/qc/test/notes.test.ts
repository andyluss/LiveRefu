import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { createApp } from '../src/app.ts'
import { html, raw } from '../src/html.ts'

const notesRoot = fileURLToPath(new URL('../../examples/notes', import.meta.url))

test('html 默认转义，raw 才允许原样输出', () => {
  const out = String(html`<p>${'<script>alert(1)</script>'}</p>`)
  assert.match(out, /&lt;script&gt;/)
  assert.equal(String(html`<p>${raw('<b>ok</b>')}</p>`), '<p><b>ok</b></p>')
})

test('notes: 页面 / 创建 / 详情 / 删除', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'qc-notes-'))
  process.env.QC_DB_PATH = join(dir, 'test.db')
  process.env.QC_DEV = '0'

  const app = await createApp(notesRoot)
  try {
    const home = await app.handle(new Request('http://test/'))
    assert.equal(home.status, 200)
    assert.match(await home.text(), /Notes/)

    const created = await app.handle(new Request('http://test/actions/notes/create', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ title: '第一则', body: '内容' }),
    }))
    assert.equal(created.status, 303)
    assert.equal(created.headers.get('location'), '/')

    const row = app.db.one<{ id: number; title: string }>('select id, title from notes where title = ?', ['第一则'])
    assert.ok(row)
    assert.equal(row.title, '第一则')

    const detail = await app.handle(new Request(`http://test/notes/${row.id}`))
    assert.equal(detail.status, 200)
    assert.match(await detail.text(), /第一则/)

    const deleted = await app.handle(new Request('http://test/actions/notes/delete', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ id: String(row.id) }),
    }))
    assert.equal(deleted.status, 303)
    assert.equal(app.db.one('select id from notes where id = ?', [row.id]), null)

    const missing = await app.handle(new Request(`http://test/notes/${row.id}`))
    assert.equal(missing.status, 404)
  } finally {
    app.close()
    rmSync(dir, { recursive: true, force: true })
  }
})
