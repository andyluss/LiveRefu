#!/usr/bin/env bun
/**
 * 全量验收编排器（M3）。
 *
 * 为什么需要它：项目到这一步已有 12 个验收工具、20+ 个 npm 脚本，但**没有单一入口**。
 * 也就是说"全部验收通过"这件事**离不开人记住一串命令与前置条件**
 * （要起几个服务、端口多少、要不要 Chrome、Giscus 要不要配）——
 * 交接给别人或换个环境重现时，这个知识就丢了。
 *
 * 本脚本把全套验收收成一条命令，并**自带前置编排**：
 *   1. 起**临时**生产服务（用临时数据库，绝不碰真实 `data/app.db`）；
 *   2. 起第二个实例（带占位 Giscus 配置）供讨论区验收用；
 *   3. 若本机有 Chrome，则拉起带 remote-debugging 的实例，否则**自动跳过需要浏览器的套件**；
 *   4. 按依赖顺序跑全部套件，汇总耗时与退出码；
 *   5. 收尾：杀掉自己起的进程、删掉临时目录（绝不留垃圾）。
 *
 * 用法：
 *   bun run verify                                    # 全套
 *   bun run verify --skip=browser                     # 不需要浏览器的先跑（CI 无头常用）
 *   bun run verify --only=site,og,contrast            # 只跑指定套件
 *   bun run verify --list                             # 列出套件与依赖
 */

import { mkdtempSync, rmSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const arg = (name: string) => process.argv.find(a => a.startsWith(`--${name}=`))?.slice(name.length + 3)

const PROJECT_ROOT = resolve(import.meta.dir, '..')
const PORT_MAIN = Number(arg('port') ?? 3210)
const PORT_GISCUS = PORT_MAIN + 1
const BASE = `http://localhost:${PORT_MAIN}`
const BASE_GISCUS = `http://localhost:${PORT_GISCUS}`
const CDP = `http://127.0.0.1:${arg('cdp-port') ?? 9333}`
const CDP_PORT = Number(arg('cdp-port') ?? 9333)

/** 需要浏览器的套件名（顺序即执行顺序） */
type Suite = {
  name: string
  cmd: string[]
  needs: 'server' | 'browser' | 'giscus' | 'none'
  /** 一句话说明它验什么（汇总时展示） */
  what: string
}

const SUITES: Suite[] = [
  { name: 'content-sync', what: '内容/画廊生成物是否与 doc/ 一致', needs: 'none', cmd: ['bun', 'run', 'tools/sync-content.ts', '--check'] },
  { name: 'gallery-sync', what: '画廊条目是否最新', needs: 'none', cmd: ['bun', 'run', 'tools/sync-gallery.ts', '--check'] },
  { name: 'build-artifacts', what: '构建产物完整性（srvx 条件导出等）', needs: 'none', cmd: ['bun', 'run', 'tools/check-build.ts'] },
  { name: 'contrast', what: 'WCAG 对比度 + 视觉层级', needs: 'none', cmd: ['bun', 'run', 'tools/verify-contrast.ts'] },
  { name: 'deploy-config', what: '部署配置静态校验', needs: 'none', cmd: ['bun', 'run', 'tools/verify-deploy.ts'] },
  { name: 'backup-drill', what: '备份→篡改→拒绝→恢复 闭环演练', needs: 'none', cmd: ['bun', 'run', 'tools/verify-backup.ts'] },
  { name: 'site', what: '全部篇目 200 + 站内链接可达', needs: 'server', cmd: ['bun', 'run', 'tools/verify-site.ts', `--base=${BASE}`] },
  { name: 'og', what: 'OG 图端点 + 版式像素断言', needs: 'server', cmd: ['bun', 'run', 'tools/verify-og.ts', `--base=${BASE}`] },
  { name: 'storage', what: '存储健康检查 7 项', needs: 'server', cmd: ['bun', 'run', 'tools/verify-storage.ts', `--base=${BASE}`] },
  { name: 'search', what: '全文检索（真浏览器 CDP）', needs: 'browser', cmd: ['bun', 'run', 'tools/verify-search.ts', `--base=${BASE}`, `--cdp=${CDP}`] },
  { name: 'perf-a11y', what: '限速 LCP/CLS + 无障碍 10 项', needs: 'browser', cmd: ['bun', 'run', 'tools/verify-perf.ts', `--base=${BASE}`, `--cdp=${CDP}`, '--selftest'] },
  { name: 'giscus', what: '讨论区降级与注入', needs: 'giscus', cmd: ['bun', 'run', 'tools/verify-giscus.ts', '--base=' + BASE, '--base-configured=' + BASE_GISCUS, `--cdp=${CDP}`] },
]

// ---- 参数处理 ----
if (process.argv.includes('--list')) {
  console.log('套件（按执行顺序）：\n')
  for (const s of SUITES) {
    console.log(`  ${s.name.padEnd(16)} [${s.needs.padEnd(7)}] ${s.what}`)
  }
  console.log('\n依赖：server=需要站点实例；browser=还需 Chrome remote-debugging；giscus=还需第二个带配置的实例')
  process.exit(0)
}

const only = arg('only')?.split(',').map(s => s.trim()).filter(Boolean)
const skip = new Set((arg('skip')?.split(',').map(s => s.trim()) ?? []).filter(Boolean))

let selected = SUITES
if (only?.length) selected = selected.filter(s => only.includes(s.name))
if (skip.size) selected = selected.filter(s => !skip.has(s.name))

if (selected.length === 0) {
  console.error('✗ 没有选中任何套件（检查 --only / --skip）')
  process.exit(1)
}

// ---- 前置：临时目录与数据库 ----
const WORK = mkdtempSync(join(tmpdir(), 'retro-verify-'))
const TMP_DB = join(WORK, 'verify.db')
const procs: Array<{ name: string; kill: () => void }> = []
const cleanup = () => {
  for (const p of procs) {
    try { p.kill() } catch { /* 已退出 */ }
  }
  try { rmSync(WORK, { recursive: true, force: true }) } catch { /* ignore */ }
}
// --keep：调试用。保留自己起的服务与临时目录，便于手工 curl / 查看日志。
const KEEP = process.argv.includes('--keep')
if (!KEEP) {
  process.on('exit', cleanup)
  process.on('SIGINT', () => { cleanup(); process.exit(130) })
}

async function waitFor(url: string, timeoutMs = 30000): Promise<boolean> {
  const t0 = Date.now()
  while (Date.now() - t0 < timeoutMs) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(2000) })
      if (res.status > 0) return true
    } catch { /* 还没起来 */ }
    await new Promise(r => setTimeout(r, 300))
  }
  return false
}

/** 起一个 Nitro 产物实例 */
async function startServer(name: string, port: number, extraEnv: Record<string, string> = {}) {
  const entry = join(PROJECT_ROOT, '.output/server/index.mjs')
  if (!existsSync(entry)) {
    console.error(`✗ 未找到构建产物 ${entry}\n  请先跑：bun run build`)
    process.exit(1)
  }
  const proc = Bun.spawn(['bun', entry], {
    cwd: PROJECT_ROOT,
    env: {
      ...process.env,
      PORT: String(port),
      HOST: '127.0.0.1',
      // 关键：**用临时数据库**，不碰真实 data/app.db
      DATABASE_PATH: TMP_DB,
      NUXT_PUBLIC_SITE_URL: `http://localhost:${port}`,
      NUXT_PUBLIC_GISCUS_REPO: '',
      NUXT_PUBLIC_GISCUS_REPO_ID: '',
      NUXT_PUBLIC_GISCUS_CATEGORY: '',
      NUXT_PUBLIC_GISCUS_CATEGORY_ID: '',
      ...extraEnv,
    },
    stdout: 'pipe',
    stderr: 'pipe',
  })
  procs.push({ name, kill: () => proc.kill() })
  const ok = await waitFor(`http://localhost:${port}/api/health/storage`)
  if (!ok) {
    // 服务没起来时把它的输出打出来——否则只看到"未就绪"，无从判断原因
    // （真实踩到过：第二个实例起不来，但日志里什么都没有）
    let out = ''
    try {
      out = (await new Response(proc.stdout).text()) + (await new Response(proc.stderr).text())
    } catch { /* 管道已关 */ }
    console.error(`\n✗ ${name}（:${port}）未能在 30s 内就绪，exitCode=${proc.exitCode}`)
    if (out.trim()) {
      console.error('  —— 该实例输出 ——')
      for (const l of out.split('\n').slice(-25)) console.error('  ' + l)
    } else {
      console.error('  （该实例无任何输出）')
    }
    console.error(`  提示：确认端口 :${port} 未被占用（lsof -i :${port}）`)
    cleanup()
    process.exit(1)
  }
  return proc
}

/** 找 Chrome（找不到就跳过浏览器套件，而不是让整轮失败） */
function findChrome(): string | null {
  const candidates = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ]
  for (const c of candidates) if (existsSync(c)) return c
  return null
}

// ---- 起前置服务 ----
// 注意：`giscus` 既需要第二个实例、**也**需要浏览器（脚本用 CDP 驱动页面），
// 所以判定"需要浏览器"时必须把它算进来——早先漏了这一步，
// 结果 giscus 套件在没有 Chrome 的情况下直接连不上 CDP。
const runsBrowser = (s: Suite) => s.needs === 'browser' || s.needs === 'giscus'
const needsServer = selected.some(s => s.needs !== 'none')
const needsBrowser = selected.some(runsBrowser)
const needsGiscus = selected.some(s => s.needs === 'giscus')

console.log(`全量验收（${selected.length} 个套件）`)
console.log(`临时目录：${WORK}\n`)

if (needsServer) {
  process.stdout.write('起前置服务… ')
  // 先迁移临时库
  const mig = Bun.spawnSync(['bun', 'run', 'server/db/migrate.ts'], {
    cwd: PROJECT_ROOT,
    env: { ...process.env, DATABASE_PATH: TMP_DB },
    stdout: 'pipe', stderr: 'pipe',
  })
  if (mig.exitCode !== 0) {
    console.error('\n✗ 临时库迁移失败：' + mig.stderr.toString().slice(-300))
    cleanup(); process.exit(1)
  }
  await startServer('main', PORT_MAIN)
  process.stdout.write(`主实例 :${PORT_MAIN} OK`)
  if (needsGiscus) {
    await startServer('giscus', PORT_GISCUS, {
      NUXT_PUBLIC_GISCUS_REPO: 'owner/verify-placeholder',
      NUXT_PUBLIC_GISCUS_REPO_ID: 'R_kgDOPLACEHOLDER',
      NUXT_PUBLIC_GISCUS_CATEGORY: 'General',
      NUXT_PUBLIC_GISCUS_CATEGORY_ID: 'DIC_kwDOPLACEHOLDER',
    })
    process.stdout.write(` · 讨论区实例 :${PORT_GISCUS} OK`)
  }
  console.log()
}

let browserAvailable = false
if (needsBrowser) {
  const chrome = findChrome()
  if (!chrome) {
    console.log('⚠ 未找到 Chrome —— 需要浏览器的套件将标记为 SKIP（不算失败）')
  } else {
    const proc = Bun.spawn([
      chrome,
      '--headless=old', '--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage',
      `--user-data-dir=${join(WORK, 'chrome')}`,
      `--remote-debugging-port=${CDP_PORT}`,
      'about:blank',
    ], { stdout: 'ignore', stderr: 'ignore' })
    procs.push({ name: 'chrome', kill: () => proc.kill() })
    browserAvailable = await waitFor(`${CDP}/json/version`, 20000)
    console.log(browserAvailable ? '✓ Chrome remote-debugging 就绪\n' : '⚠ Chrome 起来了但调试端口未就绪 —— 浏览器套件将 SKIP\n')
  }
}

// ---- 执行 ----
interface Result { name: string; what: string; status: 'PASS' | 'FAIL' | 'SKIP'; ms: number; tail: string }
const results: Result[] = []

/** 调试用：定期探活自己起的服务，定位"某个实例中途死掉"这类问题 */
if (process.argv.includes('--heartbeat')) {
  const targets = needsGiscus
    ? [[PORT_MAIN, 'main'], [PORT_GISCUS, 'giscus']] as const
    : [[PORT_MAIN, 'main']] as const
  const iv = setInterval(async () => {
    const parts: string[] = []
    for (const [port, label] of targets) {
      let st = 'DOWN'
      try {
        const r = await fetch(`http://localhost:${port}/api/health/storage`, { signal: AbortSignal.timeout(1500) })
        st = String(r.status)
      } catch { /* DOWN */ }
      parts.push(`${label}:${port}=${st}`)
    }
    console.log(`  [heartbeat ${((Date.now() - t0All) / 1000).toFixed(0)}s] ${parts.join('  ')}`)
  }, 2000)
  iv.unref?.()
}
const t0All = Date.now()

for (const s of selected) {
  if (runsBrowser(s) && !browserAvailable) {
    results.push({ name: s.name, what: s.what, status: 'SKIP', ms: 0, tail: '需要 Chrome remote-debugging' })
    console.log(`  SKIP  ${s.name.padEnd(16)} ${s.what}`)
    continue
  }
  const t0 = Date.now()
  const proc = Bun.spawn(s.cmd, { cwd: PROJECT_ROOT, env: { ...process.env, DATABASE_PATH: TMP_DB }, stdout: 'pipe', stderr: 'pipe' })
  const out = await new Response(proc.stdout).text()
  const err = await new Response(proc.stderr).text()
  const code = await proc.exited
  const ms = Date.now() - t0
  const status: Result['status'] = code === 0 ? 'PASS' : 'FAIL'
  // 取最有信息量的一行作为摘要（验收脚本都把结论写在最后几行）
  const lines = (out + '\n' + err).split('\n').map(l => l.trim()).filter(Boolean)
  const summary = [...lines].reverse().find(l => /通过|OK|达标|✓/.test(l)) ?? lines.at(-1) ?? ''
  results.push({ name: s.name, what: s.what, status, ms, tail: summary.slice(0, 100) })
  console.log(`  ${status === 'PASS' ? '✓   ' : '✗   '} ${s.name.padEnd(16)} ${(ms / 1000).toFixed(1)}s  ${summary.slice(0, 72)}`)
  if (status === 'FAIL') {
    console.log('      —— 失败输出尾部 ——')
    for (const l of lines.slice(-8)) console.log('      ' + l.slice(0, 160))
  }
}

// ---- 汇总 ----
const pass = results.filter(r => r.status === 'PASS').length
const fail = results.filter(r => r.status === 'FAIL').length
const skipped = results.filter(r => r.status === 'SKIP').length
const totalMs = results.reduce((n, r) => n + r.ms, 0)

console.log(`\n${'─'.repeat(64)}`)
console.log(`通过 ${pass} · 失败 ${fail} · 跳过 ${skipped} · 合计 ${(totalMs / 1000).toFixed(1)}s`)
if (skipped) {
  console.log('跳过的套件：' + results.filter(r => r.status === 'SKIP').map(r => r.name).join(', '))
}
console.log('注：跳过的套件未被验证——不要把它当成"通过"。')

cleanup()

if (fail) {
  console.error(`\n✗ 有 ${fail} 个套件未通过`)
  process.exit(1)
}
if (skipped) {
  console.log('\n⚠ 全部已运行套件通过，但有套件被跳过（结果不完整）')
  process.exit(0)
}
console.log('\n✓ 全部验收通过')
