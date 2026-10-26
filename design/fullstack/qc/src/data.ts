import { DatabaseSync } from 'node:sqlite'
import { nowIso } from './time.ts'
import { existsSync, mkdirSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'

function quoteIdent(name: string): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) throw new Error(`非法表/列名: ${name}`)
  return `"${name}"`
}

export class Db {
  raw: DatabaseSync
  constructor(raw: DatabaseSync) { this.raw = raw }

  query<T = Record<string, unknown>>(sql: string, params: unknown[] = []): T[] {
    return this.raw.prepare(sql).all(...(params as any[])) as T[]
  }

  one<T = Record<string, unknown>>(sql: string, params: unknown[] = []): T | null {
    const row = this.raw.prepare(sql).get(...(params as any[]))
    return (row as T | undefined) ?? null
  }

  run(sql: string, params: unknown[] = []): { changes: number; lastInsertRowid: number } {
    const result = this.raw.prepare(sql).run(...(params as any[]))
    return {
      changes: Number(result.changes),
      lastInsertRowid: Number(result.lastInsertRowid),
    }
  }

  insert(table: string, data: Record<string, unknown>): number {
    const keys = Object.keys(data)
    if (!keys.length) throw new Error('insert 需要至少一个字段')
    const sql = `insert into ${quoteIdent(table)} (${keys.map(quoteIdent).join(', ')}) values (${keys.map(() => '?').join(', ')})`
    return this.run(sql, keys.map(k => data[k])).lastInsertRowid
  }

  transaction<T>(fn: () => T): T {
    this.raw.exec('begin')
    try {
      const result = fn()
      this.raw.exec('commit')
      return result
    } catch (error) {
      this.raw.exec('rollback')
      throw error
    }
  }

  close(): void {
    this.raw.close()
  }
}

export function openDatabase(path: string): Db {
  mkdirSync(dirname(path), { recursive: true })
  const db = new DatabaseSync(path)
  db.exec('pragma journal_mode = wal')
  db.exec('pragma foreign_keys = on')
  return new Db(db)
}

export function migrate(db: Db, migrationsDir: string): string[] {
  db.raw.exec(`create table if not exists _qc_migrations (
    name text primary key,
    applied_at text not null
  )`)
  if (!existsSync(migrationsDir)) return []
  const applied = new Set(db.query<{ name: string }>('select name from _qc_migrations').map(row => row.name))
  const files = readdirSync(migrationsDir).filter(name => name.endsWith('.sql')).sort()
  const ran: string[] = []
  for (const file of files) {
    if (applied.has(file)) continue
    const sql = readFileSync(join(migrationsDir, file), 'utf8')
    db.transaction(() => {
      db.raw.exec(sql)
      db.run('insert into _qc_migrations (name, applied_at) values (?, ?)', [file, nowIso()])
    })
    ran.push(file)
  }
  return ran
}
