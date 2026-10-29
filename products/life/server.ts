// SPDX-License-Identifier: UNLICENSED
import { createServer } from 'node:http'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { extname, join, normalize, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { APPS } from './apps.ts'
export { APPS }

const PORT = Number(process.env.PORT || 4200)
const WEB = resolve(import.meta.dirname, 'web')
const SHARED = resolve(import.meta.dirname, 'packages/web')
const TYPES: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json' }
function send(res: any, status: number, data: unknown) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'access-control-allow-origin': '*' })
  res.end(JSON.stringify(data))
}
export function createHubServer() {
  return createServer((req, res) => {
    const path = new URL(req.url || '/', 'http://127.0.0.1').pathname
    if (path === '/api/apps') return send(res, 200, APPS)
    if (path === '/api/health') return send(res, 200, { ok: true, app: 'life-home', version: '3.1.0' })
    if (path.startsWith('/api/')) return send(res, 404, { error: 'API 不存在' })
    const isShared = path.startsWith('/shared/')
    const root = isShared ? SHARED : WEB
    const rel = path === '/' ? 'index.html' : decodeURIComponent(path.slice(1))
    const file = normalize(join(root, isShared ? rel.slice('shared/'.length) : rel))
    if (!file.startsWith(normalize(root)) || !existsSync(file) || !statSync(file).isFile()) { res.writeHead(404); return void res.end('Not found') }
    res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream', 'cache-control': 'no-cache' })
    res.end(readFileSync(file))
  })
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  createHubServer().listen(PORT, '127.0.0.1', () => console.log(`Life 统合主页 3.1.0 · http://127.0.0.1:${PORT}\n${APPS.length} apps`))
}
