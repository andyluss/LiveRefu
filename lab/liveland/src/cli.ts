#!/usr/bin/env node
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadWorld, stats } from './world.ts'
import { assetManifest, htmlWorld, lintWorld, styleGuide, worldBible } from './lint.ts'
import { loadWorldRegistry } from './registry.ts'
import { startServer } from './server.ts'

const args = process.argv.slice(2)
const cmd = args[0] || 'help'
const defaultWorld = fileURLToPath(new URL('../world/orange-harbor.world.json', import.meta.url))
const defaultCmd = ['serve', 'worlds'].includes(cmd)
const worldFile = resolve(process.env.LIVELAND_WORLD || (defaultCmd ? defaultWorld : args[1] || defaultWorld))

function initWorld(): ReturnType<typeof loadWorld> {
  const world = loadWorld(worldFile)
  const result = lintWorld(world)
  const s = stats(world)
  console.log(`world: ${worldFile}`)
  console.log(`${world.title} · ${s.eras} eras · ${s.canon} canon · ${s.entities} entities · ${s.assets} assets`)
  console.log(`lint: ${result.score}/100 · ${result.errors} errors · ${result.warnings} warnings`)
  for (const issue of result.issues) console.log(`  [${issue.severity}] ${issue.code}${issue.path ? ` ${issue.path}` : ''} — ${issue.message}`)
  return world
}

switch (cmd) {
  case 'check': {
    const result = lintWorld(initWorld())
    process.exitCode = result.errors ? 1 : 0
    break
  }
  case 'report': {
    const world = loadWorld(worldFile)
    const out = resolve(args[2] || 'reports/world-bible.md')
    mkdirSync(dirname(out), { recursive: true })
    writeFileSync(out, worldBible(world) + '\n', 'utf8')
    console.log(`wrote ${out}`)
    break
  }
  case 'style': {
    const world = loadWorld(worldFile)
    const out = resolve(args[2] || 'reports/style-guide.md')
    mkdirSync(dirname(out), { recursive: true })
    writeFileSync(out, styleGuide(world) + '\n', 'utf8')
    console.log(`wrote ${out}`)
    break
  }
  case 'html': {
    const world = loadWorld(worldFile)
    const out = resolve(args[2] || 'reports/world.html')
    mkdirSync(dirname(out), { recursive: true })
    writeFileSync(out, htmlWorld(world), 'utf8')
    console.log(`wrote ${out}`)
    break
  }
  case 'worlds': {
    const registry = loadWorldRegistry(resolve(process.env.LIVELAND_REGISTRY || 'worlds.json'), defaultWorld)
    for (const w of registry.worlds) console.log(`${w.id}\t${w.name}\t${w.path}`)
    for (const e of registry.errors) console.log(`! ${e}`)
    break
  }
  case 'assets': {
    const world = loadWorld(worldFile)
    const out = resolve(args[2] || 'reports/assets.json')
    mkdirSync(dirname(out), { recursive: true })
    writeFileSync(out, assetManifest(world), 'utf8')
    console.log(`wrote ${out}`)
    break
  }
  case 'serve': {
    const port = Number(args[1] || process.env.PORT || 4174)
    await startServer({ port, world: worldFile, registry: process.env.LIVELAND_REGISTRY })
    break
  }
  case 'help':
  default:
    console.log(`LiveLand 0.2 · local-first world / era authoring

用法:
  node src/cli.ts check [world]          世界 lint
  node src/cli.ts report [world] [out]   生成世界圣经
  node src/cli.ts style [world] [out]    生成风格指南
  node src/cli.ts assets [world] [out]   生成资产清单
  node src/cli.ts html [world] [out]     生成独立世界页 HTML
  node src/cli.ts worlds                 列出 worlds.json
  node src/cli.ts serve [port]           启动 Web Workbench

环境:
  LIVELAND_WORLD   覆盖默认 world JSON
  LIVELAND_REGISTRY 覆盖 worlds.json
  PORT             覆盖默认端口 4174
`)
    if (cmd !== 'help') process.exitCode = 1
}
