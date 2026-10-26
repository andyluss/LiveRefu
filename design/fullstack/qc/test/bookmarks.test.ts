import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { createApp } from '../src/app.ts'

const root = fileURLToPath(new URL('../../examples/bookmarks', import.meta.url))

test('bookmarks: 第二个 dogfood 可复用', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'qc-bookmarks-'))
  process.env.QC_DB_PATH = join(dir, 'test.db')
  process.env.QC_DEV = '0'
  const app = await createApp(root)
  try {
    const home = await app.handle(new Request('http://test/'))
    assert.equal(home.status, 200)
    assert.match(await home.text(), /Bookmarks/)

    const created = await app.handle(new Request('http://test/actions/bookmarks/create', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ title: '青橙设计', url: 'https://example.com/qc' }),
    }))
    assert.equal(created.status, 303)
    const row = app.db.one<{ title: string; url: string }>('select title, url from bookmarks')
    assert.equal(row?.title, '青橙设计')
    assert.equal(row?.url, 'https://example.com/qc')
  } finally {
    app.close()
    rmSync(dir, { recursive: true, force: true })
  }
})
