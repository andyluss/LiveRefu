import { createServer } from 'node:http'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { extname, join, normalize, resolve } from 'node:path'
import { URL } from 'node:url'
import { duplicateGroups, saveItemMeta, saveItemsMeta, scanArchive, stats } from './archive.ts'
import type { ItemMeta } from './types.ts'
import { recordRestore, runBackup, verifyRestore } from './backup.ts'
import { publicHtml } from './public.ts'
import { retentionAudit } from './retention.ts'
import { buildInheritancePackage } from './inherit.ts'
import { backupReport, catalog, healthCheck, manifest } from './health.ts'

const WEB = resolve(import.meta.dirname, '../web')
const ARCHIVE = resolve(process.env.LIVEFILE_ARCHIVE || join(import.meta.dirname, '../archive'))
const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.md': 'text/markdown; charset=utf-8', '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg'
}
function send(res: import('node:http').ServerResponse, status: number, body: string, type = 'application/json; charset=utf-8'): void {
  res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' }); res.end(body)
}
function json(res: import('node:http').ServerResponse, status: number, value: unknown): void { send(res, status, JSON.stringify(value, null, 2)) }
function readBody(req: import('node:http').IncomingMessage): Promise<string> {
  return new Promise((res, rej) => { let text = ''; req.on('data', c => { text += c; if (text.length > 1_000_000) { req.destroy(); rej(new Error('body too large')) } }); req.on('end', () => res(text)); req.on('error', rej) })
}
function staticFile(pathname: string): { file: string; type: string } | null {
  const rel = pathname === '/' ? 'index.html' : decodeURIComponent(pathname.replace(/^\/+/, ''))
  const base = pathname.startsWith('/files/') ? ARCHIVE : WEB
  const inside = pathname.startsWith('/files/') ? rel.replace(/^files\//, '') : rel
  const file = normalize(join(base, inside))
  if (!file.startsWith(base + '/') || !existsSync(file) || !statSync(file).isFile()) return null
  return { file, type: MIME[extname(file)] || 'application/octet-stream' }
}

export interface ServerOptions { port?: number; archive?: string }
export function startServer(options: ServerOptions = {}): Promise<{ port: number; close: () => Promise<void> }> {
  const archiveDir = resolve(options.archive || process.env.LIVEFILE_ARCHIVE || ARCHIVE)
  const port = Number(options.port || process.env.PORT || 4175)
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)
      if (url.pathname === '/favicon.ico') { res.writeHead(204); return res.end() }
      if (url.pathname === '/api/health') return json(res, 200, { ok: true, service: 'livefile', archive: archiveDir })
      if (url.pathname === '/api/state' && req.method === 'GET') {
        const index = scanArchive(archiveDir)
        const health = healthCheck(index)
        return json(res, 200, { ...index, duplicates: duplicateGroups(index), health, stats: stats(index), retention: retentionAudit(index), runtime: process.version })
      }
      if (url.pathname === '/api/scan' && req.method === 'POST') {
        const index = scanArchive(archiveDir)
        return json(res, 200, { ...index, duplicates: duplicateGroups(index), health: healthCheck(index), stats: stats(index), retention: retentionAudit(index) })
      }
      if (url.pathname === '/api/item' && req.method === 'POST') {
        const input = JSON.parse(await readBody(req)) as { path?: string; meta?: ItemMeta }
        if (!input.path || !input.meta) return json(res, 400, { error: '需要 path 与 meta' })
        const allowed: Array<keyof ItemMeta> = ['title', 'type', 'created', 'source', 'license', 'collections', 'tags', 'retention', 'person', 'note', 'public']
        const patch: ItemMeta = {}
        for (const key of allowed) {
          if (key in input.meta) (patch as Record<string, unknown>)[key] = input.meta[key]
        }
        saveItemMeta(archiveDir, input.path, patch)
        const index = scanArchive(archiveDir)
        return json(res, 200, { ...index, duplicates: duplicateGroups(index), health: healthCheck(index), stats: stats(index), retention: retentionAudit(index), runtime: process.version })
      }
      if (url.pathname === '/api/items/batch' && req.method === 'POST') {
        const input = JSON.parse(await readBody(req)) as { paths?: string[]; patch?: ItemMeta }
        if (!Array.isArray(input.paths) || !input.paths.length || !input.patch) return json(res, 400, { error: '需要 paths 与 patch' })
        const allowed: Array<keyof ItemMeta> = ['source', 'license', 'collections', 'tags', 'retention', 'type']
        const patch: ItemMeta = {}
        for (const key of allowed) if (key in input.patch) (patch as Record<string, unknown>)[key] = input.patch[key]
        saveItemsMeta(archiveDir, input.paths, patch)
        const index = scanArchive(archiveDir)
        return json(res, 200, { ...index, duplicates: duplicateGroups(index), health: healthCheck(index), stats: stats(index), retention: retentionAudit(index), runtime: process.version })
      }
      if (url.pathname === '/api/backup' && req.method === 'POST') {
        const { target } = JSON.parse(await readBody(req)) as { target?: string }
        if (!target) return json(res, 400, { error: '需要 target' })
        const index = scanArchive(archiveDir)
        const result = runBackup(index, target)
        const next = scanArchive(archiveDir)
        return json(res, 200, { result, ...next, duplicates: duplicateGroups(next), health: healthCheck(next), stats: stats(next), runtime: process.version })
      }
      if (url.pathname === '/api/restore-check' && req.method === 'POST') {
        const { source } = JSON.parse(await readBody(req)) as { source?: string }
        if (!source) return json(res, 400, { error: '需要 source' })
        const report = verifyRestore(source)
        recordRestore(archiveDir, report)
        const index = scanArchive(archiveDir)
        return json(res, 200, { result: report, ...index, duplicates: duplicateGroups(index), health: healthCheck(index), stats: stats(index), runtime: process.version })
      }
      if (url.pathname === '/api/inherit' && req.method === 'POST') {
        const { target } = JSON.parse(await readBody(req)) as { target?: string }
        if (!target) return json(res, 400, { error: '需要 target' })
        const index = scanArchive(archiveDir)
        return json(res, 200, buildInheritancePackage(index, target))
      }
      if (url.pathname === '/api/export' && req.method === 'POST') {
        const { type } = JSON.parse(await readBody(req)) as { type?: string }
        const index = scanArchive(archiveDir)
        const health = healthCheck(index)
        const out: Record<string, { name: string; text: string; mime: string }> = {
          catalog: { name: 'archive-catalog.md', text: catalog(index, health), mime: 'text/markdown' },
          manifest: { name: 'archive-manifest.json', text: manifest(index), mime: 'application/json' },
          backup: { name: 'backup-report.md', text: backupReport(index, health), mime: 'text/markdown' },
          public: { name: 'public-archive.html', text: publicHtml(index), mime: 'text/html' }
        }
        const result = out[type || 'catalog']
        if (!result) return json(res, 400, { error: 'type: catalog/manifest/backup' })
        return json(res, 200, result)
      }
      if (url.pathname.startsWith('/api/')) return json(res, 404, { error: 'not found' })
      const file = staticFile(url.pathname)
      if (!file) return send(res, 404, 'Not found', 'text/plain; charset=utf-8')
      return send(res, 200, readFileSync(file.file, 'utf8'), file.type)
    } catch (e) { return json(res, 500, { error: (e as Error).message }) }
  })
  return new Promise((resolvePromise, reject) => {
    server.once('error', reject)
    server.listen(port, '127.0.0.1', () => {
      const addr = server.address()
      const actual = typeof addr === 'object' && addr ? addr.port : port
      console.log(`LiveFile · http://127.0.0.1:${actual}`)
      console.log(`archive · ${archiveDir}`)
      resolvePromise({ port: actual, close: () => new Promise<void>((res, rej) => server.close(err => err ? rej(err) : res())) })
    })
  })
}
