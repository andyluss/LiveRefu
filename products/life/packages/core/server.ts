// SPDX-License-Identifier: UNLICENSED
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, statSync, writeFileSync } from 'node:fs'
import { dirname, extname, join, normalize, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { AppConfig, Field, LifeEntry, PublicConfig, StateResponse, Summary } from './types.ts'

const SHARED_WEB = fileURLToPath(new URL('../web/', import.meta.url))
const MAX_BODY = 500_000
type Req = IncomingMessage
type Res = ServerResponse

const now = (): string => new Date().toISOString()
const today = (): string => new Date().toISOString().slice(0, 10)
const uid = (): string => `ent_${crypto.randomUUID().slice(0, 8)}`
const str = (v: unknown): string => typeof v === 'string' ? v.trim() : ''
const valueOf = (v: unknown): string | number => typeof v === 'number' ? v : str(v)

function json(res: Res, status: number, data: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
  res.end(JSON.stringify(data))
}
function fail(res: Res, status: number, message: string): void { json(res, status, { error: message }) }
function body(req: Req): Promise<Record<string, unknown>> {
  return new Promise((resolveBody, reject) => {
    let size = 0
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => {
      size += chunk.length
      if (size > MAX_BODY) { reject(new Error('请求体过大')); req.destroy(); return }
      chunks.push(chunk)
    })
    req.on('end', () => {
      if (!chunks.length) return resolveBody({})
      try { resolveBody(JSON.parse(Buffer.concat(chunks).toString('utf8'))) } catch { reject(new Error('JSON 解析失败')) }
    })
    req.on('error', reject)
  })
}
function publicConfig(config: AppConfig): PublicConfig {
  const { summary: _summary, seed: _seed, ...rest } = config
  return rest
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
function normalizeInput(config: AppConfig, input: Record<string, unknown>): { ok: true; date: string; data: Record<string, string | number> } | { ok: false; message: string } {
  const data = input.data && typeof input.data === 'object' ? input.data as Record<string, unknown> : input
  const date = str(input.date || data.date || today())
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { ok: false, message: '日期格式不正确' }
  const out: Record<string, string | number> = {}
  for (const field of config.fields) {
    if (field.key === 'date') continue
    const result = validate(field, data[field.key])
    if (!result.ok) return result
    if (result.value !== '') out[field.key] = result.value
  }
  return { ok: true, date, data: out }
}
function sortEntries(entries: LifeEntry[]): LifeEntry[] {
  return [...entries].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
}
function summaryOf(config: AppConfig, entries: LifeEntry[]): Summary {
  try { return config.summary(sortEntries(entries)) } catch { return { metrics: [], chart: { label: '', values: new Array(14).fill(0) }, hint: '摘要暂不可用' } }
}

export interface LifeApp {
  config: AppConfig
  file: string
  start(): ReturnType<typeof createServer>
  handler: (req: Req, res: Res) => Promise<void>
  read(): { version: number; entries: LifeEntry[] }
  write(entries: LifeEntry[]): { version: number; entries: LifeEntry[] }
}

export function createLifeApp(config: AppConfig, options: { dataFile?: string } = {}): LifeApp {
  const file = resolve(options.dataFile || process.env.DATA_FILE || 'data/store.json')
  mkdirSync(dirname(file), { recursive: true })
  const seed = (): LifeEntry[] => (config.seed || []).map((entry, index) => ({ id: `seed_${index}`, date: entry.date, createdAt: now(), updatedAt: now(), data: entry.data }))
  const read = (): { version: number; entries: LifeEntry[] } => {
    if (!existsSync(file)) return { version: 1, entries: seed() }
    return JSON.parse(readFileSync(file, 'utf8')) as { version: number; entries: LifeEntry[] }
  }
  const write = (entries: LifeEntry[]): { version: number; entries: LifeEntry[] } => {
    if (existsSync(file)) copyFileSync(file, `${file}.bak`)
    const tmp = `${file}.tmp`
    writeFileSync(tmp, JSON.stringify({ version: 1, entries }, null, 2) + '\n', 'utf8')
    renameSync(tmp, file)
    return { version: 1, entries }
  }
  if (!existsSync(file)) write(seed())

  const handler = async (req: Req, res: Res): Promise<void> => {
    const url = new URL(req.url || '/', `http://${req.headers.host || '127.0.0.1'}`)
    const path = url.pathname
    try {
      if (path === '/api/health') return json(res, 200, { ok: true, app: config.id, version: '1.0.0' })
      if (path === '/api/state' && req.method === 'GET') {
        const state = read()
        return json(res, 200, { config: publicConfig(config), entries: sortEntries(state.entries), summary: summaryOf(config, state.entries) } satisfies StateResponse)
      }
      if (path === '/api/backup' && req.method === 'GET') {
        const state = read()
        res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'content-disposition': `attachment; filename="${config.id}-${today()}.json"` })
        return void res.end(JSON.stringify(state, null, 2))
      }
      if (path === '/api/reset' && req.method === 'POST') {
        write(seed())
        return json(res, 200, { config: publicConfig(config), entries: sortEntries(seed()), summary: summaryOf(config, seed()) })
      }
      if (path === '/api/entries' && req.method === 'POST') {
        const input = await body(req)
        const parsed = normalizeInput(config, input)
        if (!parsed.ok) return fail(res, 400, parsed.message)
        const entry: LifeEntry = { id: uid(), date: parsed.date, createdAt: now(), updatedAt: now(), data: parsed.data }
        const state = read()
        state.entries.push(entry)
        write(state.entries)
        return json(res, 201, { config: publicConfig(config), entries: sortEntries(state.entries), summary: summaryOf(config, state.entries) })
      }
      const match = path.match(/^\/api\/entries\/([^/]+)$/)
      if (match && (req.method === 'PATCH' || req.method === 'DELETE')) {
        const state = read()
        const id = decodeURIComponent(match[1]!)
        const index = state.entries.findIndex(e => e.id === id)
        if (index < 0) return fail(res, 404, '记录不存在')
        if (req.method === 'DELETE') {
          state.entries.splice(index, 1)
          write(state.entries)
          return json(res, 200, { config: publicConfig(config), entries: sortEntries(state.entries), summary: summaryOf(config, state.entries) })
        }
        const input = await body(req)
        const current = state.entries[index]!
        const merged = { ...current, ...input, date: str(input.date) || current.date, data: { ...current.data, ...(input.data && typeof input.data === 'object' ? input.data as Record<string, unknown> : {}) } }
        const parsed = normalizeInput(config, merged)
        if (!parsed.ok) return fail(res, 400, parsed.message)
        state.entries[index] = { ...current, date: parsed.date, data: parsed.data, updatedAt: now() }
        write(state.entries)
        return json(res, 200, { config: publicConfig(config), entries: sortEntries(state.entries), summary: summaryOf(config, state.entries) })
      }
      if (path.startsWith('/api/')) return fail(res, 404, 'API 不存在')
      // static: app web then shared
      const rel = path === '/' ? 'index.html' : decodeURIComponent(path.slice(1))
      const roots = path.startsWith('/shared/') ? [{ root: SHARED_WEB, file: rel.slice('shared/'.length) }] : [{ root: resolve('web'), file: rel }]
      for (const { root, file: f } of roots) {
        const abs = normalize(join(root, f))
        if (!abs.startsWith(normalize(root)) || !existsSync(abs) || !statSync(abs).isFile()) continue
        const types: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json' }
        res.writeHead(200, { 'content-type': types[extname(abs)] || 'application/octet-stream', 'cache-control': 'no-cache' })
        return void res.end(readFileSync(abs))
      }
      return fail(res, 404, '文件不存在')
    } catch (e) {
      if (!res.headersSent) fail(res, 500, e instanceof Error ? e.message : '服务错误')
    }
  }
  const start = () => {
    const server = createServer(handler)
    server.listen(config.port, '127.0.0.1', () => console.log(`${config.name} ${config.english} 1.0.0 · http://127.0.0.1:${config.port}\ndata: ${file}`))
    return server
  }
  return { config, file, start, handler, read, write }
}
