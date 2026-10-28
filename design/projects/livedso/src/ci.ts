// SPDX-License-Identifier: Apache-2.0
import { loadRegistry } from './registry.ts'
import { loadVault } from './vault.ts'
import { runChecks } from './checks.ts'
import { scanAdoption } from './adoption.ts'
import { diffSnapshot } from './history.ts'
import { runPlugins, type LocalPlugin } from './plugins.ts'
import { adaptRegistry } from './adapt.ts'
import type { Issue } from './types.ts'

export interface CiOptions {
  registry?: string
  adopt?: string
  baseline?: string
  strict?: boolean
  maxWarnings?: number
  maxRaw?: number
  maxDeprecated?: number
  plugins?: LocalPlugin[]
  pluginErrors?: Issue[]
  adaptRegistry?: string
}
export interface CiVaultResult {
  id: string
  name: string
  path: string
  tokens: number
  contracts: number
  styleCards: number
  score: number
  errors: number
  warnings: number
  rawColors: number
  unknownRefs: number
  deprecatedRefs: number
  diff?: { id: string; added: number; removed: number; changed: number }
  error?: string
}
export interface CiResult {
  ok: boolean
  vaults: CiVaultResult[]
  totals: { tokens: number; contracts: number; styleCards: number; errors: number; warnings: number; rawColors: number; unknownRefs: number; deprecatedRefs: number }
  reasons: string[]
  registryErrors: string[]
  adapters?: { ok: boolean; total: number; failed: string[] }
}

export function runCi(options: CiOptions = {}): CiResult {
  const registryFile = options.registry || new URL('../vaults.json', import.meta.url).pathname
  const registry = loadRegistry(registryFile, new URL('../vaults/lrds-sample', import.meta.url).pathname)
  const reasons: string[] = []
  const vaults: CiVaultResult[] = []
  for (const entry of registry.vaults) {
    try {
      const vault = loadVault(entry.path)
      const checks = runChecks(vault, [...(options.pluginErrors || []), ...runPlugins(options.plugins || [], vault)])
      const adoption = options.adopt ? scanAdoption(options.adopt, vault) : null
      const diff = options.baseline ? diffSnapshot(vault, options.baseline) : null
      vaults.push({
        id: entry.id, name: entry.name, path: entry.path,
        tokens: vault.tokens.size, contracts: vault.contracts.length, styleCards: vault.styleCards.length,
        score: checks.score, errors: checks.errors, warnings: checks.warnings,
        rawColors: adoption?.rawColors || 0, unknownRefs: adoption?.unknownRefs || 0, deprecatedRefs: adoption?.deprecatedRefs || 0,
        diff: diff ? { id: diff.id, added: diff.counts.added, removed: diff.counts.removed, changed: diff.counts.changed } : undefined
      })
    } catch (e) {
      vaults.push({ id: entry.id, name: entry.name, path: entry.path, tokens: 0, contracts: 0, styleCards: 0, score: 0, errors: 1, warnings: 0, rawColors: 0, unknownRefs: 0, deprecatedRefs: 0, error: (e as Error).message })
      reasons.push(`${entry.id}: ${(e as Error).message}`)
    }
  }
  let adapters: CiResult['adapters']
  if (options.adaptRegistry) {
    try {
      const result = adaptRegistry({ registry: options.adaptRegistry, check: true })
      adapters = { ok: result.ok, total: result.results.length, failed: result.results.filter(r => !r.ok).map(r => r.theme) }
      if (!result.ok) reasons.push(`adapters: ${adapters.failed.join(', ') || 'failed'}`)
    } catch (e) {
      adapters = { ok: false, total: 0, failed: [(e as Error).message] }
      reasons.push(`adapters: ${(e as Error).message}`)
    }
  }
  const totals = vaults.reduce((a, v) => ({
    tokens: a.tokens + v.tokens, contracts: a.contracts + v.contracts, styleCards: a.styleCards + v.styleCards,
    errors: a.errors + v.errors, warnings: a.warnings + v.warnings,
    rawColors: a.rawColors + v.rawColors, unknownRefs: a.unknownRefs + v.unknownRefs, deprecatedRefs: a.deprecatedRefs + v.deprecatedRefs
  }), { tokens: 0, contracts: 0, styleCards: 0, errors: 0, warnings: 0, rawColors: 0, unknownRefs: 0, deprecatedRefs: 0 })
  if (totals.errors > 0) reasons.push(`checks: ${totals.errors} error(s)`)
  if (totals.warnings > (options.maxWarnings ?? Infinity)) reasons.push(`warnings: ${totals.warnings} > ${options.maxWarnings}`)
  if (totals.rawColors > (options.maxRaw ?? Infinity)) reasons.push(`raw colors: ${totals.rawColors} > ${options.maxRaw}`)
  if (totals.unknownRefs > 0) reasons.push(`unknown --dso vars: ${totals.unknownRefs}`)
  if (totals.deprecatedRefs > (options.maxDeprecated ?? Infinity)) reasons.push(`deprecated refs: ${totals.deprecatedRefs} > ${options.maxDeprecated}`)
  if (options.strict && (totals.warnings > 0 || totals.rawColors > 0 || totals.unknownRefs > 0 || totals.deprecatedRefs > 0)) reasons.push('strict mode')
  return { ok: reasons.length === 0 && registry.errors.length === 0, vaults, totals, reasons, registryErrors: registry.errors, adapters }
}

export function formatCi(result: CiResult): string {
  const lines = [
    `LiveDSO CI · ${result.ok ? 'PASS' : 'FAIL'}`,
    `vaults ${result.vaults.length} · tokens ${result.totals.tokens} · contracts ${result.totals.contracts} · cards ${result.totals.styleCards}`,
    `errors ${result.totals.errors} · warnings ${result.totals.warnings} · raw ${result.totals.rawColors} · unknown ${result.totals.unknownRefs} · deprecated ${result.totals.deprecatedRefs}`
  ]
  if (result.adapters) lines.push(`adapters ${result.adapters.total} · ${result.adapters.ok ? 'PASS' : `FAIL (${result.adapters.failed.join(', ')})`}`)
  for (const v of result.vaults) lines.push(`  ${v.id.padEnd(10)} score ${String(v.score).padStart(3)} · ${v.errors}e/${v.warnings}w${v.error ? ` · ${v.error}` : ''}${v.diff ? ` · diff +${v.diff.added}/-${v.diff.removed}/~${v.diff.changed}` : ''}`)
  if (result.reasons.length) lines.push(`reasons: ${result.reasons.join('; ')}`)
  return lines.join('\n')
}

export function markdownCi(result: CiResult): string {
  return `# LiveDSO CI Report

> Vaults: ${result.vaults.length} ｜ Result: **${result.ok ? 'PASS' : 'FAIL'}** ｜ Generated: ${new Date(Date.now() + 8 * 3600 * 1000).toISOString().replace('Z', '+08:00')}

| Vault | Score | Errors | Warnings | Raw | Unknown | Deprecated | Diff |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
${result.vaults.map(v => `| ${v.name} | ${v.score} | ${v.errors} | ${v.warnings} | ${v.rawColors} | ${v.unknownRefs} | ${v.deprecatedRefs} | ${v.diff ? `+${v.diff.added}/-${v.diff.removed}/~${v.diff.changed}` : '—'} |`).join('\n')}

${result.adapters ? `## Adapters\n\n- ${result.adapters.ok ? 'PASS' : 'FAIL'} · ${result.adapters.total} checked${result.adapters.failed.length ? ` · failed: ${result.adapters.failed.join(', ')}` : ''}\n\n` : ''}${result.reasons.length ? `## Blocking\n\n${result.reasons.map(r => `- ${r}`).join('\n')}` : '## Blocking\n\n- none'}
`
}
