// SPDX-License-Identifier: Apache-2.0
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

export interface VaultEntry {
  id: string
  name: string
  path: string
}

export interface Registry {
  file: string
  vaults: VaultEntry[]
  errors: string[]
}

/** 读取 vaults.json；路径相对 registry 文件，便于项目整体移动。 */
export function loadRegistry(file: string, fallback: string): Registry {
  const abs = resolve(file)
  const errors: string[] = []
  if (!existsSync(abs)) {
    return { file: abs, vaults: [{ id: 'default', name: 'Local vault', path: resolve(fallback) }], errors: [`registry 不存在，使用默认 vault：${abs}`] }
  }
  try {
    const raw = JSON.parse(readFileSync(abs, 'utf8')) as { vaults?: Array<{ id?: string; name?: string; path?: string }> }
    const base = dirname(abs)
    const vaults = (raw.vaults || []).filter(v => v && v.path).map((v, i) => ({
      id: v.id || `vault-${i + 1}`,
      name: v.name || v.id || v.path!,
      path: resolve(base, v.path!)
    }))
    if (!vaults.length) {
      errors.push('vaults.json 没有有效 vault；使用默认 vault。')
      vaults.push({ id: 'default', name: 'Local vault', path: resolve(fallback) })
    }
    return { file: abs, vaults, errors }
  } catch (e) {
    return { file: abs, vaults: [{ id: 'default', name: 'Local vault', path: resolve(fallback) }], errors: [`vaults.json 解析失败：${(e as Error).message}`] }
  }
}
