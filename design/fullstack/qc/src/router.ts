import { existsSync, readdirSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

export type RouteKind = 'page' | 'action' | 'api'

export interface Route {
  kind: RouteKind
  file: string
  route: string
  score: number
}

function walk(dir: string, suffix: string, out: string[]): void {
  if (!statSync(dir).isDirectory()) return
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.tmp' || name.startsWith('.')) continue
    const full = join(dir, name)
    if (statSync(full).isDirectory()) walk(full, suffix, out)
    else if (name.endsWith(suffix)) out.push(full)
  }
}

function toRoute(base: string, file: string, suffix: string, prefix = ''): string {
  let rel = relative(base, file).split(sep).join('/')
  rel = rel.slice(0, -suffix.length)
  const parts = rel.split('/').filter(Boolean)
  if (parts.at(-1) === 'index') parts.pop()
  const route = parts.map(p => p.startsWith('[') && p.endsWith(']') ? `:${p.slice(1, -1)}` : p)
  return `${prefix}/${route.join('/')}`.replace(/\/+/g, '/').replace(/\/$/, '') || '/'
}

function score(route: string): number {
  const parts = route.split('/').filter(Boolean)
  const dynamic = parts.filter(p => p.startsWith(':')).length
  return parts.length * 100 - dynamic * 10
}

export function discover(appRoot: string): Route[] {
  const routes: Route[] = []
  for (const [kind, base, suffix, prefix] of [
    ['page', join(appRoot, 'app/pages'), '.page.ts', ''],
    ['action', join(appRoot, 'app/actions'), '.action.ts', '/actions'],
    ['api', join(appRoot, 'app/api'), '.api.ts', '/api'],
  ] as const) {
    if (!existsSync(base) || !statSync(base).isDirectory()) continue
    const files: string[] = []
    walk(base, suffix, files)
    for (const file of files) {
      const route = toRoute(base, file, suffix, prefix)
      routes.push({ kind, file, route, score: score(route) + (kind === 'page' ? 1 : 0) })
    }
  }
  return routes.sort((a, b) => b.score - a.score || a.route.localeCompare(b.route))
}

export function match(route: string, pathname: string): Record<string, string> | null {
  const r = route.split('/').filter(Boolean)
  const p = pathname.split('/').filter(Boolean)
  if (r.length !== p.length) return null
  const params: Record<string, string> = {}
  for (let i = 0; i < r.length; i++) {
    if (r[i].startsWith(':')) {
      params[r[i].slice(1)] = decodeURIComponent(p[i])
    } else if (r[i] !== p[i]) {
      return null
    }
  }
  return params
}
