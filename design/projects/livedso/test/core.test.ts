// SPDX-License-Identifier: Apache-2.0
import test from 'node:test'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { loadVault, projection, saveContract, saveToken, saveTokenLifecycle } from '../src/vault.ts'
import { scanAdoption } from '../src/adoption.ts'
import { loadRegistry } from '../src/registry.ts'
import { createSnapshot, diffSnapshot, listSnapshots, trendSnapshots } from '../src/history.ts'
import { runCi } from '../src/ci.ts'
import { allTrends } from '../src/trend.ts'
import { pluginTestAll } from '../src/plugin-test.ts'
import { buildReportBundle, listReportTemplates, renderReport } from '../src/reports.ts'
import { loadPlugins, runPlugins } from '../src/plugins.ts'
import { localizeCheckResult, runChecks, parseColor, contrast, reportMarkdown } from '../src/checks.ts'
import { auditSkin, SKIN_ROLES } from '../src/skin.ts'
import { checkVaultSchema } from '../tools/check-vault-schema.ts'
import { adaptVault } from '../src/adapt.ts'

const root = fileURLToPath(new URL('../vaults/lrds-sample', import.meta.url))
const registryFile = fileURLToPath(new URL('../vaults.json', import.meta.url))

test('vault loads tokens/contracts/style cards', () => {
  const vault = loadVault(root)
  assert.equal(vault.errors.length, 0)
  assert.equal(vault.tokens.size, 463)
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

test('real LRDS case imports 229 core + 150 role tokens', () => {
  const vault = loadVault(fileURLToPath(new URL('../vaults/lrds-real', import.meta.url)))
  assert.equal(vault.errors.length, 0)
  assert.equal(vault.tokens.size, 635)
  assert.equal(vault.contracts.length, 2)
  assert.equal(vault.styleCards.length, 3)
  assert.equal(vault.tokens.get('sys.color.bg.base')?.resolvedValue, '#0B0F14')
})


test('contract editing writes back and survives reload', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'livedso-contract-'))
  try {
    cpSync(fileURLToPath(new URL('../vaults/lrds-sample', import.meta.url)), tmp, { recursive: true })
    rmSync(join(tmp, '.history'), { recursive: true, force: true })
    const vault = loadVault(tmp)
    const next = saveContract(vault, 'field', { states: ['default', 'hover', 'active', 'focus-visible', 'disabled'], summary: 'edited' })
    assert.equal(next.summary, 'edited')
    assert.equal(next.states?.length, 5)
    assert.equal(loadVault(tmp).contracts.find(c => c.id === 'field')?.summary, 'edited')
  } finally { rmSync(tmp, { recursive: true, force: true }) }
})


test('token lifecycle writes back and is visible after reload', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'livedso-lifecycle-'))
  try {
    cpSync(fileURLToPath(new URL('../vaults/lrds-sample', import.meta.url)), tmp, { recursive: true })
    rmSync(join(tmp, '.history'), { recursive: true, force: true })
    saveTokenLifecycle(loadVault(tmp), 'sys.color.action.primaryHover', { deprecated: true, replacedBy: 'sys.color.action.primary', note: 'test' })
    const t = loadVault(tmp).tokens.get('sys.color.action.primaryHover')
    assert.equal(t?.deprecated, true)
    assert.equal(t?.replacedBy, 'sys.color.action.primary')
    assert.equal(t?.deprecationNote, 'test')
  } finally { rmSync(tmp, { recursive: true, force: true }) }
})

test('adoption scan finds token refs, raw colors and unknown vars', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'livedso-adopt-'))
  try {
    mkdirSync(join(tmp, 'src'))
    writeFileSync(join(tmp, 'src', 'a.css'), 'a{color:var(--dso-sys-color-action-primary);border-color:var(--dso-sys-color-action-primaryhover);background:#ffffff}\n')
    writeFileSync(join(tmp, 'src', 'b.ts'), 'const x = "var(--dso-not-real)"\n')
    const vault = loadVault(fileURLToPath(new URL('../vaults/lrds-sample', import.meta.url)))
    const r = scanAdoption(tmp, vault)
    assert.equal(r.filesScanned, 2)
    assert.equal(r.tokenRefs, 2)
    assert.equal(r.deprecatedRefs, 1)
    assert.equal(r.unknownRefs, 1)
    assert.equal(r.rawColors, 1)
    assert.equal(r.tokens[0]?.path, 'sys.color.action.primary')
  } finally { rmSync(tmp, { recursive: true, force: true }) }
})


test('registry resolves vault paths relative to its file', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'livedso-registry-'))
  try {
    const dir = join(tmp, 'nested')
    mkdirSync(dir)
    writeFileSync(join(tmp, 'vaults.json'), JSON.stringify({ vaults: [{ id: 'a', name: 'A', path: 'vault-a' }, { id: 'b', path: 'nested/vault-b' }] }))
    const r = loadRegistry(join(tmp, 'vaults.json'), join(tmp, 'vault-a'))
    assert.equal(r.errors.length, 0)
    assert.equal(r.vaults.length, 2)
    assert.equal(r.vaults[1]?.path, join(tmp, 'nested', 'vault-b'))
  } finally { rmSync(tmp, { recursive: true, force: true }) }
})


test('local history snapshots and diffs', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'livedso-history-'))
  try {
    cpSync(fileURLToPath(new URL('../vaults/lrds-sample', import.meta.url)), tmp, { recursive: true })
    rmSync(join(tmp, '.history'), { recursive: true, force: true })
    const vault = loadVault(tmp)
    const snap = createSnapshot(vault)
    assert.equal(listSnapshots(vault).length, 1)
    saveToken(vault, 'sys.color.text.primary', '#FFFFFF')
    const diff = diffSnapshot(loadVault(tmp), snap.id)
    assert.ok(diff.changedTokens.length >= 1)
    createSnapshot(loadVault(tmp))
    assert.equal(trendSnapshots(loadVault(tmp)).length, 2)
    assert.ok(diff.changedTokens.some(t => t.path === 'sys.color.text.primary'))
  } finally { rmSync(tmp, { recursive: true, force: true }) }
})


test('CI aggregates multiple vaults and enforces thresholds', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'livedso-ci-'))
  try {
    for (const name of ['a', 'b']) { cpSync(fileURLToPath(new URL('../vaults/lrds-sample', import.meta.url)), join(tmp, name), { recursive: true }); rmSync(join(tmp, name, '.history'), { recursive: true, force: true }) }
    writeFileSync(join(tmp, 'vaults.json'), JSON.stringify({ vaults: [{ id: 'a', name: 'A', path: 'a' }, { id: 'b', name: 'B', path: 'b' }] }))
    const ok = runCi({ registry: join(tmp, 'vaults.json') })
    assert.equal(ok.vaults.length, 2)
    assert.equal(ok.ok, true)
    const strict = runCi({ registry: join(tmp, 'vaults.json'), strict: true })
    assert.equal(strict.ok, false)
  } finally { rmSync(tmp, { recursive: true, force: true }) }
})


test('local plugin loads and contributes issues', async () => {
  const tmp = mkdtempSync(join(tmpdir(), 'livedso-plugin-'))
  try {
    mkdirSync(join(tmp, 'plugins'))
    writeFileSync(join(tmp, 'plugins', 'brand.mjs'), `export default { name: 'brand', check({ vault }) { return [{ code: 'brand.rule', severity: 'warn', path: 'brand', message: 'brand rule', detail: String(vault.tokens.size) }] } }\n`)
    const loaded = await loadPlugins(join(tmp, 'plugins'))
    assert.equal(loaded.errors.length, 0)
    assert.equal(loaded.plugins.length, 1)
    const vault = loadVault(fileURLToPath(new URL('../vaults/lrds-sample', import.meta.url)))
    const result = runChecks(vault, [...loaded.errors, ...runPlugins(loaded.plugins, vault)])
    assert.equal(result.warnings, 4)
    assert.ok(result.issues.some(i => i.code === 'brand.rule'))
  } finally { rmSync(tmp, { recursive: true, force: true }) }
})


test('cross-vault trends read each vault history', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'livedso-trends-'))
  try {
    for (const name of ['a', 'b']) {
      cpSync(fileURLToPath(new URL('../vaults/lrds-sample', import.meta.url)), join(tmp, name), { recursive: true })
      rmSync(join(tmp, name, '.history'), { recursive: true, force: true })
      createSnapshot(loadVault(join(tmp, name)))
    }
    writeFileSync(join(tmp, 'vaults.json'), JSON.stringify({ vaults: [{ id: 'a', name: 'A', path: 'a' }, { id: 'b', name: 'B', path: 'b' }] }))
    const r = allTrends(join(tmp, 'vaults.json'))
    assert.equal(r.vaults.length, 2)
    assert.equal(r.vaults[0]?.points.length, 1)
    assert.equal(r.vaults[0]?.points[0]?.deprecated, 1)
  } finally { rmSync(tmp, { recursive: true, force: true }) }
})


test('example plugins load', async () => {
  const loaded = await loadPlugins(fileURLToPath(new URL('../examples/plugins', import.meta.url)))
  assert.equal(loaded.errors.length, 0)
  assert.equal(loaded.plugins.length, 2)
})


test('plugin test matrix runs across vaults', async () => {
  const tmp = mkdtempSync(join(tmpdir(), 'livedso-plugin-matrix-'))
  try {
    for (const name of ['a', 'b']) { cpSync(fileURLToPath(new URL('../vaults/lrds-sample', import.meta.url)), join(tmp, name), { recursive: true }); rmSync(join(tmp, name, '.history'), { recursive: true, force: true }) }
    writeFileSync(join(tmp, 'vaults.json'), JSON.stringify({ vaults: [{ id: 'a', name: 'A', path: 'a' }, { id: 'b', name: 'B', path: 'b' }] }))
    const loaded = await loadPlugins(fileURLToPath(new URL('../examples/plugins', import.meta.url)))
    const matrix = pluginTestAll(join(tmp, 'vaults.json'), loaded.plugins, loaded.errors)
    assert.equal(matrix.vaults.length, 2)
    assert.equal(matrix.vaults[0]?.plugins.length, 2)
    assert.ok(matrix.vaults[0]!.issues.length >= 1)
  } finally { rmSync(tmp, { recursive: true, force: true }) }
})


test('report templates render builtin and custom placeholders', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'livedso-report-'))
  try {
    const vault = loadVault(fileURLToPath(new URL('../vaults/lrds-sample', import.meta.url)))
    const result = runChecks(vault)
    const release = renderReport(vault, result, 'release')
    assert.match(release, /Health/); assert.match(release, /463/)
    mkdirSync(join(tmp, 'templates'))
    writeFileSync(join(tmp, 'templates', 'custom.md'), '# {{vault.name}} · {{score}} · {{counts.tokens}}\n{{generatedAt}}')
    const custom = renderReport(vault, result, 'custom', join(tmp, 'templates'))
    assert.match(custom, /LRDS sample/)
    const inventory = renderReport(vault, result, 'inventory')
    assert.match(inventory, /sys\.color\.action\.primaryHover/)
    assert.match(inventory, /deprecated/)
    assert.equal(listReportTemplates(join(tmp, 'templates')).some(t => t.id === 'custom'), true)
  } finally { rmSync(tmp, { recursive: true, force: true }) }
})


test('report bundle builds all templates and an index', () => {
  const vault = loadVault(fileURLToPath(new URL('../vaults/lrds-sample', import.meta.url)))
  const result = runChecks(vault)
  const bundle = buildReportBundle(vault, result, fileURLToPath(new URL('../templates/reports', import.meta.url)))
  assert.ok(bundle.files.length >= 6)
  assert.ok(bundle.files.some(f => f.id === 'inventory'))
  assert.ok(bundle.files.some(f => f.id === 'deprecations'))
  assert.match(bundle.index, /Report Bundle/)
  assert.match(bundle.index, /inventory\.md/)
})


test('minimal example vault is valid', () => {
  const vault = loadVault(fileURLToPath(new URL('../vaults/minimal', import.meta.url)))
  const result = runChecks(vault)
  assert.equal(vault.tokens.size, 419)
  assert.equal(vault.contracts.length, 1)
  assert.equal(result.errors, 0)
  assert.equal(result.warnings, 0)
})


test('style cards expose preview roles', () => {
  const vault = loadVault(fileURLToPath(new URL('../vaults/lrds-sample', import.meta.url)))
  assert.equal(vault.styleCards.length, 3)
  for (const card of vault.styleCards) {
    assert.ok(card.roles && typeof card.roles === 'object')
    assert.ok(card.roles.bg)
  }
})


test('frontend exposes routes, i18n, skins and nav groups', () => {
  const html = readFileSync(fileURLToPath(new URL('../web/index.html', import.meta.url)), 'utf8')
  const js = readFileSync(fileURLToPath(new URL('../web/app.js', import.meta.url)), 'utf8')
  const i18n = readFileSync(fileURLToPath(new URL('../web/i18n.js', import.meta.url)), 'utf8')
  assert.match(html, /id="lang-toggle"/)
  assert.match(html, /id="skin-select"/)
  assert.match(html, /class="nav-group"/)
  assert.match(js, /hashchange/)
  assert.match(js, /routeFromHash/)
  assert.match(js, /applySkin/)
  assert.match(js, /syncSelectionUrl/)
  assert.match(js, /searchParams\.set\('vault'/)
  assert.match(i18n, /LiveAtelier/)
  assert.match(html, /灵动构坊/)
})


test('rule messages have English versions', () => {
  const vault = loadVault(fileURLToPath(new URL('../vaults/lrds-sample', import.meta.url)))
  const result = runChecks(vault)
  assert.ok(result.issues.length > 0)
  assert.ok(result.issues.every(i => typeof i.messageEn === 'string' && i.messageEn.length > 0))
  const en = localizeCheckResult(result, 'en')
  assert.ok(en.issues.every(i => /^[\x00-\x7F]+$/.test(i.message)))
})


test('all registered vaults load and have no blocking errors', () => {
  const registry = loadRegistry(registryFile, root)
  assert.equal(registry.errors.length, 0)
  assert.equal(registry.vaults.length, 11)
  for (const entry of registry.vaults) {
    const vault = loadVault(entry.path)
    const result = runChecks(vault)
    assert.ok(vault.tokens.size > 0, `${entry.id} has tokens`)
    assert.ok(vault.contracts.length > 0, `${entry.id} has contracts`)
    assert.ok(vault.styleCards.length >= 3, `${entry.id} has at least 3 style cards`)
    assert.ok(vault.styleCards.every(c => c.roles?.bg && c.roles?.surface && c.roles?.text && c.roles?.action && c.roles?.focus), `${entry.id} style cards have preview roles`)
    for (const card of vault.styleCards) assert.equal(Object.keys(card.roles || {}).length, 50, `${entry.id}/${card.id} has 50 explicit roles`)
    for (const card of vault.styleCards) assert.ok(auditSkin(vault, card).ok, `${entry.id}/${card.id} passes skin audit`)
    assert.equal(result.errors, 0, `${entry.id} has no errors`)
  }
})


test('skin schema exposes extended roles', () => {
  assert.ok(SKIN_ROLES.length >= 45)
  for (const role of ['textLink', 'borderSubtle', 'actionHover', 'onDanger', 'successSubtle', 'chart1']) assert.ok(SKIN_ROLES.includes(role as never), role)
})


test('minimal is LRDS schema compliant', () => {
  const result = checkVaultSchema(fileURLToPath(new URL('../vaults/minimal', import.meta.url)))
  assert.equal(result.ok, true, result.issues.map(i => `${i.file} ${i.path}: ${i.message}`).join(' | '))
  assert.equal(result.files, 4)
})


test('skin token names align with generated tokens', () => {
  const js = readFileSync(fileURLToPath(new URL('../web/app.js', import.meta.url)), 'utf8')
  assert.match(js, /--dso-sys-color-bg-surface-sunken/)
  assert.match(js, /--dso-sys-color-border-subtle/)
  assert.match(js, /--dso-sys-color-border-strong/)
  assert.doesNotMatch(js, /'--dso-sys-color-bg-sunken'/)
  assert.doesNotMatch(js, /'--dso-sys-color-line-subtle'/)
})


test('DTCG adapter generates a schema-compatible vault', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'livedso-adapt-'))
  try {
    const source = fileURLToPath(new URL('../examples/adapt/source.tokens.json', import.meta.url))
    const profile = fileURLToPath(new URL('../examples/adapt/profile.json', import.meta.url))
    const result = adaptVault({ source, profile, out: tmp })
    assert.equal(result.ok, true, result.issues.map(i => i.message).join(' | '))
    assert.equal(result.mappedRoles, 16)
    const schema = checkVaultSchema(tmp)
    assert.equal(schema.ok, true, schema.issues.map(i => i.message).join(' | '))
    const vault = loadVault(tmp)
    assert.ok(vault.tokens.has('sys.color.bg'))
    assert.equal(vault.styleCards.length, 1)
    assert.equal(Object.keys(vault.styleCards[0]!.roles || {}).length, 16)
  } finally { rmSync(tmp, { recursive: true, force: true }) }
})

test('DTCG adapter rejects missing mappings', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'livedso-adapt-'))
  try {
    const source = fileURLToPath(new URL('../examples/adapt/source.tokens.json', import.meta.url))
    const profile = join(tmp, 'profile.json')
    writeFileSync(profile, JSON.stringify({ theme: { id: 'broken' }, roles: { bg: 'color.background' } }))
    const result = adaptVault({ source, profile, out: join(tmp, 'out') })
    assert.equal(result.ok, false)
    assert.ok(result.issues.some(i => i.path.endsWith('roles.text')))
  } finally { rmSync(tmp, { recursive: true, force: true }) }
})


test('adapter handles multi-theme DTCG and suggestions', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'livedso-adapt-multi-'))
  try {
    const source = fileURLToPath(new URL('../examples/adapt/multi.tokens.json', import.meta.url))
    const profile = fileURLToPath(new URL('../examples/adapt/multi-profile.json', import.meta.url))
    const result = adaptVault({ source, profile, out: tmp, suggest: true })
    assert.equal(result.ok, true, result.issues.map(i => i.message).join(' | '))
    assert.deepEqual(result.themes, ['paper-light', 'paper-dark'])
    assert.ok(result.suggestions.length > 0)
    assert.equal(checkVaultSchema(tmp).ok, true)
    assert.equal(loadVault(tmp).styleCards.length, 2)
  } finally { rmSync(tmp, { recursive: true, force: true }) }
})

test('adapter handles CSS variables with themes', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'livedso-adapt-css-'))
  try {
    const source = fileURLToPath(new URL('../examples/adapt/theme.css', import.meta.url))
    const profile = fileURLToPath(new URL('../examples/adapt/css-profile.json', import.meta.url))
    const result = adaptVault({ source, profile, out: tmp })
    assert.equal(result.ok, true, result.issues.map(i => i.message).join(' | '))
    assert.equal(result.format, 'css')
    assert.equal(result.themes.length, 2)
    assert.equal(checkVaultSchema(tmp).ok, true)
  } finally { rmSync(tmp, { recursive: true, force: true }) }
})

test('adapter handles Tailwind JSON', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'livedso-adapt-tw-'))
  try {
    const source = fileURLToPath(new URL('../examples/adapt/tailwind.tokens.json', import.meta.url))
    const profile = fileURLToPath(new URL('../examples/adapt/tailwind-profile.json', import.meta.url))
    const result = adaptVault({ source, profile, out: tmp })
    assert.equal(result.ok, true, result.issues.map(i => i.message).join(' | '))
    assert.equal(result.format, 'tailwind')
    assert.equal(checkVaultSchema(tmp).ok, true)
  } finally { rmSync(tmp, { recursive: true, force: true }) }
})
