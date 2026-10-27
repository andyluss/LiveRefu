import { createHash } from 'node:crypto'
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import type { ArchiveIndex, BackupStatus } from './types.ts'

export interface BackupResult { ok: boolean; target: string; files: number; errors: string[]; manifest: string }
export interface RestoreResult { ok: boolean; source: string; checked: number; missing: string[]; mismatched: string[]; errors: string[] }

function sha256(file: string): string {
  return createHash('sha256').update(readFileSync(file)).digest('hex')
}
function inside(parent: string, child: string): boolean {
  const rel = relative(resolve(parent), resolve(child))
  return rel === '' || (!rel.startsWith('..') && !rel.startsWith('..' + '/'))
}

export function runBackup(index: ArchiveIndex, targetDir: string): BackupResult {
  const target = resolve(targetDir)
  const archive = resolve(index.root)
  if (inside(archive, target)) throw new Error('备份目标不能位于 archive 内部')
  mkdirSync(target, { recursive: true })
  const errors: string[] = []
  try {
    cpSync(archive, target, {
      recursive: true,
      filter: src => !src.split('/').includes('.git') && !src.split('/').includes('backups')
    })
  } catch (e) { errors.push((e as Error).message) }
  const manifest = {
    created: new Date().toISOString(),
    source: archive.split('/').pop(),
    items: index.items.map(i => ({ path: i.path, hash: i.sha256, size: i.size, title: i.title }))
  }
  const manifestPath = join(target, 'backup-manifest.json')
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8')
  for (const item of index.items) {
    const file = join(target, item.path)
    if (!existsSync(file)) errors.push('缺失：' + item.path)
    else if (sha256(file) !== item.sha256) errors.push('hash 不符：' + item.path)
  }
  const backup = readBackup(archive)
  const locations = Array.from(new Set([...(backup.locations || []), target]))
  writeFileSync(join(archive, '.backup.json'), JSON.stringify({
    ...backup,
    lastBackup: new Date().toISOString(),
    locations,
    verified: errors.length === 0,
    note: errors.length ? `备份有 ${errors.length} 个问题` : '最近一次备份已验证'
  }, null, 2) + '\n', 'utf8')
  return { ok: errors.length === 0, target, files: index.items.length, errors, manifest: manifestPath }
}

export function verifyRestore(sourceDir: string): RestoreResult {
  const source = resolve(sourceDir)
  const manifestPath = join(source, 'backup-manifest.json')
  const errors: string[] = []
  const missing: string[] = []
  const mismatched: string[] = []
  if (!existsSync(manifestPath)) return { ok: false, source, checked: 0, missing, mismatched, errors: ['没有 backup-manifest.json'] }
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as { items: Array<{ path: string; hash: string }> }
  for (const item of manifest.items || []) {
    const file = join(source, item.path)
    if (!existsSync(file)) { missing.push(item.path); errors.push('缺失：' + item.path); continue }
    if (sha256(file) !== item.hash) { mismatched.push(item.path); errors.push('hash 不符：' + item.path) }
  }
  return { ok: errors.length === 0, source, checked: (manifest.items || []).length, missing, mismatched, errors }
}

export function recordRestore(archiveRoot: string, report: RestoreResult): void {
  const backup = readBackup(archiveRoot)
  writeFileSync(join(archiveRoot, '.backup.json'), JSON.stringify({
    ...backup,
    lastRestoreTest: new Date().toISOString(),
    verified: report.ok,
    note: report.ok ? `恢复校验通过：${report.checked} 个文件` : `恢复校验失败：${report.errors.length} 个问题`
  }, null, 2) + '\n', 'utf8')
}

function readBackup(archiveRoot: string): BackupStatus {
  const p = join(archiveRoot, '.backup.json')
  return existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) as BackupStatus : {}
}
