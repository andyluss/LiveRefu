// SPDX-License-Identifier: Apache-2.0
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import type { ChecksConfig } from './types.ts'

/**
 * Import a DTCG-style token tree into a LiveDSO vault.
 * Source layout: <root>/core/*.json + <root>/products/*.json
 * Existing contracts/style cards are copied from the default sample vault so the
 * imported case still has something to exercise.
 */
export function importTokens(sourceRoot: string, targetVault: string, sampleVault: string): { tokens: number; files: string[] } {
  const source = resolve(sourceRoot)
  const target = resolve(targetVault)
  const core = join(source, 'core')
  const products = join(source, 'products')
  if (!existsSync(core) && !existsSync(products)) throw new Error(`没有找到 core/ 或 products/：${source}`)
  mkdirSync(join(target, 'tokens'), { recursive: true })
  const files: string[] = []
  const copy = (dir: string, prefix: string): void => {
    if (!existsSync(dir)) return
    for (const name of readdirSync(dir).filter(n => n.endsWith('.json')).sort()) {
      const out = join(target, 'tokens', `${prefix}-${name}`)
      cpSync(join(dir, name), out)
      files.push(out)
    }
  }
  copy(core, 'core')
  copy(products, 'product')
  if (!files.length) throw new Error('没有可导入的 JSON token 文件')

  for (const dir of ['contracts', 'style-cards']) {
    if (!existsSync(join(target, dir))) {
      mkdirSync(join(target, dir), { recursive: true })
      const src = join(sampleVault, dir)
      if (existsSync(src)) cpSync(src, join(target, dir), { recursive: true })
    }
  }

  const sampleChecksPath = join(sampleVault, 'checks.json')
  const checks: ChecksConfig = existsSync(sampleChecksPath)
    ? JSON.parse(readFileSync(sampleChecksPath, 'utf8')) as ChecksConfig
    : {
        contrast: [
          { fg: 'sys.color.text.primary', bg: 'sys.color.bg.base', min: 4.5, label: '正文 on 画布' },
          { fg: 'sys.color.text.muted', bg: 'sys.color.bg.surface', min: 7, label: '弱化文字 on 面板（AAA 目标）' }
        ],
        focusToken: 'sys.color.focus.ring',
        actionToken: 'sys.color.action.primary',
        rawValueTiers: ['sys'],
        contractRequired: ['anatomy', 'states', 'tokens', 'keyboard', 'a11y', 'do', 'dont']
      }
  // Real LRDS product tokens intentionally contain raw values; only flag sys raw values.
  checks.rawValueTiers = ['sys']
  writeFileSync(join(target, 'checks.json'), JSON.stringify(checks, null, 2) + '\n', 'utf8')
  return { tokens: files.length, files }
}
