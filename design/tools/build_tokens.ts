#!/usr/bin/env node
/**
 * 从 design/tokens/ 生成各端产物。
 *
 * 用法：
 *   node --experimental-strip-types design/tools/build_tokens.ts            # 写入
 *   node --experimental-strip-types design/tools/build_tokens.ts --check    # 只校验生成物是否最新
 *   node --experimental-strip-types design/tools/build_tokens.ts --self-test
 *
 * 产物：
 *   design/tokens/dist/web/{future-archive,livefab}.css
 *   design/tokens/dist/godot/tokens.json
 *   design/tokens/dist/docs/tokens.md
 *   projects/website/app/assets/tokens.generated.css
 *   projects/mainline/future-debris/game/data/tokens.json
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, relative } from 'node:path'

import {
  DESIGN_ROOT,
  WORKSPACE_ROOT,
  buildAll,
  firstDiff,
  kebab,
  cssVar,
  productCssVar,
  godotColorKey,
  contrast,
  round2,
} from './token_lib.ts'

const CHECK = process.argv.includes('--check')
const SELF_TEST = process.argv.includes('--self-test')

function runSelfTest(): number {
  console.log('[self-test] 生成器纯函数与差异检测')
  const cases: Array<[string, boolean, string]> = [
    ['kebab: bgElev → bg-elev', kebab('bgElev') === 'bg-elev', 'camelCase 必须转 kebab'],
    ['kebab: title-1 保持不变', kebab('title-1') === 'title-1', '已有连字符不得被破坏'],
    [
      'cssVar: sys.color.bg.base → --lr-color-bg-base',
      cssVar('sys.color.bg.base') === '--lr-color-bg-base',
      '系统 token 前缀',
    ],
    [
      'productCssVar: product.future-archive.color.bgElev',
      productCssVar('product.future-archive.color.bgElev') === '--lr-future-archive-bg-elev',
      '产品 token 去 color 段',
    ],
    [
      'godotColorKey: bgElev1 → --bg-elev-1',
      godotColorKey('product.future-debris.color.bgElev1') === '--bg-elev-1',
      'Godot 现有命名',
    ],
    [
      'contrast: 黑白 21:1',
      round2(contrast('#000000', '#FFFFFF')) === 21,
      'WCAG 极值',
    ],
    [
      'firstDiff: 相同 → null',
      firstDiff('a\nb\n', 'a\nb\n') === null,
      '完全相同不得报差异',
    ],
    [
      'firstDiff: 不同 → 行号 2',
      firstDiff('a\nb\n', 'a\nc\n')?.line === 2,
      '差异必须定位到行',
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

function main(): number {
  if (SELF_TEST) return runSelfTest()

  let outputs
  try {
    outputs = buildAll(DESIGN_ROOT, WORKSPACE_ROOT)
  } catch (e) {
    console.error(`✗ 构建失败：${e instanceof Error ? e.message : String(e)}`)
    return 1
  }

  if (CHECK) {
    let failures = 0
    for (const out of outputs) {
      if (!existsSync(out.path)) {
        console.error(`✗ 缺少生成物：${out.label}`)
        failures++
        continue
      }
      const actual = readFileSync(out.path, 'utf8')
      const diff = firstDiff(out.content, actual)
      if (diff) {
        console.error(`✗ 生成物过期：${out.label}`)
        console.error(`    第 ${diff.line} 行`)
        console.error(`    期望：${diff.expected}`)
        console.error(`    实际：${diff.actual}`)
        failures++
      }
    }
    if (failures) {
      console.error(
        `\n✗ ${failures}/${outputs.length} 个生成物与源不一致。` +
          ' 运行 `node --experimental-strip-types design/tools/build_tokens.ts` 重新生成。',
      )
      return 1
    }
    console.log(`✓ 全部 ${outputs.length} 个生成物已是最新（源 ↔ 生成物一致）`)
    return 0
  }

  for (const out of outputs) {
    mkdirSync(dirname(out.path), { recursive: true })
    writeFileSync(out.path, out.content, 'utf8')
    console.log(`✓ ${relative(WORKSPACE_ROOT, out.path)}`)
  }
  console.log(`\n✓ 已生成 ${outputs.length} 个产物`)
  return 0
}

process.exit(main())
