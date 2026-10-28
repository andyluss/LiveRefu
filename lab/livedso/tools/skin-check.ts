#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0
import { fileURLToPath } from 'node:url'
import { loadRegistry } from '../src/registry.ts'
import { loadVault } from '../src/vault.ts'
import { auditSkin } from '../src/skin.ts'

const here = import.meta.dirname
const registryFile = fileURLToPath(new URL('../vaults.json', import.meta.url))
const fallback = fileURLToPath(new URL('../vaults/lrds-sample', import.meta.url))
const registry = loadRegistry(registryFile, fallback)
const json = process.argv.includes('--json')
const only = process.argv.indexOf('--vault') >= 0 ? process.argv[process.argv.indexOf('--vault') + 1] : undefined
const rows: Array<{ vault: string; card: string; mode: string; roles: number; ok: boolean; pairs: ReturnType<typeof auditSkin>['pairs']; missing: string[] }> = []
const failures: typeof rows = []

for (const entry of registry.vaults) {
  if (only && entry.id !== only) continue
  const vault = loadVault(entry.path)
  for (const card of vault.styleCards) {
    const audit = auditSkin(vault, card)
    const row = { vault: entry.id, card: card.id, mode: audit.mode, roles: Object.keys(card.roles || {}).length, ok: audit.ok, pairs: audit.pairs, missing: audit.missingRoles }
    rows.push(row)
    if (!audit.ok) failures.push(row)
  }
}

if (json) {
  console.log(JSON.stringify({ registry: registryFile, vaults: registry.vaults.length, cards: rows.length, passing: rows.length - failures.length, failing: failures.length, rows }, null, 2))
} else {
  console.log('LiveDSO · skin audit')
  console.log(`vaults ${registry.vaults.length} · cards ${rows.length} · passing ${rows.length - failures.length} · failing ${failures.length}`)
  for (const row of rows) {
    const pairs = row.pairs.map(p => `${p.name} ${p.ratio}:1${p.ok ? '' : '!'}`).join(' · ')
    console.log(`${row.ok ? '✓' : '✗'} ${row.vault}/${row.card} [${row.mode}] ${row.roles} roles · ${pairs}${row.missing.length ? ` missing: ${row.missing.join(',')}` : ''}`)
  }
  console.log(`\n${failures.length ? '✗ skin audit failed' : '✓ skin audit passed'}`)
}
process.exitCode = failures.length ? 1 : 0
