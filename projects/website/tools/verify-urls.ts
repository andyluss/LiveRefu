#!/usr/bin/env bun
/**
 * 绝对地址来源验收（M3）。
 *
 * 为什么单独验这个：RSS / sitemap / OG 图里的地址**必须是绝对地址**，
 * 而站点根一旦取错，**页面全都正常、只有订阅与抓取会拿到错的域名**——
 * 这类错误极难在日常点检中发现。
 *
 * 本项目真实踩过：`rss.xml.ts` / `sitemap.xml.ts` / `useStructuredData.ts`
 * 各自把域名硬编码成 `https://retro-futurism.example`。部署到真实域名后，
 * 这三处产出的地址全是错的，而**没有任何报错**。
 *
 * 本脚本的做法：用一个**明显非默认**的站点根启动校验（由编排器传入），
 * 然后断言三处产出都用它——如果代码里还有硬编码，即刻暴露。
 *
 * 用法：
 *   bun run tools/verify-urls.ts --base=http://localhost:3210 --expect=https://example.test
 */

const arg = (name: string, def: string) =>
  process.argv.find(a => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? def

const BASE = arg('base', 'http://localhost:3210')
const EXPECT = arg('expect', '').replace(/\/$/, '')

const results: Array<{ name: string; ok: boolean; detail: string }> = []
const record = (name: string, ok: boolean, detail: string) => {
  results.push({ name, ok, detail })
  console.log(`  ${ok ? '✓' : '✗'} ${name.padEnd(28)} ${detail}`)
}

/** 已知的历史硬编码值——出现即失败 */
const FORBIDDEN = ['retro-futurism.example']

console.log(`绝对地址来源验收（base=${BASE}${EXPECT ? `，期望站点根=${EXPECT}` : '，未指定期望根'}）\n`)

const rss = await fetch(`${BASE}/rss.xml`)
const rssText = await rss.text()
const sm = await fetch(`${BASE}/sitemap.xml`)
const smText = await sm.text()

// ---- 1) RSS ----
record('rss.xml 可达', rss.status === 200, `${rss.status} ${rss.headers.get('content-type') ?? ''}`)
const rssLinks = [...rssText.matchAll(/<link>([^<]+)<\/link>/g)].map(m => m[1]!)
record('rss 含绝对地址', rssLinks.length > 0 && rssLinks.every(l => /^https?:\/\//.test(l)), `${rssLinks.length} 个 link`)

// ---- 2) sitemap ----
record('sitemap.xml 可达', sm.status === 200, `${sm.status} ${sm.headers.get('content-type') ?? ''}`)
const locs = [...smText.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]!)
record('sitemap 含绝对地址', locs.length > 0 && locs.every(l => /^https?:\/\//.test(l)), `${locs.length} 个 loc`)

// ---- 3) OG 图地址（从页面 meta 取） ----
const page = await fetch(`${BASE}/wiki/main/14-tape-futurism`)
const pageText = await page.text()
const ogImage = pageText.match(/<meta property="og:image" content="([^"]+)"/)?.[1] ?? ''
const canonical = pageText.match(/<link rel="canonical" href="([^"]+)"/)?.[1] ?? ''
record('og:image 为绝对地址', /^https?:\/\//.test(ogImage), ogImage.slice(0, 70) || '(缺失)')
record('canonical 为绝对地址', /^https?:\/\//.test(canonical), canonical.slice(0, 70) || '(缺失)')

// ---- 4) 不带历史硬编码域名 ----
for (const bad of FORBIDDEN) {
  const inRss = rssText.includes(bad)
  const inSm = smText.includes(bad)
  const inPage = pageText.includes(bad)
  record(
    `不含硬编码 ${bad}`,
    !inRss && !inSm && !inPage,
    inRss || inSm || inPage
      ? `仍出现于：${[inRss && 'rss', inSm && 'sitemap', inPage && 'page'].filter(Boolean).join(', ')}`
      : 'rss / sitemap / page 均未出现',
  )
}

// ---- 5) 三处地址的站点根一致，且等于期望值 ----
if (EXPECT) {
  const origins = {
    rss: new URL(rssLinks[0] ?? 'http://x').origin,
    sitemap: new URL(locs[0] ?? 'http://x').origin,
    og: /^https?:\/\//.test(ogImage) ? new URL(ogImage).origin : '',
    canonical: /^https?:\/\//.test(canonical) ? new URL(canonical).origin : '',
  }
  for (const [name, origin] of Object.entries(origins)) {
    record(`${name} 站点根等于配置`, origin === EXPECT, `${origin} ${origin === EXPECT ? '' : `≠ ${EXPECT}`}`)
  }
  // 一致性：四处应当同源
  const uniq = new Set(Object.values(origins).filter(Boolean))
  record('四处站点根一致', uniq.size <= 1, [...uniq].join(' / ') || '(空)')
} else {
  console.log('  （未传 --expect，跳过"等于配置"的断言）')
}

const failed = results.filter(r => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} 项通过`)
if (failed.length) {
  console.error('✗ 绝对地址来源验收未通过')
  process.exit(1)
}
console.log('✓ 绝对地址来源验收通过')
