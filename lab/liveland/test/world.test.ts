import test from 'node:test'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { cpSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { deleteCanon, loadWorld, stats, updateCanon } from '../src/world.ts'
import { assetManifest, htmlWorld, lintWorld, styleGuide, worldBible } from '../src/lint.ts'
import { loadWorldRegistry } from '../src/registry.ts'

const file = fileURLToPath(new URL('../world/orange-harbor.world.json', import.meta.url))

test('world loads with three eras and canon', () => {
  const w = loadWorld(file)
  assert.equal(w.id, 'orange-harbor')
  assert.equal(w.eras.length, 3)
  assert.equal(w.canon.length, 12)
  assert.equal(w.entities.length, 8)
  assert.equal(w.assets.length, 6)
  assert.deepEqual(stats(w), { eras: 3, canon: 12, entities: 8, assets: 6, outputs: 4, constraints: 5 })
})

test('lint finds intentional conflict and missing dependency', () => {
  const r = lintWorld(loadWorld(file))
  assert.equal(r.errors, 2)
  assert.equal(r.warnings, 2)
  assert.equal(r.score, 64)
  assert.ok(r.issues.some(i => i.code === 'canon.conflict'))
  assert.ok(r.issues.some(i => i.code === 'canon.dependency'))
})

test('world outputs are generated', () => {
  const w = loadWorld(file)
  assert.ok(worldBible(w).includes('# 橙港'))
  assert.ok(styleGuide(w).includes('风格指南'))
  const manifest = JSON.parse(assetManifest(w)) as { assets: unknown[] }
  assert.equal(manifest.assets.length, 6)
})


test('registry resolves world paths and canon edit/delete writes back', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'liveland-'))
  try {
    const worldFile = join(tmp, 'world.json')
    cpSync(file, worldFile)
    writeFileSync(join(tmp, 'worlds.json'), JSON.stringify({ worlds: [{ id: 'one', name: 'One', path: 'world.json' }] }))
    const reg = loadWorldRegistry(join(tmp, 'worlds.json'), worldFile)
    assert.equal(reg.worlds[0]?.path, worldFile)
    const world = loadWorld(worldFile)
    const id = world.canon[0]!.id
    updateCanon(worldFile, world, id, { statement: 'edited statement', confidence: 'canon' })
    assert.equal(loadWorld(worldFile).canon[0]?.statement, 'edited statement')
    deleteCanon(worldFile, loadWorld(worldFile), id)
    assert.equal(loadWorld(worldFile).canon.some(c => c.id === id), false)
  } finally { rmSync(tmp, { recursive: true, force: true }) }
})

test('html world export escapes content', () => {
  const world = loadWorld(file)
  world.title = '<橙港>'
  const html = htmlWorld(world)
  assert.match(html, /&lt;橙港&gt;/)
  assert.match(html, /<html/)
  assert.match(html, /Canon/)
})
