import test from 'node:test'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { scanArchive, stats } from '../src/archive.ts'
import { backupReport, catalog, healthCheck, manifest } from '../src/health.ts'

const root = fileURLToPath(new URL('../archive', import.meta.url))

test('archive indexes files and sidecars', () => {
  const idx = scanArchive(root)
  assert.equal(idx.items.length, 10)
  assert.equal(idx.collections.length, 9)
  assert.equal(stats(idx).types, 6)
  assert.equal(stats(idx).unmanaged, 1)
  assert.ok(idx.items.some(i => i.title === '电站维修记录' && i.source === '现场记录'))
})

test('health catches unmanaged/backup/inheritance', () => {
  const idx = scanArchive(root)
  const h = healthCheck(idx)
  assert.equal(h.errors, 0)
  assert.equal(h.warnings, 3)
  assert.equal(h.score, 88)
  assert.ok(h.issues.some(i => i.code === 'item.unmanaged'))
  assert.ok(h.issues.some(i => i.code === 'backup.stale'))
  assert.ok(h.issues.some(i => i.code === 'inherit.stale'))
})

test('catalog/manifest/backup reports generate', () => {
  const idx = scanArchive(root)
  const h = healthCheck(idx)
  assert.ok(catalog(idx, h).includes('档案目录'))
  assert.equal((JSON.parse(manifest(idx)) as { items: unknown[] }).items.length, 10)
  assert.ok(backupReport(idx, h).includes('备份与继承报告'))
})
