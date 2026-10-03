#!/usr/bin/env bun
/**
 * M0 验收：遍历全部 Wiki 篇目，校验
 *   1. 每篇的页面返回 200；
 *   2. 页面里所有站内链接都指向存在的页面（无 404）；
 *   3. 交叉引用确实被改写成了链接（而非遗留纯文本）。
 *
 * 用法：
 *   bun run tools/verify-site.ts --base=http://localhost:3100
 */

const baseArg = process.argv.find(a => a.startsWith('--base='))
const BASE = baseArg ? baseArg.slice('--base='.length) : 'http://localhost:3100'

const nav = JSON.parse(await Bun.file(new URL('../app/assets/wiki-nav.json', import.meta.url)).text())

interface Leaf { text: string; route: string }
const all: Leaf[] = [
  ...nav.main.flatMap((g: { items: Leaf[] }) => g.items),
  ...nav.punks.flatMap((p: { items: Leaf[] }) => p.items),
  ...nav.appendix.flatMap((a: { items: Leaf[] }) => a.items),
]

const indexRoutes: string[] = [
  '/', '/wiki', '/wiki/main', '/wiki/punks', '/wiki/appendix',
  ...nav.punks.map((p: { route: string }) => p.route),
  ...nav.appendix.map((a: { route: string }) => a.route),
  '/blog', '/gallery', '/forum', '/search', '/about',
  '/rss.xml', '/sitemap.xml', '/robots.txt',
]

console.log(`待校验篇目：${all.length} 篇，索引页 ${indexRoutes.length} 个（base=${BASE}）\n`)

/**
 * 扫描生成物 Markdown 里"看起来像篇目引用、却仍是纯文本"的残留。
 *
 * 判定口径（刻意从严，避免误报）：
 *   仅当 `（见 …）` 里出现**两位篇号**且后面还有内容时才计为残留，
 *   因为那几乎必然是 `（见 16 末日篇）` 这类篇目引用漏改。
 * 排除的情况：
 *   - `（见 1.1）` / `（见 2.3）`  —— 文内小节号，保持纯文本是正确行为
 *   - `（见 05）`                —— 单编号无后缀，语义有歧义，故意不链接
 *   - `（见第三节）` `（见下）`    —— 篇内指代
 */
function residualRefs(md: string): string[] {
  const out: string[] = []
  for (const m of md.matchAll(/（见\s*([^）]{0,80}?)）/g)) {
    const inner = m[1]!.trim()
    if (/\]\(/.test(inner)) continue // 已改写成链接
    if (/\d\.\d/.test(inner)) continue // 小节号
    if (/^\d\d\s*$/.test(inner)) continue // 纯编号、无后缀
    if (/^\d\d[^\d]/.test(inner)) out.push(inner) // 两位篇号 + 后缀 → 疑似漏改
  }
  return out
}

async function fetchPage(route: string) {
  try {
    const res = await fetch(`${BASE}${route}`, { redirect: 'manual' })
    const html = res.status === 200 ? await res.text() : ''
    return { status: res.status, html }
  } catch (e) {
    return { status: 0, html: '', error: String(e) }
  }
}

// ---- 1) 逐篇 200 ----
const bad: Array<{ route: string; status: number; error?: string }> = []
const internalLinks = new Set<string>()
let plainRefCount = 0
const pagesWithPlainRefs: string[] = []

const t0 = Date.now()
for (const item of all) {
  const { status, html, error } = await fetchPage(item.route)
  if (status !== 200) bad.push({ route: item.route, status, error })
  if (!html) continue

  // 收集站内链接
  for (const m of html.matchAll(/href="(\/[^"#?]*)"/g)) {
    const href = m[1]!
    if (href.startsWith('/_nuxt/') || href.startsWith('/__') || href.startsWith('/favicon')) continue
    internalLinks.add(href)
  }

  // 残留交叉引用：直接扫描**生成物 Markdown**（权威），而非 HTML。
  // 扫 HTML 会把「已正确改写、但链接文字里含（见 NN）」的标题误判为残留。
  const mdPath = new URL(`../content/wiki${item.route.replace('/wiki', '')}.md`, import.meta.url)
  const file = Bun.file(mdPath)
  if (await file.exists()) {
    const found = residualRefs(await file.text())
    if (found.length) {
      plainRefCount += found.length
      if (pagesWithPlainRefs.length < 10) pagesWithPlainRefs.push(`${item.route}: ${found.join(' / ')}`)
    }
  }
}
const elapsed = ((Date.now() - t0) / 1000).toFixed(1)

// ---- 2) 站内链接可达性 ----
const linkBad: Array<{ href: string; status: number }> = []
for (const href of [...internalLinks].sort()) {
  const { status } = await fetchPage(href)
  if (status !== 200) linkBad.push({ href, status })
}

// ---- 3) 索引页可达 ----
const indexBad: Array<{ route: string; status: number }> = []
for (const r of indexRoutes) {
  const { status } = await fetchPage(r)
  if (status !== 200) indexBad.push({ route: r, status })
}

// ---- 报告 ----
console.log(`篇目 200 检查      : ${all.length - bad.length}/${all.length} OK（耗时 ${elapsed}s）`)
if (bad.length) for (const b of bad.slice(0, 15)) console.log(`  ✗ ${b.status} ${b.route} ${b.error ?? ''}`)

console.log(`索引页 200 检查    : ${indexRoutes.length - indexBad.length}/${indexRoutes.length} OK`)
if (indexBad.length) for (const b of indexBad) console.log(`  ✗ ${b.status} ${b.route}`)

console.log(`站内链接可达性     : ${internalLinks.size - linkBad.length}/${internalLinks.size} OK`)
if (linkBad.length) for (const b of linkBad.slice(0, 20)) console.log(`  ✗ ${b.status} ${b.href}`)

console.log(`未改写的「（见 数字…）」: ${plainRefCount} 处`)
if (pagesWithPlainRefs.length) for (const p of pagesWithPlainRefs) console.log(`  · ${p}`)

const failed = bad.length + linkBad.length + indexBad.length
if (failed) {
  console.error(`\n✗ M0 验收未通过：${failed} 项问题`)
  process.exit(1)
}
console.log('\n✓ M0 验收通过：全部篇目与站内链接均可达')
