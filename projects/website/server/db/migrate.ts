#!/usr/bin/env bun
/**
 * 迁移执行器：按序应用 `server/db/migrations/*.sql`。
 *
 * 为什么不用 drizzle-kit 跑迁移：部署机上只需要**一个 Bun**。
 * drizzle-kit 是 devDependency（体积不小），让它在生产跑会平白多一层依赖与风险。
 * 这里用 `bun:sqlite` 直接执行生成的 SQL，并把已应用的文件名记在 `_migrations` 表里，
 * 保证**幂等、可重复执行**（部署脚本可以无脑每次跑）。
 *
 * 用法：
 *   bun run db:migrate
 *   DATABASE_PATH=/var/lib/retro/data/app.db bun run db:migrate
 */

import { Database } from 'bun:sqlite'
import { readdirSync, readFileSync, mkdirSync, existsSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const MIGRATIONS_DIR = join(HERE, 'migrations')
const DB_PATH = process.env.DATABASE_PATH || resolve(process.cwd(), 'data/app.db')

if (!existsSync(MIGRATIONS_DIR)) {
  console.error(`✗ 未找到迁移目录：${MIGRATIONS_DIR}`)
  process.exit(1)
}

mkdirSync(dirname(DB_PATH), { recursive: true })
const db = new Database(DB_PATH, { create: true })
db.exec('PRAGMA journal_mode = WAL;')
db.exec('PRAGMA foreign_keys = ON;')

// 迁移记录表（不放进 Drizzle schema：它是基建表，不属于业务模型）
db.exec(`
  CREATE TABLE IF NOT EXISTS _migrations (
    name       TEXT PRIMARY KEY,
    applied_at INTEGER NOT NULL DEFAULT (unixepoch())
  );
`)

const applied = new Set(
  db.query<{ name: string }, []>('SELECT name FROM _migrations').all().map(r => r.name),
)

const files = readdirSync(MIGRATIONS_DIR)
  .filter(f => f.endsWith('.sql'))
  .sort()

if (files.length === 0) {
  console.error('✗ 迁移目录里没有 .sql，请先 `bun run db:generate`')
  process.exit(1)
}

let ran = 0
for (const file of files) {
  if (applied.has(file)) continue
  const sqlText = readFileSync(join(MIGRATIONS_DIR, file), 'utf-8')
  // 每个迁移文件在**一个事务**里执行：失败则整体回滚，不留半截 schema
  const run = db.transaction(() => {
    db.exec(sqlText)
    db.query('INSERT INTO _migrations (name) VALUES (?)').run(file)
  })
  try {
    run()
    ran++
    console.log(`  ✓ 应用 ${file}`)
  } catch (e) {
    console.error(`  ✗ ${file} 失败：${e instanceof Error ? e.message : String(e)}`)
    db.close()
    process.exit(1)
  }
}

const total = db.query<{ n: number }, []>('SELECT COUNT(*) AS n FROM _migrations').get()?.n ?? 0
const tables = db
  .query<{ name: string }, []>("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
  .all()
  .map(r => r.name)

console.log(`\n数据库      : ${DB_PATH}`)
console.log(`已应用      : ${ran} 个新迁移（累计 ${total}）`)
console.log(`表          : ${tables.join(', ')}`)
db.close()
console.log('\n✓ 迁移完成')
