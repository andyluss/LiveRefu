#!/usr/bin/env bun
/**
 * 构建产物完整性校验（构建后置步骤）。
 *
 * 为什么需要这个脚本 —— 见 docs/02_技术栈与选型.md 的「Bun × Nuxt 兼容性」风险段：
 *
 *   `srvx` 的 package.json `exports` 使用**条件导出**，按运行时暴露多个适配器：
 *     "." → { bun: ./dist/adapters/bun.mjs, deno: …, node: ./dist/adapters/node.mjs, default: … }
 *   Nitro 用 @vercel/nft 做文件追踪时，只按**构建条件**复制了 `node.mjs`；
 *   而 `ipx`（@nuxt/image 的默认 IPX 提供方）在运行时 `import('srvx')`。
 *   一旦产物由 **Bun** 运行，Bun 命中 `bun` 条件去解析 `dist/adapters/bun.mjs`——
 *   该文件不在产物里，于是报 "Cannot find package 'srvx'" 而启动失败。
 *
 * 本脚本做两件事：
 *   1. 校验产物里 srvx 是否包含其 exports 引用的全部文件（缺失则从根 node_modules 补齐）；
 *   2. 校验产物不含 Node 无法解析的 `bun:` 协议导入时、是否与运行命令匹配，给出明确提示。
 *
 * 幂等；无缺失时不做任何写入。
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs'
import { join, dirname, resolve, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '..')
const OUT_SERVER = join(ROOT, '.output/server')

if (!existsSync(OUT_SERVER)) {
  console.error(`✗ 未找到构建产物：${relative(ROOT, OUT_SERVER)}（请先 bun run build）`)
  process.exit(1)
}

let repaired = 0
const problems: string[] = []

/** 递归收集目录下所有文件（相对该目录） */
function walk(dir: string, base = dir): string[] {
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) out.push(...walk(full, base))
    else out.push(relative(base, full))
  }
  return out
}

/**
 * 从某个包的 package.json exports 中抽出所有被引用的文件路径。
 * 只处理字符串值与一层嵌套对象，够用于 srvx 这类结构。
 */
function exportedFiles(pkgDir: string): string[] {
  const pkgPath = join(pkgDir, 'package.json')
  if (!existsSync(pkgPath)) return []
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
  const found = new Set<string>()
  const visit = (node: unknown) => {
    if (typeof node === 'string') {
      if (node.startsWith('./')) found.add(node.slice(2))
      return
    }
    if (node && typeof node === 'object') {
      for (const v of Object.values(node as Record<string, unknown>)) visit(v)
    }
  }
  visit(pkg.exports)
  return [...found]
}

// ---- 校验 srvx：exports 引用的文件是否都在产物里 ----
const SRVX_REL = 'node_modules/srvx'
const srcSrvx = join(ROOT, SRVX_REL)
const outSrvx = join(OUT_SERVER, SRVX_REL)

if (!existsSync(srcSrvx)) {
  problems.push(`${SRVX_REL} 不在根 node_modules —— 请先 bun install`)
} else if (!existsSync(outSrvx)) {
  problems.push(`${SRVX_REL} 未被复制进产物`)
} else {
  const need = exportedFiles(srcSrvx)
  const missing = need.filter(f => !existsSync(join(outSrvx, f)))
  if (missing.length) {
    // 从根 node_modules 补齐缺失文件（含其依赖的 dist 子文件）
    for (const f of missing) {
      const src = join(srcSrvx, f)
      const dst = join(outSrvx, f)
      if (!existsSync(src)) continue
      mkdirSync(dirname(dst), { recursive: true })
      writeFileSync(dst, readFileSync(src))
      repaired++
    }
    console.log(`[check-build] srvx 补齐 ${repaired} 个文件（Nitro 条件导出追踪不全）：`)
    for (const f of missing.slice(0, 6)) console.log(`  · ${f}`)
    if (missing.length > 6) console.log(`  … 另有 ${missing.length - 6} 个`)
  }
}

// ---- 运行命令提示：产物是否含 bun: 协议导入 ----
const nitroChunk = join(OUT_SERVER, 'chunks/nitro/nitro.mjs')
let runtime = 'node'
if (existsSync(nitroChunk)) {
  const text = readFileSync(nitroChunk, 'utf-8')
  if (/from ['"]bun:/.test(text)) runtime = 'bun'
}

if (problems.length) {
  console.error('✗ 产物校验发现问题：')
  for (const p of problems) console.error(`  · ${p}`)
  process.exit(1)
}

console.log(`[check-build] ✓ 产物校验通过${repaired ? `（已补齐 ${repaired} 个 srvx 文件）` : ''}`)
console.log(`[check-build] 运行产物请用：${runtime === 'bun' ? 'bun' : 'node'} .output/server/index.mjs`)
