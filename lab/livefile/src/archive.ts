import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, resolve, sep } from 'node:path'
import type { ArchiveIndex, ArchiveItem, BackupStatus, Inheritance, ItemMeta } from './types.ts'

const TEXT_EXT = new Set(['.md', '.txt', '.json', '.csv', '.log'])
const SKIP_DIRS = new Set(['.git', 'backups', 'node_modules', '.DS_Store'])

function walk(root: string, dir: string, out: string[]): void {
  for (const name of readdirSync(dir)) {
    if (name.startsWith('.')) continue
    const abs = join(dir, name)
    const st = statSync(abs)
    if (st.isDirectory()) { if (!SKIP_DIRS.has(name)) walk(root, abs, out); continue }
    if (name.endsWith('.meta.json') || name === 'inheritance.json') continue
    out.push(abs)
  }
}

function sha256(file: string): string {
  return createHash('sha256').update(readFileSync(file)).digest('hex')
}
function readMeta(file: string): { meta: ItemMeta | null; error?: string } {
  const sidecar = file + '.meta.json'
  if (!existsSync(sidecar)) return { meta: null }
  try { return { meta: JSON.parse(readFileSync(sidecar, 'utf8')) as ItemMeta } }
  catch (e) { return { meta: null, error: (e as Error).message } }
}
function preview(file: string): string {
  if (!TEXT_EXT.has(file.slice(file.lastIndexOf('.')).toLowerCase())) return ''
  try { return readFileSync(file, 'utf8').slice(0, 4000) } catch { return '' }
}
function dateOnly(d: Date): string { return d.toISOString().slice(0, 10) }

export function scanArchive(root: string): ArchiveIndex {
  const absRoot = resolve(root)
  const files: string[] = []
  const errors: string[] = []
  walk(absRoot, absRoot, files)
  const items: ArchiveItem[] = []
  for (const file of files) {
    const rel = relative(absRoot, file).split(sep).join('/')
    const { meta, error } = readMeta(file)
    if (error) errors.push(`${rel}: meta ${error}`)
    const st = statSync(file)
    const ext = file.slice(file.lastIndexOf('.')).toLowerCase()
    const raw = file.split('/').pop() || rel
    const title = meta?.title || raw.replace(/\.[^.]+$/, '')
    const type = meta?.type || (ext === '.svg' || ext === '.png' || ext === '.jpg' ? 'photo' : ext === '.md' || ext === '.txt' ? 'note' : 'file')
    const created = meta?.created || dateOnly(st.mtime)
    items.push({
      id: rel,
      path: rel,
      title,
      type,
      created,
      source: meta?.source || '',
      license: meta?.license || '',
      collections: meta?.collections || [],
      tags: meta?.tags || [],
      retention: meta?.retention || '',
      person: meta?.person || '',
      size: st.size,
      sha256: sha256(file),
      mtime: st.mtime.toISOString(),
      hasMeta: Boolean(meta),
      preview: preview(file)
    })
  }
  items.sort((a, b) => b.created.localeCompare(a.created) || a.title.localeCompare(b.title))
  const collectionMap = new Map<string, number>()
  for (const item of items) for (const c of item.collections) collectionMap.set(c, (collectionMap.get(c) || 0) + 1)
  const collections = [...collectionMap.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
  const yearMap = new Map<string, ArchiveItem[]>()
  for (const item of items) {
    const year = (item.created || '').slice(0, 4) || '未知'
    if (!yearMap.has(year)) yearMap.set(year, [])
    yearMap.get(year)!.push(item)
  }
  const timeline = [...yearMap.entries()].sort((a, b) => b[0].localeCompare(a[0])).map(([year, items]) => ({ year, items }))
  const backup = existsSync(join(absRoot, '.backup.json')) ? JSON.parse(readFileSync(join(absRoot, '.backup.json'), 'utf8')) as BackupStatus : {}
  const inheritance = existsSync(join(absRoot, 'inheritance.json')) ? JSON.parse(readFileSync(join(absRoot, 'inheritance.json'), 'utf8')) as Inheritance : {}
  return { root: absRoot, items, collections, timeline, backup, inheritance, errors }
}

export function stats(index: ArchiveIndex): { items: number; collections: number; types: number; bytes: number; unmanaged: number } {
  const types = new Set(index.items.map(i => i.type))
  return {
    items: index.items.length,
    collections: index.collections.length,
    types: types.size,
    bytes: index.items.reduce((n, i) => n + i.size, 0),
    unmanaged: index.items.filter(i => !i.hasMeta).length
  }
}

export function itemByPath(index: ArchiveIndex, id: string): ArchiveItem | undefined {
  return index.items.find(i => i.id === id)
}
