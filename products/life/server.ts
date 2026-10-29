// SPDX-License-Identifier: UNLICENSED
import { createServer } from 'node:http'
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { extname, join, normalize, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { APPS } from './apps.ts'
export { APPS }

const PORT = Number(process.env.PORT || 4200)
const WEB = resolve(import.meta.dirname, 'web')
const SHARED = resolve(import.meta.dirname, 'packages/web')
const DATA_ROOT = resolve(import.meta.dirname, 'data/apps')
const TYPES: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json' }
function send(res: any, status: number, data: unknown) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'access-control-allow-origin': '*' })
  res.end(JSON.stringify(data))
}
export function createHubServer() {
  return createServer((req, res) => {
    const path = new URL(req.url || '/', 'http://127.0.0.1').pathname
    if (path === '/api/apps') return send(res, 200, APPS)
    if (path === '/api/export' && req.method === 'GET') {
      const apps: Record<string, unknown> = {}
      for (const app of APPS) {
        const file = join(DATA_ROOT, app.id, 'store.json')
        if (existsSync(file)) apps[app.id] = JSON.parse(readFileSync(file, 'utf8'))
      }
      res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'content-disposition': `attachment; filename="life-all-${new Date().toISOString().slice(0, 10)}.json"`, 'cache-control': 'no-store' })
      return void res.end(JSON.stringify({ version: 1, app: 'life', exportedAt: new Date().toISOString(), apps }, null, 2))
    }
    if (path === '/api/import' && req.method === 'POST') {
      let input = ''
      req.on('data', chunk => { input += chunk; if (input.length > 20_000_000) req.destroy() })
      req.on('end', () => {
        try {
          const payload = JSON.parse(input)
          if (!payload.apps || typeof payload.apps !== 'object') return send(res, 400, { error: '导入文件缺少 apps' })
          const imported: string[] = []
          for (const app of APPS) {
            const data = payload.apps[app.id]
            if (!data || typeof data !== 'object') continue
            const dir = join(DATA_ROOT, app.id)
            mkdirSync(dir, { recursive: true })
            const file = join(dir, 'store.json')
            if (existsSync(file)) copyFileSync(file, `${file}.bak`)
            writeFileSync(file, JSON.stringify(data, null, 2) + '\n')
            imported.push(app.id)
          }
          send(res, 200, { ok: true, imported })
        } catch { send(res, 400, { error: '导入 JSON 解析失败' }) }
      })
      return
    }
    if (path === '/api/health') return send(res, 200, { ok: true, app: 'life-home', version: '3.4.4' })
    if (path.startsWith('/api/')) return send(res, 404, { error: 'API 不存在' })
    const isShared = path.startsWith('/shared/')
    const root = isShared ? SHARED : WEB
    const rel = path === '/' ? 'index.html' : path === '/rhythm' || path === '/rhythm/' ? 'rhythm.html' : decodeURIComponent(path.slice(1))
    const file = normalize(join(root, isShared ? rel.slice('shared/'.length) : rel))
    if (!file.startsWith(normalize(root)) || !existsSync(file) || !statSync(file).isFile()) { res.writeHead(404); return void res.end('Not found') }
    res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream', 'cache-control': 'no-cache' })
    res.end(readFileSync(file))
  })
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  createHubServer().listen(PORT, '127.0.0.1', () => console.log(`Life 统合主页 3.4.4 · http://127.0.0.1:${PORT}\n${APPS.length} apps`))
}
