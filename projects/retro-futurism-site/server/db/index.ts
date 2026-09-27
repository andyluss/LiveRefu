import { drizzle } from 'drizzle-orm/bun-sqlite'
import { Database } from 'bun:sqlite'
import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import * as schema from './schema'

/**
 * 数据访问门面（[04 §3.3](../../docs/04_数据存储与同步方案.md) 建议的「薄数据访问层」）。
 *
 * **为什么要有这一层**：Drizzle 抽象了方言，`server/db/index.ts` 是唯一的连接点。
 * 日后若要把 SQLite 换成 Postgres（或接 PocketBase），改这里的实现即可，
 * **页面与路由代码基本不动**——这就是"选最简单的方案，但不让它变成锁定"。
 *
 * 驱动说明：用 Bun 内置的 `bun:sqlite`（零依赖）。
 * 这与 [02 §3.2](../../docs/02_技术栈与选型.md) 的实测结论一致：
 * Bun 下 Nuxt Content 也是靠它，**不需要 better-sqlite3**。
 * 因此本文件**只能由 Bun 运行**（`bun start`），这也是 D6 的部署要求。
 */

const DB_PATH = process.env.DATABASE_PATH || resolve(process.cwd(), 'data/app.db')

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null
let _sqlite: Database | null = null

/** 打开（或新建）数据库；进程内复用同一连接 */
export function useDb() {
  if (_db) return _db

  mkdirSync(dirname(DB_PATH), { recursive: true })
  _sqlite = new Database(DB_PATH, { create: true })

  // WAL：读写并发更好，且与 Litestream 的持续复制配合良好
  // （见 04 §六 S4、§4.2 备份口径）
  _sqlite.exec('PRAGMA journal_mode = WAL;')
  // 外键约束默认关闭，必须显式打开，否则 schema 里的 references 形同虚设
  _sqlite.exec('PRAGMA foreign_keys = ON;')
  // 崩溃恢复与写入性能的平衡点
  _sqlite.exec('PRAGMA synchronous = NORMAL;')

  _db = drizzle(_sqlite, { schema })
  return _db
}

/** 原始连接（迁移、PRAGMA、健康检查用） */
export function useSqlite(): Database {
  useDb()
  return _sqlite!
}

export const DB_FILE = DB_PATH

export { schema }
