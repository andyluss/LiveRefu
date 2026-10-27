import test from 'node:test'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { loadWorld, stats } from '../src/world.ts'
import { assetManifest, lintWorld, styleGuide, worldBible } from '../src/lint.ts'

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
