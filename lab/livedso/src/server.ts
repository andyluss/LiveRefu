// SPDX-License-Identifier: Apache-2.0
import { createServer } from 'node:http'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { extname, join, normalize, resolve } from 'node:path'
import { URL } from 'node:url'
import { loadVault, projection, saveContract, saveToken, stateView } from './vault.ts'
import { reportMarkdown, runChecks } from './checks.ts'

const WEB = resolve(import.meta.dirname, '../web')
const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
}

function send(res: import('node:http').ServerResponse, status: number, body: string, type = 'application/json; charset=utf-8'): void {
  res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' })
  res.end(body)
}
function json(res: import('node:http').ServerResponse, status: number, value: unknown): void {
  send(res, status, JSON.stringify(value, null, 2))
}
function readBody(req: import('node:http').IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', chunk => { body += chunk; if (body.length > 1_000_000) { req.destroy(); reject(new Error('body too large')) } })
    req.on('end', () => resolve(body))
    req.on('error', reject)
  })
}
function staticFile(pathname: string): { file: string; type: string } | null {
  const rel = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '')
  const file = normalize(join(WEB, rel))
  if (!file.startsWith(WEB + '/') && file !== WEB) return null
  if (!existsSync(file) || !statSync(file).isFile()) return null
  return { file, type: MIME[extname(file)] || 'application/octet-stream' }
}

export interface ServerOptions { port?: number; vault?: string }

export function startServer(options: ServerOptions = {}): Promise<{ port: number; close: () => Promise<void> }> {
  const vaultRoot = resolve(options.vault || process.env.LIVEDSO_VAULT || join(import.meta.dirname, '../vault'))
  const port = Number(options.port || process.env.PORT || 4173)
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)
      if (url.pathname === '/favicon.ico') { res.writeHead(204); return res.end() }
      if (url.pathname === '/api/health') return json(res, 200, { ok: true, service: 'livedso', vault: vaultRoot })
      let vault = loadVault(vaultRoot)
      let result = runChecks(vault)
      if (url.pathname === '/api/state' && req.method === 'GET') return json(res, 200, { ...stateView(vault, result), runtime: process.version })
      if (url.pathname === '/api/check' && req.method === 'POST') return json(res, 200, { checks: result })
      if (url.pathname === '/api/report' && req.method === 'POST') return json(res, 200, { markdown: reportMarkdown(vault, result) })
      if (url.pathname === '/api/projection' && req.method === 'POST') return json(res, 200, { css: projection(vault) })
      if (url.pathname === '/api/token' && req.method === 'POST') {
        const body = JSON.parse(await readBody(req)) as { path?: string; value?: string }
        if (!body.path || typeof body.value !== 'string') return json(res, 400, { error: '需要 path 与 value（string）' })
        saveToken(vault, body.path, body.value)
        vault = loadVault(vaultRoot)
        result = runChecks(vault)
        return json(res, 200, { ...stateView(vault, result), runtime: process.version })
      }
      if (url.pathname === '/api/contract' && req.method === 'POST') {
        const body = JSON.parse(await readBody(req)) as { id?: string; patch?: Record<string, unknown> }
        if (!body.id || !body.patch) return json(res, 400, { error: '需要 id 与 patch' })
        const allowed = new Set(['title', 'status', 'summary', 'anatomy', 'states', 'tokens', 'keyboard', 'a11y', 'do', 'dont'])
        const patch: Record<string, unknown> = {}
        for (const [key, value] of Object.entries(body.patch)) if (allowed.has(key)) patch[key] = value
        saveContract(vault, body.id, patch)
        vault = loadVault(vaultRoot)
        result = runChecks(vault)
        return json(res, 200, { ...stateView(vault, result), runtime: process.version })
      }
      if (url.pathname.startsWith('/api/')) return json(res, 404, { error: 'not found' })
      const file = staticFile(url.pathname)
      if (!file) return send(res, 404, 'Not found', 'text/plain; charset=utf-8')
      return send(res, 200, readFileSync(file.file, 'utf8'), file.type)
    } catch (e) {
      return json(res, 500, { error: (e as Error).message })
    }
  })
  return new Promise((resolvePromise, reject) => {
    server.once('error', reject)
    server.listen(port, '127.0.0.1', () => {
      const address = server.address()
      const actualPort = typeof address === 'object' && address ? address.port : port
      console.log(`LiveDSO · http://127.0.0.1:${actualPort}`)
      console.log(`vault · ${vaultRoot}`)
      resolvePromise({
        port: actualPort,
        close: () => new Promise<void>((resolveClose, rejectClose) => server.close(err => err ? rejectClose(err) : resolveClose()))
      })
    })
  })
}
