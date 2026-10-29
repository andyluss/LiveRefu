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
  const rhythm = await fetch(`http://127.0.0.1:${port}/rhythm`)
  assert.equal(rhythm.status, 200)
  assert.match(await rhythm.text(), /跨应用节律/)
  const logo = await fetch(`http://127.0.0.1:${port}/shared/logos/life.svg`)
  assert.equal(logo.status, 200)
  assert.match(await logo.text(), /<svg/)
  assert.match(await (await fetch(`http://127.0.0.1:${port}/shared/logos/life.svg`)).text(), /小孩头像/)
  for (const app of [...data, { id: 'life' }]) {
    const asset = await fetch(`http://127.0.0.1:${port}/shared/logos/${app.id}.svg`)
    assert.equal(asset.status, 200, `${app.id} logo 存在`)
    assert.match(asset.headers.get('content-type') || '', /image\/svg\+xml/)
  }
  await new Promise<void>(resolve => server.close(() => resolve()))
})
