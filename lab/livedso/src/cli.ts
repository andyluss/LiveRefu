#!/usr/bin/env node
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadVault, projection } from './vault.ts'
import { reportMarkdown, runChecks } from './checks.ts'
import { startServer } from './server.ts'

const args = process.argv.slice(2)
const cmd = args[0] || 'help'
const defaultVault = fileURLToPath(new URL('../vault', import.meta.url))
const vaultArg = process.env.LIVEDSO_VAULT || (cmd === 'serve' ? defaultVault : args[1] || defaultVault)
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
  case 'serve': {
    const port = Number(args[1] || process.env.PORT || 4173)
    await startServer({ port, vault: root })
    break
  }
  case 'help':
  default:
    console.log(`LiveDSO 0.1 · local-first design system operations

用法:
  node src/cli.ts check [vault]           检查并打印问题
  node src/cli.ts report [vault] [out]    输出健康报告 Markdown
  node src/cli.ts build [vault] [out]     输出 CSS 投影
  node src/cli.ts serve [port]            启动 Web Workbench

环境:
  LIVEDSO_VAULT   覆盖默认 vault
  PORT            覆盖默认端口 4173
`)
    if (cmd !== 'help') process.exitCode = 1
}
