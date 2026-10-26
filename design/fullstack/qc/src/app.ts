import { randomUUID } from 'node:crypto'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { extname, join, normalize, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

import { createAuth, defaultAuthConfig, type Auth, type AuthConfig } from './auth.ts'
import { createMailer, type Mailer } from './mail.ts'
import { loadConfig, resolveConfig, type QcConfig } from './config.ts'
import { migrate, openDatabase, type Db } from './data.ts'
import { html, SafeHtml } from './html.ts'
import { HttpError, json } from './http.ts'
import { discover, match, type Route } from './router.ts'
import type { Action, Ctx, Page } from './contracts.ts'
import { ValidationError } from './validate.ts'
import { nowIso } from './time.ts'

export type Layout = (args: { title: string; children: SafeHtml | string; ctx: Ctx }) => SafeHtml | string

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
  if (!existsSync(file)) return defaultLayout as Layout
  const mod = await import(pathToFileURL(file).href)
  return (mod.default ?? defaultLayout) as Layout
}

async function loadAuthConfig(appRoot: string): Promise<AuthConfig | null> {
  const file = join(appRoot, 'app/auth/config.ts')
  if (!existsSync(file)) return null
  const mod = await import(pathToFileURL(file).href)
  return { ...defaultAuthConfig, ...(mod.default ?? {}) }
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

function errorPage(status: number, message: string, extra = '', dev = false, stack = ''): Response {
  return new Response(`<!doctype html><meta charset="utf-8"><title>${status}</title>
<body style="font:16px system-ui;padding:32px;background:#0b0f14;color:#f3ede1">
<h1>${status}</h1><p>${message.replace(/</g, '&lt;')}</p>${extra}${dev ? stack : ''}</body>`, {
    status,
    headers: { 'content-type': 'text/html; charset=utf-8' },
  })
}

function errorResponse(error: unknown, dev: boolean): Response {
  const status = error instanceof HttpError ? error.status : 500
  const message = error instanceof Error ? error.message : String(error)
  if (error instanceof ValidationError) {
    const fields = Object.entries(error.fields)
      .map(([key, value]) => `<li><strong>${key}</strong>: ${value.replace(/</g, '&lt;')}</li>`)
      .join('')
    return errorPage(422, message, `<ul>${fields}</ul><p><a href="/">返回</a></p>`, dev)
  }
  const stack = error instanceof Error && error.stack && dev ? `<pre>${error.stack.replace(/</g, '&lt;')}</pre>` : ''
  return errorPage(status, message, '', dev, stack)
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

async function parseBody(request: Request): Promise<{ form?: FormData; json?: unknown; raw?: unknown }> {
  const type = request.headers.get('content-type') ?? ''
  if (type.includes('application/json')) {
    const json = await request.json()
    return { json, raw: json }
  }
  if (request.method === 'GET' || request.method === 'HEAD') return {}
  const form = await request.formData()
  return { form, raw: Object.fromEntries(form.entries()) }
}

function securityHeaders(headers: Headers): void {
  if (!headers.has('x-content-type-options')) headers.set('x-content-type-options', 'nosniff')
  if (!headers.has('x-frame-options')) headers.set('x-frame-options', 'DENY')
  if (!headers.has('referrer-policy')) headers.set('referrer-policy', 'strict-origin-when-cross-origin')
  if (!headers.has('permissions-policy')) headers.set('permissions-policy', 'camera=(), microphone=(), geolocation=()')
  if (!headers.has('content-security-policy')) {
    headers.set('content-security-policy', "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; form-action 'self'; base-uri 'self'; frame-ancestors 'none'")
  }
}

export interface AppOptions {
  config?: QcConfig
  layout?: Layout
  authConfig?: AuthConfig | null
  mailer?: Mailer
  modules?: Record<string, unknown>
}

export interface App {
  handle: (request: Request) => Promise<Response>
  close: () => void
  routes: Route[]
  db: Db
  config: QcConfig
  auth: Auth | null
  mailer: Mailer | null
  appRoot: string
}

export async function createApp(appRoot: string, options: AppOptions = {}): Promise<App> {
  const root = resolve(appRoot)
  const config = options.config ? resolveConfig(options.config, root) : await loadConfig(root)
  const db = openDatabase(config.db.path)
  migrate(db, join(root, 'app/data/migrations'))
  const authConfig = 'authConfig' in options ? (options.authConfig ?? null) : await loadAuthConfig(root)
  const mailer = authConfig ? (options.mailer ?? createMailer(authConfig.mail ?? { transport: 'console', from: 'no-reply@localhost' }, root)) : null
  const auth = authConfig ? createAuth(db, authConfig, mailer!) : null
  const routes = discover(root)
  const layout = options.layout ?? await loadLayout(root)
  const modules = options.modules ?? {}
  const loadModule = async (route: Route): Promise<any> => {
    const bundled = modules[`${route.kind}:${route.route}`]
    if (bundled) return bundled
    return import(pathToFileURL(route.file).href)
  }
  const dev = process.env.QC_DEV === '1'
  const rateWindows = new Map<string, { count: number; reset: number }>()

  function rateLimit(key: string, limit: number, windowMs: number): void {
    const now = Date.now()
    const current = rateWindows.get(key)
    if (!current || current.reset <= now) {
      rateWindows.set(key, { count: 1, reset: now + windowMs })
      return
    }
    current.count++
    if (current.count > limit) throw new HttpError(429, '请求过于频繁，请稍后再试', 'RATE_LIMITED')
  }

  function finalizeResponse(response: Response, initialCookie: string, cookies: string[], requestId = ''): Response {
    const headers = new Headers(response.headers)
    if (requestId && !headers.has('x-request-id')) headers.set('x-request-id', requestId)
    securityHeaders(headers)
    for (const cookie of [initialCookie, ...cookies].filter(Boolean)) {
      headers.append('set-cookie', cookie)
    }
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    })
  }

  async function handle(request: Request): Promise<Response> {
    const started = Date.now()
    const url = new URL(request.url)
    const pathname = url.pathname
    let initialCookie = ''
    const cookies: string[] = []
    const requestId = request.headers.get('x-request-id') ?? randomUUID()
    let finalStatus = 500
    const finish = (response: Response): Response => {
      finalStatus = response.status
      return finalizeResponse(response, initialCookie, cookies, requestId)
    }
    try {
      if (request.method === 'GET' || request.method === 'HEAD') {
        const asset = servePublic(root, pathname)
        if (asset) return finish(asset)
      }

      if (pathname === '/health' && request.method === 'GET') {
        try {
          db.query('select 1')
          return finish(json({ ok: true, uptime: Math.round(process.uptime()), db: 'ok' }))
        } catch {
          return finish(json({ ok: false, uptime: Math.round(process.uptime()), db: 'error' }, { status: 503 }))
        }
      }

      const pageRoute = routes.find(r => r.kind === 'page' && match(r.route, pathname))
      const actionRoute = routes.find(r => r.kind === 'action' && match(r.route, pathname))
      const apiRoute = routes.find(r => r.kind === 'api' && match(r.route, pathname))
      const route = pageRoute ?? actionRoute ?? apiRoute
      if (!route) throw new HttpError(404, '页面不存在', 'NOT_FOUND')
      const params = match(route.route, pathname) ?? {}

      const authState = auth?.load(request) ?? null
      if (authState) initialCookie = authState.cookie
      const ctx: Ctx = {
        request,
        url,
        params,
        db,
        config,
        appRoot: root,
        user: authState?.user ?? null,
        session: authState?.session,
        auth: auth ?? undefined,
        csrf: authState?.session.csrf,
        setCookie: (cookie: string) => cookies.push(cookie),
        rateLimit,
        input: undefined,
      }

      if (route.kind === 'page') {
        if (request.method !== 'GET' && request.method !== 'HEAD') {
          return finish(new Response('Method Not Allowed', { status: 405, headers: { allow: 'GET, HEAD' } }))
        }
        const mod = await loadModule(route)
        const page = mod.default as Page
        if (!page?.render) throw new Error(`页面缺少 render: ${route.file}`)
        if (page.auth === 'required' && !ctx.user) {
          const next = encodeURIComponent(pathname + url.search)
          return finish(new Response(null, { status: 303, headers: { location: `/login?next=${next}` } }))
        }
        const data = page.load ? await page.load(ctx) : {}
        const body = await page.render(data, ctx)
        if (isResponse(body)) return finish(body)
        const title = typeof page.title === 'function' ? page.title(data, ctx) : (page.title ?? config.site.name)
        const rendered = layout({ title, children: body as SafeHtml | string, ctx })
        return finish(new Response(String(rendered), { headers: { 'content-type': 'text/html; charset=utf-8' } }))
      }

      if (route.kind === 'action') {
        if (request.method !== 'POST') {
          return finish(new Response('Method Not Allowed', { status: 405, headers: { allow: 'POST' } }))
        }
        const parsed = await parseBody(request)
        Object.assign(ctx, parsed)
        if (auth) {
          const ok = auth.verifyCsrf(ctx.session!, parsed.form ?? null, request)
          if (!ok) throw new HttpError(403, 'CSRF 校验失败', 'CSRF_FAILED')
        }
        const mod = await loadModule(route)
        const action = mod.default as Action
        if (action.auth === 'required' && !ctx.user) throw new HttpError(401, '需要登录', 'UNAUTHORIZED')
        if (!action?.handle) throw new Error(`动作缺少 handle: ${route.file}`)
        if (action.input) {
          try {
            ctx.input = await action.input.parse(parsed.raw)
          } catch (error) {
            if (error instanceof ValidationError && action.onError) {
              const body = await action.onError(ctx, error)
              if (isResponse(body)) return finish(body)
              const title = action.errorTitle ?? '表单错误'
              const rendered = layout({ title, children: body as SafeHtml | string, ctx })
              return finish(new Response(String(rendered), { status: 422, headers: { 'content-type': 'text/html; charset=utf-8' } }))
            }
            throw error
          }
        }
        return finish(toResponse(await action.handle(ctx)))
      }

      const mod = await loadModule(route)
      const handler = mod[request.method]
      if (typeof handler !== 'function') {
        return finish(new Response('Method Not Allowed', { status: 405 }))
      }
      return finish(toResponse(await handler(ctx)))
    } catch (error) {
      if (!(error instanceof HttpError)) console.error(error)
      return finish(errorResponse(error, dev))
    } finally {
      const entry = {
        time: nowIso(),
        requestId,
        method: request.method,
        path: pathname,
        status: finalStatus,
        ms: Date.now() - started,
      }
      if (process.env.QC_LOG_FORMAT === 'json') console.log(JSON.stringify(entry))
      else if (dev) console.log(`${request.method} ${pathname} ${finalStatus} ${entry.ms}ms`)
    }
  }

  return {
    handle,
    close: () => db.close(),
    routes,
    db,
    config,
    auth,
    mailer,
    appRoot: root,
  }
}
