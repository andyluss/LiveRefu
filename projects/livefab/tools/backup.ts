#!/usr/bin/env bun
/**
 * LiveFab 统一备份（M1）。
 *
 * 为什么需要它：LiveFab 的数据**散在多个地方**，而"每套系统各备各的"必然有一套被遗忘：
 *
 *   | 来源                | 内容                              | 忘了它会怎样            |
 *   | ------------------- | --------------------------------- | ----------------------- |
 *   | PostgreSQL:authelia | 会话 / 双因素状态                  | 全员被登出、2FA 要重配   |
 *   | PostgreSQL:nodebb   | 论坛帖子                          | 论坛内容丢失            |
 *   | MySQL:ghost         | 站点内容与会员                     | 内容全丢                |
 *   | authelia_secretview | **密钥**（session/storage/reset）  | ⚠️ 恢复后旧会话全部失效、 |
 *   |                     |                                   |    加密字段解不开        |
 *   | caddy_data          | TLS 证书 + 本地 CA（**含私钥**）    | 证书要重签、本地 CA 变了 |
 *   | ghost_content       | 上传的图片 / 主题                  | 图片全丢                |
 *   | nodebb_data/config  | 上传文件 / 论坛配置                | 附件与配置丢失          |
 *
 * 产出是一个**自描述**的备份集：`backups/<UTC 时间戳>/` 下每件东西一个文件，
 * 外加 `manifest.json`（大小、sha256、以及**每张表的行数**——供恢复演练比对）。
 *
 * ★ 本工具只**产出**备份，不验证"能不能恢复"。
 *   验证在 `tools/verify-backup.ts`（真的恢复到临时容器再比对）。
 *   这是刻意的分工：**备份脚本"跑成功"不等于备份"能用"**。
 *
 * 用法：
 *   bun run tools/backup.ts                    # 备份到 backups/
 *   bun run tools/backup.ts --out=/path/to/dir # 指定输出根目录
 */

import { mkdirSync, writeFileSync, statSync, existsSync } from 'node:fs'
import { join, resolve, basename } from 'node:path'
import { createHash } from 'node:crypto'

const arg = (n: string, d = '') => process.argv.find(a => a.startsWith(`--${n}=`))?.slice(n.length + 3) ?? d
const ROOT = resolve(import.meta.dir, '..')
const OUT_ROOT = resolve(arg('out', join(ROOT, 'backups')))
const COMPOSE = join(ROOT, 'deploy/compose.yml')
const ENV_FILE = join(ROOT, '.env')

/** 要备份的数据库：`<容器服务名> <引擎> <库名> [用户]` */
const DATABASES = [
  { service: 'db', engine: 'postgres' as const, name: 'authelia', user: 'authelia' },
  { service: 'db', engine: 'postgres' as const, name: 'nodebb', user: 'nodebb' },
  { service: 'ghost-db', engine: 'mysql' as const, name: 'ghost', user: 'root' },
]

/** 要备份的卷（顺序无关；命名保持与 docker 一致便于辨认） */
const VOLUMES = [
  'livefab_authelia_secretview', // ★ 密钥——最容易漏、漏了最麻烦
  'livefab_caddy_data',          // TLS 证书与本地 CA
  'livefab_ghost_content',
  'livefab_nodebb_data',
  'livefab_nodebb_config',
]

const sh = async (cmd: string[], opts: { input?: string } = {}) => {
  const p = Bun.spawn(cmd, { stdin: opts.input ? 'pipe' : 'ignore', stdout: 'pipe', stderr: 'pipe' })
  if (opts.input) {
    p.stdin.write(opts.input)
    await p.stdin.end()
  }
  const [out, err, code] = await Promise.all([
    new Response(p.stdout).text(),
    new Response(p.stderr).text(),
    p.exited,
  ])
  return { out, err, code }
}

/** 统一从 .env 读密码，避免依赖外部已导出的环境变量 */
function envFromFile(key: string): string {
  const txt = require('node:fs').readFileSync(ENV_FILE, 'utf8') as string
  return txt.match(new RegExp(`^${key}=(.*)$`, 'm'))?.[1]?.trim() ?? ''
}

/** 找到 compose 里某个服务对应的容器名（compose 会加项目前缀） */
async function containerOf(service: string): Promise<string> {
  const { out } = await sh(['docker', 'compose', '-f', COMPOSE, '--env-file', ENV_FILE, 'ps', '-q', service])
  const id = out.trim().split('\n')[0]
  if (!id) throw new Error(`服务 ${service} 没有运行中的容器——请先 docker compose up`)
  const { out: name } = await sh(['docker', 'inspect', '-f', '{{.Name}}', id])
  return name.trim().replace(/^\//, '')
}

/** 取某张表的行数（Postgres / MySQL 语法不同） */
async function tableCounts(container: string, engine: 'postgres' | 'mysql', db: string, user: string, password: string) {
  const sql = engine === 'postgres'
    ? `SELECT relname, n_live_tup FROM pg_stat_user_tables ORDER BY relname`
    : `SELECT table_name, table_rows FROM information_schema.tables WHERE table_schema='${db}' AND table_type='BASE TABLE' ORDER BY table_name`
  const cmd = engine === 'postgres'
    ? ['docker', 'exec', '-e', `PGPASSWORD=${password}`, container, 'psql', '-U', user, '-d', db, '-tAF', '|', '-c', sql]
    : ['docker', 'exec', container, 'mysql', '-u', user, `-p${password}`, '-N', '-B', '-e', sql]
  const { out, code, err } = await sh(cmd)
  if (code !== 0) throw new Error(`取行数失败（${db}）: ${err.slice(0, 200)}`)
  const counts: Record<string, number> = {}
  for (const line of out.trim().split('\n')) {
    const [t, n] = line.split('|')
    if (t) counts[t] = Number(n ?? 0)
  }
  return counts
}

// ── 开始 ─────────────────────────────────────────────────────────────
const stamp = new Date().toISOString().replace(/[:.]/g, '-').replace(/Z$/, 'Z')
const DIR = join(OUT_ROOT, stamp)
mkdirSync(DIR, { recursive: true })

console.log(`LiveFab 统一备份\n输出：${DIR}\n`)

const artifacts: Array<{ path: string; bytes: number; sha256: string; kind: string; note: string }> = []
const record = (rel: string, kind: string, note: string) => {
  const abs = join(DIR, rel)
  const bytes = statSync(abs).size
  const sha256 = createHash('sha256').update(require('node:fs').readFileSync(abs)).digest('hex')
  artifacts.push({ path: rel, bytes, sha256, kind, note })
  console.log(`  ✓ ${rel.padEnd(34)} ${(bytes / 1024).toFixed(0).padStart(6)} KB  ${note}`)
}

const dbInfo: Record<string, { container: string; engine: string; counts: Record<string, number> }> = {}

// ① 数据库
console.log('数据库：')
for (const d of DATABASES) {
  const container = await containerOf(d.service)
  const password = d.engine === 'postgres'
    ? (d.name === 'authelia' ? envFromFile('AUTHELIA_DB_PASSWORD') : envFromFile('NODEBB_DB_PASSWORD'))
    : envFromFile('GHOST_DB_ROOT_PASSWORD')

  // 行数先记（供恢复后比对）
  const counts = await tableCounts(container, d.engine, d.name, d.user, password)

  const rel = `${d.engine}/${d.name}.sql`
  mkdirSync(join(DIR, d.engine), { recursive: true })

  const cmd = d.engine === 'postgres'
    // --clean --if-exists 让 dump 可重复导入；-Fp 纯文本便于人工查看
    ? ['docker', 'exec', '-e', `PGPASSWORD=${password}`, container, 'pg_dump', '-U', d.user, '-d', d.name, '--clean', '--if-exists']
    // ★ 必须加 --databases：否则 dump 里**没有 CREATE DATABASE / USE**，
    //   导进一个干净实例会报 "No database selected"（早先就是这样，恢复演练才暴露）。
    : ['docker', 'exec', container, 'mysqldump', '-u', d.user, `-p${password}`, '--single-transaction', '--routines', '--events', '--databases', d.name]

  const { out, code, err } = await sh(cmd)
  if (code !== 0) {
    console.error(`\n✗ 导出 ${d.name} 失败：${err.slice(0, 300)}`)
    process.exit(1)
  }
  // ⚠️ 导出结果为空 = 静默失败（例如密码错但 exit code 仍是 0 的情况），必须挡住
  if (!out.trim()) {
    console.error(`\n✗ ${d.name} 的导出结果为空——这几乎一定是失败，而不是"库是空的"`)
    process.exit(1)
  }
  writeFileSync(join(DIR, rel), out)
  record(rel, 'database', `${d.engine} · ${Object.keys(counts).length} 张表`)
  dbInfo[d.name] = { container, engine: d.engine, counts }
}

// ② 卷
console.log('\n卷：')
mkdirSync(join(DIR, 'volumes'), { recursive: true })
for (const vol of VOLUMES) {
  const rel = `volumes/${vol}.tar.gz`
  // 用 alpine 走一遍 tar；:ro 挂载源卷，避免误写
  const { code, err } = await sh([
    'docker', 'run', '--rm',
    '-v', `${vol}:/src:ro`,
    '-v', `${DIR}/volumes:/out`,
    'alpine:3.20', 'tar', 'czf', `/out/${vol}.tar.gz`, '-C', '/src', '.',
  ])
  if (code !== 0) {
    console.error(`\n✗ 打包卷 ${vol} 失败：${err.slice(0, 300)}`)
    process.exit(1)
  }
  const note = vol.includes('secret') ? '★ 密钥（恢复后会话/加密依赖它）'
    : vol.includes('caddy') ? 'TLS 证书与本地 CA'
    : vol.includes('content') ? '上传的媒体'
    : '上传文件与配置'
  record(rel, 'volume', note)
}

// ③ 清单
const manifest = {
  tool: 'livefab-backup',
  version: 1,
  createdAt: new Date().toISOString(),
  // 说明：不含任何密钥或密码——只记"有什么、多大、校验和"
  databases: dbInfo,
  artifacts,
}
writeFileSync(join(DIR, 'manifest.json'), JSON.stringify(manifest, null, 2))
console.log(`\n  ✓ manifest.json                      ${artifacts.length} 个产物的校验和与行数`)

const totalBytes = artifacts.reduce((n, a) => n + a.bytes, 0)
console.log(`\n备份完成：${artifacts.length} 个产物，合计 ${(totalBytes / 1024 / 1024).toFixed(1)} MB`)
console.log(`目录：${DIR}`)
console.log('\n⚠️ 备份"跑成功"不等于备份"能用"——请跑：bun run tools/verify-backup.ts')
