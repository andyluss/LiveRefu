// SPDX-License-Identifier: UNLICENSED
import test from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { config as sleep } from '../apps/sleep/config.ts'
import { config as meal } from '../apps/meal/config.ts'
import { config as move } from '../apps/move/config.ts'
import { config as read } from '../apps/read/config.ts'
import { config as home } from '../apps/home/config.ts'
import { createLifeApp } from '../packages/core/server.ts'

const configs = [sleep, meal, move, read, home]

test('five apps have unique ids/ports and valid contracts', () => {
  assert.equal(new Set(configs.map(c => c.id)).size, 5)
  assert.equal(new Set(configs.map(c => c.port)).size, 5)
  for (const c of configs) {
    assert.ok(c.fields.some(f => f.key === 'date'))
    assert.ok(c.columns.every(col => c.fields.some(f => f.key === col)))
    const summary = c.summary([])
    assert.equal(summary.chart.values.length, 14)
  }
})

test('shared core validates, creates, patches and deletes entries', async () => {
  const tmp = mkdtempSync(join(tmpdir(), 'life-api-'))
  const app = createLifeApp(sleep, { dataFile: join(tmp, 'store.json') })
  const server = createServer(app.handler)
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', () => resolve()))
  const port = (server.address() as { port: number }).port
  const base = `http://127.0.0.1:${port}`
  try {
    const state = await (await fetch(`${base}/api/state`)).json() as any
    assert.equal(state.config.id, 'sleep')
    assert.ok(state.entries.length > 0)
    const created = await (await fetch(`${base}/api/entries`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ date: '2026-10-29', data: { sleepAt: '23:00', wakeAt: '07:00', quality: 4 } }) })).json() as any
    const entry = created.entries.find((e: any) => e.date === '2026-10-29' && e.data.quality === 4)
    assert.ok(entry)
    const patched = await (await fetch(`${base}/api/entries/${entry.id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ data: { quality: 5 } }) })).json() as any
    assert.equal(patched.entries.find((e: any) => e.id === entry.id).data.quality, 5)
    const removed = await (await fetch(`${base}/api/entries/${entry.id}`, { method: 'DELETE' })).json() as any
    assert.ok(!removed.entries.some((e: any) => e.id === entry.id))
    const bad = await fetch(`${base}/api/entries`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ date: '2026-10-29', data: {} }) })
    assert.equal(bad.status, 400)
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()))
    rmSync(tmp, { recursive: true, force: true })
  }
})
