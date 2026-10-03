#!/usr/bin/env bun
/**
 * 部署配置静态校验（M3）。
 *
 * **能做什么、不能做什么（务必分清）**：
 *   ✅ 能做：检查配置文件存在、YAML 语法可解析、关键字段齐全、
 *            Caddyfile 里的 root 路径与仓库实际布局是否自洽、
 *            systemd 单元没误用 node 执行、文档里的路径引用是否指向真实目录。
 *   ❌ 不能做：**验证配置在真实服务器上能跑起来**。Caddy/systemd/Litestream
 *            都需要对应的运行环境；容器/沙箱里没有它们。
 *            真正的部署验证必须在目标机上 smoke test（见 docs/08 §五）。
 *
 * 这个脚本的价值在于**把"能静态查出来的错"在上服务器之前查掉**——
 * 比如 Caddyfile 的 root 指向一个不存在的目录，这类错误在部署时才暴露很浪费时间。
 *
 * 用法：
 *   bun run tools/verify-deploy.ts
 */

import { existsSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

const PROJECT_ROOT = resolve(import.meta.dir, '..')
const WORKSPACE_ROOT = resolve(PROJECT_ROOT, '../..')

const results: Array<{ name: string; ok: boolean; detail: string }> = []
const record = (name: string, ok: boolean, detail: string) => {
  results.push({ name, ok, detail })
  console.log(`  ${ok ? '✓' : '✗'} ${name.padEnd(30)} ${detail}`)
}

/** 极简 YAML 语法检查：缩进一致、无 Tab、键值行可解析、无重复顶层键 */
function checkYaml(text: string): { ok: boolean; reason?: string } {
  const lines = text.split('\n')
  const topKeys = new Set<string>()
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!
    if (line.includes('\t')) return { ok: false, reason: `第 ${i + 1} 行含 Tab（YAML 不允许）` }
    if (/^\s*#/.test(line) || line.trim() === '') continue
    if (/^\s*-\s*$/.test(line)) continue
    // 键值行
    const m = line.match(/^(\s*)([A-Za-z_][\w.-]*|-)\s*:(.*)$/)
    if (!m && !/^\s*-/.test(line)) {
      return { ok: false, reason: `第 ${i + 1} 行不是合法 YAML 行：${line.slice(0, 60)}` }
    }
    if (m && m[1] === '') {
      const key = m[2]!
      if (topKeys.has(key)) return { ok: false, reason: `顶层键重复：${key}` }
      topKeys.add(key)
    }
  }
  return { ok: true }
}

console.log('部署配置静态校验\n')

// ---- 1) Caddyfile ----
const caddyPath = join(PROJECT_ROOT, 'deploy/Caddyfile')
if (!existsSync(caddyPath)) {
  record('Caddyfile 存在', false, '缺 deploy/Caddyfile')
} else {
  const caddy = readFileSync(caddyPath, 'utf-8')
  record('Caddyfile 存在', true, `${caddy.split('\n').length} 行`)

  // 花括号配对（最容易手误且后果直接）
  const open = (caddy.match(/\{/g) ?? []).length
  const close = (caddy.match(/\}/g) ?? []).length
  record('Caddyfile 括号配对', open === close, `{ ${open} 个 / } ${close} 个`)

  // root 指向的目录必须是绝对路径（否则部署后才 404 一大片）
  // 注意：必须**跳过注释行**——否则注释里出现 "root" 一词会被误判为指令
  // （本项目就在中文注释里写了「root 指向的目录必须与应用解析出的 doc/ 一致」，踩过一次）
  const directiveLines = caddy
    .split('\n')
    .map(l => l.trim())
    .filter(l => l !== '' && !l.startsWith('#'))
  const roots = directiveLines.flatMap(l => [...l.matchAll(/(?:^|\s)root\s+\*?\s*(\S+)/g)].map(m => m[1]!))
  if (roots.length === 0) {
    record('Caddyfile root 路径', false, '未找到 root 指令')
  } else {
    const nonAbsolute = roots.filter(r => !r.startsWith('/'))
    record(
      'Caddyfile root 为绝对路径',
      nonAbsolute.length === 0,
      nonAbsolute.length === 0 ? `${roots.length} 处均为绝对路径：${roots.join(', ')}` : `非绝对：${nonAbsolute.join(', ')}`,
    )
  }

  // 必须把请求转给应用
  record('Caddyfile 有 reverse_proxy', /reverse_proxy\s+127\.0\.0\.1:\d+/.test(caddy), '指向本机应用端口')
  // 传输安全
  record('Caddyfile 有安全响应头', /Strict-Transport-Security/.test(caddy) && /X-Content-Type-Options/.test(caddy), 'HSTS + nosniff')
}

// ---- 2) systemd 单元 ----
const unitPath = join(PROJECT_ROOT, 'deploy/retro-futurism.service')
if (!existsSync(unitPath)) {
  record('systemd 单元存在', false, '缺 deploy/retro-futurism.service')
} else {
  const unit = readFileSync(unitPath, 'utf-8')
  record('systemd 单元存在', true, `${unit.split('\n').length} 行`)

  // 必须有三个节
  const hasSections = ['[Unit]', '[Service]', '[Install]'].every(s => unit.includes(s))
  record('systemd 三个节齐全', hasSections, hasSections ? '[Unit]/[Service]/[Install]' : '缺节')

  // 必须用 bun 而不是 node 执行（M0 实测的硬约束）
  const exec = unit.match(/^ExecStart=(.+)$/m)?.[1] ?? ''
  const usesBun = /\bbun\b/.test(exec)
  const usesNode = /\bnode\b/.test(exec)
  record('用 bun 而非 node 启动', usesBun && !usesNode, exec ? exec.slice(0, 60) : '缺 ExecStart')

  // 数据库目录必须可写（否则启动即失败）
  const rw = unit.match(/ReadWritePaths=(.+)$/m)?.[1] ?? ''
  const dbPath = unit.match(/DATABASE_PATH=(\S+)/m)?.[1] ?? ''
  const dbDir = dbPath ? dbPath.replace(/\/[^/]+$/, '') : ''
  const rwOk = Boolean(dbDir && rw.split(/\s+/).some(p => dbDir === p || dbDir.startsWith(p + '/')))
  record('数据库目录可写', rwOk, rwOk ? `${dbDir} ∈ ReadWritePaths` : `DATABASE_PATH=${dbPath || '(无)'} 不在 ReadWritePaths=${rw || '(无)'}`)

  // 不应暴露到 0.0.0.0（应由反代承接）
  const host = unit.match(/HOST=(\S+)/m)?.[1] ?? ''
  record('只监听本机', host === '127.0.0.1' || host === 'localhost', host || '(未设置 HOST)')
}

// ---- 3) Litestream 配置 ----
const lsPath = join(PROJECT_ROOT, 'deploy/litestream.yml')
if (!existsSync(lsPath)) {
  record('Litestream 配置存在', false, '缺 deploy/litestream.yml')
} else {
  const ls = readFileSync(lsPath, 'utf-8')
  const y = checkYaml(ls)
  record('Litestream YAML 可解析', y.ok, y.ok ? '语法检查通过' : (y.reason ?? ''))
  record('Litestream 备份 source', /path:\s*\/var\/lib\/retro\/app\.db/.test(ls), '指向持久数据库路径')
  record('Litestream 有保留策略', /retention:/.test(ls), '避免无限增长')
  record('Litestream 有快照间隔', /snapshot-interval:/.test(ls), '完整快照周期')
}

// ---- 4) 与仓库实际的路径自洽性 ----
// 文档/配置里引用 doc/ 的地方必须真的存在（这是画廊的素材源）
const docDir = join(WORKSPACE_ROOT, 'doc/refu-game-001/美术')
record('素材源目录存在', existsSync(docDir), docDir.replace(WORKSPACE_ROOT + '/', ''))

// 部署文档必须存在
const deployDoc = join(PROJECT_ROOT, 'docs/08_部署与备份.md')
record('部署文档存在', existsSync(deployDoc), deployDoc.replace(PROJECT_ROOT + '/', ''))

// ---- 5) 数据库迁移必须入库（schema 的唯一真相） ----
const migDir = join(PROJECT_ROOT, 'server/db/migrations')
const migs = existsSync(migDir) ? (await import('node:fs')).readdirSync(migDir).filter(f => f.endsWith('.sql')) : []
record('迁移 SQL 已生成', migs.length > 0, `${migs.length} 个：${migs.join(', ')}`)

// 数据库文件本身不应入库（走 .gitignore）
const dbFile = join(PROJECT_ROOT, 'data/app.db')
if (existsSync(dbFile)) {
  record('数据库文件已存在（本地）', true, `${(statSync(dbFile).size / 1024).toFixed(0)} KB（应被 .gitignore 忽略）`)
}

const failed = results.filter(r => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} 项通过`)
console.log('\n⚠️  以上仅为**静态**校验。Caddy/systemd/Litestream 能否真正运行必须在')
console.log('    目标机上验证（见 docs/08_部署与备份.md §五 的 smoke test 清单）。')

if (failed.length) {
  console.error(`\n✗ 部署配置校验未通过（${failed.length} 项）`)
  process.exit(1)
}
console.log('\n✓ 部署配置静态校验通过')
