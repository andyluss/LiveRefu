// SPDX-License-Identifier: Apache-2.0
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'
import type { CheckResult, Vault } from './types.ts'
import { reportMarkdown } from './checks.ts'
import { formatValue, toCssVariable } from './tokens.ts'

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
  return renderTemplate(text, context(vault, result))
}

function lookup(ctx: Record<string, unknown>, key: string): unknown {
  return key.split('.').reduce<unknown>((cur, part) => cur && typeof cur === 'object' ? (cur as Record<string, unknown>)[part] : undefined, ctx)
}

/** 渲染安全占位符：#each 风格循环 + #if 条件，不执行代码。 */
function renderTemplate(text: string, ctx: Record<string, unknown>): string {
  const loop = /\{\{#(tokens|issues|contracts|styleCards)\}\}([\s\S]*?)\{\{\/\1\}\}/g
  text = text.replace(loop, (_, name: string, body: string) => {
    const key = ({ tokens: 'tokenItems', issues: 'issueItems', contracts: 'contractItems', styleCards: 'styleCardItems' } as Record<string, string>)[name] || name
    const list = ctx[key]
    if (!Array.isArray(list)) return ''
    return list.map(item => renderTemplate(body, (item || {}) as Record<string, unknown>)).join('')
  })
  text = text.replace(/\{\{#if\s+([a-zA-Z0-9_.]+)\s*\}\}([\s\S]*?)\{\{\/if\}\}/g, (_, key: string, body: string) => lookup(ctx, key) ? renderTemplate(body, ctx) : '')
  return text.replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, (_, key: string) => {
    const value = lookup(ctx, key)
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
    styleCards,
    tokenItems: tokens.map(t => ({ path: t.path, tier: t.tier, type: t.type, raw: formatValue(t.rawValue), resolved: formatValue(t.resolvedValue), deprecated: Boolean(t.deprecated), replacedBy: t.replacedBy || '', note: t.deprecationNote || '', cssVar: toCssVariable(t.path), file: t.sourceFile.split('/').pop() })),
    issueItems: result.issues.map(i => ({ severity: i.severity, code: i.code, path: i.path || '', message: i.message, detail: i.detail || '' })),
    contractItems: vault.contracts.map(c => ({ id: c.id, title: c.title, status: c.status || '', summary: c.summary || '', states: (c.states || []).join(', '), tokens: (c.tokens || []).join(', ') })),
    styleCardItems: vault.styleCards.map(c => ({ id: c.id, name: c.name, era: c.era || '', note: c.note || '', colors: (c.colors || []).join(', ') }))
  }
}
