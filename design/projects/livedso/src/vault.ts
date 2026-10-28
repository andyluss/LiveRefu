// SPDX-License-Identifier: Apache-2.0
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import type { ChecksConfig, Contract, JsonObject, JsonValue, StyleCard, Vault } from './types.ts'
import { cssProjection, formatValue, getAtPath, isObject, mergeTokenFiles, setAtPath, toCssVariable } from './tokens.ts'
import { colorOf, contrast } from './checks.ts'

export function loadVault(root: string): Vault {
  const abs = resolve(root)
  const errors: string[] = []
  const tokenDir = join(abs, 'tokens')
  const contractDir = join(abs, 'contracts')
  const styleDir = join(abs, 'style-cards')
  const checksPath = join(abs, 'checks.json')
  const tokenFiles: string[] = []
  const sources: Array<{ file: string; source: JsonValue }> = []
  let meta: Vault['meta'] = {}

  if (existsSync(tokenDir)) {
    for (const name of readdirSync(tokenDir).filter(n => n.endsWith('.json')).sort()) {
      const file = join(tokenDir, name)
      try {
        const source = JSON.parse(readFileSync(file, 'utf8')) as JsonValue
        tokenFiles.push(file)
        sources.push({ file, source })
        if (isObject(source) && isObject(source.meta) && !meta.name) {
          meta = {
            name: typeof source.meta.name === 'string' ? source.meta.name : undefined,
            version: typeof source.meta.version === 'string' ? source.meta.version : undefined,
            note: typeof source.meta.note === 'string' ? source.meta.note : undefined
          }
        }
      } catch (e) {
        errors.push(`tokens/${name}: ${(e as Error).message}`)
      }
    }
  } else {
    errors.push('vault/tokens 不存在')
  }

  const contracts: Contract[] = []
  if (existsSync(contractDir)) {
    for (const name of readdirSync(contractDir).filter(n => n.endsWith('.json')).sort()) {
      try {
        const c = JSON.parse(readFileSync(join(contractDir, name), 'utf8')) as Contract
        if (!c.id) c.id = name.replace(/\.json$/, '')
        contracts.push(c)
      } catch (e) {
        errors.push(`contracts/${name}: ${(e as Error).message}`)
      }
    }
  }

  const styleCards: StyleCard[] = []
  if (existsSync(styleDir)) {
    for (const name of readdirSync(styleDir).filter(n => n.endsWith('.json')).sort()) {
      try {
        const c = JSON.parse(readFileSync(join(styleDir, name), 'utf8')) as StyleCard
        if (!c.id) c.id = name.replace(/\.json$/, '')
        styleCards.push(c)
      } catch (e) {
        errors.push(`style-cards/${name}: ${(e as Error).message}`)
      }
    }
  }

  let checks: ChecksConfig = {}
  if (existsSync(checksPath)) {
    try { checks = JSON.parse(readFileSync(checksPath, 'utf8')) as ChecksConfig } catch (e) { errors.push(`checks.json: ${(e as Error).message}`) }
  }

  const tokens = mergeTokenFiles(sources)
  return { root: abs, meta, tokens, tokenFiles, contracts, styleCards, checks, errors }
}

export function saveToken(vault: Vault, tokenPath: string, value: JsonValue): void {
  const token = vault.tokens.get(tokenPath)
  if (!token) throw new Error(`token 不存在：${tokenPath}`)
  const file = token.sourceFile
  const source = JSON.parse(readFileSync(file, 'utf8')) as JsonObject
  // Support both `{ "$value": ... }` and already-raw leaf values.
  const current = getAtPath(source, tokenPath)
  if (isObject(current) && '$value' in current) setAtPath(source, tokenPath, value)
  else {
    const parts = tokenPath.split('.')
    let cur: JsonObject = source
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i]!
      if (!isObject(cur[part])) cur[part] = {}
      cur = cur[part] as JsonObject
    }
    cur[parts[parts.length - 1]!] = { $value: value }
  }
  writeFileSync(file, JSON.stringify(source, null, 2) + '\n', 'utf8')
}

export function saveContract(vault: Vault, id: string, patch: Partial<Contract>): Contract {
  const dir = join(vault.root, 'contracts')
  const names = existsSync(dir) ? readdirSync(dir).filter(n => n.endsWith('.json')).sort() : []
  for (const name of names) {
    const file = join(dir, name)
    let current: Contract
    try { current = JSON.parse(readFileSync(file, 'utf8')) as Contract } catch { continue }
    if ((current.id || name.replace(/\.json$/, '')) !== id) continue
    const next: Contract = { ...current, ...patch, id: current.id || id }
    writeFileSync(file, JSON.stringify(next, null, 2) + '\n', 'utf8')
    return next
  }
  throw new Error(`contract 不存在：${id}`)
}

export function saveTokenLifecycle(vault: Vault, tokenPath: string, input: { deprecated?: boolean; replacedBy?: string; note?: string }): void {
  const token = vault.tokens.get(tokenPath)
  if (!token) throw new Error(`token 不存在：${tokenPath}`)
  const file = token.sourceFile
  const source = JSON.parse(readFileSync(file, 'utf8')) as JsonObject
  const node = getAtPath(source, tokenPath)
  if (!isObject(node)) throw new Error(`token 节点不是对象：${tokenPath}`)
  if (input.deprecated) node.deprecated = true
  else delete node.deprecated
  if (input.replacedBy?.trim()) node.replacedBy = input.replacedBy.trim()
  else delete node.replacedBy
  if (input.note?.trim()) node.deprecationNote = input.note.trim()
  else delete node.deprecationNote
  writeFileSync(file, JSON.stringify(source, null, 2) + '\n', 'utf8')
}

export function stateView(vault: Vault, result: import('./types.ts').CheckResult): object {
  const bgBase = colorOf(vault, 'sys.color.bg.base')
  const tokens = [...vault.tokens.values()]
    .sort((a, b) => a.path.localeCompare(b.path))
    .map(t => {
      const color = t.type === 'color' ? colorOf(vault, t.path) : null
      const onBase = color && bgBase ? contrast(color, bgBase) : null
      return {
        path: t.path,
        tier: t.tier,
        type: t.type,
        raw: formatValue(t.rawValue),
        resolved: formatValue(t.resolvedValue),
        alias: t.alias,
        source: t.sourceFile.split('/').pop(),
        cssVar: toCssVariable(t.path),
        deprecated: Boolean(t.deprecated),
        replacedBy: t.replacedBy || null,
        deprecationNote: t.deprecationNote || null,
        onBase: onBase ? Number(onBase.toFixed(2)) : null
      }
    })
  return {
    root: vault.root,
    meta: vault.meta,
    tokens,
    contracts: vault.contracts,
    styleCards: vault.styleCards,
    checks: result,
    counts: {
      tokens: vault.tokens.size,
      contracts: vault.contracts.length,
      styleCards: vault.styleCards.length,
      errors: result.errors,
      warnings: result.warnings
    },
    errors: vault.errors
  }
}

export function projection(vault: Vault): string {
  return cssProjection(vault.tokens)
}

export function assertVaultDir(path: string): string {
  const abs = resolve(path)
  if (!existsSync(abs) || !statSync(abs).isDirectory()) throw new Error(`vault 不存在：${abs}`)
  return abs
}
