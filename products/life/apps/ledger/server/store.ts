// SPDX-License-Identifier: UNLICENSED
import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { seedState, emptyState } from './seed.ts'
import type { Store } from './domain.ts'

export interface StoreHandle {
  file: string
  read(): Store
  write(next: Store): Store
  reset(seeded?: boolean): Store
}

export function createStore(file = resolve('data/store.json')): StoreHandle {
  const abs = resolve(file)
  mkdirSync(dirname(abs), { recursive: true })
  const read = (): Store => {
    if (!existsSync(abs)) return seedState()
    const raw = readFileSync(abs, 'utf8')
    const parsed = JSON.parse(raw) as Store
    if (!parsed || parsed.version !== 1) throw new Error('store.json 版本不支持')
    return parsed
  }
  const write = (next: Store): Store => {
    if (existsSync(abs)) copyFileSync(abs, `${abs}.bak`)
    const tmp = `${abs}.tmp`
    writeFileSync(tmp, JSON.stringify(next, null, 2) + '\n', 'utf8')
    renameSync(tmp, abs)
    return next
  }
  const reset = (seeded = true): Store => write(seeded ? seedState() : emptyState())
  if (!existsSync(abs)) write(seedState())
  return { file: abs, read, write, reset }
}
