#!/usr/bin/env bun
/**
 * 内容适配层：doc/ → content/wiki/
 *
 * 设计依据见 docs/03_信息架构与内容模型.md §二。
 *
 * 三条实测约束（决定了本脚本存在）：
 *   1. 源文档无 YAML frontmatter（篇首用「> 关键词：」/「> 摘要：」引用块）
 *   2. 交叉引用是纯文本（如「（见 16 末日篇）」），点不动
 *   3. 卷属 / 篇序 / slug 需由路径与文件名推导
 *
 * 原则：**doc/ 是唯一内容权威，本脚本只读不写源文件**（单向、幂等）。
 *
 * 用法：
 *   bun run tools/sync-content.ts            # 生成 content/wiki/
 *   bun run tools/sync-content.ts --check    # 只校验是否最新 + 交叉引用命中率，不写盘
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, rmSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = resolve(HERE, '..')
const WORKSPACE_ROOT = resolve(PROJECT_ROOT, '../..')
const DOC = join(WORKSPACE_ROOT, 'doc')
const OUT = join(PROJECT_ROOT, 'content/wiki')

// ---------------------------------------------------------------------------
// 一、卷与篇目的映射表
// ---------------------------------------------------------------------------

/** 主卷 00—20：篇名（用于链接文字与回退标题） */
const MAIN: Record<number, { name: string; slug: string }> = {
  0: { name: '总论', slug: '00-general-introduction' },
  1: { name: '理论篇', slug: '01-theory-nostalgia' },
  2: { name: '远古篇', slug: '02-ancient-myths' },
  3: { name: '古典篇', slug: '03-classical-utopia' },
  4: { name: '近代篇', slug: '04-early-modern-progress' },
  5: { name: '奠基篇', slug: '05-verne-wells' },
  6: { name: '机器篇', slug: '06-machine-age' },
  7: { name: '战间篇', slug: '07-interwar-dieselpunk' },
  8: { name: '原子篇', slug: '08-atompunk' },
  9: { name: '太空篇', slug: '09-space-age' },
  10: { name: '红旗篇', slug: '10-red-future' },
  11: { name: '中国篇', slug: '11-china-future' },
  12: { name: '谱系篇', slug: '12-punk-genealogy' },
  13: { name: '蒸汽篇', slug: '13-steampunk' },
  14: { name: '磁带篇', slug: '14-tape-futurism' },
  15: { name: '赛博篇', slug: '15-cyberpunk' },
  16: { name: '末日篇', slug: '16-apocalypse' },
  17: { name: '蒸汽波篇', slug: '17-vaporwave' },
  18: { name: '千禧篇', slug: '18-y2k-frutiger-aero' },
  19: { name: '多元篇', slug: '19-multicultural-futures' },
  20: { name: '结语与附录', slug: '20-conclusion-appendix' },
}

/** 主卷「四段」分组（取自论文集 README 的「卷内结构（四段）」表） */
const MAIN_SECTIONS: Array<{ title: string; orders: number[] }> = [
  { title: '理论地基', orders: [0, 1] },
  { title: '未来的考古', orders: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
  { title: '回收的未来', orders: [12, 13, 14, 15, 16] },
  { title: '当代乡愁与多元', orders: [17, 18, 19] },
  { title: '收束', orders: [20] },
]

/** 朋克五卷：目录名 → 显示名 / slug / 源目录 */
const PUNKS: Array<{ dir: string; slug: string; name: string }> = [
  { dir: 'atompunk', slug: 'atompunk', name: '原子朋克' },
  { dir: 'biopunk', slug: 'biopunk', name: '生物朋克' },
  { dir: 'cyberpunk', slug: 'cyberpunk', name: '赛博朋克' },
  { dir: 'dieselpunk', slug: 'dieselpunk', name: '柴油朋克' },
  { dir: 'steampunk', slug: 'steampunk', name: '蒸汽朋克' },
]

/** 附录七卷：源目录名 → slug / 显示名。篇名以数字开头，slug 用 `NN-topic` */
const APPENDICES: Array<{ dir: string; slug: string; name: string; topics: Record<number, string> }> = [
  {
    dir: '附录_千禧美学卷', slug: 'y2k-aesthetics', name: '千禧美学',
    topics: { 0: 'duiduipian', 1: 'overview-definition', 2: 'chronology', 3: 'aesthetic-families', 4: 'mechanics-theory', 5: 'media-archaeology', 6: 'criticism', 7: 'chinese-context', 8: 'resources' },
  },
  {
    dir: '附录_原子朋克卷', slug: 'atompunk-appendix', name: '原子朋克（附录）',
    topics: { 0: 'duiduipian', 1: 'definition-genealogy', 2: 'chronology', 3: 'aesthetics-visual', 4: 'politics-philosophy', 5: 'works-media', 6: 'criticism', 7: 'chinese-context', 8: 'resources' },
  },
  {
    dir: '附录_太阳朋克卷', slug: 'solarpunk', name: '太阳朋克',
    topics: { 0: 'duiduipian', 1: 'definition-genealogy', 2: 'chronology', 3: 'aesthetics-visual', 4: 'politics-philosophy', 5: 'works-media', 6: 'criticism', 7: 'chinese-context', 8: 'resources' },
  },
  {
    dir: '附录_柴油朋克卷', slug: 'dieselpunk-appendix', name: '柴油朋克（附录）',
    topics: { 0: 'duiduipian', 1: 'definition-genealogy', 2: 'chronology', 3: 'aesthetics-visual', 4: 'politics-philosophy', 5: 'works-media', 6: 'criticism', 7: 'chinese-context', 8: 'resources' },
  },
  {
    dir: '附录_生物朋克卷', slug: 'biopunk-appendix', name: '生物朋克（附录）',
    topics: { 0: 'duiduipian', 1: 'definition-genealogy', 2: 'chronology', 3: 'aesthetics-visual', 4: 'politics-philosophy', 5: 'works-media', 6: 'criticism', 7: 'chinese-context', 8: 'resources' },
  },
  {
    dir: '附录_蒸汽朋克卷', slug: 'steampunk-appendix', name: '蒸汽朋克（附录）',
    topics: { 0: 'duiduipian', 1: 'definition-genealogy', 2: 'chronology', 3: 'aesthetics-visual', 4: 'politics-philosophy', 5: 'works-media', 6: 'criticism', 7: 'chinese-context', 8: 'resources' },
  },
  {
    dir: '附录_赛博朋克卷', slug: 'cyberpunk-appendix', name: '赛博朋克（附录）',
    topics: { 0: 'duiduipian', 1: 'definition-genealogy', 2: 'chronology', 3: 'aesthetics-visual', 4: 'politics-philosophy', 5: 'works-media', 6: 'criticism', 7: 'chinese-context', 8: 'resources' },
  },
]

/** 朋克卷内 00—08 的通用篇名与 slug */
const PUNK_TOPICS: Record<number, { name: string; slug: string }> = {
  0: { name: '对读篇', slug: 'duiduipian' },
  1: { name: '定义与谱系', slug: 'definition-genealogy' },
  2: { name: '历史年表', slug: 'chronology' },
  3: { name: '美学与视觉', slug: 'aesthetics-visual' },
  4: { name: '思想政治与批评', slug: 'politics-philosophy' },
  5: { name: '作品与媒介', slug: 'works-media' },
  6: { name: '中文语境', slug: 'chinese-context' },
  7: { name: '批评与争议', slug: 'criticism' },
  8: { name: '资料库', slug: 'resources' },
}

// ---------------------------------------------------------------------------
// 二、解析源文档
// ---------------------------------------------------------------------------

interface Doc {
  /** 稳定标识，如 `main/14` 或 `punks/atompunk/03` 或 `appendix/solarpunk/01` */
  id: string
  volume: 'main' | 'punks' | 'appendix'
  series?: string
  order: number
  title: string
  subtitle?: string
  tags: string[]
  description: string
  /** 站点路由，如 /wiki/main/14-tape-futurism */
  route: string
  /** 链接文字，如「14 磁带篇」 */
  linkText: string
  srcPath: string
  body: string
}

const warnings: string[] = []

/** 解析篇首引用块：`> 副题：…` / `> 关键词：…` / `> 摘要：…` */
function parseHeader(raw: string) {
  const lines = raw.split('\n')
  let title = ''
  const quote: string[] = []
  for (const line of lines) {
    const t = line.trim()
    if (!title && t.startsWith('# ')) { title = t.slice(2).trim(); continue }
    if (t.startsWith('>')) { quote.push(t.replace(/^>\s?/, '')); continue }
    // 引用块结束于首个分隔线 / 标题 / 正文
    if (title && quote.length > 0) break
  }
  let subtitle: string | undefined
  let keywords = ''
  let summary = ''
  for (const q of quote) {
    const mSub = q.match(/^副题[:：]\s*(.+)$/)
    const mKw = q.match(/^关键词[:：]\s*(.+)$/)
    const mSum = q.match(/^摘要[:：]\s*(.+)$/)
    if (mSub) subtitle = mSub[1].trim()
    else if (mKw) keywords = mKw[1].trim()
    else if (mSum) summary = mSum[1].trim()
  }
  return {
    title,
    subtitle,
    tags: keywords ? keywords.split(/[；;]/).map(s => s.trim()).filter(Boolean) : [],
    description: summary,
  }
}

/** 去掉正文开头的 h1 与引用块（已在 frontmatter 中结构化表达） */
function stripHeader(raw: string): string {
  const lines = raw.split('\n')
  let i = 0
  // 跳过 h1 与紧随的引用块，直到遇到 --- 或第一个 ## 标题
  while (i < lines.length) {
    const t = lines[i]!.trim()
    if (t.startsWith('# ') || t.startsWith('>') || t === '' || t === '---') { i++; continue }
    break
  }
  // 若跳过过程中已在正文（遇到 ##），回退到该行
  return lines.slice(i).join('\n').replace(/^\n+/, '')
}

/** 极简 YAML 序列化（只处理字符串/数字/字符串数组，够用且避免引号转义陷阱） */
function yamlString(s: string): string {
  return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

// ---------------------------------------------------------------------------
// 三、建立解析索引（供交叉引用改写用）
// ---------------------------------------------------------------------------

const docs: Doc[] = []

function addMain() {
  for (const order of Object.keys(MAIN).map(Number).sort((a, b) => a - b)) {
    const meta = MAIN[order]!
    const prefix = String(order).padStart(2, '0')
    const dir = join(DOC, 'retro-futurism')
    const file = readdirSync(dir).find(f => f.startsWith(`${prefix}_`) && f.endsWith('.md'))
    if (!file) { warnings.push(`主卷缺文件：${prefix}_*.md`); continue }
    const srcPath = join(dir, file)
    const raw = readFileSync(srcPath, 'utf-8')
    const h = parseHeader(raw)
    docs.push({
      id: `main/${prefix}`,
      volume: 'main',
      order,
      title: h.title || meta.name,
      subtitle: h.subtitle,
      tags: h.tags,
      description: h.description,
      route: `/wiki/main/${meta.slug}`,
      linkText: `${prefix} ${meta.name}`,
      srcPath,
      body: stripHeader(raw),
    })
  }
}

function addPunks() {
  for (const p of PUNKS) {
    const dir = join(DOC, 'punks', p.dir)
    for (const order of Object.keys(PUNK_TOPICS).map(Number).sort((a, b) => a - b)) {
      const prefix = String(order).padStart(2, '0')
      const file = readdirSync(dir).find(f => f.startsWith(`${prefix}_`) && f.endsWith('.md'))
      if (!file) { warnings.push(`朋克卷缺文件：${p.dir}/${prefix}_*.md`); continue }
      const srcPath = join(dir, file)
      const raw = readFileSync(srcPath, 'utf-8')
      const h = parseHeader(raw)
      const topic = PUNK_TOPICS[order]!
      docs.push({
        id: `punks/${p.dir}/${prefix}`,
        volume: 'punks',
        series: p.dir,
        order,
        title: h.title || `${p.name} · ${topic.name}`,
        subtitle: h.subtitle,
        tags: h.tags,
        description: h.description,
        route: `/wiki/punks/${p.slug}/${prefix}-${topic.slug}`,
        linkText: `${prefix} ${topic.name}`,
        srcPath,
        body: stripHeader(raw),
      })
    }
  }
}

function addAppendices() {
  for (const a of APPENDICES) {
    const dir = join(DOC, 'retro-futurism', a.dir)
    if (!existsSync(dir)) { warnings.push(`附录卷缺目录：${a.dir}`); continue }
    for (const order of Object.keys(a.topics).map(Number).sort((n, m) => n - m)) {
      const prefix = String(order).padStart(2, '0')
      const file = readdirSync(dir).find(f => f.startsWith(`${prefix}_`) && f.endsWith('.md'))
      if (!file) { warnings.push(`附录卷缺文件：${a.dir}/${prefix}_*.md`); continue }
      const srcPath = join(dir, file)
      const raw = readFileSync(srcPath, 'utf-8')
      const h = parseHeader(raw)
      const topic = a.topics[order]!
      docs.push({
        id: `appendix/${a.slug}/${prefix}`,
        volume: 'appendix',
        series: a.slug,
        order,
        title: h.title || `${a.name} · ${topic}`,
        subtitle: h.subtitle,
        tags: h.tags,
        description: h.description,
        route: `/wiki/appendix/${a.slug}/${prefix}-${topic}`,
        linkText: `${a.name} ${prefix}`,
        srcPath,
        body: stripHeader(raw),
      })
    }
  }
}

// ---------------------------------------------------------------------------
// 四、交叉引用改写
// ---------------------------------------------------------------------------

const byId = new Map<string, Doc>()

/** 主卷编号 → Doc */
function mainDoc(n: number): Doc | undefined {
  return byId.get(`main/${String(n).padStart(2, '0')}`)
}

/**
 * 去掉 tail 开头与链接文字重复的篇名/卷名。
 * 例：链接文字「16 末日篇」+ tail「末日篇」→ 只剩 tail 中有信息量的部分。
 */
function dedupeTail(tail: string, linkText: string): string {
  let t = tail.trim()
  if (!t) return ''
  // 链接文字里除编号外的部分，如「末日篇」「对读篇」「原子朋克（附录）」
  const label = linkText.replace(/^\d+\s*/, '').trim()
  if (label && t.startsWith(label)) {
    t = t.slice(label.length).trim()
  }
  return t
}

/** 把一段「见 …」的内部描述改写为 Markdown 链接；无法解析则返回 null（保留原文） */
function rewriteRef(inner: string, self: Doc): string | null {
  const s = inner.trim()

  // A) 显式附录卷名：`附录_生物朋克卷`
  const mAppendix = s.match(/^附录_([^\s、]+卷)/)
  if (mAppendix) {
    const a = APPENDICES.find(x => x.dir === mAppendix[1])
    if (a) return `[${a.name}附录卷](${a.route})`
    return null
  }

  // B) 主卷引用：`主卷 08`、`主卷 08、16`、`主卷 12 谱系篇`、`主卷 00 总论 2.4`
  const mMain = s.match(/^主卷\s*([\d、,\s]+)(.*)$/)
  if (mMain) {
    const nums = mMain[1]!.split(/[、,]/).map(x => parseInt(x.trim(), 10)).filter(n => !Number.isNaN(n))
    const links = nums.map(n => {
      const d = mainDoc(n)
      return d ? `[${d.linkText}](${d.route})` : null
    })
    if (links.some(l => l === null)) return null
    const tail = dedupeTail(mMain[2]!, nums.length === 1 ? mainDoc(nums[0]!)!.linkText : '')
    return links.join('、') + (tail ? `（${tail}）` : '')
  }

  // C) 本卷引用：`本卷 03`、`本卷 00 第三节` → 同 series 内
  const mSelf = s.match(/^本卷\s*(\d\d)(.*)$/)
  if (mSelf) {
    const key = `${self.volume}/${self.series}/${mSelf[1]}`
    const d = byId.get(key)
    if (!d) return null
    const tail = dedupeTail(mSelf[2]!, d.linkText)
    return `[${d.linkText}](${d.route})` + (tail ? `（${tail}）` : '')
  }

  // D) 纯编号序列：`16 末日篇`、`05、20`、`01、14`、`02/05 篇`、以及裸编号 `（见 06）`
  //
  // 裸编号一律解析为**主卷**篇目：主卷是全集的枢纽，各分卷（朋克/附录）内的
  // `（见 05）`、`（见 16）` 经抽查均指主卷 05 作品与媒介 / 16 末日篇。
  //
  // 但**不接受以小节号开头**的形态（`（见 1.1）`、`（见 2.3）`）：那指向文内小节而非篇目，
  // 强行解析会把 `（见 1.1）` 当成主卷第 1 篇。注意后缀里的小节号是合法的
  // （`（见 00 总论 2.2 的四元素）` → 链到 00 总论，后缀保留原文）。
  const mNums = s.match(/^(\d[\d、,\/\s]*)(.*)$/)
  if (mNums) {
    const numPart = mNums[1]!
    const tail = mNums[2]!.trim()
    // 以小节号开头（1.1 / 2.3）或范围表述（06—10）一律不转
    if (/^\d+\.\d+/.test(s) || /[—\-]/.test(numPart)) return null
    const nums: number[] = []
    for (const rn of numPart.split(/[、,\/\s]+/).filter(Boolean)) {
      const n = parseInt(rn, 10)
      if (Number.isNaN(n)) return null
      nums.push(n)
    }
    if (nums.length === 0) return null
    const links = nums.map(n => {
      const d = mainDoc(n)
      return d ? `[${d.linkText}](${d.route})` : null
    })
    if (links.some(l => l === null)) return null
    const tailClean = nums.length === 1 ? dedupeTail(tail, mainDoc(nums[0]!)!.linkText) : tail
    return links.join('、') + (tailClean ? ` ${tailClean}` : '')
  }

  return null
}

/** 把 `doc/retro-futurism/NN` 形态的裸引用也转掉 */
function rewriteBarePaths(text: string): { out: string; hits: number } {
  let hits = 0
  const out = text.replace(/doc\/retro-futurism\/(\d\d)/g, (m, nn: string) => {
    const d = mainDoc(parseInt(nn, 10))
    if (!d) return m
    hits++
    return d.route
  })
  return { out, hits }
}

// ---------------------------------------------------------------------------
// 五、生成
// ---------------------------------------------------------------------------

/** 收集「被引用于」反向索引：目标 id → 来源 doc 列表 */
const backrefs = new Map<string, Set<string>>()
function recordBackref(targetId: string, fromId: string) {
  if (targetId === fromId) return
  if (!backrefs.has(targetId)) backrefs.set(targetId, new Set())
  backrefs.get(targetId)!.add(fromId)
}

/**
 * 处理一整篇正文里的所有交叉引用。
 *
 * 源文档里「见」有两种写法，都要转：
 *   1. `（见 16 末日篇）`——括号包裹，最常见；
 *   2. `之定义见 00 总论`、`（图像母本则可上溯《大都会》（1927，见 06 机器篇））`——裸写「见 NN」。
 * 只匹配后接编号/主卷/本卷/附录卷名的形态，因此「见下」「见第三节」「见本文第六节」
 * 这类篇内指代会被安全跳过（保留原文，计入 skipped）。
 */
function processBody(doc: Doc) {
  let convertible = 0, skipped = 0, bareHits = 0
  const skippedSamples: string[] = []

  const makeReplacer = (withParens: boolean) => (whole: string, inner: string) => {
    const rebuilt = rewriteRef(inner, doc)
    if (rebuilt === null) {
      // 只对显式「（见 …）」形态记 skipped，避免把「见下」等噪声也算进分母
      if (withParens) {
        skipped++
        if (skippedSamples.length < 6) skippedSamples.push(inner.trim())
      }
      return whole
    }
    convertible++
    for (const m of rebuilt.matchAll(/\]\((\/wiki\/[^)]+)\)/g)) {
      const target = [...byId.values()].find(d => d.route === m[1])
      if (target) recordBackref(target.id, doc.id)
    }
    return withParens ? `（见 ${rebuilt}）` : `见 ${rebuilt}`
  }

  // 先处理括号形态，再处理裸写形态（顺序重要：避免裸写规则吃掉括号内的内容）
  let out = doc.body.replace(/（见\s*([^）]{0,80}?)）/g, makeReplacer(true))
  out = out.replace(
    /(?<![\u4e00-\u9fff（])见\s+((?:主卷|本卷)\s*\d[\d、,\s]*|附录_[^\s、]+卷|\d[\d、,\s]*(?:[^\s）]+)?)/g,
    (whole, inner: string) => {
      const rebuilt = rewriteRef(inner, doc)
      if (rebuilt === null) return whole
      convertible++
      for (const m of rebuilt.matchAll(/\]\((\/wiki\/[^)]+)\)/g)) {
        const target = [...byId.values()].find(d => d.route === m[1])
        if (target) recordBackref(target.id, doc.id)
      }
      return `见 ${rebuilt}`
    },
  )

  const bare = rewriteBarePaths(out)
  bareHits = bare.hits
  return { rendered: bare.out, convertible, skipped, skippedSamples, bareHits }
}

/**
 * 摘要（篇首「摘要：」）里也会出现交叉引用，如
 *   `…中后段（见 00 总论）。`
 * 它最终会进入页面 meta description，所以同样要改写，否则留下点不动的纯文本。
 */
function rewriteDescription(text: string, self: Doc): string {
  return text.replace(/（见\s*([^）]{0,80}?)）/g, (whole, inner: string) => {
    const rebuilt = rewriteRef(inner, self)
    return rebuilt === null ? whole : `（见 ${rebuilt}）`
  })
}

function frontmatter(d: Doc): string {
  const lines = ['---']
  lines.push(`title: ${yamlString(d.title)}`)
  if (d.subtitle) lines.push(`subtitle: ${yamlString(d.subtitle)}`)
  lines.push(`volume: ${yamlString(d.volume)}`)
  if (d.series) lines.push(`series: ${yamlString(d.series)}`)
  lines.push(`order: ${d.order}`)
  lines.push(`route: ${yamlString(d.route)}`)
  if (d.tags.length) lines.push(`tags: [${d.tags.map(yamlString).join(', ')}]`)
  if (d.description) lines.push(`description: ${yamlString(rewriteDescription(d.description, d))}`)
  lines.push('---')
  return lines.join('\n')
}

function outPath(d: Doc): string {
  const rel = d.route.replace('/wiki/', '')
  return join(OUT, `${rel}.md`)
}

// ---------------------------------------------------------------------------
// 六、导航树
// ---------------------------------------------------------------------------

interface NavLeaf { text: string; route: string }
interface NavGroup { title: string; items: NavLeaf[] }
interface NavTree {
  main: NavGroup[]
  punks: Array<{ title: string; slug: string; route: string; items: NavLeaf[] }>
  appendix: Array<{ title: string; slug: string; route: string; items: NavLeaf[] }>
}

function buildTree(): NavTree {
  const leaf = (d: Doc): NavLeaf => ({ text: d.linkText, route: d.route })

  // 主卷：按 MAIN_SECTIONS 四段分组（分组定义不写死在页面里，只此一处）
  const main: NavGroup[] = MAIN_SECTIONS.map(sec => ({
    title: sec.title,
    items: sec.orders
      .map(o => byId.get(`main/${String(o).padStart(2, '0')}`))
      .filter((d): d is Doc => Boolean(d))
      .map(leaf),
  }))

  const punks = PUNKS.map(p => {
    const items = docs
      .filter(d => d.volume === 'punks' && d.series === p.dir)
      .sort((a, b) => a.order - b.order)
      .map(leaf)
    return { title: p.name, slug: p.slug, route: `/wiki/punks/${p.slug}`, items }
  })

  const appendix = APPENDICES.map(a => {
    const items = docs
      .filter(d => d.volume === 'appendix' && d.series === a.slug)
      .sort((x, y) => x.order - y.order)
      .map(leaf)
    return { title: a.name, slug: a.slug, route: `/wiki/appendix/${a.slug}`, items }
  })

  return { main, punks, appendix }
}

function main() {
  const check = process.argv.includes('--check')

  addMain()
  addPunks()
  addAppendices()
  for (const d of docs) byId.set(d.id, d)

  if (docs.length === 0) {
    console.error('✗ 未解析到任何源文档，请检查 doc/ 路径')
    process.exit(1)
  }

  // 先处理正文（同时收集反链），再写文件（此时 refs 已知）
  // 注意：Doc 自带 body 字段，展开时必须显式重组，否则会覆盖引用
  const processed = docs.map((doc) => {
    const r = processBody(doc)
    return { doc, rendered: r.rendered, convertible: r.convertible, skipped: r.skipped, skippedSamples: r.skippedSamples, bareHits: r.bareHits }
  })

  let totalConv = 0, totalSkip = 0, totalBare = 0
  for (const p of processed) { totalConv += p.convertible; totalSkip += p.skipped; totalBare += p.bareHits }

  // 生成文件（先清空输出目录，避免方案变更后留下孤儿文件）
  const written: string[] = []
  if (!check) {
    rmSync(OUT, { recursive: true, force: true })
  }
  for (const p of processed) {
    const content = `${frontmatter(p.doc)}\n\n${p.rendered.trim()}\n`
    const target = outPath(p.doc)
    if (check) {
      if (!existsSync(target) || readFileSync(target, 'utf-8') !== content) {
        warnings.push(`内容未同步：${p.doc.route}`)
      }
    } else {
      mkdirSync(dirname(target), { recursive: true })
      writeFileSync(target, content, 'utf-8')
      written.push(target)
    }
  }

  // 报告
  const rate = totalConv + totalSkip > 0 ? (totalConv / (totalConv + totalSkip) * 100) : 100

  // ---- 生成导航树与反链索引（供界面直接 import）----
  const tree = buildTree()
  const refsJson: Record<string, Array<{ text: string; route: string }>> = {}
  for (const [targetId, sources] of backrefs) {
    const target = byId.get(targetId)
    if (!target) continue
    refsJson[target.route] = [...sources]
      .map(id => byId.get(id)!)
      .sort((a, b) => a.route.localeCompare(b.route))
      .map(d => ({ text: d.linkText, route: d.route }))
  }
  for (const file of [
    { path: join(PROJECT_ROOT, 'app/assets/wiki-nav.json'), data: tree },
    { path: join(PROJECT_ROOT, 'app/assets/wiki-backrefs.json'), data: refsJson },
  ]) {
    const json = `${JSON.stringify(file.data, null, 2)}\n`
    if (check) {
      if (!existsSync(file.path) || readFileSync(file.path, 'utf-8') !== json) {
        warnings.push(`索引未同步：${file.path.replace(PROJECT_ROOT + '/', '')}`)
      }
    } else {
      mkdirSync(dirname(file.path), { recursive: true })
      writeFileSync(file.path, json, 'utf-8')
    }
  }

  console.log(`解析源文档      : ${docs.length} 篇`)
  console.log(`  主卷          : ${docs.filter(d => d.volume === 'main').length}`)
  console.log(`  朋克卷        : ${docs.filter(d => d.volume === 'punks').length}`)
  console.log(`  附录卷        : ${docs.filter(d => d.volume === 'appendix').length}`)
  console.log(`交叉引用        : 改写 ${totalConv} 处，保留 ${totalSkip} 处，命中率 ${rate.toFixed(1)}%`)
  console.log(`裸路径引用改写  : ${totalBare} 处`)
  console.log(`反向索引        : ${backrefs.size} 篇被引用`)
  console.log(check ? `校验模式：未写盘（不一致 ${warnings.length} 项）` : `已生成          : ${written.length} 个文件 → content/wiki/`)

  // 保留原样的样本（供人工确认，属预期行为）
  const keepSamples = new Set<string>()
  for (const p of processed) for (const s of p.skippedSamples) keepSamples.add(s)
  if (keepSamples.size) {
    console.log('\n保留原样的交叉引用样本（多为篇内「见第三节」类，属预期）：')
    for (const s of [...keepSamples].slice(0, 8)) console.log(`  · ${s}`)
  }

  if (warnings.length) {
    console.log(`\n⚠ 告警 ${warnings.length} 项：`)
    for (const w of warnings.slice(0, 20)) console.log(`  · ${w}`)
    if (warnings.length > 20) console.log(`  … 另有 ${warnings.length - 20} 项`)
  }

  if (check && warnings.length) process.exit(1)
  console.log('\n✓ 完成')
}

main()
