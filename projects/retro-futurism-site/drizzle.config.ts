import type { Config } from 'drizzle-kit'

/**
 * drizzle-kit 配置（仅用于 `bun run db:generate` 生成迁移 SQL）。
 *
 * 注意：迁移的**执行**不走 drizzle-kit，而由 `server/db/migrate.ts` 在应用启动/部署时跑，
 * 理由见该文件头部（部署机上只需 Bun，不必装 drizzle-kit）。
 */
export default {
  schema: './server/db/schema.ts',
  out: './server/db/migrations',
  dialect: 'sqlite',
  dbCredentials: {
    url: process.env.DATABASE_PATH || './data/app.db',
  },
} satisfies Config
