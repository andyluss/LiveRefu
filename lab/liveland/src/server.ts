import { createServer } from 'node:http'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { extname, join, normalize, resolve } from 'node:path'
import { URL } from 'node:url'
import { addCanon, loadWorld, stats } from './world.ts'
import { assetManifest, lintWorld, styleGuide, worldBible } from './lint.ts'

const WEB = resolve(import.meta.dirname, '../web')
const WORLD = resolve(process.env.LIVELAND_WORLD || join(import.meta.dirname, '../world/orange-harbor.world.json'))
const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png'
}
function send(res: import('node:http').ServerResponse, status: number, body: string, type = 'application/json; charset=utf-8'): void {
  res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' })
  res.end(body)
}
function json(res: import('node:http').ServerResponse, status: number, value: unknown): void { send(res, status, JSON.stringify(value, null, 2)) }
function body(req: import('node:http').IncomingMessage): Promise<string> {
  return new Promise((resolveBody, reject) => {
    let text = ''
    req.on('data', c => { text += c; if (text.length > 1_000_000) { req.destroy(); reject(new Error('body too large')) } })
    req.on('end', () => resolveBody(text)); req.on('error', reject)
  })
}
function staticFile(pathname: string): { file: string; type: string } | null {
  const rel = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '')
  const file = normalize(join(WEB, rel))
  if (!file.startsWith(WEB + '/') || !existsSync(file) || !statSync(file).isFile()) return null
  return { file, type: MIME[extname(file)] || 'application/octet-stream' }
}

export interface ServerOptions { port?: number; world?: string }
export function startServer(options: ServerOptions = {}): Promise<{ port: number; close: () => Promise<void> }> {
  const worldFile = resolve(options.world || process.env.LIVELAND_WORLD || WORLD)
  const port = Number(options.port || process.env.PORT || 4174)
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)
      if (url.pathname === '/favicon.ico') { res.writeHead(204); return res.end() }
      if (url.pathname === '/api/health') return json(res, 200, { ok: true, service: 'liveland', world: worldFile })
      if (url.pathname === '/api/world' && req.method === 'GET') {
        const world = loadWorld(worldFile)
        return json(res, 200, { world, lint: lintWorld(world), stats: stats(world), runtime: process.version })
      }
      if (url.pathname === '/api/lint' && req.method === 'POST') {
        return json(res, 200, { lint: lintWorld(loadWorld(worldFile)) })
      }
      if (url.pathname === '/api/canon' && req.method === 'POST') {
        const input = JSON.parse(await body(req)) as { era?: string; statement?: string; confidence?: string; source?: string }
        if (!input.era || !input.statement?.trim()) return json(res, 400, { error: '需要 era 与 statement' })
        const world = loadWorld(worldFile)
        if (!world.eras.some(e => e.id === input.era)) return json(res, 400, { error: `未知时代：${input.era}` })
        const fact = addCanon(worldFile, world, { era: input.era, statement: input.statement, confidence: input.confidence, source: input.source })
        const next = loadWorld(worldFile)
        return json(res, 200, { fact, world: next, lint: lintWorld(next), stats: stats(next) })
      }
      if (url.pathname === '/api/export' && req.method === 'POST') {
        const { type } = JSON.parse(await body(req)) as { type?: string }
        const world = loadWorld(worldFile)
        const map: Record<string, { name: string; text: string }> = {
          bible: { name: `${world.id}-bible.md`, text: worldBible(world) },
          style: { name: `${world.id}-style.md`, text: styleGuide(world) },
          assets: { name: `${world.id}-assets.json`, text: assetManifest(world) }
        }
        const out = map[type || 'bible']
        if (!out) return json(res, 400, { error: 'type: bible/style/assets' })
        return json(res, 200, out)
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
      console.log(`LiveLand · http://127.0.0.1:${actualPort}`)
      console.log(`world · ${worldFile}`)
      resolvePromise({ port: actualPort, close: () => new Promise<void>((res, rej) => server.close(err => err ? rej(err) : res())) })
    })
  })
}
