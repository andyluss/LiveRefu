import test from 'node:test'
import assert from 'node:assert/strict'
import { cpSync, existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { duplicateGroups, saveItemMeta, saveItemsMeta, scanArchive, stats } from '../src/archive.ts'
import { backupReport, catalog, healthCheck, manifest } from '../src/health.ts'
import { runBackup, verifyRestore } from '../src/backup.ts'
import { publicHtml } from '../src/public.ts'
import { retentionAudit, retentionStatus } from '../src/retention.ts'
import { buildInheritancePackage } from '../src/inherit.ts'

const root = fileURLToPath(new URL('../archive', import.meta.url))

test('archive indexes files and sidecars', () => {
  const idx = scanArchive(root)
  assert.equal(idx.items.length, 11)
  assert.equal(idx.collections.length, 9)
  assert.equal(stats(idx).types, 6)
  assert.equal(stats(idx).unmanaged, 1)
  assert.ok(idx.items.some(i => i.title === '电站维修记录' && i.source === '现场记录'))
})

test('health catches unmanaged/duplicate/backup/inheritance', () => {
  const idx = scanArchive(root)
  const h = healthCheck(idx)
  assert.equal(h.errors, 0)
  assert.equal(h.warnings, 4)
  assert.equal(h.score, 84)
  assert.ok(h.issues.some(i => i.code === 'item.unmanaged'))
  assert.ok(h.issues.some(i => i.code === 'item.duplicate'))
  assert.ok(h.issues.some(i => i.code === 'backup.stale'))
  assert.ok(h.issues.some(i => i.code === 'inherit.stale'))
})

test('duplicates and public page', () => {
  const idx = scanArchive(root)
  assert.equal(duplicateGroups(idx).length, 1)
  const page = publicHtml(idx)
  assert.ok(page.includes('橙港的清晨'))
  assert.ok(!page.includes('房契摘要'))
})

test('metadata save creates/updates sidecar in a temp copy', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'livefile-meta-'))
  try {
    cpSync(root, tmp, { recursive: true })
    const item = saveItemMeta(tmp, 'inbox/未整理照片.svg', { title: '补好的照片', source: '家庭相册', license: 'private', public: true })
    assert.equal(item.title, '补好的照片')
    assert.equal(item.isPublic, true)
    const idx = scanArchive(tmp)
    assert.ok(!idx.items.some(i => i.id === 'inbox/未整理照片.svg' && !i.hasMeta))
  } finally { rmSync(tmp, { recursive: true, force: true }) }
})

test('backup + restore verification works on a temp copy', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'livefile-backup-'))
  try {
    const src = join(tmp, 'archive')
    const dst = join(tmp, 'backup')
    cpSync(root, src, { recursive: true })
    const idx = scanArchive(src)
    const result = runBackup(idx, dst)
    assert.equal(result.ok, true)
    assert.equal(result.files, 11)
    const check = verifyRestore(dst)
    assert.equal(check.ok, true)
    assert.equal(check.checked, 11)
  } finally { rmSync(tmp, { recursive: true, force: true }) }
})

test('catalog/manifest/backup reports generate', () => {
  const idx = scanArchive(root)
  const h = healthCheck(idx)
  assert.ok(catalog(idx, h).includes('档案目录'))
  assert.equal((JSON.parse(manifest(idx)) as { items: unknown[] }).items.length, 11)
  assert.ok(backupReport(idx, h).includes('备份与继承报告'))
})


test('batch metadata applies to selected items', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'livefile-batch-'))
  try {
    cpSync(root, tmp, { recursive: true })
    const paths = ['inbox/未整理照片.svg', 'inbox/电站维修记录-副本.md']
    saveItemsMeta(tmp, paths, { source: 'batch', license: 'private', retention: 'permanent', tags: ['batch'] })
    const idx = scanArchive(tmp)
    for (const path of paths) {
      const item = idx.items.find(i => i.id === path)
      assert.equal(item?.source, 'batch')
      assert.equal(item?.license, 'private')
      assert.deepEqual(item?.tags, ['batch'])
    }
  } finally { rmSync(tmp, { recursive: true, force: true }) }
})


test('retention audit parses policy and inheritance package builds', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'livefile-retention-'))
  try {
    const src = join(tmp, 'archive')
    cpSync(root, src, { recursive: true })
    const idx = scanArchive(src)
    const item = idx.items.find(i => i.path === 'notes/2026-04-12-电站维修.md')!
    assert.equal(retentionStatus(item).status, 'active')
    assert.equal(retentionStatus({ ...item, retention: '2020-01-01' }).status, 'overdue')
    assert.ok(Array.isArray(retentionAudit(idx)))
    const out = join(tmp, 'inheritance')
    const pkg = buildInheritancePackage(idx, out)
    assert.equal(pkg.ok, true)
    assert.equal(pkg.files, 11)
    assert.ok(existsSync(join(out, 'README.md')))
    assert.ok(existsSync(join(out, 'inheritance-package.json')))
    assert.ok(existsSync(join(out, 'public.html')))
  } finally { rmSync(tmp, { recursive: true, force: true }) }
})
