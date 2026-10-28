// SPDX-License-Identifier: Apache-2.0
import type { CheckResult, Issue, Vault } from './types.ts'
import { formatValue, isColorToken, resolveToken } from './tokens.ts'

export interface RGB { r: number; g: number; b: number; a: number }

export function parseColor(value: string): RGB | null {
  let s = value.trim()
  if (/^#([0-9a-f]{3}|[0-9a-f]{4})$/i.test(s)) {
    const hex = s.slice(1)
    const parts = (hex.length === 3 ? hex.split('').map(c => c + c) : [hex.slice(0, 2), hex.slice(2, 4)])
    const [r, g, b, a] = [parseInt(parts[0]!, 16), parseInt(parts[1]!, 16), parseInt(parts[2]!, 16), hex.length === 4 ? parseInt(hex.slice(3) + hex.slice(3), 16) : 255]
    return { r, g, b, a: a / 255 }
  }
  if (/^#([0-9a-f]{6}|[0-9a-f]{8})$/i.test(s)) {
    const hex = s.slice(1)
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
      a: hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1
    }
  }
  return null
}

function channel(v: number): number {
  const c = v / 255
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

function luminance(c: RGB): number {
  return 0.2126 * channel(c.r) + 0.7152 * channel(c.g) + 0.0722 * channel(c.b)
}

function blend(fg: RGB, bg: RGB): RGB {
  if (fg.a >= 1) return fg
  const a = fg.a
  return { r: fg.r * a + bg.r * (1 - a), g: fg.g * a + bg.g * (1 - a), b: fg.b * a + bg.b * (1 - a), a: 1 }
}

export function contrast(fg: RGB, bg: RGB): number {
  const f = luminance(blend(fg, bg))
  const b = luminance(bg)
  const hi = Math.max(f, b), lo = Math.min(f, b)
  return (hi + 0.05) / (lo + 0.05)
}

export function colorOf(vault: Vault, path: string): RGB | null {
  const token = vault.tokens.get(path)
  if (!token) return null
  const value = resolveToken(path, vault.tokens)
  return typeof value === 'string' ? parseColor(value) : null
}

export function runChecks(vault: Vault, extraIssues: Issue[] = []): CheckResult {
  const issues: Issue[] = [...extraIssues]
  const push = (issue: Issue): void => { issues.push(issue) }
  const cfg = vault.checks || {}
  const rawTiers = new Set(cfg.rawValueTiers || [])

  // 1. Aliases and semantic raw values
  for (const token of vault.tokens.values()) {
    if (token.resolvedValue === null) {
      push({ code: 'alias.broken', severity: 'error', path: token.path, message: `无法解析别名：${formatValue(token.rawValue)}`, messageEn: `Cannot resolve alias: ${formatValue(token.rawValue)}`, detail: token.alias ? `目标 ${token.alias} 不存在或形成循环` : undefined, detailEn: token.alias ? `Target ${token.alias} is missing or cyclic.` : undefined })
    }
    if (rawTiers.has(token.tier) && isColorToken(token) && token.alias === null) {
      push({ code: 'token.raw-color', severity: 'warn', path: token.path, message: '语义层直接写了色值，建议改为引用 ref.*', messageEn: 'Semantic tier contains a raw color; reference ref.* instead.', detail: formatValue(token.rawValue), detailEn: formatValue(token.rawValue) })
    }
  }

  // 1b. Lifecycle / deprecation
  for (const token of vault.tokens.values()) {
    if (!token.deprecated) continue
    if (!token.replacedBy) {
      push({ code: 'token.deprecated-no-replacement', severity: 'warn', path: token.path, message: `${token.path} 已弃用但没有写 replacedBy。`, messageEn: `${token.path} is deprecated but has no replacedBy.`, detail: token.deprecationNote, detailEn: token.deprecationNote })
    } else if (token.replacedBy === token.path) {
      push({ code: 'token.deprecated-self', severity: 'error', path: token.path, message: `${token.path} 的 replacedBy 指向自己。`, messageEn: `${token.path} replacedBy points to itself.` })
    } else if (!vault.tokens.has(token.replacedBy)) {
      push({ code: 'token.deprecated-target', severity: 'error', path: token.path, message: `${token.path} 的替代 token 不存在：${token.replacedBy}`, messageEn: `${token.path} replacement token does not exist: ${token.replacedBy}` })
    } else if (vault.tokens.get(token.replacedBy)?.deprecated) {
      push({ code: 'token.deprecated-chain', severity: 'warn', path: token.path, message: `${token.path} 的替代 token 也已弃用：${token.replacedBy}`, messageEn: `${token.path} replacement token is also deprecated: ${token.replacedBy}` })
    }
  }

  // 2. Focus must be independent from action
  if (cfg.focusToken && cfg.actionToken) {
    const f = resolveToken(cfg.focusToken, vault.tokens)
    const a = resolveToken(cfg.actionToken, vault.tokens)
    if (f && a && String(f).toLowerCase() === String(a).toLowerCase()) {
      push({ code: 'focus.reuses-action', severity: 'error', path: cfg.focusToken, message: '焦点色与主行动色相同；焦点必须独立。', messageEn: 'Focus color equals the action color; focus must be independent.' })
    }
  }

  // 3. Contrast pairs
  for (const pair of cfg.contrast || []) {
    const fg = colorOf(vault, pair.fg)
    const bg = colorOf(vault, pair.bg)
    if (!fg || !bg) continue
    const ratio = contrast(fg, bg)
    if (ratio + 0.005 < pair.min) {
      const aaa = pair.min >= 7
      push({
        code: 'contrast.low',
        severity: aaa ? 'warn' : 'error',
        path: `${pair.fg} on ${pair.bg}`,
        message: `${pair.label || '对比度'}：${ratio.toFixed(2)}:1，低于 ${pair.min}:1`,
        messageEn: `Contrast: ${ratio.toFixed(2)}:1, below ${pair.min}:1`,
        detail: aaa ? '这是 AAA 目标，不阻断，但应记录取舍。' : '正文/交互对比度不达标。',
        detailEn: aaa ? 'This is an AAA target; it does not block, but record the trade-off.' : 'Body/interaction contrast is below target.'
      })
    }
  }

  // 4. Contracts
  const required = cfg.contractRequired || ['anatomy', 'states', 'tokens', 'keyboard', 'a11y', 'do', 'dont']
  for (const contract of vault.contracts) {
    for (const key of required) {
      const value = (contract as Record<string, unknown>)[key]
      if (value === undefined || value === null || (Array.isArray(value) && value.length === 0)) {
        push({ code: 'contract.missing', severity: 'warn', path: contract.id, message: `${contract.title} 缺少契约字段：${key}`, messageEn: `${contract.title} is missing contract field: ${key}` })
      }
    }
    if (Array.isArray(contract.states) && contract.states.length < 5) {
      push({ code: 'contract.states', severity: 'warn', path: contract.id, message: `${contract.title} 状态少于 5 个（default/hover/active/focus/disabled）。`, messageEn: `${contract.title} has fewer than 5 states (default/hover/active/focus/disabled).` })
    }
    for (const tokenPath of contract.tokens || []) {
      if (!vault.tokens.has(tokenPath)) {
        push({ code: 'contract.token-missing', severity: 'error', path: contract.id, message: `${contract.title} 引用了不存在的 token：${tokenPath}`, messageEn: `${contract.title} references a missing token: ${tokenPath}` })
      } else if (vault.tokens.get(tokenPath)?.deprecated) {
        push({ code: 'contract.deprecated-token', severity: 'warn', path: contract.id, message: `${contract.title} 仍引用已弃用 token：${tokenPath}`, messageEn: `${contract.title} still references a deprecated token: ${tokenPath}`, detail: vault.tokens.get(tokenPath)?.deprecationNote, detailEn: vault.tokens.get(tokenPath)?.deprecationNote })
      }
    }
  }

  // 5. Style cards
  for (const card of vault.styleCards) {
    if (!card.name) push({ code: 'style-card.name', severity: 'warn', path: card.id, message: '风格卡缺少 name。', messageEn: 'Style card is missing name.' })
    if (!card.note) push({ code: 'style-card.note', severity: 'warn', path: card.id, message: `${card.name || card.id} 没有写“谁维护/代价”。`, messageEn: `${card.name || card.id} has no maintenance/cost note.` })
    for (const color of card.colors || []) {
      if (typeof color === 'string' && color.includes('.') && !vault.tokens.has(color)) {
        push({ code: 'style-card.token-missing', severity: 'warn', path: card.id, message: `${card.name} 引用了不存在的 token：${color}`, messageEn: `${card.name} references a missing token: ${color}` })
      } else if (typeof color === 'string' && vault.tokens.get(color)?.deprecated) {
        push({ code: 'style-card.deprecated-token', severity: 'warn', path: card.id, message: `${card.name} 仍引用已弃用 token：${color}`, messageEn: `${card.name} still references a deprecated token: ${color}` })
      }
    }
  }

  const errors = issues.filter(i => i.severity === 'error').length
  const warnings = issues.filter(i => i.severity === 'warn').length
  const infos = issues.filter(i => i.severity === 'info').length
  const score = Math.max(0, Math.min(100, 100 - errors * 14 - warnings * 4))
  return { issues, errors, warnings, infos, score }
}

export function localizeCheckResult(result: CheckResult, lang: string): CheckResult {
  if (lang !== 'en') return result
  return { ...result, issues: result.issues.map(i => ({ ...i, message: i.messageEn || i.message, detail: i.detailEn ?? i.detail })) }
}

export function reportMarkdown(vault: Vault, result: CheckResult): string {
  const rows = [...vault.tokens.values()].map(t => `| \`${t.path}\` | ${t.tier} | ${t.type} | ${formatValue(t.resolvedValue)} | ${t.deprecated ? 'deprecated' : 'active'} | ${t.sourceFile.split('/').pop()} |`).join('\n')
  const issues = result.issues.length
    ? result.issues.map(i => `- **${i.severity.toUpperCase()}** \`${i.code}\`${i.path ? ` · \`${i.path}\`` : ''} — ${i.message}${i.detail ? `\n  - ${i.detail}` : ''}`).join('\n')
    : '- 没有发现问题。'
  return `# LiveDSO · Design System Health Report

> Vault: \`${vault.root.replace(/\\/g, '/').split('/').slice(-3).join('/')}\` ｜ Generated: ${new Date().toISOString()}

## Summary

| 指标 | 值 |
| --- | ---: |
| Health score | **${result.score}/100** |
| Tokens | ${vault.tokens.size} |
| Contracts | ${vault.contracts.length} |
| Style cards | ${vault.styleCards.length} |
| Errors | **${result.errors}** |
| Warnings | ${result.warnings} |

## Issues

${issues}

## Token Inventory

| Path | Tier | Type | Resolved | Lifecycle | File |
| --- | --- | --- | --- | --- | --- |
${rows}

## Contracts

${vault.contracts.map(c => `- **${c.title}** (\`${c.id}\`, ${c.status || '—'}) — ${c.summary || 'no summary'}\n  - states: ${(c.states || []).join(', ') || '—'}\n  - tokens: ${(c.tokens || []).join(', ') || '—'}`).join('\n')}

## Style Cards

${vault.styleCards.map(c => `- **${c.name}** (\`${c.id}\`, ${c.era || '—'}) — ${c.note || 'no note'}\n  - colors: ${(c.colors || []).join(', ') || '—'}`).join('\n')}

## How to read

- **ERROR** 应阻断发布：坏别名、正文对比度、焦点复用、契约引用不存在 token。
- **WARN** 不阻断，但必须记录取舍：语义层裸色、AAA 未达、契约缺字段、风格卡缺维护说明。
- 这份报告由 LiveDSO 在本地生成，不上传任何 vault 内容。
`
}
