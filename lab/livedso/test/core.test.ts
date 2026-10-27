// SPDX-License-Identifier: Apache-2.0
import test from 'node:test'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { cpSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { loadVault, projection, saveContract } from '../src/vault.ts'
import { runChecks, parseColor, contrast, reportMarkdown } from '../src/checks.ts'

const root = fileURLToPath(new URL('../vault', import.meta.url))

test('vault loads tokens/contracts/style cards', () => {
  const vault = loadVault(root)
  assert.equal(vault.errors.length, 0)
  assert.equal(vault.tokens.size, 37)
  assert.equal(vault.contracts.length, 2)
  assert.equal(vault.styleCards.length, 3)
})

test('aliases resolve to concrete colors', () => {
  const vault = loadVault(root)
  assert.equal(vault.tokens.get('sys.color.bg.base')?.resolvedValue, '#0B0F14')
  assert.equal(vault.tokens.get('sys.color.action.primary')?.resolvedValue, '#4FD1C5')
})

test('contrast math is sane', () => {
  const black = parseColor('#000000')!
  const white = parseColor('#ffffff')!
  assert.equal(Number(contrast(white, black).toFixed(2)), 21)
  assert.ok(contrast(parseColor('#4FD1C5')!, parseColor('#0B0F14')!) > 7)
})

test('checks produce warnings, no errors', () => {
  const vault = loadVault(root)
  const result = runChecks(vault)
  assert.equal(result.errors, 0)
  assert.ok(result.warnings >= 2)
  assert.ok(result.score < 100 && result.score > 0)
  assert.ok(result.issues.some(i => i.code === 'token.raw-color'))
})

test('report and CSS projection are generated', () => {
  const vault = loadVault(root)
  const result = runChecks(vault)
  const report = reportMarkdown(vault, result)
  assert.ok(report.includes('LiveDSO'))
  assert.ok(report.includes('Health score'))
  const css = projection(vault)
  assert.ok(css.includes('--dso-sys-color-bg-base'))
})

test('real LRDS case imports 229 tokens', () => {
  const vault = loadVault(fileURLToPath(new URL('../vault-lrds', import.meta.url)))
  assert.equal(vault.errors.length, 0)
  assert.equal(vault.tokens.size, 229)
  assert.equal(vault.contracts.length, 2)
  assert.equal(vault.styleCards.length, 3)
  assert.equal(vault.tokens.get('sys.color.bg.base')?.resolvedValue, '#0B0F14')
})


test('contract editing writes back and survives reload', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'livedso-contract-'))
  try {
    cpSync(fileURLToPath(new URL('../vault', import.meta.url)), tmp, { recursive: true })
    const vault = loadVault(tmp)
    const next = saveContract(vault, 'field', { states: ['default', 'hover', 'active', 'focus-visible', 'disabled'], summary: 'edited' })
    assert.equal(next.summary, 'edited')
    assert.equal(next.states?.length, 5)
    assert.equal(loadVault(tmp).contracts.find(c => c.id === 'field')?.summary, 'edited')
  } finally { rmSync(tmp, { recursive: true, force: true }) }
})
