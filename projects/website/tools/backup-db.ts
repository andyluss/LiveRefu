#!/usr/bin/env bun
/**
 * 数据库备份 + **备份可恢复性验证**。
 *
 * 设计依据：[04 §4.2](../../docs/04_数据存储与同步方案.md) 的备份口径。
 *
 * 核心立场（值得单独说）：
 *   **未经验证的备份等于没有备份。**
 *   所以本脚本不是"拷个文件就完事"——它每次都会**打开备份文件、
 *   跑 integrity_check、对比关键表的行数**，确认这份备份真的能用。
 *   只有验证通过的备份才会被保留；验证失败的会改名标 `.bad` 并让脚本以非零码退出。
 *
 * 为什么用 SQLite 在线备份 API（`VACUUM INTO`）而不是 `cp`：
 *   WAL 模式下直接拷 `.db` 可能漏掉还在 WAL 里的已提交事务。
 *   `VACUUM INTO` 会产出一个**一致且已整理**的副本，是 SQLite 官方推荐的备份方式。
 *
 * 用法：
 *   bun run tools/backup-db.ts                       # 备份到 ./backups
 *   bun run tools/backup-db.ts --out=/var/backups/retro
 *   bun run tools/backup-db.ts --keep=14             # 只保留最近 14 份
 *   bun run tools/backup-db.ts --verify=backups/xxx.db   # 只验已有备份
 */

import { Database } from 'bun:sqlite'
import { existsSync, mkdirSync, readdirSync, statSync, unlinkSync, renameSync } from 'node:fs'
import { join, resolve, basename } from 'node:path'

const arg = (name: string, def?: string) => {
  const hit = process.argv.find(a => a.startsWith(`--${name}=`))
  if (hit) return hit.slice(name.length + 3)
  return process.argv.includes(`--${name}`) ? '' : def
}

const PROJECT_ROOT = resolve(import.meta.dir, '..')
const DB_PATH = process.env.DATABASE_PATH || join(PROJECT_ROOT, 'data/app.db')
const OUT_DIR = resolve(arg('out', join(PROJECT_ROOT, 'backups'))!)
const KEEP = Number(arg('keep', '10'))
const ONLY_VERIFY = arg('verify')

/** 关键表：备份验证时对比行数 */
const KEY_TABLES = ['users', 'boards', 'threads', 'posts'] as const

interface VerifyResult {
  ok: boolean
  integrity: string
  counts: Record<string, number>
  error?: string
}

/**
 * 打开一个 SQLite 文件用于**只读校验**。
 *
 * ⚠️ 踩过的坑：不能直接用 `new Database(file, { readonly: true })`。
 * 备份/源库是 WAL 模式，而 WAL 库在只读打开时仍需要创建 `-shm` 共享内存文件；
 * 若目录不可写（或 `-shm` 不存在），Bun 会直接抛
 * `SQLITE_CANTOPEN: unable to open database file`——**看起来像"文件打不开"，
 * 实际是"没有目录写权限"**，极易误判成备份损坏。
 *
 * 改用：可读写打开 + `PRAGMA query_only = ON`。
 * 效果等价于只读（本连接不会写），且不依赖目录权限。
 */
function openReadOnly(file: string): Database {
  const db = new Database(file, { create: true })
  db.exec('PRAGMA query_only = ON;')
  return db
}

/**
 * 验证一个 SQLite 文件是否可用：
 *   1. integrity_check 必须是 "ok"
 *   2. 关键表必须存在且可查询
 * 这就是"备份能不能真的恢复出可用数据库"的最小可信判据。
 */
function verify(file: string): VerifyResult {
  const counts: Record<string, number> = {}
  if (!existsSync(file)) {
    return { ok: false, integrity: '文件不存在', counts, error: 'not found' }
  }
  let db: Database | null = null
  try {
    db = openReadOnly(file)
    const integrity = db.query<{ integrity_check: string }, []>('PRAGMA integrity_check').get()?.integrity_check ?? '（无输出）'
    for (const t of KEY_TABLES) {
      try {
        counts[t] = db.query<{ n: number }, []>(`SELECT COUNT(*) AS n FROM ${t}`).get()?.n ?? -1
      } catch {
        counts[t] = -1 // 表缺失
      }
    }
    const missing = KEY_TABLES.filter(t => counts[t] === -1)
    return {
      ok: integrity === 'ok' && missing.length === 0,
      integrity,
      counts,
      error: missing.length ? `缺表：${missing.join(', ')}` : undefined,
    }
  } catch (e) {
    return { ok: false, integrity: '打开失败', counts, error: e instanceof Error ? e.message : String(e) }
  } finally {
    db?.close()
  }
}

function fmtCounts(c: Record<string, number>) {
  return Object.entries(c).map(([k, v]) => `${k}=${v}`).join(' ')
}

// ---- 只验证模式 ----
if (ONLY_VERIFY !== undefined) {
  const target = resolve(ONLY_VERIFY)
  const v = verify(target)
  console.log(`验证备份：${target}`)
  console.log(`  integrity_check : ${v.integrity}`)
  console.log(`  行数            : ${fmtCounts(v.counts)}`)
  if (!v.ok) {
    console.error(`✗ 备份不可用${v.error ? `（${v.error}）` : ''}`)
    process.exit(1)
  }
  console.log('\n✓ 备份可用')
  process.exit(0)
}

// ---- 备份模式 ----
if (!existsSync(DB_PATH)) {
  console.error(`✗ 源数据库不存在：${DB_PATH}`)
  console.error('  请先 `bun run db:migrate`')
  process.exit(1)
}

mkdirSync(OUT_DIR, { recursive: true })
const stamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19)
const dest = join(OUT_DIR, `app-${stamp}.db`)

console.log(`源数据库 : ${DB_PATH}`)
console.log(`备份到   : ${dest}\n`)

// 源库信息（同时确认源库本身是健康的——不健康的源库备份出来也是坏的）
//
// ⚠️ 这里必须用**可写**连接：`VACUUM INTO` 对源库是一次写操作
// （开启读事务并写出目标文件），在 `query_only=ON` 的连接上会报
// "attempt to write a readonly database"。只读语义只用于校验，见 openReadOnly()。
const src = new Database(DB_PATH, { create: true })
const srcIntegrity = src.query<{ integrity_check: string }, []>('PRAGMA integrity_check').get()?.integrity_check
const srcCounts: Record<string, number> = {}
for (const t of KEY_TABLES) {
  try {
    srcCounts[t] = src.query<{ n: number }, []>(`SELECT COUNT(*) AS n FROM ${t}`).get()?.n ?? -1
  } catch {
    srcCounts[t] = -1
  }
}
if (srcIntegrity !== 'ok') {
  src.close()
  console.error(`✗ 源数据库 integrity_check = ${srcIntegrity}，请先排查再备份`)
  process.exit(1)
}

// SQLite 官方推荐的一致备份方式（WAL 安全）
//
// 注意：`VACUUM INTO` **不会创建父目录**，目标目录不存在时只报一句
// "unable to open database file"，很容易被误读成"源库打不开"。
// 所以这里显式建目录，并在失败时把真实原因说清楚。
mkdirSync(OUT_DIR, { recursive: true })
try {
  src.exec(`VACUUM INTO '${dest.replace(/'/g, "''")}'`)
} catch (e) {
  src.close()
  const msg = e instanceof Error ? e.message : String(e)
  console.error(`✗ 备份失败：${msg}`)
  console.error(`  源库：${DB_PATH}`)
  console.error(`  目标：${dest}（目录存在=${existsSync(OUT_DIR)}，可写=${(() => { try { mkdirSync(OUT_DIR, { recursive: true }); return true } catch { return false } })()}）`)
  process.exit(1)
}
src.close()

if (!existsSync(dest)) {
  console.error(`✗ 备份命令未报错但目标文件不存在：${dest}`)
  process.exit(1)
}

const size = statSync(dest).size

// **关键一步**：验证刚产出的备份
const v = verify(dest)
console.log(`源库行数   : ${fmtCounts(srcCounts)}`)
console.log(`备份行数   : ${fmtCounts(v.counts)}`)
console.log(`备份大小   : ${(size / 1024).toFixed(1)} KB`)
console.log(`integrity  : ${v.integrity}`)

const countsMatch = KEY_TABLES.every(t => srcCounts[t] === v.counts[t])
if (!countsMatch) console.log('⚠ 行数与源库不一致')

if (!v.ok || !countsMatch) {
  const bad = `${dest}.bad`
  renameSync(dest, bad)
  console.error(`\n✗ 备份验证未通过，已标记为 ${basename(bad)}`)
  if (v.error) console.error(`  原因：${v.error}`)
  process.exit(1)
}

console.log('\n✓ 备份已生成并通过验证')

// ---- 清理旧备份（只删已验证命名的，不碰 .bad） ----
const files = readdirSync(OUT_DIR)
  .filter(f => f.startsWith('app-') && f.endsWith('.db'))
  .sort()
  .reverse()
if (files.length > KEEP) {
  const drop = files.slice(KEEP)
  for (const f of drop) {
    unlinkSync(join(OUT_DIR, f))
    console.log(`  已清理旧备份 ${f}`)
  }
}
console.log(`当前保留 ${Math.min(files.length, KEEP)} 份（--keep=${KEEP}）`)
