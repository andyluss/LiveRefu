#!/usr/bin/env -S node --experimental-strip-types
import { existsSync, mkdirSync, readdirSync, writeFileSync, cpSync, rmSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { spawn } from 'node:child_process'

import { loadConfig } from './config.ts'
import { migrate, openDatabase } from './data.ts'
import { discover } from './router.ts'
import { startServer } from './server.ts'
import { nowIso } from './time.ts'

const args = process.argv.slice(2)
const command = args[0] ?? 'help'
const cwd = process.cwd()

function help(): void {
  console.log(`qc — 青橙全栈最小骨架

用法:
  qc dev                本地开发（watch）
  qc start [dir]        启动生产进程
  qc build [dir]        P1 源码构建（复制 app/public/config 到 dist）
  qc db migrate         应用迁移
  qc doctor             打印配置/路由/数据库
  qc new <dir>          创建最小应用
  qc help

Node: ${process.version}`)
}

function fail(message: string): never {
  console.error(`[qc] ${message}`)
  process.exit(1)
}

function write(path: string, content: string): void {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, content, 'utf8')
}

function makeApp(target: string): void {
  const dir = resolve(cwd, target)
  if (existsSync(dir) && readdirSync(dir).length > 0) fail(`目录非空: ${dir}`)
  const indexPath = fileURLToPath(new URL('./index.ts', import.meta.url))
  const cliPath = fileURLToPath(new URL('./cli.ts', import.meta.url))
  const bridge = `export * from ${JSON.stringify(pathToFileURL(indexPath).href)}\n`
  write(join(dir, 'app/qc.ts'), bridge)
  write(join(dir, 'app/pages/index.page.ts'), `import { definePage, html } from '../qc.ts'

export default definePage({
  render() {
    return html\`<h1>Hello, 青橙全栈</h1>
      <p class="muted">编辑 <code>app/pages/index.page.ts</code> 开始。</p>
      <form method="post" action="/actions/notes/create">
        <input name="title" placeholder="标题" required>
        <textarea name="body" placeholder="正文" required></textarea>
        <button type="submit">创建</button>
      </form>\`
  },
})
`)
  write(join(dir, 'app/actions/notes/create.action.ts'), `import { defineAction, redirect, badRequest, nowIso } from '../../qc.ts'

export default defineAction({
  async handle({ form, db }) {
    const title = String(form?.get('title') ?? '').trim()
    const body = String(form?.get('body') ?? '').trim()
    if (!title) throw badRequest('标题不能为空')
    await db.insert('notes', { title, body, created_at: nowIso() })
    return redirect('/')
  },
})
`)
  write(join(dir, 'app/data/migrations/001_notes.sql'), `create table if not exists notes (
  id integer primary key autoincrement,
  title text not null,
  body text not null,
  created_at text not null
);
`)
  write(join(dir, 'qc.config.ts'), `export default {
  site: { name: 'QC Notes' },
  db: { path: 'data/app.db' },
  server: { host: '127.0.0.1', port: 3000 },
}
`)
  write(join(dir, 'package.json'), JSON.stringify({
    name: target.replace(/[^a-z0-9-]/gi, '-').toLowerCase() || 'qc-app',
    private: true,
    type: 'module',
    scripts: {
      dev: `node --experimental-strip-types ${JSON.stringify(cliPath)} dev`,
      start: `node --experimental-strip-types ${JSON.stringify(cliPath)} start`,
      build: `node --experimental-strip-types ${JSON.stringify(cliPath)} build`,
      'db:migrate': `node --experimental-strip-types ${JSON.stringify(cliPath)} db migrate`,
      doctor: `node --experimental-strip-types ${JSON.stringify(cliPath)} doctor`,
    },
  }, null, 2) + '\n')
  write(join(dir, 'README.md'), `# QC App\n\n\`\`\`bash\nnpm run dev\n\`\`\`\n\n编辑 \`app/pages/index.page.ts\`；数据迁移在 \`app/data/migrations/\`。\n`)
  write(join(dir, '.gitignore'), `data/*.db\n.qc/\ndist/\nnode_modules/\n`)
  console.log(`✓ 已创建 ${dir}`)
  console.log('  npm run dev')
}

async function dev(): Promise<void> {
  const main = fileURLToPath(new URL('./server-main.ts', import.meta.url))
  const child = spawn(process.execPath, ['--watch', '--experimental-strip-types', main], {
    cwd,
    stdio: 'inherit',
    env: { ...process.env, QC_APP_ROOT: cwd, QC_DEV: '1' },
  })
  child.on('exit', code => process.exit(code ?? 0))
}

async function start(rootArg?: string): Promise<void> {
  const appRoot = rootArg ? resolve(cwd, rootArg) : cwd
  const { url } = await startServer({ appRoot })
  console.log(`[qc] ${url}`)
}

async function build(rootArg?: string): Promise<void> {
  const appRoot = rootArg ? resolve(cwd, rootArg) : cwd
  const config = await loadConfig(appRoot)
  const routes = discover(appRoot)
  const dist = join(appRoot, 'dist')
  rmSync(dist, { recursive: true, force: true })
  mkdirSync(dist, { recursive: true })
  cpSync(join(appRoot, 'app'), join(dist, 'app'), { recursive: true })
  if (existsSync(join(appRoot, 'public'))) cpSync(join(appRoot, 'public'), join(dist, 'public'), { recursive: true })
  if (existsSync(join(appRoot, 'qc.config.ts'))) cpSync(join(appRoot, 'qc.config.ts'), join(dist, 'qc.config.ts'))
  if (existsSync(join(appRoot, 'package.json'))) cpSync(join(appRoot, 'package.json'), join(dist, 'package.json'))
  write(join(dist, 'qc-manifest.json'), JSON.stringify({
    version: 1,
    builtAt: nowIso(),
    site: config.site.name,
    db: config.db.path,
    routes: routes.map(r => ({ kind: r.kind, route: r.route })),
  }, null, 2) + '\n')
  console.log(`✓ P1 源码构建到 ${dist}`)
  console.log('  P2 会替换为真正的 server bundle；当前可用 `qc start dist` 验证。')
}

async function dbMigrate(): Promise<void> {
  const config = await loadConfig(cwd)
  const db = openDatabase(config.db.path)
  const ran = migrate(db, join(cwd, 'app/data/migrations'))
  db.close()
  console.log(ran.length ? `✓ 已应用: ${ran.join(', ')}` : '✓ 无待应用迁移')
}

async function doctor(): Promise<void> {
  const config = await loadConfig(cwd)
  const routes = discover(cwd)
  console.log(`site: ${config.site.name}`)
  console.log(`app:  ${cwd}`)
  console.log(`db:   ${config.db.path} (${existsSync(config.db.path) ? 'exists' : 'missing'})`)
  console.log(`server: http://${config.server.host}:${config.server.port}`)
  console.log(`routes (${routes.length}):`)
  for (const route of routes) console.log(`  ${route.kind.padEnd(6)} ${route.route}  ${route.file.replace(cwd + '/', '')}`)
}

async function main(): Promise<void> {
  if (command === 'help' || command === '--help' || command === '-h') return help()
  if (command === 'new') {
    if (!args[1]) fail('用法: qc new <dir>')
    return makeApp(args[1])
  }
  if (command === 'dev') return dev()
  if (command === 'start') return start(args[1])
  if (command === 'build') return build(args[1])
  if (command === 'db' && args[1] === 'migrate') return dbMigrate()
  if (command === 'doctor') return doctor()
  fail(`未知命令: ${command}\n运行 qc help`)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
