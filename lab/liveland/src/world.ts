import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { CanonFact, World } from './types.ts'

export function loadWorld(file: string): World {
  const abs = resolve(file)
  const world = JSON.parse(readFileSync(abs, 'utf8')) as World
  if (!world.id || !world.title) throw new Error('world 缺少 id/title')
  if (!Array.isArray(world.eras) || !world.eras.length) throw new Error('world 缺少 eras')
  if (!Array.isArray(world.canon)) world.canon = []
  if (!Array.isArray(world.entities)) world.entities = []
  if (!Array.isArray(world.assets)) world.assets = []
  if (!Array.isArray(world.outputs)) world.outputs = []
  if (!Array.isArray(world.constraints)) world.constraints = []
  return world
}

export function saveWorld(file: string, world: World): void {
  writeFileSync(resolve(file), JSON.stringify(world, null, 2) + '\n', 'utf8')
}

export function addCanon(file: string, world: World, input: { era: string; statement: string; confidence?: string; source?: string }): CanonFact {
  const fact: CanonFact = {
    id: 'canon.' + input.era + '.' + Date.now().toString(36),
    era: input.era,
    statement: input.statement.trim(),
    confidence: input.confidence || 'draft',
    sources: input.source ? [input.source.trim()] : [],
    dependsOn: [],
    conflictsWith: [],
    owner: 'worldbuilding'
  }
  world.canon.push(fact)
  saveWorld(file, world)
  return fact
}

export function updateCanon(file: string, world: World, id: string, patch: Partial<CanonFact>): CanonFact {
  const fact = world.canon.find(c => c.id === id)
  if (!fact) throw new Error(`canon 不存在：${id}`)
  if (patch.era && !world.eras.some(e => e.id === patch.era)) throw new Error(`未知时代：${patch.era}`)
  Object.assign(fact, patch)
  fact.statement = fact.statement.trim()
  saveWorld(file, world)
  return fact
}

export function deleteCanon(file: string, world: World, id: string): void {
  const index = world.canon.findIndex(c => c.id === id)
  if (index < 0) throw new Error(`canon 不存在：${id}`)
  world.canon.splice(index, 1)
  saveWorld(file, world)
}

export function stats(world: World): { eras: number; canon: number; entities: number; assets: number; outputs: number; constraints: number } {
  return {
    eras: world.eras.length,
    canon: world.canon.length,
    entities: world.entities.length,
    assets: world.assets.length,
    outputs: world.outputs.length,
    constraints: world.constraints.length
  }
}

export function eraMap(world: World): Map<string, World['eras'][number]> {
  return new Map(world.eras.map(e => [e.id, e]))
}
