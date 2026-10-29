// SPDX-License-Identifier: UNLICENSED
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { config as sleep } from '../apps/sleep/config.ts'
import { config as meal } from '../apps/meal/config.ts'
import { config as move } from '../apps/move/config.ts'
import { config as read } from '../apps/read/config.ts'
import { config as home } from '../apps/home/config.ts'
import type { AppConfig } from '../packages/core/types.ts'

const configs: AppConfig[] = [sleep, meal, move, read, home]
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
  if (!existsSync(resolve(import.meta.dirname, '..', 'apps', c.id, 'web/index.html'))) fail('缺 web/index.html')
}
console.log(failures ? `✗ ${failures} 项失败` : `✓ ${configs.length} 个 app 契约通过`)
process.exitCode = failures ? 1 : 0
