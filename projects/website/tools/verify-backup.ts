#!/usr/bin/env bun
/**
 * 备份/恢复演练验收（M3）。
 *
 * 为什么要有这个脚本：
 *   **未经验证的备份等于没有备份。** 但"备份脚本跑完退出码 0"并不构成验证——
 *   它只证明脚本没崩，不证明产出物能用。本脚本做的是一条**完整闭环演练**：
 *
 *     造数据 → 备份 → 校验能读回同样行数 → **篡改备份** → 确认会被拒绝
 *                                                    → 恢复 → 确认恢复出来的库可用
 *
 *   最后两步是关键：**一个永远说"备份 OK"的校验器毫无价值**，
 *   所以必须证明它在备份损坏时真的会失败。
 *
 * 全程在临时目录里做，不碰真实 data/app.db。
 *
 * 用法：
 *   bun run tools/verify-backup.ts
 */

import { Database } from 'bun:sqlite'
import { mkdtempSync, rmSync, copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const results: Array<{ name: string; ok: boolean; detail: string }> = []
const record = (name: string, ok: boolean, detail: string) => {
  results.push({ name, ok, detail })
  console.log(`  ${ok ? '✓' : '✗'} ${name.padEnd(26)} ${detail}`)
}

const WORK = mkdtempSync(join(tmpdir(), 'backup-drill-'))
const SRC_DB = join(WORK, 'app.db')
const OUT_DIR = join(WORK, 'backups')
const PROJECT_ROOT = join(import.meta.dir, '..')

const KEY_TABLES = ['users', 'boards', 'threads', 'posts'] as const

function counts(file: string): Record<string, number> {
  const db = new Database(file, { create: true })
  db.exec('PRAGMA query_only = ON;')
  const out: Record<string, number> = {}
  for (const t of KEY_TABLES) {
    out[t] = db.query<{ n: number }, []>(`SELECT COUNT(*) AS n FROM ${t}`).get()?.n ?? -1
  }
  db.close()
  return out
}

/** 跑一个子进程，返回 {code, out} */
async function run(cmd: string[], env: Record<string, string> = {}) {
  const proc = Bun.spawn(cmd, {
    cwd: PROJECT_ROOT,
    env: { ...process.env, ...env },
    stdout: 'pipe',
    stderr: 'pipe',
  })
  const code = await proc.exited
  const out = (await new Response(proc.stdout).text()) + (await new Response(proc.stderr).text())
  return { code, out }
}

console.log(`备份/恢复演练（工作目录 ${WORK}）\n`)

try {
  // ---- 1) 建一个带真实数据的库（用正式迁移，顺带验证迁移器） ----
  const mig = await run(['bun', 'run', 'server/db/migrate.ts'], { DATABASE_PATH: SRC_DB })
  record('迁移建库', mig.code === 0, mig.code === 0 ? '迁移器执行成功' : mig.out.slice(-200))

  const db = new Database(SRC_DB, { create: true })
  db.exec('PRAGMA foreign_keys = ON;')
  db.exec(`
    INSERT INTO users (name, email, password_hash) VALUES ('tester','t@example.com','x');
    INSERT INTO boards (slug, name) VALUES ('general','综合');
    INSERT INTO threads (board_id, author_id, title, slug) VALUES (1,1,'测试主题','t1');
    INSERT INTO posts (thread_id, author_id, body) VALUES (1,1,'第一层');
    INSERT INTO posts (thread_id, author_id, body) VALUES (1,1,'第二层');
  `)
  db.close()
  const before = counts(SRC_DB)
  record('造数据', before.users === 1 && before.threads === 1 && before.posts === 2,
    `users=${before.users} boards=${before.boards} threads=${before.threads} posts=${before.posts}`)

  // ---- 2) 备份 ----
  const bk = await run(['bun', 'run', 'tools/backup-db.ts', `--out=${OUT_DIR}`], { DATABASE_PATH: SRC_DB })
  record('备份并自校验', bk.code === 0, bk.code === 0 ? '备份脚本退出码 0（内部已校验）' : bk.out.slice(-200))

  const made = existsSync(OUT_DIR)
    ? (await import('node:fs')).readdirSync(OUT_DIR).filter(f => f.endsWith('.db')).sort()
    : []
  record('产出备份文件', made.length === 1, made.join(', ') || '（无）')
  if (made.length === 0) throw new Error('没有产出备份，后续步骤无法进行')
  const backupFile = join(OUT_DIR, made[made.length - 1]!)

  // ---- 3) 备份内容与源库一致 ----
  const afterBk = counts(backupFile)
  const same = KEY_TABLES.every(t => before[t] === afterBk[t])
  record('备份行数一致', same, `源 users=${before.users}/posts=${before.posts} → 备份 users=${afterBk.users}/posts=${afterBk.posts}`)

  // ---- 4) 独立校验模式也应通过 ----
  const v1 = await run(['bun', 'run', 'tools/backup-db.ts', `--verify=${backupFile}`])
  record('独立校验通过', v1.code === 0, v1.code === 0 ? '--verify 退出码 0' : v1.out.slice(-160))

  // ---- 5) 篡改备份 → 必须被拒绝（这一步证明校验器不是空跑） ----
  const corrupt = join(WORK, 'corrupt.db')
  copyFileSync(backupFile, corrupt)
  const buf = readFileSync(corrupt)
  const mid = Math.floor(buf.length / 2)
  for (let i = mid; i < Math.min(mid + 2048, buf.length); i++) buf[i] = 0xde
  writeFileSync(corrupt, buf)
  const v2 = await run(['bun', 'run', 'tools/backup-db.ts', `--verify=${corrupt}`])
  record('拒绝损坏的备份', v2.code !== 0, v2.code !== 0 ? `退出码 ${v2.code}（已拒绝）` : '⚠ 竟然通过了！校验器无效')

  // ---- 6) 恢复：把备份当数据库用，并跑真实查询 ----
  const restored = join(WORK, 'restored.db')
  copyFileSync(backupFile, restored)
  const rdb = new Database(restored, { create: true })
  rdb.exec('PRAGMA foreign_keys = ON;')
  const joined = rdb
    .query<{ title: string; body: string }, []>(
      `SELECT t.title AS title, p.body AS body
       FROM posts p JOIN threads t ON t.id = p.thread_id
       ORDER BY p.id`,
    )
    .all()
  rdb.close()
  const restoredOk = joined.length === 2 && joined[0]!.title === '测试主题'
  record('恢复后可查询', restoredOk, restoredOk ? `联表读回 ${joined.length} 层（${joined.map(j => j.body).join('/')}）` : JSON.stringify(joined))

  // ---- 7) 恢复出来的库能通过存储健康检查的判据（表齐全 + integrity ok） ----
  const rdb2 = new Database(restored, { create: true })
  const integrity = rdb2.query<{ integrity_check: string }, []>('PRAGMA integrity_check').get()?.integrity_check
  rdb2.close()
  record('恢复库完整性', integrity === 'ok', `integrity_check = ${integrity}`)
} finally {
  rmSync(WORK, { recursive: true, force: true })
}

const failed = results.filter(r => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} 项通过`)
if (failed.length) {
  console.error('✗ 备份/恢复演练未通过')
  process.exit(1)
}
console.log('✓ 备份/恢复演练通过（含"损坏备份会被拒绝"的反向证明）')
