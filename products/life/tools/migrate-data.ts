// SPDX-License-Identifier: UNLICENSED
import { copyFileSync, existsSync, mkdirSync, readdirSync, renameSync } from 'node:fs'
import { join, resolve } from 'node:path'

const ROOT = resolve(import.meta.dirname, '..')
const APPS = resolve(ROOT, 'apps')
const DEST = resolve(ROOT, 'data/apps')
mkdirSync(DEST, { recursive: true })

for (const id of readdirSync(APPS)) {
  const from = join(APPS, id, 'data')
  if (!existsSync(from)) continue
  const to = join(DEST, id)
  mkdirSync(to, { recursive: true })
  for (const name of readdirSync(from)) {
    if (!name.startsWith('store.json')) continue
    const src = join(from, name)
    const dst = join(to, name)
    if (existsSync(dst)) {
      console.log(`skip ${id}/${name}：目标已存在`)
      continue
    }
    try { renameSync(src, dst) } catch { copyFileSync(src, dst) }
    console.log(`move ${id}/${name} → data/apps/${id}/${name}`)
  }
}
const stray = resolve(ROOT, 'data/store.json')
if (existsSync(stray)) {
  const legacy = resolve(ROOT, 'data/legacy')
  mkdirSync(legacy, { recursive: true })
  const dst = join(legacy, 'store.json')
  if (!existsSync(dst)) renameSync(stray, dst)
  console.log('move data/store.json → data/legacy/store.json（保留旧快照）')
}
