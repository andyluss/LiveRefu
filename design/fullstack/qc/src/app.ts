import { existsSync, readFileSync, statSync } from 'node:fs'
import { extname, join, normalize, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

import { loadConfig, type QcConfig } from './config.ts'
import { migrate, openDatabase, type Db } from './data.ts'
import { html, SafeHtml } from './html.ts'
import { HttpError, json } from './http.ts'
import { discover, match, type Route } from './router.ts'
import type { Action, Ctx, Page } from './contracts.ts'

type Layout = (args: { title: string; children: SafeHtml | string; ctx: Ctx }) => SafeHtml | string

const MIME: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
}

function defaultLayout({ title, children }: { title: string; children: SafeHtml | string }): SafeHtml {
  return html`<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <style>
    :root { color-scheme: dark; --bg:#0b0f14; --surface:#111823; --text:#f3ede1; --dim:#9aa7b8; --line:#24303f; --accent:#4fd1c5; --danger:#ff6b35; }
    * { box-sizing: border-box; }
    body { margin:0; background:var(--bg); color:var(--text); font:16px/1.6 ui-sans-serif, system-ui, sans-serif; }
    main { max-width:760px; margin:0 auto; padding:32px 20px 64px; }
    a { color:var(--accent); }
    .card { background:var(--surface); border:1.5px solid var(--line); border-radius:8px; padding:16px 20px; margin:12px 0; }
    input, textarea { width:100%; background:var(--bg); color:var(--text); border:1.5px solid var(--line); border-radius:4px; padding:8px 10px; font:inherit; }
    textarea { min-height:120px; }
    button { background:var(--surface); color:var(--text); border:1.5px solid var(--line); border-radius:4px; padding:8px 12px; font:inherit; cursor:pointer; }
    button:hover { border-color:var(--accent); color:var(--accent); }
    .muted { color:var(--dim); }
    .danger { color:var(--danger); }
    :focus-visible { outline:2px solid #8ab4f8; outline-offset:1px; }
  </style>
</head>
<body><main>${children}</main></body>
</html>`
}

async function loadLayout(appRoot: string): Promise<Layout> {
  const file = join(appRoot, 'app/layouts/default.layout.ts')
  if (!existsSync(file)) return defaultLayout
  const mod = await import(pathToFileURL(file).href)
  return mod.default ?? defaultLayout
}

function isResponse(value: unknown): value is Response {
  return value instanceof Response
}

function toResponse(value: unknown): Response {
  if (isResponse(value)) return value
  if (value instanceof SafeHtml || typeof value === 'string') {
    return new Response(String(value), { headers: { 'content-type': 'text/html; charset=utf-8' } })
  }
  if (value === null || value === undefined) return new Response(null, { status: 204 })
  return json(value)
}

function errorResponse(error: unknown, dev: boolean): Response {
  const status = error instanceof HttpError ? error.status : 500
  const message = error instanceof Error ? error.message : String(error)
  const stack = error instanceof Error && error.stack && dev ? `<pre>${stack.replace(/</g, '&lt;')}</pre>` : ''
  return new Response(`<!doctype html><meta charset="utf-8"><title>${status}</title>
<body style="font:16px system-ui;padding:32px;background:#0b0f14;color:#f3ede1">
<h1>${status}</h1><p>${message.replace(/</g, '&lt;')}</p>${stack}</body>`, {
    status,
    headers: { 'content-type': 'text/html; charset=utf-8' },
  })
}

function servePublic(appRoot: string, pathname: string): Response | null {
  if (pathname === '/') return null
  const publicRoot = join(appRoot, 'public')
  if (!existsSync(publicRoot)) return null
  const rel = normalize(decodeURIComponent(pathname)).replace(/^(\.\.(\/|\\|$))+/, '')
  const file = resolve(publicRoot, `.${rel}`)
  if (!file.startsWith(resolve(publicRoot)) || !existsSync(file) || !statSync(file).isFile()) return null
  const type = MIME[extname(file)] ?? 'application/octet-stream'
  return new Response(readFileSync(file), { headers: { 'content-type': type } })
}

async function parseBody(request: Request): Promise<{ form?: FormData; json?: unknown }> {
  const type = request.headers.get('content-type') ?? ''
  if (type.includes('application/json')) return { json: await request.json() }
  if (request.method === 'GET' || request.method === 'HEAD') return {}
  return { form: await request.formData() }
}

export interface App {
  handle: (request: Request) => Promise<Response>
  close: () => void
  routes: Route[]
  db: Db
  config: QcConfig
  appRoot: string
}

export async function createApp(appRoot: string): Promise<App> {
  const root = resolve(appRoot)
  const config = await loadConfig(root)
  const db = openDatabase(config.db.path)
  migrate(db, join(root, 'app/data/migrations'))
  const routes = discover(root)
  const layout = await loadLayout(root)
  const dev = process.env.QC_DEV === '1'

  async function handle(request: Request): Promise<Response> {
    const started = Date.now()
    const url = new URL(request.url)
    const pathname = url.pathname
    try {
      if (request.method === 'GET' || request.method === 'HEAD') {
        const asset = servePublic(root, pathname)
        if (asset) return asset
      }

      const pageRoute = routes.find(r => r.kind === 'page' && match(r.route, pathname))
      const actionRoute = routes.find(r => r.kind === 'action' && match(r.route, pathname))
      const apiRoute = routes.find(r => r.kind === 'api' && match(r.route, pathname))
      const route = pageRoute ?? actionRoute ?? apiRoute
      if (!route) throw new HttpError(404, '页面不存在', 'NOT_FOUND')
      const params = match(route.route, pathname) ?? {}
      const ctx: Ctx = { request, url, params, db, config, appRoot: root }

      if (route.kind === 'page') {
        if (request.method !== 'GET' && request.method !== 'HEAD') {
          return new Response('Method Not Allowed', { status: 405, headers: { allow: 'GET, HEAD' } })
        }
        const mod = await import(pathToFileURL(route.file).href)
        const page = mod.default as Page
        if (!page?.render) throw new Error(`页面缺少 render: ${route.file}`)
        const data = page.load ? await page.load(ctx) : {}
        const body = await page.render(data, ctx)
        if (isResponse(body)) return body
        const title = typeof page.title === 'function' ? page.title(data, ctx) : (page.title ?? config.site.name)
        const rendered = layout({ title, children: body as SafeHtml | string, ctx })
        return new Response(String(rendered), { headers: { 'content-type': 'text/html; charset=utf-8' } })
      }

      if (route.kind === 'action') {
        if (request.method !== 'POST') {
          return new Response('Method Not Allowed', { status: 405, headers: { allow: 'POST' } })
        }
        const parsed = await parseBody(request)
        Object.assign(ctx, parsed)
        const mod = await import(pathToFileURL(route.file).href)
        const action = mod.default as Action
        if (!action?.handle) throw new Error(`动作缺少 handle: ${route.file}`)
        return toResponse(await action.handle(ctx))
      }

      const mod = await import(pathToFileURL(route.file).href)
      const handler = mod[request.method]
      if (typeof handler !== 'function') {
        return new Response('Method Not Allowed', { status: 405 })
      }
      return toResponse(await handler(ctx))
    } catch (error) {
      if (!(error instanceof HttpError)) console.error(error)
      return errorResponse(error, dev)
    } finally {
      if (dev) console.log(`${request.method} ${pathname} ${Date.now() - started}ms`)
    }
  }

  return {
    handle,
    close: () => db.close(),
    routes,
    db,
    config,
    appRoot: root,
  }
}
