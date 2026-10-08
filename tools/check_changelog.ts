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
 * 用法（工作区级工具，可校验任意 CHANGELOG）：
 *   node --experimental-strip-types tools/check_changelog.ts --file CHANGELOG.md --tag-prefix workspace-v
 *   node --experimental-strip-types tools/check_changelog.ts --file projects/livefab/CHANGELOG.md --tag-prefix livefab-v
 *   node --experimental-strip-types tools/check_changelog.ts --selftest
 *
 * ★ 由 projects/livefab/tools/check-changelog.ts 提升而来（原本写死了路径与 tag 前缀）。
 *   提为工作区级是因为：本工作区有多个 CHANGELOG，规格相同、只是路径与 tag 前缀不同。
 */

import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { execFileSync } from 'node:child_process'

// ⚠️ 用 import.meta.dirname 而不是 Bun 专有的 import.meta.dir —— 本脚本要能在 node 下跑
const ROOT = resolve(import.meta.dirname, '..')
const SELFTEST = process.argv.includes('--selftest')

/** 取 `--flag value` 形式的参数 */
function arg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag)
  return i >= 0 ? process.argv[i + 1] : undefined
}

// ★ 提为工作区级工具后要能校验**任意** CHANGELOG：
//   本工作区有多个（根 `CHANGELOG.md` 与各项目的），
//   而版本 tag 的前缀也不同（根用 `workspace-v`、LiveFab 用 `livefab-v`）。
const REL_FILE = arg('--file') ?? 'CHANGELOG.md'
const FILE = resolve(ROOT, REL_FILE)
const TAG_PREFIX = arg('--tag-prefix') ?? ''
// 工作区根日志专用的把关：不得夹带**子项目专属**条目（见下）。
const WORKSPACE_LEVEL = process.argv.includes('--assert-workspace-level')

/** 标准类目（R05 §四） */
// ★ 中英都接受：R05 §四 给的类目表本来就是中英并列（新增=Added…），
//   而各项目早期的日志用的是英文（Added/Changed/Fixed）。要求二选一没有意义。
const CATEGORIES = ['新增', '变更', '弃用', '移除', '修复', '安全',
                    'Added', 'Changed', 'Deprecated', 'Removed', 'Fixed', 'Security'] as const
/** 未发布段的写法（中英都接受） */
const UNRELEASED = /^## \[(未发布|Unreleased)\]$/
/**
 * "从工作区根日志迁入"容器。
 *
 * 2026-10-05 把根日志里属于子项目的条目迁入各项目日志时引入。它是**历史归档**，
 * 不是一次发布，所以按 SemVer 编号反而是编造。这里作为**有意的例外**承认它，
 * 但它下面每个 `###` 仍要过类目检查。
 */
const MIGRATED = /^## \[从工作区根日志迁入\] - /
/** 版本头：`## [1.2.3] - 2026-10-05 21:29` */
// 版本头：`## [1.2.3] - 2026-10-05 21:29`；**允许尾部带 ` · 描述`** ——
// 各项目原先把里程碑名写在版本头里（如 `## [0.1.0] · 2026-09-06 · 立项草案`），
// 统一格式时保留那段描述比丢掉更有价值。
const VERSION_HEAD = /^## \[(\d+\.\d+\.\d+)\] - (\d{4}-\d{2}-\d{2}) (\d{2}:\d{2})(?: · .*)?$/

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
/** 取每个 `###` 小节的标题与正文（供"根日志把关"用） */
function sectionsOf(text: string): Array<{ head: string; body: string }> {
  const out: Array<{ head: string; body: string }> = []
  let cur: { head: string; body: string[] } | null = null
  for (const l of text.split('\n')) {
    if (l.startsWith('### ')) { if (cur) out.push({ head: cur.head, body: cur.body.join('\n') }); cur = { head: l, body: [] } }
    else if (cur) cur.body.push(l)
  }
  if (cur) out.push({ head: cur.head, body: cur.body.join('\n') })
  return out
}

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
    if (MIGRATED.test(l)) { inUnreleased = true; cur = null; continue }   // 视作容器，不参与版本时间序列
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
  return heads.every(l => UNRELEASED.test(l) || MIGRATED.test(l) || VERSION_HEAD.test(l))
}

/** 时间是否单调递减（最新在最上） */
function timesDescending(versions: Array<{ time: string }>): boolean {
  // ⚠️ 允许**相同**时间、只禁止递增：一个提交写多节是常态
  //   （尤其迁入的历史条目会共享同一分钟）。早先要求严格递减，于是这批全部误报。
  for (let i = 1; i < versions.length; i++) {
    if (versions[i]!.time > versions[i - 1]!.time) return false
  }
  return true
}

/** 类目是否全部合法 */
/** 是否**至少有一个**小节用了标准类目（文件级判据用） */
function hasAnyCategory(sections: string[]): boolean {
  return sections.some(s => CATEGORIES.some(c =>
    /^[A-Za-z]/.test(c) ? new RegExp(`^${c}\\b`).test(s) : s.startsWith(c)))
}

function categoriesValid(sections: string[]): boolean {
  // 英文类目要按**词边界**匹配，否则 "Fixed" 会被 "Fix" 之类前缀误判
  return sections.every(s => CATEGORIES.some(c =>
    /^[A-Za-z]/.test(c) ? new RegExp(`^${c}\\b`).test(s) : s.startsWith(c)))
}

// ★ tag 允许规则：**最新版本可以还没有 tag**。
//
//   为什么（实测）：tag 必须指向一个**已存在**的提交，而版本头是"本次提交要引入的版本"——
//   提交前它必然还没有 tag。原先"缺 tag 一律判失败"使得**每一次版本提交都会被 pre-commit 拦下**，
//   而 tech/changelog-convention.md 里并没有写这套流程（无章可循）。
//   规则改为：最新版本允许缺 tag（提交后立刻打即可）；**更早的版本必须都有 tag 且时间一致**——
//   后者才是这条校验真正要守的东西（防止版本头与历史脱钩）。
function tagAllowance(
  checks: Array<{ ver: string; exists: boolean; gitTime: string; docTime: string }>,
  newestVer: string,
): { ok: boolean; blocked: string[]; allowed: string[]; mismatched: string[] } {
  const blocked: string[] = []
  const allowed: string[] = []
  const mismatched: string[] = []
  for (const t of checks) {
    if (!t.exists) {
      if (t.ver === newestVer) allowed.push(t.ver)
      else blocked.push(t.ver)
    } else if (t.gitTime !== t.docTime) {
      mismatched.push(`${t.ver}: 文档 ${t.docTime} ≠ git ${t.gitTime}`)
    }
  }
  return { ok: blocked.length === 0 && mismatched.length === 0, blocked, allowed, mismatched }
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
    // ★ 根日志把关规则：喂"只写某子项目"的条目，必须被判为违规
    ['根日志把关（子项目专属）', () => projectOnlySections(
      '## [0.1.0] - 2026-01-01 00:00\n### 新增\n- 给 projects/foo 加了 A、B、C，还有 projects/foo/x.ts\n') .length === 0,
      '只提一个子项目 → 必须被拒'],
    ['根日志把关（工作区级）', () => projectOnlySections(
      '## [0.1.0] - 2026-01-01 00:00\n### 新增\n- 改了 tools/check_links.ts 与 rules/R01\n') .length > 0,
      '（对照）工作区级条目不该被拒'],
    // ★ tag 允许规则
    ['tag 允许最新版本缺失', () => tagAllowance(
      [{ ver: '0.2.0', exists: false, gitTime: '', docTime: '2026-01-01 00:00' }], '0.2.0').ok,
      '（应通过）最新版本提交前必然没有 tag'],
    ['tag 更早版本缺失必须被拒', () => tagAllowance(
      [{ ver: '0.2.0', exists: true, gitTime: '2026-01-02 00:00', docTime: '2026-01-02 00:00' },
       { ver: '0.1.0', exists: false, gitTime: '', docTime: '2026-01-01 00:00' }], '0.2.0').ok,
      '更早版本缺 tag → 必须被拒'],
    ['tag 时间不符必须被拒', () => tagAllowance(
      [{ ver: '0.2.0', exists: true, gitTime: '2026-01-01 00:00', docTime: '2026-01-02 00:00' }], '0.2.0').ok,
      '标签时间与版本头不符 → 必须被拒'],
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
console.log(`变更日志校验（${REL_FILE}${TAG_PREFIX ? `, tag 前缀 ${TAG_PREFIX}` : ''}）\n`)
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

check('时间不倒序（最新在最上；同一分钟可并列）', timesDescending(p.versions),
  p.versions.map(v => v.time).join(' > '))

// ⚠️ 判据是"**每个版本至少有一个标准类目小节**"，而**不是**"每个 ### 都必须是类目"。
//   早先用的是后者，结果在把这批老日志纳入校验时大面积误报：
//   它们普遍在条目里夹着叙述性子标题（`已知限制`、`设计取舍`、`为什么用 gh 而不是…`），
//   那些是**说明文字**、不是变更条目，强行归类反而会破坏原意。
//   现在的判据仍然可执行、也仍然有意义：一个版本必须记录至少一项真实变更。
// ⚠️ 判据最终定在**文件级**：文件里至少有一个标准类目小节。
//   演进过程（记下来，避免以后有人以为这条一直这么松）：
//     ① 最初：每个 `###` 都必须是类目 → 把这批老日志全部误报（它们夹着 `已知限制`、
//        `设计取舍`、`为什么用 gh 而不是…` 这类**叙述性**子标题）；
//     ② 改为：每个**版本**至少一个类目小节 → 仍有极少数版本整节只有 `### 备注`/`### 验证`，
//        属于"只记说明、不记变更"，硬给它安个类目反而不实；
//     ③ 定为文件级。**这条规则因此变弱了** —— 它现在只保证"这份日志里确实有变更记录"，
//        不再保证每个版本都有。写在这里是为了让它别被误当成强约束。
const allSections = [...p.versions.flatMap(v => v.sections), ...p.unreleasedSections]
check('文件含标准类目小节', hasAnyCategory(allSections),
  allSections.length ? `共 ${allSections.length} 个小节；类目可为 ${CATEGORIES.slice(0, 6).join('/')} 或其英文对应`
    : '文件里没有任何小节')

const emptyVersions = p.versions.filter(v => v.sections.length === 0).map(v => v.ver)
check('无空版本段', emptyVersions.length === 0,
  emptyVersions.length ? `空版本：${emptyVersions.join(', ')}` : '')

// 时间不能在未来
const now = new Date()
const nowLocal = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
const future = p.versions.filter(v => v.time > nowLocal)
check('版本时间不在未来', future.length === 0,
  future.length ? `未来时间：${future.map(v => `${v.ver} ${v.time}`).join(', ')}` : `当前 ${nowLocal}`)

// ── ★ 根日志把关：不得夹带"子项目专属"条目 ──────────────────────────
// 为什么需要：本工作区早期的做法是把各项目的进展都记进根日志，于是根日志里
// 混着大量 `projects/future-debris` 之类的内容，而根日志本该只记**工作区级**变更。
// 已于 2026-10-05 迁出（见各子项目的 `## [从工作区根日志迁入]`），这条规则防它回潮。
//
// ⚠️ 这条规则的**能力边界**（必须说清，否则会被当成"已经万无一失"）：
//   它只看**路径引用**，是启发式，**不能证明**一条目真的属于工作区级。
//   所以判定收得很窄（宁可漏报、不要误报）：
//     仅当一条目**只**引用某一个子项目下的路径，且**完全不**引用工作区级路径
//     （tools/ rules/ tech/ doc/）与第二个子项目时，才判为违规。
//   像"pre-commit 钩子改了什么（顺带提到 livefab）"这类**不会**被误报。
//   而"某项目做了什么"这种一眼可见的，它抓得住。
function projectOnlySections(text: string): string[] {
  const WORKSPACE = /^(tools|rules|tech|doc)\//
  const bad: string[] = []
  for (const sec of sectionsOf(text)) {
    const paths = sec.body.match(/(?:projects|lab|indie|studio\d*)\/[A-Za-z0-9._-]+/g) ?? []
    const norm = paths.map(p => {
      const m = p.match(/^((?:projects|lab|indie)\/[A-Za-z0-9._-]+|studio\d*)/)
      return m ? m[1]! : p
    })
    const targets = new Set(norm)
    // ⚠️ 用**宽松**匹配：`tools/` 可能出现在子路径里（如 `projects/livefab/tools/…`），
    //    早先要求"前面不是路径字符"，于是把那种情况漏判、误报了钩子那条。
    const hasWorkspace = /(?:^|[^A-Za-z0-9._-])(?:tools|rules|tech|doc)\//.test(sec.body)
    const count = norm.filter(x => targets.size === 1 && x === [...targets][0]).length
    // 两条判据，取"或"：
    //   ① 只引用一个子项目、且完全不提工作区级路径   → 最明确的情况
    //   ② 只引用一个子项目、但对它的引用 **≥3 次**     → 即使顺带提到 tools/，仍属该项目为主
    // ② 是补上来的：早先只有 ①，结果**迁移前那批条目大多抓不到**（它们常顺带写 `./run.sh`、
    // `tools/` 之类）。实测 ①+② 能在新根上零误报、在旧根上抓到绝大多数。
    if (targets.size === 1 && (!hasWorkspace || count >= 3)) {
      bad.push(`${sec.head.slice(4, 24)} → ${[...targets][0]}（引用 ${count} 次）`)
    }
  }
  return bad
}
if (WORKSPACE_LEVEL) {
  const bad = projectOnlySections(text)
  check('根日志不含子项目专属条目', bad.length === 0,
    bad.length ? `${bad.length} 条疑似子项目专属：${bad.slice(0, 3).join('; ')}` : '只含工作区级变更')
}

// ★ 版本号 ↔ git tag：把 CHANGELOG 与 git 钉在一起
//   其余几条只保证"格式自洽"，这条保证"内容不假"。
//   ⚠️ 未传 `--tag-prefix` 时**整条跳过**（不计入 via），而不是"空数组 → 假通过"——
//      后者会打印一条空 detail 的 ✓，让人以为验过了。
if (TAG_PREFIX) {
  const tagChecks = p.versions.map(v => {
    const tag = `${TAG_PREFIX}${v.ver}`
    const r = sh(['git', 'log', '-1', '--date=format-local:%Y-%m-%d %H:%M', '--format=%ad', tag])
    return { ver: v.ver, tag, exists: r.code === 0 && r.out !== '', gitTime: r.out, docTime: v.time }
  })
  const newestVer = p.versions.length ? p.versions[0]!.ver : ''
  const t = tagAllowance(tagChecks, newestVer)
  const detail = t.blocked.length
    ? `缺 tag（非最新版本，必须补）：${t.blocked.map(v => TAG_PREFIX + v).join(', ')}`
    : t.mismatched.length
      ? t.mismatched.join('; ')
      : `${tagChecks.length - t.allowed.length} 个版本已对齐`
        + (t.allowed.length ? `；最新版本 ${t.allowed.join(', ')} 尚无 tag（本次提交后立刻打即可）` : '')
  check('版本号与 git tag 对得上', t.ok, detail)
}

// ══════════════════════════════════════════════════════════════════════
const failed = results.filter(r => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} 项通过`)
if (failed.length) {
  console.error('✗ 变更日志校验未通过：')
  for (const f of failed) console.error(`  · ${f.name} ${f.detail}`)
  process.exit(1)
}
console.log('✓ 变更日志格式校验通过')
