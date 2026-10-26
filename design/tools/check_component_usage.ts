#!/usr/bin/env node
/**
 * 组件使用审计。
 *
 * 契约写得再好，没有真实消费者就是文档。本脚本扫描两个 Web 产品的源码，
 * 统计 `lr-button` / `lr-panel` / `lr-field` 的出现文件数与产品数：
 *   - button / panel：至少 2 个产品（网站 + LiveFab）；
 *   - field：至少 1 个产品（网站搜索框；LiveFab 当前没有表单，不硬造）。
 *
 * 这是“使用面”的审计，不是视觉验收；视觉验收要截图 + 键盘/触控走查。
 *
 * 用法：
 *   node design/tools/check_component_usage.ts
 *   node design/tools/check_component_usage.ts --self-test
 */

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { extname, join, relative } from 'node:path'

import { WORKSPACE_ROOT } from './token_lib.ts'

const SELF_TEST = process.argv.includes('--self-test')

const SOURCES = [
  {
    product: 'website',
    dir: join(WORKSPACE_ROOT, 'projects/website/app'),
    exts: new Set(['.vue', '.ts']),
    skip: ['projects/website/app/assets/tokens.generated.css'],
  },
  {
    product: 'livefab',
    dir: join(WORKSPACE_ROOT, 'projects/livefab/portal/src'),
    exts: new Set(['.astro', '.ts', '.vue']),
    skip: [],
  },
]

const COMPONENTS = [
  { className: 'lr-button', label: 'Button', minProducts: 2 },
  { className: 'lr-panel', label: 'Panel', minProducts: 2 },
  { className: 'lr-field', label: 'Form Field', minProducts: 1 },
]

interface Usage {
  product: string
  file: string
  count: number
}

export interface Report {
  className: string
  label: string
  files: number
  products: string[]
  count: number
  minProducts: number
  ok: boolean
}

function walk(dir: string, exts: Set<string>, skip: string[], out: string[]): void {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    const rel = relative(WORKSPACE_ROOT, full)
    if (skip.includes(rel)) continue
    const st = statSync(full)
    if (st.isDirectory()) {
      if (name === 'node_modules' || name === '.nuxt' || name === 'dist') continue
      walk(full, exts, skip, out)
    } else if (exts.has(extname(name))) {
      out.push(full)
    }
  }
}

export function countUsages(
  files: Array<{ product: string; path: string; text: string }>,
  className: string,
): Usage[] {
  const out: Usage[] = []
  const re = new RegExp(`\\b${className}\\b`, 'g')
  for (const f of files) {
    const count = (f.text.match(re) ?? []).length
    if (count > 0) out.push({ product: f.product, file: f.path, count })
  }
  return out
}

export function reportFor(
  files: Array<{ product: string; path: string; text: string }>,
  component: { className: string; label: string; minProducts: number },
): Report {
  const usages = countUsages(files, component.className)
  const products = [...new Set(usages.map(u => u.product))]
  return {
    className: component.className,
    label: component.label,
    files: usages.length,
    products,
    count: usages.reduce((n, u) => n + u.count, 0),
    minProducts: component.minProducts,
    ok: products.length >= component.minProducts,
  }
}

function runSelfTest(): number {
  console.log('[self-test] 组件使用审计')
  const files = [
    { product: 'website', path: 'a.vue', text: '<a class="lr-button">x</a>' },
    { product: 'livefab', path: 'b.astro', text: '<a class="lr-button lr-button--secondary">y</a>' },
    { product: 'website', path: 'c.vue', text: '<div class="lr-panel">z</div>' },
  ]
  const button = reportFor(files, { className: 'lr-button', label: 'Button', minProducts: 2 })
  const panel = reportFor(files, { className: 'lr-panel', label: 'Panel', minProducts: 2 })
  const field = reportFor(files, { className: 'lr-field', label: 'Field', minProducts: 1 })

  const cases: Array<[string, boolean, string]> = [
    ['button 两个产品 → ok', button.ok && button.products.length === 2, '两产品使用'],
    ['panel 只有一个产品 → 不 ok', !panel.ok, '少于 2 个产品必须失败'],
    ['field 没有使用 → 不 ok', !field.ok, '零使用必须失败'],
    ['同一文件多次出现只算一个文件', countUsages([
      { product: 'website', path: 'a.vue', text: 'lr-button lr-button' },
    ], 'lr-button').length === 1, '文件数去重'],
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

  const files: Array<{ product: string; path: string; text: string }> = []
  for (const src of SOURCES) {
    const paths: string[] = []
    walk(src.dir, src.exts, src.skip, paths)
    for (const path of paths) {
      files.push({
        product: src.product,
        path: relative(WORKSPACE_ROOT, path),
        text: readFileSync(path, 'utf8'),
      })
    }
  }

  const reports = COMPONENTS.map(c => reportFor(files, c))
  console.log('组件使用审计（Web）')
  console.log('  组件        文件  产品  引用  要求  判定')
  for (const r of reports) {
    console.log(
      `  ${r.label.padEnd(10)} ${String(r.files).padStart(4)}  ${String(r.products.length).padStart(4)}  ${String(r.count).padStart(4)}  ≥${r.minProducts}    ${r.ok ? '✓' : '✗'}`,
    )
  }

  const failed = reports.filter(r => !r.ok)
  if (failed.length) {
    console.error('\n✗ 组件没有达到最低真实消费者数：')
    for (const r of failed) {
      console.error(`  - ${r.label}（${r.className}）：${r.products.length} 个产品，需 ≥${r.minProducts}`)
    }
    return 1
  }

  console.log('\n✓ 三个组件都有真实消费者（field 1 个，button/panel 2 个）')
  return 0
}

process.exit(main())
