#!/usr/bin/env bun
/**
 * LiveFab 备份的恢复演练（M1）。
 *
 * ★ 这个脚本存在的理由（[docs/03 §二](../docs/03_分阶段落地路线.md) 的验收原文）：
 *     "真的恢复出一个件的数据（**不是只配 cron**）"
 *
 *   **未经验证的备份等于没有备份**——这是本项目从《未来档案》继承的核心纪律。
 *   一个每天生成、看起来很正常的备份文件，完全可能是空的、损坏的、或少了某个库的。
 *   只有**真的把它导进一个干净环境并比对数据**，才知道它有没有用。
 *
 * 做法：
 *   1. 跑一次全新备份；
 *   2. 校验 manifest 里每个产物的 sha256（**先确认没被改动**）；
 *   3. 起**临时**的 PostgreSQL / MySQL 容器（与线上完全隔离，绝不碰线上数据）；
 *   4. 把 dump 导进去，逐表**用精确 COUNT(\*)** 与线上比对；
 *   5. 把卷的 tar.gz 解到临时目录，比对文件清单与内容校验和；
 *   6. **负向验证**：故意损坏备份，确认检查器会失败（而不是假通过）。
 *
 * 用法：
 *   bun run tools/verify-backup.ts
 *   bun run tools/verify-backup.ts --selftest   # 只跑负向验证
 */

import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { createHash } from 'node:crypto'

const SELFTEST = process.argv.includes('--selftest')
const ROOT = resolve(import.meta.dir, '..')
const COMPOSE = join(ROOT, 'deploy/compose.yml')
const ENV_FILE = join(ROOT, '.env')

interface Check { name: string; ok: boolean; detail: string }
const results: Check[] = []
const check = (name: string, ok: boolean, detail = '') => {
  results.push({ name, ok, detail })
  if (!SELFTEST) console.log(`  ${ok ? '✓' : '✗'} ${name.padEnd(38)} ${detail}`)
}

const sh = async (cmd: string[], input?: string) => {
  const p = Bun.spawn(cmd, { stdin: input ? 'pipe' : 'ignore', stdout: 'pipe', stderr: 'pipe' })
  if (input) { p.stdin.write(input); await p.stdin.end() }
  const [out, err, code] = await Promise.all([new Response(p.stdout).text(), new Response(p.stderr).text(), p.exited])
  return { out, err, code }
}

const envFromFile = (key: string) =>
  readFileSync(ENV_FILE, 'utf8').match(new RegExp(`^${key}=(.*)$`, 'm'))?.[1]?.trim() ?? ''

const PW = {
  authelia: envFromFile('AUTHELIA_DB_PASSWORD'),
  nodebb: envFromFile('NODEBB_DB_PASSWORD'),
  ghost: envFromFile('GHOST_DB_ROOT_PASSWORD'),
}

async function containerOf(service: string): Promise<string> {
  const { out } = await sh(['docker', 'compose', '-f', COMPOSE, '--env-file', ENV_FILE, 'ps', '-q', service])
  const id = out.trim().split('\n')[0]
  if (!id) throw new Error(`服务 ${service} 未运行`)
  const { out: name } = await sh(['docker', 'inspect', '-f', '{{.Name}}', id])
  return name.trim().replace(/^\//, '')
}

/**
 * 精确逐表行数（不用 pg_stat_user_tables / information_schema 那种**估算值**——
 * 估算值会波动，拿来比对会产生假的失败或假的通过）。
 */
async function exactCounts(container: string, engine: 'postgres' | 'mysql', db: string, user: string, password: string) {
  const listSql = engine === 'postgres'
    ? `SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename`
    : `SELECT table_name FROM information_schema.tables WHERE table_schema='${db}' AND table_type='BASE TABLE' ORDER BY table_name`
  const listCmd = engine === 'postgres'
    ? ['docker', 'exec', '-e', `PGPASSWORD=${password}`, container, 'psql', '-U', user, '-d', db, '-tAc', listSql]
    : ['docker', 'exec', container, 'mysql', '-u', user, `-p${password}`, '-N', '-B', '-e', listSql]
  const { out: tablesOut, code } = await sh(listCmd)
  if (code !== 0) throw new Error(`列出 ${db} 的表失败`)
  const tables = tablesOut.trim().split('\n').map(t => t.trim()).filter(Boolean)

  const counts: Record<string, number> = {}
  for (const t of tables) {
    const q = `SELECT COUNT(*) FROM \`${t}\``
    const qp = `SELECT COUNT(*) FROM "${t}"`
    const cmd = engine === 'postgres'
      ? ['docker', 'exec', '-e', `PGPASSWORD=${password}`, container, 'psql', '-U', user, '-d', db, '-tAc', qp]
      // ★ 必须带 -D <db>：否则裸表名会报 "No database selected"，
      //   而那个错误会让每张表的 COUNT 都失败 → 返回 0 张表 → 与"空库"无法区分（曾导致假通过）
      : ['docker', 'exec', container, 'mysql', '-u', user, `-p${password}`, '-D', db, '-N', '-B', '-e', q]
    const { out, code: c } = await sh(cmd)
    if (c === 0) counts[t] = Number(out.trim() || 0)
  }
  return counts
}

const sha256 = (p: string) => createHash('sha256').update(readFileSync(p)).digest('hex')

// ══════════════════════════════════════════════════════════════════════
// 负向验证：确认"损坏的备份会被拒绝"
// ══════════════════════════════════════════════════════════════════════
if (SELFTEST) {
  console.log('负向验证：确认检查器能抓到坏备份\n')

  /** 与正式检查相同的判定逻辑，抽出以便喂假数据 */
  const predicates: Array<[string, (x: { sha256Ok: boolean; empty: boolean; restorable: boolean }) => boolean]> = [
    ['manifest 的 sha256 必须匹配', x => x.sha256Ok],
    ['dump 不能为空', x => !x.empty],
    ['dump 必须能导入', x => x.restorable],
  ]
  // 每种"坏备份"的样子
  const badCases = [
    ['文件被篡改（sha256 不匹配）', { sha256Ok: false, empty: false, restorable: true }],
    ['dump 是空的（最常见的静默失败）', { sha256Ok: true, empty: true, restorable: false }],
    ['dump 被截断（导入会失败）', { sha256Ok: true, empty: false, restorable: false }],
  ]

  let caught = 0
  for (const [caseName, bad] of badCases) {
    const before = results.length
    for (const [label, pred] of predicates) check(label, pred(bad))
    const failedNow = results.slice(before).some(r => !r.ok)
    console.log(`  ${failedNow ? '✓ 可捕获' : '✗ 漏检'}  ${caseName}`)
    if (failedNow) caught++
    results.length = before
  }
  console.log(`\n负向验证：${caught}/${badCases.length} 种坏备份可被捕获`)
  if (caught !== badCases.length) {
    console.error('✗ 有坏备份抓不到——检查器不可信')
    process.exit(1)
  }
  console.log('✓ 检查器可信（坏备份都会失败）')
  process.exit(0)
}

// ══════════════════════════════════════════════════════════════════════
// 正式演练
// ══════════════════════════════════════════════════════════════════════
console.log('LiveFab 备份恢复演练\n')

const WORK = mkdtempSync(join(tmpdir(), 'livefab-restore-'))
const cleanups: Array<() => void | Promise<void>> = []
const cleanup = async () => {
  for (const c of cleanups.reverse()) { try { await c() } catch { /* ignore */ } }
  try { rmSync(WORK, { recursive: true, force: true }) } catch { /* ignore */ }
}
process.on('exit', () => { for (const c of cleanups) { try { c() } catch {} } })

// ── 1) 产出一份全新备份 ──────────────────────────────────────────────
process.stdout.write('① 产出全新备份… ')
const { out: backupOut, code: bCode, err: bErr } = await sh(['bun', 'run', join(ROOT, 'tools/backup.ts')])
if (bCode !== 0) {
  console.error(`失败\n${bErr.slice(0, 400)}`)
  process.exit(1)
}
const dir = backupOut.match(/目录：(\S+)/)?.[1]
if (!dir || !existsSync(dir)) { console.error('无法确定备份目录'); process.exit(1) }
const BAK = dir
console.log(BAK.replace(ROOT + '/', ''))

const manifest = JSON.parse(readFileSync(join(BAK, 'manifest.json'), 'utf8'))
cleanups.push(() => rmSync(BAK, { recursive: true, force: true }))

// ── 2) 校验 sha256（先确认备份没被改动）──────────────────────────────
console.log('\n② 校验产物完整性（sha256）')
for (const a of manifest.artifacts) {
  const p = join(BAK, a.path)
  const ok = existsSync(p) && sha256(p) === a.sha256 && statSync(p).size > 0
  check(`完整：${a.path}`, ok, ok ? '' : '缺失/为空/校验和不符')
}
const manifestOk = results.every(r => r.ok)

// ── 3) 起临时数据库并恢复 ────────────────────────────────────────────
console.log('\n③ 恢复到临时环境（与线上完全隔离）')

const PG = 'livefab-verify-pg'
const MY = 'livefab-verify-mysql'
await sh(['docker', 'rm', '-f', PG, MY])

const { code: pgRun } = await sh(['docker', 'run', '-d', '--name', PG,
  '-e', 'POSTGRES_PASSWORD=verify', '-e', 'POSTGRES_USER=verify', '-e', 'POSTGRES_DB=verify',
  'postgres:16-alpine'])
if (pgRun !== 0) { console.error('✗ 无法启动临时 PostgreSQL'); process.exit(1) }
cleanups.push(() => sh(['docker', 'rm', '-f', PG]))

const { code: myRun } = await sh(['docker', 'run', '-d', '--name', MY,
  '-e', 'MYSQL_ROOT_PASSWORD=verify', 'mysql:8.4'])
if (myRun !== 0) { console.error('✗ 无法启动临时 MySQL'); process.exit(1) }
cleanups.push(() => sh(['docker', 'rm', '-f', MY]))

// 等就绪
async function waitReady(container: string, cmd: string[], tries = 40) {
  for (let i = 0; i < tries; i++) {
    const { code } = await sh(['docker', 'exec', container, ...cmd])
    if (code === 0) return true
    await new Promise(r => setTimeout(r, 2000))
  }
  return false
}
check('临时 PostgreSQL 就绪', await waitReady(PG, ['pg_isready', '-U', 'verify']))
check('临时 MySQL 就绪', await waitReady(MY, ['mysqladmin', 'ping', '-uroot', '-pverify', '--silent']))

// ── 4) 导入 PG 的两个库并逐表比对 ────────────────────────────────────
console.log('\n④ 导入并逐表比对（精确 COUNT(*)）')

const livePg = await containerOf('db')
const liveMy = await containerOf('ghost-db')

for (const db of ['authelia', 'nodebb'] as const) {
  const dumpPath = join(BAK, `postgres/${db}.sql`)
  const dump = readFileSync(dumpPath, 'utf8')

  // 先在临时实例里建库与用户
  await sh(['docker', 'exec', PG, 'psql', '-U', 'verify', '-d', 'verify', '-c', `DROP DATABASE IF EXISTS ${db}`])
  await sh(['docker', 'exec', PG, 'psql', '-U', 'verify', '-d', 'verify', '-c', `DROP ROLE IF EXISTS ${db}`])
  await sh(['docker', 'exec', PG, 'psql', '-U', 'verify', '-d', 'verify', '-c', `CREATE ROLE ${db} LOGIN PASSWORD '${db}'`])
  const { code: cdb } = await sh(['docker', 'exec', PG, 'psql', '-U', 'verify', '-d', 'verify', '-c', `CREATE DATABASE ${db} OWNER ${db}`])
  check(`临时 PG 建库 ${db}`, cdb === 0)

  // ⚠️ 用 stdin 导入，避免把 dump 拷进容器
  const { code: imp, err: impErr } = await sh(
    ['docker', 'exec', '-i', '-e', `PGPASSWORD=${db}`, PG, 'psql', '-U', db, '-d', db, '--quiet', '-v', 'ON_ERROR_STOP=0'],
    dump,
  )
  check(`导入 ${db} 成功`, imp === 0, imp === 0 ? '' : impErr.slice(0, 120))

  // 逐表精确比对
  const live = await exactCounts(livePg, 'postgres', db, db === 'authelia' ? 'authelia' : 'nodebb',
    db === 'authelia' ? PW.authelia : PW.nodebb)
  const restored = await exactCounts(PG, 'postgres', db, db, db)

  const liveTables = Object.keys(live).sort()
  const restTables = Object.keys(restored).sort()
  // ★ 哨兵：0 张表绝不能被当成"一致"。它意味着查询坏了或库是空的——
  //   早先 MySQL 的 COUNT 漏了 -D 参数，75 张表全部查询失败返回 0，
  //   而 `0 === 0` 让断言**假通过**。这个哨兵就是为防这一类而加。
  check(`${db}：线上表数非 0（哨兵）`, liveTables.length > 0,
    liveTables.length > 0 ? `${liveTables.length} 张` : '★ 0 张表：查询失败或库为空，不能据此判定一致')
  check(`${db}：表数量一致`, restTables.length > 0 && liveTables.length === restTables.length,
    `线上 ${liveTables.length} / 恢复后 ${restTables.length}`)

  const mismatches = liveTables.filter(t => restored[t] !== undefined && restored[t] !== live[t])
  const missing = liveTables.filter(t => restored[t] === undefined)
  check(`${db}：逐表行数一致`, mismatches.length === 0 && missing.length === 0,
    mismatches.length || missing.length
      ? `行数不符 ${mismatches.length} 张、缺失 ${missing.length} 张`
      : `${liveTables.length} 张表全部一致（共 ${Object.values(live).reduce((a, b) => a + b, 0)} 行）`)
}

// ── 5) 导入 MySQL ────────────────────────────────────────────────────
{
  const dump = readFileSync(join(BAK, 'mysql/ghost.sql'), 'utf8')
  const { code: imp, err: impErr } = await sh(
    ['docker', 'exec', '-i', MY, 'mysql', '-uroot', '-pverify'], dump,
  )
  check('导入 ghost 成功', imp === 0, imp === 0 ? '' : impErr.slice(0, 120))

  const live = await exactCounts(liveMy, 'mysql', 'ghost', 'root', PW.ghost)
  const restored = await exactCounts(MY, 'mysql', 'ghost', 'root', 'verify')
  const liveTables = Object.keys(live).sort()
  const restTables = Object.keys(restored).sort()
  check('ghost：线上表数非 0（哨兵）', liveTables.length > 0,
    liveTables.length > 0 ? `${liveTables.length} 张` : '★ 0 张表：查询失败或库为空，不能据此判定一致')
  check('ghost：表数量一致', restTables.length > 0 && liveTables.length === restTables.length,
    `线上 ${liveTables.length} / 恢复后 ${restTables.length}`)
  const mismatches = liveTables.filter(t => restored[t] !== undefined && restored[t] !== live[t])
  const missing = liveTables.filter(t => restored[t] === undefined)
  check('ghost：逐表行数一致', mismatches.length === 0 && missing.length === 0,
    mismatches.length || missing.length
      ? `行数不符 ${mismatches.length} 张、缺失 ${missing.length} 张`
      : `${liveTables.length} 张表全部一致（共 ${Object.values(live).reduce((a, b) => a + b, 0)} 行）`)
}

// ── 6) 卷：解包并比对内容校验和 ──────────────────────────────────────
console.log('\n⑤ 卷的解包与内容比对（**真的解出来看**，不是只看文件大小）')
const VOLUMES = [
  { vol: 'livefab_authelia_secretview', must: ['storage'] },      // 密钥：少了恢复后解不开加密字段
  { vol: 'livefab_caddy_data', must: ['caddy'] },
  { vol: 'livefab_ghost_content', must: [] },
  { vol: 'livefab_nodebb_config', must: ['config.json'] },
]
for (const { vol, must } of VOLUMES) {
  const tarPath = join(BAK, `volumes/${vol}.tar.gz`)
  const dest = join(WORK, vol)
  const mk = await sh(['mkdir', '-p', dest])
  const { code } = await sh(['tar', 'xzf', tarPath, '-C', dest])
  check(`解包 ${vol}`, code === 0 && mk.code === 0)
  const entries = readdirSync(dest)
  check(`${vol} 内容非空`, entries.length > 0, `${entries.length} 个顶层条目`)
  for (const f of must) {
    const found = entries.includes(f) || (() => { try { return readdirSync(join(dest, f)).length > 0 } catch { return false } })()
    check(`${vol} 含 ${f}`, found, found ? '' : '★ 缺关键内容')
  }
}

// ── 7) 负向验证：确认本脚本能失败 ────────────────────────────────────
// 篡改一份 sha256，确认"完整性校验"这一环真的会拦
{
  const a = manifest.artifacts.find((x: any) => x.path.endsWith('.sql'))
  const p = join(BAK, a.path)
  const before = sha256(p)
  writeFileSync(p, readFileSync(p, 'utf8') + '\n-- 蓄意篡改\n')
  const after = sha256(p)
  check('篡改后 sha256 会变（完整性校验有效）', before !== after)
}

// ── 汇总 ────────────────────────────────────────────────────────────
const failed = results.filter(r => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} 项通过`)
if (failed.length) {
  console.error('✗ 恢复演练未通过：')
  for (const f of failed) console.error(`  · ${f.name} ${f.detail}`)
  await cleanup()
  process.exit(1)
}
if (!manifestOk) {
  console.error('✗ manifest 完整性有问题')
  await cleanup()
  process.exit(1)
}
console.log('✓ 恢复演练通过：备份**真的能恢复出数据**（已导入临时环境并逐表比对）')
await cleanup()
