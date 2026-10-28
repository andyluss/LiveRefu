#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadVault, projection } from './vault.ts'
import { localizeCheckResult, runChecks } from './checks.ts'
import { buildReportBundle, listReportTemplates, renderReport } from './reports.ts'
import { startServer } from './server.ts'
import { importTokens } from './import.ts'
import { scanAdoption } from './adoption.ts'
import { createSnapshot, diffSnapshot, listSnapshots, trendSnapshots } from './history.ts'
import { allTrends } from './trend.ts'
import { pluginTestAll } from './plugin-test.ts'
import { formatCi, markdownCi, runCi } from './ci.ts'
import { loadPlugins, runPlugins } from './plugins.ts'

const args = process.argv.slice(2)
const cmd = args[0] || 'help'
const defaultVault = fileURLToPath(new URL('../vaults/lrds-sample', import.meta.url))
const FLAGS_WITH_VALUE = new Set(['--plugins', '--registry', '--adopt', '--baseline', '--out', '--out-dir', '--template', '--lang', '--max-warnings', '--max-raw', '--max-deprecated'])
const positionals: string[] = []
for (let i = 1; i < args.length; i++) {
  const a = args[i]!
  if (a.startsWith('--')) { if (FLAGS_WITH_VALUE.has(a)) i++; continue }
  positionals.push(a)
}
const defaultVaultCmd = ['serve', 'adopt', 'snapshot', 'history', 'diff', 'ci', 'trend', 'plugin-test'].includes(cmd)
const vaultArg = process.env.LIVEDSO_VAULT || (defaultVaultCmd ? defaultVault : positionals[0] || defaultVault)
const root = resolve(vaultArg)
const pluginDir = resolve(args.includes('--plugins') ? args[args.indexOf('--plugins') + 1]! : process.env.LIVEDSO_PLUGINS || fileURLToPath(new URL('../plugins', import.meta.url)))
const loadedPlugins = await loadPlugins(pluginDir)
const langArg = args.indexOf('--lang')
const lang = langArg >= 0 ? (args[langArg + 1] === 'en' ? 'en' : 'zh') : 'zh'

function printIssues(): number {
  const vault = loadVault(root)
  const result = localizeCheckResult(runChecks(vault, [...loadedPlugins.errors, ...runPlugins(loadedPlugins.plugins, vault)]), lang)
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
    if (args.includes('--list-templates')) {
      for (const t of listReportTemplates(new URL('../templates/reports', import.meta.url).pathname)) console.log(`${t.id}\t${t.custom ? 'custom' : 'builtin'}\t${t.description || t.name}`)
      break
    }
    const vault = loadVault(root)
    const result = localizeCheckResult(runChecks(vault, [...loadedPlugins.errors, ...runPlugins(loadedPlugins.plugins, vault)]), lang)
    if (args.includes('--bundle')) {
      const di = args.indexOf('--out-dir')
      const outDir = resolve(di >= 0 ? args[di + 1]! : 'reports/bundle')
      const bundle = buildReportBundle(vault, result, new URL('../templates/reports', import.meta.url).pathname)
      mkdirSync(outDir, { recursive: true })
      for (const f of bundle.files) writeFileSync(resolve(outDir, `${f.id}.md`), f.markdown + '\n', 'utf8')
      writeFileSync(resolve(outDir, 'index.md'), bundle.index, 'utf8')
      console.log(`wrote ${bundle.files.length} reports → ${outDir}`)
      break
    }
    const ti = args.indexOf('--template')
    const template = ti >= 0 ? args[ti + 1] || 'health' : 'health'
    const outFlag = args.indexOf('--out')
    const out = resolve(outFlag >= 0 ? args[outFlag + 1]! : positionals[1] || `reports/${template}.md`)
    mkdirSync(dirname(out), { recursive: true })
    writeFileSync(out, renderReport(vault, result, template, new URL('../templates/reports', import.meta.url).pathname) + '\n', 'utf8')
    console.log(`wrote ${out}`)
    break
  }
  case 'build': {
    const vault = loadVault(root)
    const out = resolve(positionals[1] || 'dist/tokens.css')
    mkdirSync(dirname(out), { recursive: true })
    writeFileSync(out, projection(vault), 'utf8')
    console.log(`wrote ${out}`)
    break
  }
  case 'import': {
    const src = resolve(positionals[0] || '../../design/tokens')
    const target = resolve(positionals[1] || 'vaults/lrds-real')
    const sample = fileURLToPath(new URL('../vaults/lrds-sample', import.meta.url))
    const r = importTokens(src, target, sample)
    console.log(`imported ${r.tokens} files → ${target}`)
    break
  }
  case 'adopt': {
    const target = resolve(positionals[0] || '.')
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
  case 'trend': {
    if (args.includes('--all')) {
      const flag = (name: string) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined }
      const result = allTrends(resolve(flag('--registry') || 'vaults.json'))
      if (args.includes('--json')) console.log(JSON.stringify(result, null, 2))
      else {
        for (const v of result.vaults) {
          console.log(`\n${v.id} · ${v.name}${v.error ? ` · ${v.error}` : ''}`)
          for (const x of v.points) console.log(`  ${x.createdAt}  ${x.tokens} tokens / ${x.deprecated} deprecated / ${x.contracts} contracts / ${x.styleCards} cards`)
          if (!v.points.length && !v.error) console.log('  no snapshots')
        }
        if (result.errors.length) console.log(`errors: ${result.errors.join('; ')}`)
      }
      break
    }
    const vault = loadVault(root)
    const trend = trendSnapshots(vault)
    if (args.includes('--json')) console.log(JSON.stringify(trend, null, 2))
    else {
      console.log('createdAt                     tokens  deprecated  contracts  cards')
      for (const x of trend) console.log(`${x.createdAt.padEnd(28)} ${String(x.tokens).padStart(6)}  ${String(x.deprecated).padStart(10)}  ${String(x.contracts).padStart(9)}  ${x.styleCards}`)
      if (!trend.length) console.log('no snapshots')
    }
    break
  }
  case 'diff': {
    if (!positionals[0]) { console.error('用法: node src/cli.ts diff <snapshot-id> [--json]'); process.exitCode = 1; break }
    const vault = loadVault(root)
    const result = diffSnapshot(vault, positionals[0]!)
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
  case 'plugin-test': {
    if (args.includes('--all')) {
      const flag = (name: string) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined }
      const matrix = pluginTestAll(resolve(flag('--registry') || 'vaults.json'), loadedPlugins.plugins, loadedPlugins.errors)
      if (args.includes('--json')) console.log(JSON.stringify(matrix, null, 2))
      else {
        for (const v of matrix.vaults) {
          const errors = v.issues.filter(i => i.severity === 'error').length
          console.log(`\n${v.id} · ${v.name}${v.error ? ` · ${v.error}` : ''}`)
          console.log(`  plugins: ${v.plugins.join(', ') || 'none'} · issues: ${v.issues.length} · errors: ${errors}`)
          for (const i of v.issues) console.log(`    [${i.severity}] ${i.code}${i.path ? ` ${i.path}` : ''} — ${i.message}`)
        }
        if (matrix.registryErrors.length) console.log(`registry: ${matrix.registryErrors.join('; ')}`)
      }
      const bad = loadedPlugins.errors.length || matrix.registryErrors.length || matrix.vaults.some(v => v.error || v.issues.some(i => i.severity === 'error'))
      process.exitCode = bad ? 1 : 0
      break
    }
    const vault = loadVault(root)
    const issues = localizeCheckResult(runChecks(vault, [...loadedPlugins.errors, ...runPlugins(loadedPlugins.plugins, vault)]), lang).issues
    if (args.includes('--json')) console.log(JSON.stringify({ plugins: loadedPlugins.plugins.map(p => p.name), errors: loadedPlugins.errors, issues }, null, 2))
    else {
      console.log(`plugins: ${loadedPlugins.plugins.map(p => p.name).join(', ') || 'none'}`)
      console.log(`issues: ${issues.length} · errors: ${issues.filter(i => i.severity === 'error').length}`)
      for (const i of issues) console.log(`  [${i.severity}] ${i.code}${i.path ? ` ${i.path}` : ''} — ${i.message}`)
    }
    process.exitCode = issues.some(i => i.severity === 'error') ? 1 : 0
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
      maxDeprecated: num('--max-deprecated'),
      plugins: loadedPlugins.plugins,
      pluginErrors: loadedPlugins.errors
    })
    const out = flag('--out')
    if (out) { mkdirSync(dirname(resolve(out)), { recursive: true }); writeFileSync(resolve(out), markdownCi(result), 'utf8'); console.log(`wrote ${resolve(out)}`) }
    if (args.includes('--json')) console.log(JSON.stringify(result, null, 2))
    else if (!out) console.log(formatCi(result))
    process.exitCode = result.ok ? 0 : 1
    break
  }
  case 'serve': {
    const port = Number(positionals[0] || process.env.PORT || 4173)
    await startServer({ port, vault: root, plugins: pluginDir })
    break
  }
  case 'help':
  default:
    console.log(`LiveAtelier 1.10.0 · (LiveDSO) local-first design system operations

用法:
  node src/cli.ts check [vault]           检查并打印问题
  node src/cli.ts report [vault] [out] [--template <id>] [--out <file>]
                                          输出报告（health/release/custom）
  node src/cli.ts report --list-templates              列出报告模板
  node src/cli.ts report --bundle [--out-dir <dir>]   生成全部报告 + index.md
  node src/cli.ts build [vault] [out]     输出 CSS 投影
  node src/cli.ts import [src] [vault]    导入 design/tokens 到 vaults/lrds-real
  node src/cli.ts adopt [dir] [--json] [--strict|--fail-on-raw]
                                          扫描代码中的 token/裸色引用
  node src/cli.ts snapshot                 创建本地快照
  node src/cli.ts history                  列出快照
  node src/cli.ts diff <id> [--json]       对比当前 vault 与快照
  node src/cli.ts trend [--json]           快照趋势（token/弃用/契约/风格卡）
  node src/cli.ts trend --all [--registry <file>]  跨 vault 趋势
  node src/cli.ts plugin-test [--json]     本地插件加载/运行自检
  node src/cli.ts plugin-test --all [--registry <file>]  跨 vault 插件矩阵
  node src/cli.ts ci [--json] [--strict] [--adopt <dir>] [--baseline <id>] [--out <md>]
                                          跨 vault 本地 CI 门禁
  node src/cli.ts serve [port]            启动 Web Workbench

环境:
  LIVEDSO_VAULT   覆盖默认 vault
  PORT            覆盖默认端口 4173
`)
    if (cmd !== 'help') process.exitCode = 1
}
