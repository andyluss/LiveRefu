import { useDb, useSqlite, DB_FILE } from '../../../db'
import { boards, threads } from '../../../db/schema'
import { eq } from 'drizzle-orm'

/**
 * 存储健康检查：`/api/health/storage`
 *
 * 为什么需要它：**健康检查如果只返回 `{ok:true}`，那它什么都没验证。**
 * 这个端点真的对 SQLite 做一轮读写（写入 → 读回 → 删除），并检查
 * 外键约束是否真的生效、WAL 是否开启、迁移是否已应用。
 *
 * 用途：
 *   - 部署后 smoke test（见 docs/08 §五）
 *   - 备份/恢复演练里验证"恢复出来的库确实可用"
 *
 * 安全性：只在本进程内做临时读写并回滚式清理，不依赖请求参数，不暴露数据。
 * 生产环境建议用防火墙/反代限制该路径，或仅在部署脚本中调用。
 */
export default defineEventHandler(async (event) => {
  const checks: Array<{ name: string; ok: boolean; detail: string }> = []
  const push = (name: string, ok: boolean, detail: string) => checks.push({ name, ok, detail })

  const sqlite = useSqlite()
  const db = useDb()

  // 1) 迁移状态
  let appliedMigrations: string[] = []
  try {
    appliedMigrations = sqlite
      .query<{ name: string }, []>('SELECT name FROM _migrations ORDER BY name')
      .all()
      .map(r => r.name)
    push('迁移已应用', appliedMigrations.length > 0, `${appliedMigrations.length} 个：${appliedMigrations.join(', ') || '（无）'}`)
  } catch (e) {
    push('迁移已应用', false, e instanceof Error ? e.message : String(e))
  }

  // 2) WAL 模式（与 Litestream 备份配合的前提）
  try {
    const mode = sqlite.query<{ journal_mode: string }, []>('PRAGMA journal_mode').get()?.journal_mode ?? '?'
    push('WAL 模式', mode.toLowerCase() === 'wal', mode)
  } catch (e) {
    push('WAL 模式', false, e instanceof Error ? e.message : String(e))
  }

  // 3) 外键约束确实打开（否则 schema 里的 references 形同虚设）
  try {
    const fk = sqlite.query<{ foreign_keys: number }, []>('PRAGMA foreign_keys').get()?.foreign_keys ?? 0
    push('外键约束开启', fk === 1, fk === 1 ? 'ON' : 'OFF')
  } catch (e) {
    push('外键约束开启', false, e instanceof Error ? e.message : String(e))
  }

  // 4) 真实读写往返（这是最要紧的一项）
  const probe = `__healthcheck_${Date.now()}`
  try {
    const inserted = await db
      .insert(boards)
      .values({ slug: probe, name: '健康检查', description: '临时记录，检查后删除' })
      .returning({ id: boards.id })
    const id = inserted[0]!.id
    const readBack = await db.select().from(boards).where(eq(boards.slug, probe)).get()
    const ok = readBack?.id === id && readBack.name === '健康检查'
    await db.delete(boards).where(eq(boards.id, id))
    const gone = await db.select().from(boards).where(eq(boards.id, id)).get()
    push('读写往返', ok && !gone, ok ? '写入→读回→删除 一致' : '读回内容不一致')
  } catch (e) {
    push('读写往返', false, e instanceof Error ? e.message : String(e))
  }

  // 5) 外键**真的**会拦截非法引用（不只是 PRAGMA 说 ON）
  try {
    let rejected = false
    try {
      await db.insert(threads).values({ boardId: 999999, authorId: 999999, title: 'x', slug: `__fk_${Date.now()}` })
    } catch {
      rejected = true
    }
    push('外键拦截非法引用', rejected, rejected ? '已拒绝不存在的 boardId' : '未拒绝（约束未生效）')
  } catch (e) {
    push('外键拦截非法引用', false, e instanceof Error ? e.message : String(e))
  }

  // 6) 表齐全
  try {
    const names = sqlite
      .query<{ name: string }, []>("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
      .all()
      .map(r => r.name)
    const expected = ['_migrations', 'boards', 'posts', 'sessions', 'threads', 'users']
    const missing = expected.filter(n => !names.includes(n))
    push('业务表齐全', missing.length === 0, missing.length ? `缺：${missing.join(', ')}` : `${names.length} 张表`)
  } catch (e) {
    push('业务表齐全', false, e instanceof Error ? e.message : String(e))
  }

  // 7) 规模（供运维观察）
  try {
    const row = sqlite
      .query<{ u: number; t: number; p: number }, []>(
        `SELECT (SELECT COUNT(*) FROM users) AS u,
                (SELECT COUNT(*) FROM threads) AS t,
                (SELECT COUNT(*) FROM posts) AS p`,
      )
      .get()
    push('数据规模', true, `用户 ${row?.u ?? 0} · 主题 ${row?.t ?? 0} · 楼层 ${row?.p ?? 0}`)
  } catch (e) {
    push('数据规模', false, e instanceof Error ? e.message : String(e))
  }

  const failed = checks.filter(c => !c.ok)
  setResponseStatus(event, failed.length ? 503 : 200)

  return {
    ok: failed.length === 0,
    database: DB_FILE,
    driver: 'bun:sqlite',
    migrations: appliedMigrations,
    checks,
    // 便于部署脚本 grep
    summary: `${checks.length - failed.length}/${checks.length} 通过`,
  }
})
