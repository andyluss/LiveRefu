// SPDX-License-Identifier: Apache-2.0
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

export interface WorldEntry { id: string; name: string; path: string }
export interface WorldRegistry { file: string; worlds: WorldEntry[]; errors: string[] }

export function loadWorldRegistry(file: string, fallback: string): WorldRegistry {
  const abs = resolve(file)
  if (!existsSync(abs)) return { file: abs, worlds: [{ id: 'default', name: 'Local world', path: resolve(fallback) }], errors: [`registry 不存在：${abs}`] }
  try {
    const raw = JSON.parse(readFileSync(abs, 'utf8')) as { worlds?: Array<{ id?: string; name?: string; path?: string }> }
    const base = dirname(abs)
    const worlds = (raw.worlds || []).filter(w => w && w.path).map((w, i) => ({ id: w.id || `world-${i + 1}`, name: w.name || w.id || w.path!, path: resolve(base, w.path!) }))
    if (!worlds.length) return { file: abs, worlds: [{ id: 'default', name: 'Local world', path: resolve(fallback) }], errors: ['worlds.json 为空，使用默认 world'] }
    return { file: abs, worlds, errors: [] }
  } catch (e) {
    return { file: abs, worlds: [{ id: 'default', name: 'Local world', path: resolve(fallback) }], errors: [`worlds.json 解析失败：${(e as Error).message}`] }
  }
}
