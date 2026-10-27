// SPDX-License-Identifier: Apache-2.0
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'
import type { CheckResult, Vault } from './types.ts'
import { reportMarkdown } from './checks.ts'
import { formatValue } from './tokens.ts'

export interface ReportTemplateInfo {
  id: string
  name: string
  description?: string
  custom: boolean
}

const RELEASE_TEMPLATE = `# LiveDSO · Release Report

> Vault: \`{{vault.root}}\` ｜ Generated: {{generatedAt}}

## Summary

| Metric | Value |
| --- | ---: |
| Health | **{{score}}/100** |
| Tokens | {{counts.tokens}} |
| Deprecated tokens | {{counts.deprecated}} |
| Contracts | {{counts.contracts}} |
| Style cards | {{counts.styleCards}} |
| Errors | **{{errors}}** |
| Warnings | {{warnings}} |

## Issues

{{issues}}

## Tokens

{{tokensTable}}

## Contracts

{{contracts}}

## Style cards

{{styleCards}}
`

export function listReportTemplates(dir: string): ReportTemplateInfo[] {
  const list: ReportTemplateInfo[] = [
    { id: 'health', name: 'Health', description: '完整健康报告（内置）', custom: false },
    { id: 'release', name: 'Release', description: '发布摘要：健康/问题/token/契约/风格卡（内置）', custom: false }
  ]
  const abs = resolve(dir)
  if (existsSync(abs)) {
    for (const file of readdirSync(abs).filter(n => n.endsWith('.md')).sort()) {
      list.push({ id: basename(file, '.md'), name: basename(file, '.md'), custom: true })
    }
  }
  return list
}

export function renderReport(vault: Vault, result: CheckResult, id = 'health', dir = new URL('../templates/reports', import.meta.url).pathname): string {
  if (id === 'health') return reportMarkdown(vault, result)
  const builtin = id === 'release' ? RELEASE_TEMPLATE : null
  let text = builtin
  if (!text) {
    const file = resolve(dir, `${id}.md`)
    if (!file.startsWith(resolve(dir) + '/') || !existsSync(file)) throw new Error(`报告模板不存在：${id}`)
    text = readFileSync(file, 'utf8')
  }
  const ctx = context(vault, result)
  return text.replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, (_, key: string) => {
    const value = key.split('.').reduce<unknown>((cur, part) => cur && typeof cur === 'object' ? (cur as Record<string, unknown>)[part] : undefined, ctx)
    return value === undefined || value === null ? '' : String(value)
  })
}

function context(vault: Vault, result: CheckResult): Record<string, unknown> {
  const tokens = [...vault.tokens.values()]
  const tokenRows = tokens.map(t => `| \`${t.path}\` | ${t.tier} | ${t.type} | ${formatValue(t.resolvedValue)} | ${t.deprecated ? 'deprecated' : 'active'} |`).join('\n')
  const issues = result.issues.length
    ? result.issues.map(i => `- **${i.severity.toUpperCase()}** \`${i.code}\`${i.path ? ` · \`${i.path}\`` : ''} — ${i.message}${i.detail ? `\n  - ${i.detail}` : ''}`).join('\n')
    : '- 没有发现问题。'
  const contracts = vault.contracts.map(c => `- **${c.title}** (\`${c.id}\`, ${c.status || '—'}) — ${c.summary || 'no summary'}`).join('\n') || '- none'
  const styleCards = vault.styleCards.map(c => `- **${c.name}** (\`${c.id}\`, ${c.era || '—'}) — ${c.note || 'no note'}`).join('\n') || '- none'
  return {
    title: 'LiveDSO Report',
    generatedAt: new Date(Date.now() + 8 * 3600 * 1000).toISOString().replace('Z', '+08:00'),
    vault: { root: vault.root, name: vault.meta.name || '', version: vault.meta.version || '' },
    score: result.score, errors: result.errors, warnings: result.warnings, infos: result.infos,
    counts: { tokens: tokens.length, deprecated: tokens.filter(t => t.deprecated).length, contracts: vault.contracts.length, styleCards: vault.styleCards.length },
    issues,
    tokensTable: `| Path | Tier | Type | Resolved | Lifecycle |\n| --- | --- | --- | --- | --- |\n${tokenRows}`,
    contracts,
    styleCards
  }
}
