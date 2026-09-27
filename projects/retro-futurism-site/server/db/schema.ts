/**
 * 服务端数据库 schema（Drizzle ORM + SQLite）。
 *
 * 依据 [D5](../../docs/00_决策记录.md) 的 **Bundle A（全自托管 SQLite）**：
 * 内容用 Nuxt Content 的文件式集合（构建期），**社区数据**用这里的 SQLite（运行期）。
 * 两者都由 Bun 内置的 `bun:sqlite` 支撑，**不需要任何外部服务**。
 *
 * 范围说明：这些表是 **M2 第二阶段（自建论坛）** 的数据基础，按
 * [03 §3.4](../../docs/03_信息架构与内容模型.md) 的表结构草案建立。
 * 当前只建表 + 跑通"能写入能读出"，**业务逻辑与接口等触发条件满足后再做**
 * （见 [07 §三](../../docs/07_实现记录_M2.md)）。
 */

import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

const now = sql`(unixepoch())`

/** 用户（D7：自建邮箱密码 + 会话 Cookie） */
export const users = sqliteTable(
  'users',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    /** 登录名 */
    name: text('name').notNull(),
    email: text('email').notNull(),
    /** argon2id 哈希（用 Bun.password，零依赖），绝不存明文 */
    passwordHash: text('password_hash').notNull(),
    /** member | moderator | admin */
    role: text('role').notNull().default('member'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(now),
  },
  t => ({
    emailIdx: uniqueIndex('users_email_idx').on(t.email),
    nameIdx: uniqueIndex('users_name_idx').on(t.name),
  }),
)

/** 会话（nuxt-auth-utils 写 Cookie，这里存服务端记录以便吊销） */
export const sessions = sqliteTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(now),
  },
  t => ({
    userIdx: index('sessions_user_idx').on(t.userId),
  }),
)

/** 板块 */
export const boards = sqliteTable(
  'boards',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    /** 展示顺序 */
    sortOrder: integer('sort_order').notNull().default(0),
  },
  t => ({
    slugIdx: uniqueIndex('boards_slug_idx').on(t.slug),
  }),
)

/** 主题 */
export const threads = sqliteTable(
  'threads',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    boardId: integer('board_id').notNull().references(() => boards.id, { onDelete: 'cascade' }),
    authorId: integer('author_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
    title: text('title').notNull(),
    slug: text('slug').notNull(),
    pinned: integer('pinned', { mode: 'boolean' }).notNull().default(false),
    locked: integer('locked', { mode: 'boolean' }).notNull().default(false),
    /** 冗余计数，避免列表页每次 COUNT */
    replyCount: integer('reply_count').notNull().default(0),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(now),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(now),
  },
  t => ({
    boardIdx: index('threads_board_idx').on(t.boardId),
    slugIdx: uniqueIndex('threads_slug_idx').on(t.slug),
    updatedIdx: index('threads_updated_idx').on(t.updatedAt),
  }),
)

/** 楼层 / 回复 */
export const posts = sqliteTable(
  'posts',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    threadId: integer('thread_id').notNull().references(() => threads.id, { onDelete: 'cascade' }),
    authorId: integer('author_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
    body: text('body').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(now),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(now),
  },
  t => ({
    threadIdx: index('posts_thread_idx').on(t.threadId, t.createdAt),
  }),
)

export const schema = { users, sessions, boards, threads, posts }
