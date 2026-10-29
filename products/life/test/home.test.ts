// SPDX-License-Identifier: UNLICENSED
import assert from 'node:assert/strict'
import test from 'node:test'
import { APPS, createHubServer } from '../server.ts'

test('hub registry contains 16 apps with unique ports', () => {
  assert.equal(APPS.length, 16)
  assert.equal(new Set(APPS.map(a => a.id)).size, 16)
  assert.equal(new Set(APPS.map(a => a.port)).size, 16)
})

test('hub serves the app registry', async () => {
  const server = createHubServer()
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  const port = (server.address() as any).port
  const data = await fetch(`http://127.0.0.1:${port}/api/apps`).then(r => r.json())
  assert.equal(data.length, 16)
  await new Promise<void>(resolve => server.close(() => resolve()))
})
