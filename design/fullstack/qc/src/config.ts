import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

export interface QcConfig {
  site: { name: string }
  db: { path: string }
  server: { host: string; port: number }
}

const defaults: QcConfig = {
  site: { name: 'QC App' },
  db: { path: 'data/app.db' },
  server: { host: '127.0.0.1', port: 3000 },
}

export function resolveConfig(user: Partial<QcConfig>, appRoot: string): QcConfig {
  const root = resolve(appRoot)
  const config: QcConfig = {
    site: { ...defaults.site, ...(user.site ?? {}) },
    db: { ...defaults.db, ...(user.db ?? {}) },
    server: { ...defaults.server, ...(user.server ?? {}) },
  }
  if (process.env.QC_DB_PATH) config.db.path = process.env.QC_DB_PATH
  if (process.env.PORT) config.server.port = Number(process.env.PORT)
  if (process.env.HOST) config.server.host = process.env.HOST
  config.db.path = resolve(root, config.db.path)
  return config
}

export async function loadConfig(appRoot: string): Promise<QcConfig> {
  const root = resolve(appRoot)
  const file = join(root, 'qc.config.ts')
  let user: Partial<QcConfig> = {}
  if (existsSync(file)) {
    const mod = await import(pathToFileURL(file).href)
    user = mod.default ?? {}
  }
  return resolveConfig(user, root)
}
