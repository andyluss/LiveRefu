#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadVault, projection } from './vault.ts'
import { reportMarkdown, runChecks } from './checks.ts'
import { startServer } from './server.ts'
import { importTokens } from './import.ts'
import { scanAdoption } from './adoption.ts'
import { createSnapshot, diffSnapshot, listSnapshots } from './history.ts'
import { formatCi, markdownCi, runCi } from './ci.ts'

const args = process.argv.slice(2)
const cmd = args[0] || 'help'
const defaultVault = fileURLToPath(new URL('../vault', import.meta.url))
const defaultVaultCmd = ['serve', 'adopt', 'snapshot', 'history', 'diff', 'ci'].includes(cmd)
const vaultArg = process.env.LIVEDSO_VAULT || (defaultVaultCmd ? defaultVault : args[1] || defaultVault)
const root = resolve(vaultArg)

function printIssues(): number {
  const vault = loadVault(root)
  const result = runChecks(vault)
  console.log(`vault: ${root}`)
  console.log(`tokens: ${vault.tokens.size} · contracts: ${vault.contracts.length} · style cards: ${vault.styleCards.length}`)
  console.log(`health: ${result.score}/100 · errors: ${result.errors} · warnings: ${result.warnings}`)
  for (const issue of result.issues) console.log(`  [${issue.severity}] ${issue.code}${issue.path ? ` ${issue.path}` : ''} — ${issue.message}`)
  return result.errors > 0 ? 1 : 0
}

switch (cmd) {
  case 'check':
    process.exitCode = printIssues()
    break
  case 'report': {
    const vault = loadVault(root)
    const result = runChecks(vault)
    const out = resolve(args[2] || 'reports/health.md')
    mkdirSync(dirname(out), { recursive: true })
    writeFileSync(out, reportMarkdown(vault, result) + '\n', 'utf8')
    console.log(`wrote ${out}`)
    break
  }
  case 'build': {
    const vault = loadVault(root)
    const out = resolve(args[2] || 'dist/tokens.css')
    mkdirSync(dirname(out), { recursive: true })
    writeFileSync(out, projection(vault), 'utf8')
    console.log(`wrote ${out}`)
    break
  }
  case 'import': {
    const src = resolve(args[1] || '../../design/tokens')
    const target = resolve(args[2] || 'vault-lrds')
    const sample = fileURLToPath(new URL('../vault', import.meta.url))
    const r = importTokens(src, target, sample)
    console.log(`imported ${r.tokens} files → ${target}`)
    break
  }
  case 'adopt': {
    const target = resolve(args[1] || '.')
    const vault = loadVault(root)
    const result = scanAdoption(target, vault)
    if (args.includes('--json')) {
      console.log(JSON.stringify(result, null, 2))
    } else {
      console.log(`scan: ${result.root}`)
      console.log(`files: ${result.filesScanned} · token refs: ${result.tokenRefs} · raw colors: ${result.rawColors} · unknown --dso vars: ${result.unknownRefs}`)
      for (const t of result.tokens.slice(0, 10)) console.log(`  token ${t.path} — ${t.count}`)
      for (const u of result.unknown.slice(0, 20)) console.log(`  unknown ${u.name} — ${u.file}`)
      for (const f of result.files.filter(x => x.rawColors > 0).slice(0, 20)) console.log(`  raw ${f.path} — ${f.rawColors}`)
    }
    if (result.errors.length) process.exitCode = 1
    else if (args.includes('--strict') && result.unknownRefs > 0) process.exitCode = 1
    else if (args.includes('--fail-on-raw') && result.rawColors > 0) process.exitCode = 1
    break
  }
  case 'snapshot': {
    const vault = loadVault(root)
    const snap = createSnapshot(vault)
    console.log(`snapshot ${snap.id} · ${Object.keys(snap.tokens).length} tokens · ${snap.vault}`)
    break
  }
  case 'history': {
    const vault = loadVault(root)
    const list = listSnapshots(vault)
    for (const x of list) console.log(`${x.id}  ${x.createdAt}  ${x.tokens} tokens / ${x.contracts} contracts / ${x.styleCards} cards`)
    if (!list.length) console.log('no snapshots')
    break
  }
  case 'diff': {
    if (!args[1]) { console.error('用法: node src/cli.ts diff <snapshot-id> [--json]'); process.exitCode = 1; break }
    const vault = loadVault(root)
    const result = diffSnapshot(vault, args[1])
    if (args.includes('--json')) console.log(JSON.stringify(result, null, 2))
    else {
      console.log(`diff ${result.id}: +${result.counts.added} -${result.counts.removed} ~${result.counts.changed}`)
      for (const x of result.addedTokens) console.log(`  + token ${x}`)
      for (const x of result.removedTokens) console.log(`  - token ${x}`)
      for (const x of result.changedTokens) console.log(`  ~ token ${x.path}`)
      for (const x of result.changedContracts) console.log(`  ~ contract ${x}`)
      for (const x of result.changedStyleCards) console.log(`  ~ style-card ${x}`)
    }
    break
  }
  case 'ci': {
    const flag = (name: string) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined }
    const num = (name: string) => { const v = flag(name); return v === undefined ? undefined : Number(v) }
    const result = runCi({
      registry: resolve(flag('--registry') || 'vaults.json'),
      adopt: flag('--adopt') ? resolve(flag('--adopt')!) : undefined,
      baseline: flag('--baseline'),
      strict: args.includes('--strict'),
      maxWarnings: num('--max-warnings'),
      maxRaw: num('--max-raw'),
      maxDeprecated: num('--max-deprecated')
    })
    const out = flag('--out')
    if (out) { mkdirSync(dirname(resolve(out)), { recursive: true }); writeFileSync(resolve(out), markdownCi(result), 'utf8'); console.log(`wrote ${resolve(out)}`) }
    if (args.includes('--json')) console.log(JSON.stringify(result, null, 2))
    else if (!out) console.log(formatCi(result))
    process.exitCode = result.ok ? 0 : 1
    break
  }
  case 'serve': {
    const port = Number(args[1] || process.env.PORT || 4173)
    await startServer({ port, vault: root })
    break
  }
  case 'help':
  default:
    console.log(`LiveDSO 0.8 · local-first design system operations

用法:
  node src/cli.ts check [vault]           检查并打印问题
  node src/cli.ts report [vault] [out]    输出健康报告 Markdown
  node src/cli.ts build [vault] [out]     输出 CSS 投影
  node src/cli.ts import [src] [vault]    导入 design/tokens 到 vault-lrds
  node src/cli.ts adopt [dir] [--json] [--strict|--fail-on-raw]
                                          扫描代码中的 token/裸色引用
  node src/cli.ts snapshot                 创建本地快照
  node src/cli.ts history                  列出快照
  node src/cli.ts diff <id> [--json]       对比当前 vault 与快照
  node src/cli.ts ci [--json] [--strict] [--adopt <dir>] [--baseline <id>] [--out <md>]
                                          跨 vault 本地 CI 门禁
  node src/cli.ts serve [port]            启动 Web Workbench

环境:
  LIVEDSO_VAULT   覆盖默认 vault
  PORT            覆盖默认端口 4173
`)
    if (cmd !== 'help') process.exitCode = 1
}
