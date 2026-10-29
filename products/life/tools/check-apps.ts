// SPDX-License-Identifier: UNLICENSED
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { config as sleep } from '../apps/sleep/config.ts'
import { config as meal } from '../apps/meal/config.ts'
import { config as move } from '../apps/move/config.ts'
import { config as read } from '../apps/read/config.ts'
import { config as home } from '../apps/home/config.ts'
import { config as wear } from '../apps/wear/config.ts'
import { config as hydrate } from '../apps/hydrate/config.ts'
import { config as journal } from '../apps/journal/config.ts'
import { config as watch } from '../apps/watch/config.ts'
import { config as listen } from '../apps/listen/config.ts'
import { config as learn } from '../apps/learn/config.ts'
import { config as travel } from '../apps/travel/config.ts'
import { config as care } from '../apps/care/config.ts'
import { config as organize } from '../apps/organize/config.ts'
import { config as connect } from '../apps/connect/config.ts'
import type { AppConfig } from '../packages/core/types.ts'

const configs: AppConfig[] = [sleep, meal, move, read, home, wear, hydrate, journal, watch, listen, learn, travel, care, organize, connect]
const ids = new Set<string>(), ports = new Set<number>()
let failures = 0
for (const c of configs) {
  const fail = (msg: string) => { console.error(`✗ ${c.id}: ${msg}`); failures++ }
  if (!c.id || ids.has(c.id)) fail('id 重复或为空'); ids.add(c.id)
  if (!c.port || ports.has(c.port)) fail('port 重复或为空'); ports.add(c.port)
  if (!/^#[0-9a-f]{6}$/i.test(c.accent)) fail('accent 必须是 hex')
  if (!c.fields.some(f => f.key === 'date')) fail('缺 date 字段')
  const keys = new Set(c.fields.map(f => f.key))
  for (const col of c.columns) if (!keys.has(col)) fail(`column ${col} 没有对应字段`)
  const s = c.summary([])
  if (!Array.isArray(s.metrics) || s.chart.values.length !== 14) fail('空数据 summary 必须返回 metrics 与 14 点 chart')
  if ((c.packs || []).length < 2) fail('至少需要两个扩展包')
  for (const pack of c.packs || []) for (const m of pack.modules) {
    if (!m.fields.some(f => f.key === 'date')) fail(`${pack.id}/${m.id} 缺 date`)
    if (!m.columns.every(col => m.fields.some(f => f.key === col))) fail(`${pack.id}/${m.id} columns 无效`)
    if (m.summary([]).chart.values.length !== 14) fail(`${pack.id}/${m.id} summary chart 必须 14 点`)
  }
  if (!existsSync(resolve(import.meta.dirname, '..', 'apps', c.id, 'web/index.html'))) fail('缺 web/index.html')
}
for (const f of ['web/index.html', 'server/index.ts', 'package.json']) if (!existsSync(resolve(import.meta.dirname, '..', 'apps', 'ledger', f))) { console.error(`✗ ledger: 缺 ${f}`); failures++ }
console.log(failures ? `✗ ${failures} 项失败` : `✓ ${configs.length} 个通用 app + ledger 契约通过`)
process.exitCode = failures ? 1 : 0
