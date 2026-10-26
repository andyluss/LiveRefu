import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { createApp } from '../src/app.ts'

const root = fileURLToPath(new URL('../../examples/guestbook', import.meta.url))

test('guestbook: 第三个 dogfood', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'qc-guestbook-'))
  process.env.QC_DB_PATH = join(dir, 'test.db')
  process.env.QC_DEV = '0'
  const app = await createApp(root)
  try {
    const home = await app.handle(new Request('http://test/'))
    assert.equal(home.status, 200)
    assert.match(await home.text(), /Guestbook/)
    const created = await app.handle(new Request('http://test/actions/messages/create', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ name: '青橙', body: '你好' }),
    }))
    assert.equal(created.status, 303)
    assert.equal(app.db.one<{ name: string }>('select name from messages')?.name, '青橙')
  } finally {
    app.close()
    rmSync(dir, { recursive: true, force: true })
  }
})
