// SPDX-License-Identifier: UNLICENSED
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs'
import { dirname, extname, join, normalize, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { AppConfig, CollectionConfig, Field, LifeEntry, PackConfig, PublicConfig, StateResponse, Summary } from './types.ts'

const SHARED_WEB = fileURLToPath(new URL('../web/', import.meta.url))
const MAX_BODY = 500_000
type Req = IncomingMessage
type Res = ServerResponse
interface LifeStore { version: 2; settings: { packs: Record<string, boolean> }; entries: LifeEntry[]; modules: Record<string, LifeEntry[]> }

const now = (): string => new Date().toISOString()
const today = (): string => new Date().toISOString().slice(0, 10)
const uid = (): string => `ent_${crypto.randomUUID().slice(0, 8)}`
const str = (v: unknown): string => typeof v === 'string' ? v.trim() : ''
function json(res: Res, status: number, data: unknown): void { res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }); res.end(JSON.stringify(data)) }
function fail(res: Res, status: number, message: string): void { json(res, status, { error: message }) }
function body(req: Req): Promise<Record<string, unknown>> {
  return new Promise((resolveBody, reject) => {
    let size = 0; const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => { size += chunk.length; if (size > MAX_BODY) { reject(new Error('请求体过大')); req.destroy(); return } chunks.push(chunk) })
    req.on('end', () => { if (!chunks.length) return resolveBody({}); try { resolveBody(JSON.parse(Buffer.concat(chunks).toString('utf8'))) } catch { reject(new Error('JSON 解析失败')) } })
    req.on('error', reject)
  })
}
function modulesOf(config: AppConfig): Array<{ pack: PackConfig; module: CollectionConfig }> {
  return (config.packs || []).flatMap(pack => pack.modules.map(module => ({ pack, module })))
}
function publicConfig(config: AppConfig): PublicConfig {
  const { summary: _s, seed: _seed, packs, ...rest } = config
  return { ...rest, packs: (packs || []).map(p => ({ id: p.id, name: p.name, description: p.description, modules: p.modules.map(({ seed: _sd, summary: _sm, ...m }) => m) })) }
}
function validate(field: Field, raw: unknown): { ok: true; value: string | number } | { ok: false; message: string } {
  const missing = raw === undefined || raw === null || raw === ''
  if (missing) return field.required ? { ok: false, message: `${field.label}不能为空` } : { ok: true, value: '' }
  if (field.type === 'number' || field.type === 'rating') {
    const n = Number(raw)
    if (!Number.isFinite(n)) return { ok: false, message: `${field.label}必须是数字` }
    if (field.min !== undefined && n < field.min) return { ok: false, message: `${field.label}不能小于 ${field.min}` }
    if (field.max !== undefined && n > field.max) return { ok: false, message: `${field.label}不能大于 ${field.max}` }
    return { ok: true, value: n }
  }
  const value = str(raw)
  if (field.type === 'date' && !/^\d{4}-\d{2}-\d{2}$/.test(value)) return { ok: false, message: `${field.label}日期格式不正确` }
  if (field.type === 'time' && !/^\d{2}:\d{2}$/.test(value)) return { ok: false, message: `${field.label}时间格式不正确` }
  if (field.type === 'select' && field.options && !field.options.includes(value)) return { ok: false, message: `${field.label}选项不合法` }
  return { ok: true, value }
}
function normalizeInput(collection: CollectionConfig, input: Record<string, unknown>): { ok: true; date: string; data: Record<string, string | number> } | { ok: false; message: string } {
  const data = input.data && typeof input.data === 'object' ? input.data as Record<string, unknown> : input
  const date = str(input.date || data.date || today())
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { ok: false, message: '日期格式不正确' }
  const out: Record<string, string | number> = {}
  for (const field of collection.fields) {
    if (field.key === 'date') continue
    const result = validate(field, data[field.key])
    if (!result.ok) return result
    if (result.value !== '') out[field.key] = result.value
  }
  return { ok: true, date, data: out }
}
const sortEntries = (entries: LifeEntry[]): LifeEntry[] => [...entries].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
function summaryOf(collection: CollectionConfig, entries: LifeEntry[]): Summary {
  try { return collection.summary(sortEntries(entries)) } catch { return { metrics: [], chart: { label: '', values: new Array(14).fill(0) }, hint: '摘要暂不可用' } }
}
function seedEntries(seed: CollectionConfig['seed']): LifeEntry[] { return (seed || []).map((entry, index) => ({ id: `seed_${index}`, date: entry.date, createdAt: now(), updatedAt: now(), data: entry.data })) }

export interface LifeApp {
  config: AppConfig
  file: string
  start(): ReturnType<typeof createServer>
  handler: (req: Req, res: Res) => Promise<void>
  read(): LifeStore
  write(store: LifeStore): LifeStore
}

export function createLifeApp(config: AppConfig, options: { dataFile?: string } = {}): LifeApp {
  const file = resolve(options.dataFile || process.env.DATA_FILE || 'data/store.json')
  mkdirSync(dirname(file), { recursive: true })
  const modules = modulesOf(config)
  const defaultStore = (): LifeStore => ({
    version: 2,
    settings: { packs: Object.fromEntries((config.packs || []).map(p => [p.id, false])) },
    entries: seedEntries(config.seed),
    modules: Object.fromEntries(modules.map(({ module }) => [module.id, seedEntries(module.seed)]))
  })
  const read = (): LifeStore => {
    if (!existsSync(file)) return defaultStore()
    const raw = JSON.parse(readFileSync(file, 'utf8')) as any
    if (raw.version === 1) return { ...defaultStore(), entries: Array.isArray(raw.entries) ? raw.entries : [] }
    if (raw.version !== 2) throw new Error('store.json 版本不支持')
    return raw as LifeStore
  }
  const write = (store: LifeStore): LifeStore => {
    if (existsSync(file)) copyFileSync(file, `${file}.bak`)
    const tmp = `${file}.tmp`
    writeFileSync(tmp, JSON.stringify(store, null, 2) + '\n', 'utf8')
    renameSync(tmp, file)
    return store
  }
  if (!existsSync(file)) write(defaultStore())
  const stateOf = (store: LifeStore): StateResponse => ({
    config: publicConfig(config),
    settings: store.settings,
    entries: sortEntries(store.entries),
    summary: summaryOf(config, store.entries),
    modules: Object.fromEntries(modules.map(({ module }) => [module.id, { entries: sortEntries(store.modules[module.id] || []), summary: summaryOf(module, store.modules[module.id] || []) }]))
  })
  const createEntry = (res: Res, collection: CollectionConfig, moduleId: string | null, input: Record<string, unknown>): void => {
    const parsed = normalizeInput(collection, input)
    if (!parsed.ok) return fail(res, 400, parsed.message)
    const store = read()
    const entry: LifeEntry = { id: uid(), date: parsed.date, createdAt: now(), updatedAt: now(), data: parsed.data }
    if (moduleId) { store.modules[moduleId] ||= []; store.modules[moduleId]!.push(entry) } else store.entries.push(entry)
    return json(res, 201, stateOf(write(store)))
  }
  const mutateEntry = async (req: Req, res: Res, collection: CollectionConfig, moduleId: string | null, id: string): Promise<void> => {
    const store = read()
    const list = moduleId ? (store.modules[moduleId] || []) : store.entries
    const index = list.findIndex(e => e.id === id)
    if (index < 0) return fail(res, 404, '记录不存在')
    if (req.method === 'DELETE') {
      list.splice(index, 1)
      return json(res, 200, stateOf(write(store)))
    }
    const input = await body(req)
    const current = list[index]!
    const merged = { ...current, ...input, date: str(input.date) || current.date, data: { ...current.data, ...(input.data && typeof input.data === 'object' ? input.data as Record<string, unknown> : {}) } }
    const parsed = normalizeInput(collection, merged)
    if (!parsed.ok) return fail(res, 400, parsed.message)
    list[index] = { ...current, date: parsed.date, data: parsed.data, updatedAt: now() }
    return json(res, 200, stateOf(write(store)))
  }
  const handler = async (req: Req, res: Res): Promise<void> => {
    const url = new URL(req.url || '/', `http://${req.headers.host || '127.0.0.1'}`)
    const path = url.pathname
    try {
      if (path === '/api/health') return json(res, 200, { ok: true, app: config.id, version: '2.0.0' })
      if (path === '/api/state' && req.method === 'GET') return json(res, 200, stateOf(read()))
      if (path === '/api/backup' && req.method === 'GET') {
        res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'content-disposition': `attachment; filename="${config.id}-${today()}.json"` })
        return void res.end(JSON.stringify(read(), null, 2))
      }
      if (path === '/api/settings' && req.method === 'PATCH') {
        const input = await body(req)
        const store = read()
        if (input.packs && typeof input.packs === 'object') {
          for (const [id, value] of Object.entries(input.packs as Record<string, unknown>)) {
            if (!(config.packs || []).some(p => p.id === id)) return fail(res, 400, `未知扩展包：${id}`)
            if (typeof value !== 'boolean') return fail(res, 400, `扩展包 ${id} 必须是布尔值`)
            store.settings.packs[id] = value
          }
        }
        return json(res, 200, stateOf(write(store)))
      }
      if (path === '/api/reset' && req.method === 'POST') return json(res, 200, stateOf(write(defaultStore())))
      // core collection
      if (path === '/api/entries' && req.method === 'POST') return createEntry(res, config, null, await body(req))
      const coreMatch = path.match(/^\/api\/entries\/([^/]+)$/)
      if (coreMatch && (req.method === 'PATCH' || req.method === 'DELETE')) return mutateEntry(req, res, config, null, decodeURIComponent(coreMatch[1]!))
      // module collection
      const moduleMatch = path.match(/^\/api\/modules\/([^/]+)$/)
      if (moduleMatch) {
        const found = modules.find(m => m.module.id === decodeURIComponent(moduleMatch[1]!))
        if (!found) return fail(res, 404, '模块不存在')
        if (!read().settings.packs[found.pack.id]) return fail(res, 403, '扩展包未开启')
        if (req.method === 'POST') return createEntry(res, found.module, found.module.id, await body(req))
        return fail(res, 405, '方法不允许')
      }
      const moduleEntry = path.match(/^\/api\/modules\/([^/]+)\/([^/]+)$/)
      if (moduleEntry && (req.method === 'PATCH' || req.method === 'DELETE')) {
        const found = modules.find(m => m.module.id === decodeURIComponent(moduleEntry[1]!))
        if (!found) return fail(res, 404, '模块不存在')
        if (!read().settings.packs[found.pack.id]) return fail(res, 403, '扩展包未开启')
        return mutateEntry(req, res, found.module, found.module.id, decodeURIComponent(moduleEntry[2]!))
      }
      if (path.startsWith('/api/')) return fail(res, 404, 'API 不存在')
      const rel = path === '/' ? 'index.html' : decodeURIComponent(path.slice(1))
      const isShared = path.startsWith('/shared/')
      const root = isShared ? SHARED_WEB : resolve('web')
      const abs = normalize(join(root, isShared ? rel.slice('shared/'.length) : rel))
      if (!abs.startsWith(normalize(root)) || !existsSync(abs) || !statSync(abs).isFile()) return fail(res, 404, '文件不存在')
      const types: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json' }
      res.writeHead(200, { 'content-type': types[extname(abs)] || 'application/octet-stream', 'cache-control': 'no-cache' })
      return void res.end(readFileSync(abs))
    } catch (e) {
      if (!res.headersSent) fail(res, 500, e instanceof Error ? e.message : '服务错误')
    }
  }
  const start = () => {
    const server = createServer(handler)
    server.listen(config.port, '127.0.0.1', () => console.log(`${config.name} ${config.english} 2.0.0 · http://127.0.0.1:${config.port}\ndata: ${file}`))
    return server
  }
  return { config, file, start, handler, read, write }
}
