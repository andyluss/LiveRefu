#!/usr/bin/env bun
/**
 * 存储健康验收（M3）。
 *
 * 对 `/api/health/storage` 做**独立**验收，而不是靠 `curl | grep`：
 *   - 逐项检查 7 个断言都为 true（不是只看 HTTP 200）；
 *   - 断言响应里确实包含每一项（防止端点悄悄少检查了几项还被当"通过"）；
 *   - 断言 HTTP 状态与 `ok` 字段一致（健康检查返回 200 但内容不健康 = 假绿灯）。
 *
 * 为什么值得单独一个脚本：健康检查本身是"运维的眼睛"，
 * 它错了比没有更糟——你会以为系统是好的。
 *
 * 用法：
 *   bun run tools/verify-storage.ts --base=http://localhost:3100
 */

const arg = (name: string, def: string) =>
  process.argv.find(a => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? def
const BASE = arg('base', 'http://localhost:3100')

/** 期望存在的检查项（与 server/routes/api/health/storage.get.ts 保持一致） */
const EXPECTED = [
  '迁移已应用',
  'WAL 模式',
  '外键约束开启',
  '读写往返',
  '外键拦截非法引用',
  '业务表齐全',
  '数据规模',
] as const

const results: Array<{ name: string; ok: boolean; detail: string }> = []
const record = (name: string, ok: boolean, detail: string) => {
  results.push({ name, ok, detail })
  console.log(`  ${ok ? '✓' : '✗'} ${name.padEnd(22)} ${detail}`)
}

console.log(`存储健康验收（base=${BASE}）\n`)

let res: Response
try {
  res = await fetch(`${BASE}/api/health/storage`)
} catch (e) {
  console.error(`✗ 无法访问健康检查端点：${e instanceof Error ? e.message : String(e)}`)
  process.exit(1)
}

const body = (await res.json()) as {
  ok: boolean
  database: string
  driver: string
  migrations: string[]
  checks: Array<{ name: string; ok: boolean; detail: string }>
  summary: string
}

// ---- 1) HTTP 状态与内容一致（防"假绿灯"） ----
const httpOk = res.status === 200
record('HTTP 状态一致', body.ok === httpOk, `status=${res.status} ok=${body.ok}${body.ok === httpOk ? '' : ' ← 不一致，健康检查在骗人'}`)

// ---- 2) 驱动与库文件 ----
record('驱动为 bun:sqlite', body.driver === 'bun:sqlite', body.driver)
record('报告了库文件', typeof body.database === 'string' && body.database.length > 0, body.database)

// ---- 3) 迁移已应用 ----
record('迁移非空', Array.isArray(body.migrations) && body.migrations.length > 0, `${body.migrations?.length ?? 0} 个：${(body.migrations ?? []).join(', ')}`)

// ---- 4) 检查项齐全（少检查几项不能算通过） ----
const names = new Set((body.checks ?? []).map(c => c.name))
const missing = EXPECTED.filter(n => !names.has(n))
record('检查项齐全', missing.length === 0, missing.length ? `缺：${missing.join(', ')}` : `${body.checks.length} 项，与预期一致`)

// ---- 5) 逐项通过 ----
const failedChecks = (body.checks ?? []).filter(c => !c.ok)
record('全部检查项通过', failedChecks.length === 0, failedChecks.length ? failedChecks.map(c => `${c.name}(${c.detail})`).join('; ') : body.summary)

// ---- 6) 关键项单独断言：读写往返 + 外键真的拦截 ----
// 这两项是"存储层真的能用"的核心，值得点名，避免将来被误删还被当通过
for (const key of ['读写往返', '外键拦截非法引用'] as const) {
  const c = (body.checks ?? []).find(x => x.name === key)
  record(`关键项「${key}」`, Boolean(c?.ok), c ? c.detail : '该检查项不存在')
}

const failed = results.filter(r => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} 项通过`)
if (failed.length) {
  console.error('✗ 存储健康验收未通过')
  process.exit(1)
}
console.log('✓ 存储健康验收通过')
