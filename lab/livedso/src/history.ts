// SPDX-License-Identifier: Apache-2.0
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Vault } from './types.ts'
import { formatValue } from './tokens.ts'

export interface SnapshotToken {
  raw: string
  resolved: string
  deprecated: boolean
  replacedBy: string | null
}
export interface Snapshot {
  id: string
  createdAt: string
  vault: string
  version: string
  tokens: Record<string, SnapshotToken>
  contracts: Record<string, string>
  styleCards: Record<string, string>
}
export interface TokenChange {
  path: string
  before: SnapshotToken
  after: SnapshotToken
}
export interface HistoryDiff {
  id: string
  addedTokens: string[]
  removedTokens: string[]
  changedTokens: TokenChange[]
  addedContracts: string[]
  removedContracts: string[]
  changedContracts: string[]
  addedStyleCards: string[]
  removedStyleCards: string[]
  changedStyleCards: string[]
  counts: { added: number; removed: number; changed: number }
}

export function historyDir(vault: Vault): string {
  return join(vault.root, '.history')
}
function snapshotOf(vault: Vault): Omit<Snapshot, 'id' | 'createdAt'> {
  const tokens: Record<string, SnapshotToken> = {}
  for (const t of vault.tokens.values()) {
    tokens[t.path] = {
      raw: formatValue(t.rawValue),
      resolved: formatValue(t.resolvedValue),
      deprecated: Boolean(t.deprecated),
      replacedBy: t.replacedBy || null
    }
  }
  const contracts: Record<string, string> = {}
  for (const c of vault.contracts) contracts[c.id] = JSON.stringify(c)
  const styleCards: Record<string, string> = {}
  for (const c of vault.styleCards) styleCards[c.id] = JSON.stringify(c)
  return { vault: vault.meta.name || vault.root.split('/').pop() || 'vault', version: vault.meta.version || '', tokens, contracts, styleCards }
}

export function createSnapshot(vault: Vault): Snapshot {
  const dir = historyDir(vault)
  mkdirSync(dir, { recursive: true })
  // 东八区本地可读时间；id 去掉冒号/加号，避免路径含义不清。
  const createdAt = new Date(Date.now() + 8 * 3600 * 1000).toISOString().replace('Z', '+08:00')
  const id = createdAt.replace(/[:+]/g, '-')
  const snapshot: Snapshot = { id, createdAt, ...snapshotOf(vault) }
  writeFileSync(join(dir, `${id}.json`), JSON.stringify(snapshot, null, 2) + '\n', 'utf8')
  return snapshot
}

export function listSnapshots(vault: Vault): Array<Pick<Snapshot, 'id' | 'createdAt' | 'vault' | 'version'> & { tokens: number; contracts: number; styleCards: number }> {
  const dir = historyDir(vault)
  if (!existsSync(dir)) return []
  const out = []
  for (const name of readdirSync(dir).filter(n => n.endsWith('.json')).sort().reverse()) {
    try {
      const s = JSON.parse(readFileSync(join(dir, name), 'utf8')) as Snapshot
      out.push({ id: s.id, createdAt: s.createdAt, vault: s.vault, version: s.version, tokens: Object.keys(s.tokens || {}).length, contracts: Object.keys(s.contracts || {}).length, styleCards: Object.keys(s.styleCards || {}).length })
    } catch { /* ignore malformed local snapshot */ }
  }
  return out
}

export function loadSnapshot(vault: Vault, id: string): Snapshot {
  if (!/^[0-9A-Za-z._-]+$/.test(id)) throw new Error('非法 snapshot id')
  const file = join(historyDir(vault), `${id}.json`)
  if (!existsSync(file)) throw new Error(`snapshot 不存在：${id}`)
  return JSON.parse(readFileSync(file, 'utf8')) as Snapshot
}

export function diffSnapshot(vault: Vault, id: string): HistoryDiff {
  const old = loadSnapshot(vault, id)
  const now = snapshotOf(vault)
  const addedTokens = Object.keys(now.tokens).filter(k => !(k in old.tokens))
  const removedTokens = Object.keys(old.tokens).filter(k => !(k in now.tokens))
  const changedTokens: TokenChange[] = []
  for (const path of Object.keys(now.tokens)) {
    if (!(path in old.tokens)) continue
    const a = JSON.stringify(old.tokens[path]), b = JSON.stringify(now.tokens[path])
    if (a !== b) changedTokens.push({ path, before: old.tokens[path]!, after: now.tokens[path]! })
  }
  const addedContracts = Object.keys(now.contracts).filter(k => !(k in old.contracts))
  const removedContracts = Object.keys(old.contracts).filter(k => !(k in now.contracts))
  const changedContracts = Object.keys(now.contracts).filter(k => k in old.contracts && old.contracts[k] !== now.contracts[k])
  const addedStyleCards = Object.keys(now.styleCards).filter(k => !(k in old.styleCards))
  const removedStyleCards = Object.keys(old.styleCards).filter(k => !(k in now.styleCards))
  const changedStyleCards = Object.keys(now.styleCards).filter(k => k in old.styleCards && old.styleCards[k] !== now.styleCards[k])
  return {
    id,
    addedTokens, removedTokens, changedTokens,
    addedContracts, removedContracts, changedContracts,
    addedStyleCards, removedStyleCards, changedStyleCards,
    counts: { added: addedTokens.length + addedContracts.length + addedStyleCards.length, removed: removedTokens.length + removedContracts.length + removedStyleCards.length, changed: changedTokens.length + changedContracts.length + changedStyleCards.length }
  }
}
