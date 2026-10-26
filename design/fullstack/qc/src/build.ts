import { existsSync, mkdirSync, rmSync, cpSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as esbuild from 'esbuild'

import { discover } from './router.ts'
import { loadConfig } from './config.ts'
import { nowIso } from './time.ts'

const qcRoot = fileURLToPath(new URL('..', import.meta.url))

function importPath(path: string): string {
  return JSON.stringify(path)
}

export async function buildApp(appRoot: string): Promise<{ dist: string; routes: number }> {
  const root = resolve(appRoot)
  const routes = discover(root)
  const dist = join(root, 'dist')
  const cache = join(root, '.qc-build')
  rmSync(dist, { recursive: true, force: true })
  rmSync(cache, { recursive: true, force: true })
  mkdirSync(dist, { recursive: true })
  mkdirSync(cache, { recursive: true })

  const configFile = join(root, 'qc.config.ts')
  const layoutFile = join(root, 'app/layouts/default.layout.ts')
  const authFile = join(root, 'app/auth/config.ts')
  const serverFile = join(qcRoot, 'src/server.ts')

  const lines: string[] = []
  lines.push(`import { startServer } from ${importPath(serverFile)}`)
  if (existsSync(configFile)) lines.push(`import config from ${importPath(configFile)}`)
  if (existsSync(layoutFile)) lines.push(`import layout from ${importPath(layoutFile)}`)
  if (existsSync(authFile)) lines.push(`import authConfig from ${importPath(authFile)}`)

  const entries: string[] = []
  routes.forEach((route, index) => {
    lines.push(`import * as m${index} from ${importPath(route.file)}`)
    entries.push(`  ${JSON.stringify(`${route.kind}:${route.route}`)}: m${index},`)
  })
  lines.push(`const modules = {`)
  lines.push(...entries)
  lines.push(`}`)
  lines.push(`const { url } = await startServer({`)
  lines.push(`  appRoot: process.env.QC_APP_ROOT ?? process.cwd(),`)
  if (existsSync(configFile)) lines.push(`  config,`)
  if (existsSync(layoutFile)) lines.push(`  layout,`)
  if (existsSync(authFile)) lines.push(`  authConfig,`)
  lines.push(`  modules,`)
  lines.push(`})`)
  lines.push(`console.log(\`[qc] \${url}\`)`)

  const entry = join(cache, 'entry.ts')
  writeFileSync(entry, lines.join('\n') + '\n', 'utf8')

  await esbuild.build({
    entryPoints: [entry],
    outfile: join(dist, 'server.mjs'),
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node24',
    sourcemap: true,
    logLevel: 'silent',
    external: ['node:*'],
  })

  for (const sub of ['app/pages', 'app/actions', 'app/api', 'app/layouts', 'app/auth', 'app/data/migrations']) {
    if (existsSync(join(root, sub))) cpSync(join(root, sub), join(dist, sub), { recursive: true })
  }
  if (existsSync(join(root, 'public'))) cpSync(join(root, 'public'), join(dist, 'public'), { recursive: true })
  const config = await loadConfig(root)
  writeFileSync(join(dist, 'qc-manifest.json'), JSON.stringify({
    version: 2,
    builtAt: nowIso(),
    site: config.site.name,
    routes: routes.map(route => ({ kind: route.kind, route: route.route })),
    bundle: 'dist/server.mjs',
  }, null, 2) + '\n', 'utf8')
  rmSync(cache, { recursive: true, force: true })
  return { dist, routes: routes.length }
}
