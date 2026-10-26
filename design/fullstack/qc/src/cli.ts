#!/usr/bin/env -S node --experimental-strip-types
import { existsSync, mkdirSync, readdirSync, writeFileSync, copyFileSync, unlinkSync, symlinkSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { spawn } from 'node:child_process'

import { backup } from 'node:sqlite'
import { loadConfig } from './config.ts'
import { migrate, openDatabase } from './data.ts'
import { discover } from './router.ts'
import { startServer } from './server.ts'
import { buildApp } from './build.ts'
import { pack } from './pack.ts'
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
  qc db backup [file]   备份 SQLite
  qc db restore <file> --force  恢复（覆盖）
  qc pack               预编译包（dist/index.mjs + dist/cli.mjs）
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

async function makeApp(target: string): Promise<void> {
  const dir = resolve(cwd, target)
  if (existsSync(dir) && readdirSync(dir).length > 0) fail(`目录非空: ${dir}`)
  const qcRoot = fileURLToPath(new URL('..', import.meta.url))
  if (!existsSync(join(qcRoot, 'dist/index.mjs'))) {
    await pack()
  }
  const cliPath = join(qcRoot, 'dist/cli.mjs')
  mkdirSync(join(dir, 'node_modules/@qingcheng'), { recursive: true })
  symlinkSync(qcRoot, join(dir, 'node_modules/@qingcheng/qc'), 'dir')
  write(join(dir, 'app/pages/index.page.ts'), `import { definePage, html } from '@qingcheng/qc'

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
  write(join(dir, 'app/actions/notes/create.action.ts'), `import { defineAction, redirect, badRequest, nowIso } from '@qingcheng/qc'

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
    dependencies: { '@qingcheng/qc': `file:${qcRoot}` },
    scripts: {
      dev: 'node ./node_modules/@qingcheng/qc/dist/cli.mjs dev',
      start: 'node ./node_modules/@qingcheng/qc/dist/cli.mjs start',
      build: 'node ./node_modules/@qingcheng/qc/dist/cli.mjs build',
      'db:migrate': 'node ./node_modules/@qingcheng/qc/dist/cli.mjs db migrate',
      doctor: 'node ./node_modules/@qingcheng/qc/dist/cli.mjs doctor',
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
  const argRoot = rootArg ? resolve(cwd, rootArg) : cwd
  const directBundle = join(argRoot, 'server.mjs')
  const distBundle = join(argRoot, 'dist/server.mjs')
  const bundled = existsSync(directBundle) ? directBundle : existsSync(distBundle) ? distBundle : null
  if (bundled) {
    const runtimeRoot = bundled === directBundle ? argRoot : join(argRoot, 'dist')
    const child = spawn(process.execPath, [bundled], {
      cwd: runtimeRoot,
      stdio: 'inherit',
      env: { ...process.env, QC_APP_ROOT: runtimeRoot },
    })
    child.on('exit', code => process.exit(code ?? 0))
    return
  }
  const { url } = await startServer({ appRoot: argRoot })
  console.log(`[qc] ${url}`)
}

async function build(rootArg?: string): Promise<void> {
  const appRoot = rootArg ? resolve(cwd, rootArg) : cwd
  const result = await buildApp(appRoot)
  console.log(`✓ bundle 到 ${result.dist}/server.mjs（${result.routes} 条路由）`)
  console.log('  启动: qc start dist')
  console.log('  注意: dist 默认使用 dist/data/app.db；生产请用 QC_DB_PATH 指向持久数据。')
}

async function dbMigrate(): Promise<void> {
  const config = await loadConfig(cwd)
  const db = openDatabase(config.db.path)
  const ran = migrate(db, join(cwd, 'app/data/migrations'))
  db.close()
  console.log(ran.length ? `✓ 已应用: ${ran.join(', ')}` : '✓ 无待应用迁移')
}

async function dbBackup(targetArg?: string): Promise<void> {
  const config = await loadConfig(cwd)
  if (!existsSync(config.db.path)) fail(`数据库不存在: ${config.db.path}`)
  const stamp = nowIso().replace(/[:.]/g, '-').slice(0, 19)
  const target = targetArg ? resolve(cwd, targetArg) : join(cwd, 'data', `backup-${stamp}.db`)
  mkdirSync(dirname(target), { recursive: true })
  const db = openDatabase(config.db.path)
  try {
    await backup(db.raw, target)
  } finally {
    db.close()
  }
  console.log(`✓ 备份: ${target}`)
}

async function dbRestore(sourceArg: string | undefined, force: boolean): Promise<void> {
  if (!sourceArg) fail('用法: qc db restore <file> --force')
  if (!force) fail('恢复会覆盖当前数据库；确认后加 --force')
  const source = resolve(cwd, sourceArg)
  if (!existsSync(source)) fail(`备份不存在: ${source}`)
  const config = await loadConfig(cwd)
  mkdirSync(dirname(config.db.path), { recursive: true })
  copyFileSync(source, config.db.path)
  for (const suffix of ['-wal', '-shm']) {
    const file = `${config.db.path}${suffix}`
    if (existsSync(file)) unlinkSync(file)
  }
  console.log(`✓ 已恢复: ${config.db.path}`)
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
  if (command === 'pack') { const dist = await pack(); console.log(`✓ 预编译包: ${dist}`); return }
  if (command === 'dev') return dev()
  if (command === 'start') return start(args[1])
  if (command === 'build') return build(args[1])
  if (command === 'db' && args[1] === 'migrate') return dbMigrate()
  if (command === 'db' && args[1] === 'backup') return dbBackup(args[2])
  if (command === 'db' && args[1] === 'restore') return dbRestore(args[2], args.includes('--force'))
  if (command === 'doctor') return doctor()
  fail(`未知命令: ${command}\n运行 qc help`)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
