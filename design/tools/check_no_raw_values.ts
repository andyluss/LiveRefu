#!/usr/bin/env node
/**
 * 裸色值闸门（第三道闸门）。
 *
 * 默认受检面：**整个网站 app**（.vue / .ts / .css），不只看 theme.css。
 * 生成物（tokens.generated.css / game/data/tokens.json）不算裸值：
 *   它们是 design/tokens 的可复算投影，由 build_tokens --check 守住。
 *
 * `--all` 是**报告模式**：再加上游戏脚本，列出尚未迁移的裸色值，
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

const RAW = /#(?:[0-9A-Fa-f]{8}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{4}|[0-9A-Fa-f]{3})\b|\brgba?\(/g

interface Hit {
  file: string
  line: number
  text: string
}

function findRaw(content: string): Array<{ line: number; text: string }> {
  const out: Array<{ line: number; text: string }> = []
  content.split('\n').forEach((text, i) => {
    if (RAW.test(text)) out.push({ line: i + 1, text: text.trim() })
    RAW.lastIndex = 0
  })
  return out
}

/** GDScript 注释剥离：跳过注释里的 hex，但保留字符串里的真实色值（如 Color("#4FD1C5")）。 */
function stripGdComment(line: string): string {
  const m = /(^|\s)#/.exec(line)
  if (!m) return line
  const idx = m.index + (m[1] ? m[1].length : 0)
  return line.slice(0, idx)
}

function scanFile(path: string): Hit[] {
  const raw = readFileSync(path, 'utf8')
  const content =
    extname(path) === '.gd' ? raw.split('\n').map(stripGdComment).join('\n') : raw
  return findRaw(content).map(h => ({
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
    ['6 位色值被检出', findRaw('color: #0B1017;').length === 1, '#RRGGBB'],
    ['3 位色值被检出', findRaw('color: #fff;').length === 1, '#RGB'],
    ['8 位色值被检出', findRaw('color: #0000008C;').length === 1, '#RRGGBBAA'],
    ['无裸值不误报', findRaw('color: var(--lr-color-bg-base);').length === 0, 'token 引用'],
    ['token 名里的 # 不误报', findRaw('/* #design */ color: red;').length === 0, '非色值 #'],
    ['rgba() 被检出', findRaw('background: rgba(0,0,0,.5);').length === 1, '函数式色值'],
    [
      'GDScript 注释里的 hex 被跳过',
      findRaw(stripGdComment('## 实测底色 #4c4c4c')).length === 0,
      '注释不是裸色值',
    ],
    [
      'GDScript 字符串里的 hex 仍被检出',
      findRaw(stripGdComment('var c = Color("#4FD1C5")')).length === 1,
      '真实色值不得被注释规则漏掉',
    ],
  ]
  let passed = 0
  for (const [name, ok, why] of cases) {
    console.log(`  ${ok ? '✓' : '✗'} ${name}${ok ? '' : `  ← ${why}`}`)
    if (ok) passed++
  }
  console.log(`\n[self-test] ${passed}/${cases.length} 通过`)
  return passed === cases.length ? 0 : 1
}

function collectWebsiteFiles(): string[] {
  const files: string[] = []
  walk(
    join(WORKSPACE_ROOT, 'projects/website/app'),
    new Set(['.vue', '.ts', '.css']),
    ['projects/website/app/assets/tokens.generated.css', 'projects/website/app/node_modules'],
    files,
  )
  return files
}

function collectGameFiles(): string[] {
  const files: string[] = []
  walk(
    join(WORKSPACE_ROOT, 'projects/mainline/future-debris/game'),
    new Set(['.gd', '.tscn', '.tres', '.json']),
    [
      'projects/mainline/future-debris/game/.godot',
      'projects/mainline/future-debris/game/data/tokens.json',
      'projects/mainline/future-debris/game/assets/theme/future_debris.tres',
    ],
    files,
  )
  return files
}

function groupByFile(hits: Hit[]): Map<string, Hit[]> {
  const byFile = new Map<string, Hit[]>()
  for (const h of hits) {
    const list = byFile.get(h.file) ?? []
    list.push(h)
    byFile.set(h.file, list)
  }
  return byFile
}

function main(): number {
  if (SELF_TEST) return runSelfTest()

  const websiteFiles = collectWebsiteFiles()
  const websiteHits = websiteFiles.flatMap(scanFile)

  if (ALL) {
    const all = [...websiteHits, ...collectGameFiles().flatMap(scanFile)]
    console.log(`[报告] 尚未迁移的裸色值：${all.length} 处`)
    for (const [file, hits] of [...groupByFile(all)].sort()) {
      console.log(`\n  ${file}（${hits.length}）`)
      for (const h of hits.slice(0, 10)) console.log(`    ${h.line}: ${h.text}`)
      if (hits.length > 10) console.log(`    … 另 ${hits.length - 10} 处`)
    }
    console.log('\n（--all 只报告，不拦截；迁移一处，少一处。）')
    return 0
  }

  if (websiteHits.length) {
    console.error(`✗ 网站 app 仍有 ${websiteHits.length} 处裸色值：`)
    for (const [file, hits] of [...groupByFile(websiteHits)].sort()) {
      console.error(`\n  ${file}`)
      for (const h of hits) console.error(`    ${h.line}: ${h.text}`)
    }
    console.error(
      '\n请改用 --lr-* token；确实不能表达的，登记到 design/docs/exceptions.md。',
    )
    return 1
  }

  console.log(`✓ 网站 app 无裸色值（检查 ${websiteFiles.length} 个 CSS/Vue/TS 文件）`)
  return 0
}

process.exit(main())
