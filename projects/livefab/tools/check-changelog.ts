#!/usr/bin/env bun
/**
 * 变更日志格式校验（[方案甲](../../docs/06_变更日志方案选择.md) 的 F1 护栏）。
 *
 * 为什么需要护栏：格式约定**不放护栏必腐化**。本仓库已经有过
 * 3 次"变异字符串过期致检查器误报"、2 次"检查器自己有 bug"的经历——
 * 格式这类东西靠人自觉，几个月后一定走样。
 *
 * 校验项：
 *   1. 版本头格式 `## [X.Y.Z] - YYYY-MM-DD HH:mm`（东八区、精确到分）
 *   2. `[未发布]` 若有，必须在最上
 *   3. 时间**单调递减**（最新在最上）
 *   4. 每个 `###` 必须以下列标准类目之一开头：新增/变更/弃用/移除/修复/安全
 *   5. 版本段不能为空
 *   6. 时间不能在未来
 *   7. ★ **版本号与 git tag 对得上**：若存在 `livefab-v<版本>` 标签，
 *      版本头的时间必须等于该标签指向提交的时间——这条把 CHANGELOG 与 git 钉在一起，
 *      是最有价值的一条（前面几条只保证"格式自洽"，这条保证"内容不假"）
 *
 * 用法：
 *   bun run tools/check-changelog.ts
 *   bun run tools/check-changelog.ts --selftest   # 负向自检
 */

import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { execFileSync } from 'node:child_process'

// ⚠️ 用 import.meta.dirname 而不是 Bun 专有的 import.meta.dir —— 本脚本要能在 node 下跑
const ROOT = resolve(import.meta.dirname, '..')
const FILE = join(ROOT, 'CHANGELOG.md')
const SELFTEST = process.argv.includes('--selftest')

/** 标准类目（R05 §四） */
const CATEGORIES = ['新增', '变更', '弃用', '移除', '修复', '安全'] as const
/** 未发布段的写法（中英都接受） */
const UNRELEASED = /^## \[(未发布|Unreleased)\]$/
/** 版本头：`## [1.2.3] - 2026-10-05 21:29` */
const VERSION_HEAD = /^## \[(\d+\.\d+\.\d+)\] - (\d{4}-\d{2}-\d{2}) (\d{2}:\d{2})$/

interface Check { name: string; ok: boolean; detail: string }
const results: Check[] = []
const check = (name: string, ok: boolean, detail = '') => {
  results.push({ name, ok, detail })
  if (!SELFTEST) console.log(`  ${ok ? '✓' : '✗'} ${name.padEnd(40)} ${detail}`)
}

// ⚠️ 刻意只用 node 内置模块（不用 Bun.*）：本脚本要能被**工作区 pre-commit 钩子**
//    用 `node --experimental-strip-types` 直接跑（钩子的既有约定），
//    而 Bun API 在 node 下不存在。因此这里用 execFileSync 而不是 Bun.spawnSync。
const sh = (cmd: string[]) => {
  try {
    const out = execFileSync(cmd[0]!, cmd.slice(1), { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
    return { out: out.trim(), code: 0 }
  } catch (e: any) {
    return { out: (e?.stdout ?? '').toString().trim(), code: e?.status ?? 1 }
  }
}

// ══════════════════════════════════════════════════════════════════════
// 纯逻辑校验（可被自检复用的部分）
// ══════════════════════════════════════════════════════════════════════
interface Parsed { unreleased: boolean; unreleasedSections: string[]; versions: Array<{ ver: string; time: string; sections: string[] }>; bareSections: string[] }

function parse(text: string): Parsed {
  const lines = text.split('\n')
  const out: Parsed = { unreleased: false, unreleasedSections: [], versions: [], bareSections: [] }
  let cur: { ver: string; time: string; sections: string[] } | null = null
  // ⚠️ [未发布] 也是一个**合法容器**（发布时才并入版本号），
  //    其下的小节不能算"游离"。早先版本没处理这点，把新加的条目误判成游离。
  let inUnreleased = false
  for (const l of lines) {
    if (UNRELEASED.test(l)) { out.unreleased = true; inUnreleased = true; cur = null; continue }
    const m = l.match(VERSION_HEAD)
    if (m) { cur = { ver: m[1]!, time: `${m[2]} ${m[3]}`, sections: [] }; out.versions.push(cur); continue }
    if (l.startsWith('## [')) { cur = null; inUnreleased = false; continue }  // 格式不对的版本头
    if (l.startsWith('### ')) {
      if (cur) cur.sections.push(l.slice(4).trim())
      else if (inUnreleased) out.unreleasedSections.push(l.slice(4).trim())
      else out.bareSections.push(l.slice(4).trim())
    }
  }
  return out
}

/** 版本头是否合法（用于自检喂坏数据） */
function allHeadsValid(text: string): boolean {
  const heads = text.split('\n').filter(l => l.startsWith('## ['))
  return heads.every(l => UNRELEASED.test(l) || VERSION_HEAD.test(l))
}

/** 时间是否单调递减（最新在最上） */
function timesDescending(versions: Array<{ time: string }>): boolean {
  for (let i = 1; i < versions.length; i++) {
    if (versions[i]!.time >= versions[i - 1]!.time) return false
  }
  return true
}

/** 类目是否全部合法 */
function categoriesValid(sections: string[]): boolean {
  return sections.every(s => CATEGORIES.some(c => s.startsWith(c)))
}

// ══════════════════════════════════════════════════════════════════════
// 自检：给校验逻辑喂**已知坏数据**，确认它会失败
// ══════════════════════════════════════════════════════════════════════
if (SELFTEST) {
  console.log('负向自检：给校验逻辑喂已知坏数据，确认它们会失败\n')
  const cases: Array<[string, () => boolean, string]> = [
    ['版本头格式', () => allHeadsValid('## [0.3.0] - 2026-10-05 21:29'), '（这条应通过——作为对照）'],
    ['版本头格式（缺时分）', () => allHeadsValid('## [0.3.0] - 2026-10-05'), '旧格式必须被拒'],
    ['版本头格式（非 SemVer）', () => allHeadsValid('## [M1] - 2026-10-05 21:29'), '里程碑式必须被拒'],
    ['时间单调递减', () => timesDescending([{ time: '2026-10-05 21:29' }, { time: '2026-10-03 19:43' }]), '（应通过）'],
    ['时间单调递减（乱的）', () => timesDescending([{ time: '2026-10-03 19:43' }, { time: '2026-10-05 21:29' }]), '顺序颠倒必须被拒'],
    ['标准类目', () => categoriesValid(['新增（x）', '修复（y）']), '（应通过）'],
    ['标准类目（非标准）', () => categoriesValid(['发现（x）']), '发现不在七类目里，必须被拒'],
  ]
  let caught = 0
  let expectedPass = 0
  for (const [name, fn, note] of cases) {
    const isControl = note.includes('应通过')
    const got = fn()
    const ok = isControl ? got : !got
    if (ok) caught++
    console.log(`  ${ok ? '✓' : '✗'} ${isControl ? '对照' : '可捕获'}  ${name}  ${note}`)
    expectedPass++
  }
  console.log(`\n负向自检：${caught}/${expectedPass} 项符合预期`)
  if (caught !== expectedPass) {
    console.error('✗ 校验逻辑不可信')
    process.exit(1)
  }
  console.log('✓ 校验逻辑可信')
  process.exit(0)
}

// ══════════════════════════════════════════════════════════════════════
// 正式校验
// ══════════════════════════════════════════════════════════════════════
console.log('变更日志校验\n')
const text = readFileSync(FILE, 'utf8')
const p = parse(text)

check('存在版本段', p.versions.length > 0, `${p.versions.length} 个版本`)
check('版本头格式合法', allHeadsValid(text),
  p.versions.map(v => v.ver).join(' / '))
check('无"游离"的 ### 小节', p.bareSections.length === 0,
  p.bareSections.length ? `有 ${p.bareSections.length} 个不在任何版本下：${p.bareSections.slice(0, 2).join('; ')}` : '')

if (p.unreleased) {
  const idxUnreleased = text.split('\n').findIndex(l => UNRELEASED.test(l))
  const idxFirstVersion = text.split('\n').findIndex(l => VERSION_HEAD.test(l))
  check('[未发布] 在最上', idxUnreleased < idxFirstVersion)
}

check('时间单调递减（最新在最上）', timesDescending(p.versions),
  p.versions.map(v => v.time).join(' > '))

const allSections = [...p.versions.flatMap(v => v.sections), ...p.unreleasedSections]
check('每个小节都用标准类目', categoriesValid(allSections),
  `共 ${allSections.length} 个小节（含未发布 ${p.unreleasedSections.length}）；类目集 ${CATEGORIES.join('/')}`)

const emptyVersions = p.versions.filter(v => v.sections.length === 0).map(v => v.ver)
check('无空版本段', emptyVersions.length === 0,
  emptyVersions.length ? `空版本：${emptyVersions.join(', ')}` : '')

// 时间不能在未来
const now = new Date()
const nowLocal = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
const future = p.versions.filter(v => v.time > nowLocal)
check('版本时间不在未来', future.length === 0,
  future.length ? `未来时间：${future.map(v => `${v.ver} ${v.time}`).join(', ')}` : `当前 ${nowLocal}`)

// ★ 版本号 ↔ git tag：把 CHANGELOG 与 git 钉在一起
//   其余几条只保证"格式自洽"，这条保证"内容不假"。
const tagChecks = p.versions.map(v => {
  const tag = `livefab-v${v.ver}`
  const r = sh(['git', 'log', '-1', '--date=format-local:%Y-%m-%d %H:%M', '--format=%ad', tag])
  return { ver: v.ver, tag, exists: r.code === 0 && r.out !== '', gitTime: r.out, docTime: v.time }
})
const missing = tagChecks.filter(t => !t.exists)
const mismatched = tagChecks.filter(t => t.exists && t.gitTime !== t.docTime)
check('版本号与 git tag 对得上',
  missing.length === 0 && mismatched.length === 0,
  missing.length ? `缺 tag：${missing.map(t => t.tag).join(', ')}（打 tag 后此项会通过）`
    : mismatched.length ? mismatched.map(t => `${t.tag}: 文档 ${t.docTime} ≠ git ${t.gitTime}`).join('; ')
    : tagChecks.map(t => `${t.ver} ✓`).join(' '))

// ══════════════════════════════════════════════════════════════════════
const failed = results.filter(r => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} 项通过`)
if (failed.length) {
  console.error('✗ 变更日志校验未通过：')
  for (const f of failed) console.error(`  · ${f.name} ${f.detail}`)
  process.exit(1)
}
console.log('✓ 变更日志格式校验通过')
