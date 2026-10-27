import type { JsonObject, JsonValue, TokenRecord, Vault } from './types.ts'

const ALIAS_RE = /^\{([^{}]+)\}$/

export function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function getAtPath(root: JsonValue, path: string): JsonValue | undefined {
  let cur: JsonValue = root
  for (const part of path.split('.')) {
    if (!isObject(cur)) return undefined
    cur = cur[part]
    if (cur === undefined) return undefined
  }
  return cur
}

export function setAtPath(root: JsonObject, path: string, value: JsonValue): void {
  const parts = path.split('.')
  let cur: JsonObject = root
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i]!
    if (!isObject(cur[part])) cur[part] = {}
    cur = cur[part] as JsonObject
  }
  const last = parts[parts.length - 1]!
  const node = cur[last]
  if (isObject(node) && '$value' in node) node.$value = value
  else cur[last] = { $value: value }
}

export function flattenTokens(source: JsonValue, sourceFile: string): TokenRecord[] {
  const out: TokenRecord[] = []
  const walk = (node: JsonValue, prefix: string, inheritedType: string): void => {
    if (!isObject(node)) return
    const type = typeof node.$type === 'string' ? node.$type : inheritedType
    if (node.$value !== undefined) {
      if (!prefix) return
      const value = node.$value
      const alias = typeof value === 'string' && ALIAS_RE.test(value) ? value.replace(/[{}]/g, '') : null
      out.push({
        path: prefix,
        tier: prefix.split('.')[0] || 'root',
        type: type || inferType(value),
        rawValue: value,
        resolvedValue: null,
        alias,
        sourceFile,
        description: typeof node.$description === 'string' ? node.$description : undefined
      })
      return
    }
    for (const [key, child] of Object.entries(node)) {
      if (key.startsWith('$')) continue
      walk(child, prefix ? `${prefix}.${key}` : key, type)
    }
  }
  walk(source, '', '')
  return out
}

export function inferType(value: JsonValue): string {
  if (typeof value === 'number') return 'number'
  if (typeof value === 'boolean') return 'boolean'
  if (typeof value === 'string') {
    if (/^#([0-9a-f]{3,8})$/i.test(value)) return 'color'
    if (/^-?\d*\.?\d+(px|rem|em|%|ms|s)$/.test(value)) return 'dimension'
    return 'string'
  }
  return 'unknown'
}

export function resolveToken(path: string, tokens: Map<string, TokenRecord>, seen = new Set<string>()): JsonValue | null {
  const token = tokens.get(path)
  if (!token) return null
  if (token.alias) {
    if (seen.has(path)) return null
    seen.add(path)
    return resolveToken(token.alias, tokens, seen)
  }
  return token.rawValue
}

export function resolveAll(tokens: Map<string, TokenRecord>): void {
  for (const token of tokens.values()) token.resolvedValue = resolveToken(token.path, tokens)
}

export function mergeTokenFiles(files: Array<{ file: string; source: JsonValue }>): Map<string, TokenRecord> {
  const map = new Map<string, TokenRecord>()
  for (const { file, source } of files) {
    for (const token of flattenTokens(source, file)) {
      if (map.has(token.path)) {
        // Same path in two files: keep the later one, but mark description.
        token.description = token.description || `duplicate of ${map.get(token.path)?.sourceFile || 'unknown'}`
      }
      map.set(token.path, token)
    }
  }
  resolveAll(map)
  return map
}

export function toCssVariable(path: string): string {
  return '--dso-' + path.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase()
}

export function cssProjection(tokens: Map<string, TokenRecord>): string {
  const lines = [
    '/* LiveDSO projection · generated from vault/tokens. Do not edit by hand. */',
    ':root {'
  ]
  for (const token of [...tokens.values()].sort((a, b) => a.path.localeCompare(b.path))) {
    if (token.resolvedValue === null) continue
    const value = formatCssValue(token.resolvedValue)
    if (value === null) continue
    lines.push(`  ${toCssVariable(token.path)}: ${value};`)
  }
  lines.push('}', '')
  return lines.join('\n')
}

export function formatCssValue(value: JsonValue): string | null {
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return null
}

export function formatValue(value: JsonValue | null): string {
  if (value === null) return '—'
  if (typeof value === 'string') return value
  return JSON.stringify(value)
}

export function getTier(token: TokenRecord): string {
  return token.tier
}

export function isColorToken(token: TokenRecord): boolean {
  return token.type === 'color' || (typeof token.resolvedValue === 'string' && /^#([0-9a-f]{3,8})$/i.test(token.resolvedValue))
}

export function tokenSummary(vault: Vault): { total: number; byTier: Record<string, number>; byType: Record<string, number>; brokenAliases: number } {
  const byTier: Record<string, number> = {}
  const byType: Record<string, number> = {}
  let brokenAliases = 0
  for (const token of vault.tokens.values()) {
    byTier[token.tier] = (byTier[token.tier] || 0) + 1
    byType[token.type] = (byType[token.type] || 0) + 1
    if (token.resolvedValue === null) brokenAliases += 1
  }
  return { total: vault.tokens.size, byTier, byType, brokenAliases }
}
