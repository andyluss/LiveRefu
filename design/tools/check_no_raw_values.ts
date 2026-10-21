#!/usr/bin/env node
/**
 * 裸色值闸门（第三道闸门）。
 *
 * v0.1 的“受检面”是**已迁移的表面**，不是整个仓库：
 *   - projects/website/app/assets/theme.css（网站主题）
 * 生成物（tokens.generated.css / game/data/tokens.json）不算裸值：
 *   它们是 design/tokens 的可复算投影，由 build_tokens --check 守住。
 *
 * `--all` 是**报告模式**：扫描网站 app 与游戏脚本，列出尚未迁移的裸色值，
 * 用来把设计债写在明处，而不是假装不存在。
 *
 * 用法：
 *   node --experimental-strip-types design/tools/check_no_raw_values.ts
 *   node --experimental-strip-types design/tools/check_no_raw_values.ts --all
 *   node --experimental-strip-types design/tools/check_no_raw_values.ts --self-test
 */

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { extname, join, relative, resolve } from 'node:path'

import { WORKSPACE_ROOT } from './token_lib.ts'

const SELF_TEST = process.argv.includes('--self-test')
const ALL = process.argv.includes('--all')

const HEX = /#(?:[0-9A-Fa-f]{8}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{4}|[0-9A-Fa-f]{3})\b/g

interface Hit {
  file: string
  line: number
  text: string
}

function findHex(content: string): Array<{ line: number; text: string }> {
  const out: Array<{ line: number; text: string }> = []
  content.split('\n').forEach((text, i) => {
    if (HEX.test(text)) out.push({ line: i + 1, text: text.trim() })
    HEX.lastIndex = 0
  })
  return out
}

function scanFile(path: string): Hit[] {
  const content = readFileSync(path, 'utf8')
  return findHex(content).map(h => ({
    file: relative(WORKSPACE_ROOT, path),
    line: h.line,
    text: h.text,
  }))
}

function walk(dir: string, exts: Set<string>, skip: string[], out: string[]): void {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    const rel = relative(WORKSPACE_ROOT, full)
    if (skip.some(s => rel === s || rel.startsWith(`${s}/`))) continue
    const st = statSync(full)
    if (st.isDirectory()) {
      walk(full, exts, skip, out)
    } else if (exts.has(extname(name))) {
      out.push(full)
    }
  }
}

function runSelfTest(): number {
  console.log('[self-test] 裸色值扫描器')
  const cases: Array<[string, boolean, string]> = [
    ['6 位 hex 被检出', findHex('color: #0B1017;').length === 1, '#RRGGBB'],
    ['3 位 hex 被检出', findHex('color: #fff;').length === 1, '#RGB'],
    ['8 位 hex 被检出', findHex('color: #0000008C;').length === 1, '#RRGGBBAA'],
    ['无 hex 不误报', findHex('color: var(--lr-color-bg-base);').length === 0, 'token 引用'],
    ['token 名里的 # 不误报', findHex('/* #design */ color: red;').length === 0, '非色值 #'],
  ]
  let passed = 0
  for (const [name, ok, why] of cases) {
    console.log(`  ${ok ? '✓' : '✗'} ${name}${ok ? '' : `  ← ${why}`}`)
    if (ok) passed++
  }
  console.log(`\n[self-test] ${passed}/${cases.length} 通过`)
  return passed === cases.length ? 0 : 1
}

function main(): number {
  if (SELF_TEST) return runSelfTest()

  const pilot = [join(WORKSPACE_ROOT, 'projects/website/app/assets/theme.css')]
  let failures = 0
  for (const file of pilot) {
    const hits = scanFile(file)
    if (hits.length) {
      failures += hits.length
      console.error(`✗ ${relative(WORKSPACE_ROOT, file)} 仍有裸色值：`)
      for (const h of hits) console.error(`    ${h.line}: ${h.text}`)
    }
  }

  if (ALL) {
    const websiteFiles: string[] = []
    walk(
      join(WORKSPACE_ROOT, 'projects/website/app'),
      new Set(['.vue', '.ts', '.css']),
      ['projects/website/app/assets/tokens.generated.css', 'projects/website/app/node_modules'],
      websiteFiles,
    )
    const gameFiles: string[] = []
    walk(
      join(WORKSPACE_ROOT, 'projects/mainline/future-debris/game'),
      new Set(['.gd', '.tscn', '.tres', '.json']),
      [
        'projects/mainline/future-debris/game/.godot',
        'projects/mainline/future-debris/game/data/tokens.json',
        'projects/mainline/future-debris/game/assets/theme/future_debris.tres',
      ],
      gameFiles,
    )
    const all = [...websiteFiles, ...gameFiles].flatMap(scanFile)
    console.log(`\n[报告] 尚未迁移的裸色值：${all.length} 处`)
    const byFile = new Map<string, Hit[]>()
    for (const h of all) {
      const list = byFile.get(h.file) ?? []
      list.push(h)
      byFile.set(h.file, list)
    }
    for (const [file, hits] of [...byFile].sort()) {
      console.log(`\n  ${file}（${hits.length}）`)
      for (const h of hits.slice(0, 10)) console.log(`    ${h.line}: ${h.text}`)
      if (hits.length > 10) console.log(`    … 另 ${hits.length - 10} 处`)
    }
    console.log('\n（--all 只报告，不拦截；迁移一处，少一处。）')
  }

  if (failures) {
    console.error(
      `\n✗ 已迁移表面仍有 ${failures} 处裸色值。请改用 --lr-* token，或在 design/docs/exceptions.md 登记例外。`,
    )
    return 1
  }

  console.log('✓ 已迁移表面无裸色值（网站 theme.css）')
  return 0
}

process.exit(main())
