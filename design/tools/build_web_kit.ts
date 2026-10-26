#!/usr/bin/env node
/**
 * 把共享 Web 组件层复制到设计系统产物与两个产品。
 *
 * 源是手写的 design/kits/web/components.css；产品副本是**生成物**，
 * 由本脚本保证一致。它不属于 token 生成器：组件 CSS 是代码，不是 token。
 *
 * 用法：
 *   node design/tools/build_web_kit.ts
 *   node design/tools/build_web_kit.ts --check
 *   node design/tools/build_web_kit.ts --self-test
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'

import { DESIGN_ROOT, WORKSPACE_ROOT, firstDiff } from './token_lib.ts'

const SRC = join(DESIGN_ROOT, 'kits/web/components.css')
const CHECK = process.argv.includes('--check')
const SELF_TEST = process.argv.includes('--self-test')

interface Out {
  path: string
  label: string
}

const OUTPUTS: Out[] = [
  {
    path: join(DESIGN_ROOT, 'tokens/dist/web/components.css'),
    label: 'design/tokens/dist/web/components.css',
  },
  {
    path: join(WORKSPACE_ROOT, 'projects/website/app/assets/components.generated.css'),
    label: 'projects/website/app/assets/components.generated.css',
  },
  {
    path: join(WORKSPACE_ROOT, 'projects/livefab/portal/src/assets/components.generated.css'),
    label: 'projects/livefab/portal/src/assets/components.generated.css',
  },
]

function runSelfTest(): number {
  console.log('[self-test] Web 组件层复制器')
  const cases: Array<[string, boolean, string]> = [
    ['相同 → 无 diff', firstDiff('a\nb\n', 'a\nb\n') === null, '相同不得误报'],
    ['不同 → 定位行 2', firstDiff('a\nb\n', 'a\nc\n')?.line === 2, '差异必须定位'],
    ['源文件存在', existsSync(SRC), 'components.css 必须存在'],
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

  const content = readFileSync(SRC, 'utf8')

  if (CHECK) {
    let failures = 0
    for (const out of OUTPUTS) {
      if (!existsSync(out.path)) {
        console.error(`✗ 缺少生成物：${out.label}`)
        failures++
        continue
      }
      const actual = readFileSync(out.path, 'utf8')
      const diff = firstDiff(content, actual)
      if (diff) {
        console.error(`✗ 生成物过期：${out.label}`)
        console.error(`    第 ${diff.line} 行`)
        console.error(`    期望：${diff.expected}`)
        console.error(`    实际：${diff.actual}`)
        failures++
      }
    }
    if (failures) {
      console.error(`\n✗ ${failures}/${OUTPUTS.length} 个组件产物不一致`)
      return 1
    }
    console.log(`✓ 全部 ${OUTPUTS.length} 个组件产物已是最新`)
    return 0
  }

  for (const out of OUTPUTS) {
    mkdirSync(dirname(out.path), { recursive: true })
    writeFileSync(out.path, content, 'utf8')
    console.log(`✓ ${relative(WORKSPACE_ROOT, out.path)}`)
  }
  console.log(`\n✓ 已生成 ${OUTPUTS.length} 个组件产物`)
  return 0
}

process.exit(main())
