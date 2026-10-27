#!/usr/bin/env node
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { scanArchive, stats } from './archive.ts'
import { backupReport, catalog, healthCheck, manifest } from './health.ts'
import { recordRestore, runBackup, verifyRestore } from './backup.ts'
import { publicHtml } from './public.ts'
import { buildInheritancePackage } from './inherit.ts'
import { retentionAudit } from './retention.ts'
import { startServer } from './server.ts'

const args = process.argv.slice(2)
const cmd = args[0] || 'help'
const defaultArchive = fileURLToPath(new URL('../archive', import.meta.url))
const archiveDir = resolve(process.env.LIVEFILE_ARCHIVE || (cmd === 'serve' ? defaultArchive : args[1] || defaultArchive))

function scan(): ReturnType<typeof scanArchive> {
  const index = scanArchive(archiveDir)
  const health = healthCheck(index)
  const s = stats(index)
  console.log(`archive: ${archiveDir}`)
  console.log(`items: ${s.items} · collections: ${s.collections} · types: ${s.types} · unmanaged: ${s.unmanaged}`)
  console.log(`health: ${health.score}/100 · ${health.errors} errors · ${health.warnings} warnings`)
  for (const issue of health.issues) console.log(`  [${issue.severity}] ${issue.code}${issue.path ? ` ${issue.path}` : ''} — ${issue.message}`)
  return index
}

switch (cmd) {
  case 'check': {
    const index = scan()
    process.exitCode = healthCheck(index).errors ? 1 : 0
    break
  }
  case 'catalog': {
    const index = scanArchive(archiveDir)
    const out = resolve(args[2] || 'reports/archive-catalog.md')
    mkdirSync(dirname(out), { recursive: true })
    writeFileSync(out, catalog(index, healthCheck(index)) + '\n', 'utf8')
    console.log(`wrote ${out}`)
    break
  }
  case 'manifest': {
    const index = scanArchive(archiveDir)
    const out = resolve(args[2] || 'reports/archive-manifest.json')
    mkdirSync(dirname(out), { recursive: true })
    writeFileSync(out, manifest(index), 'utf8')
    console.log(`wrote ${out}`)
    break
  }
  case 'retention': {
    const index = scanArchive(archiveDir)
    const rows = retentionAudit(index)
    for (const r of rows) console.log(`${r.status.padEnd(9)} ${r.expires || '—'}  ${r.item.path}  ${r.policy}`)
    if (!rows.length) console.log('no retention issues')
    break
  }
  case 'backup': {
    const index = scanArchive(archiveDir)
    const out = resolve(args[2] || 'reports/backup-report.md')
    mkdirSync(dirname(out), { recursive: true })
    writeFileSync(out, backupReport(index, healthCheck(index)) + '\n', 'utf8')
    console.log(`wrote ${out}`)
    break
  }
  case 'backup-run': {
    const target = args[1] || 'reports/backup'
    const index = scanArchive(archiveDir)
    const result = runBackup(index, resolve(target))
    console.log(result.ok ? `backup ok: ${result.files} files` : `backup failed: ${result.errors.length} errors`)
    console.log(`target: ${result.target}`)
    for (const e of result.errors) console.log('  ' + e)
    process.exitCode = result.ok ? 0 : 1
    break
  }
  case 'restore-check': {
    const source = args[1]
    if (!source) { console.error('用法: node src/cli.ts restore-check <backup-dir>'); process.exitCode = 1; break }
    const result = verifyRestore(resolve(source))
    recordRestore(archiveDir, result)
    console.log(result.ok ? `restore ok: ${result.checked} files` : `restore failed: ${result.errors.length} errors`)
    for (const e of result.errors) console.log('  ' + e)
    process.exitCode = result.ok ? 0 : 1
    break
  }
  case 'inherit': {
    const out = args[1]
    if (!out) { console.error('用法: node src/cli.ts inherit <out-dir>'); process.exitCode = 1; break }
    const index = scanArchive(archiveDir)
    const result = buildInheritancePackage(index, resolve(out))
    console.log(result.ok ? `inheritance package ok: ${result.files} files` : `inheritance package had ${result.errors.length} errors`)
    console.log(`out: ${result.out}`)
    for (const e of result.errors) console.log('  ' + e)
    process.exitCode = result.ok ? 0 : 1
    break
  }
  case 'public': {
    const index = scanArchive(archiveDir)
    const out = resolve(args[2] || 'reports/public-archive.html')
    mkdirSync(dirname(out), { recursive: true })
    writeFileSync(out, publicHtml(index), 'utf8')
    console.log(`wrote ${out}`)
    break
  }
  case 'serve': {
    const port = Number(args[1] || process.env.PORT || 4175)
    await startServer({ port, archive: archiveDir })
    break
  }
  case 'help':
  default:
    console.log(`LiveFile 0.4 · local-first personal archive

用法:
  node src/cli.ts check [archive]             索引 + 健康检查
  node src/cli.ts catalog [archive] [out]     生成档案目录 Markdown
  node src/cli.ts manifest [archive] [out]    生成机器可读清单 JSON
  node src/cli.ts retention [archive]        保留期审计
  node src/cli.ts backup [archive] [out]      生成备份/继承报告
  node src/cli.ts backup-run <target>         复制备份并校验
  node src/cli.ts restore-check <target>      校验恢复（只读）
  node src/cli.ts public [archive] [out]      生成独立公开页
  node src/cli.ts inherit <out-dir>           生成继承包（原始文件 + 清单 + 公开页）
  node src/cli.ts serve [port]                启动 Web Workbench

环境:
  LIVEFILE_ARCHIVE   覆盖默认 archive
  PORT               覆盖默认端口 4175
`)
    if (cmd !== 'help') process.exitCode = 1
}
