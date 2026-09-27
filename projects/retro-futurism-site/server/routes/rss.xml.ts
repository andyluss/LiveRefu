/**
 * RSS 2.0 订阅源：`/rss.xml`
 *
 * 手写而非引入 `@nuxtjs/seo`：本站只需要「博客 + Wiki 更新」这一条 feed，
 * 一个路由即可，符合 D5「零外部服务/最小依赖」的取向。
 *
 * 注意：服务端查询必须用 `@nuxt/content/server` 的 `queryCollection(event, name)`
 * ——客户端版本不接收 event，在路由里会因拿不到请求上下文而 500。
 */

import { queryCollection } from '@nuxt/content/server'

const SITE = 'https://retro-futurism.example' // M3 部署时替换为真实域名
const TITLE = '明日档案 · 复古未来主义'
const DESC = '复古未来主义知识库与社区：Wiki 论文全集、朋克谱系专卷、多媒体画廊与博客。'

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export default defineEventHandler(async (event) => {
  const [posts, wiki] = await Promise.all([
    queryCollection(event, 'blog').where('draft', '=', false).order('date', 'DESC').limit(30).all(),
    queryCollection(event, 'wiki').order('order', 'DESC').limit(30).all(),
  ])

  type Feed = { title: string; link: string; desc: string; date: string }
  const items: Feed[] = []

  for (const p of posts) {
    items.push({
      title: p.title,
      link: `${SITE}${p.path}`,
      desc: p.description ?? '',
      date: new Date(p.date).toUTCString(),
    })
  }
  for (const w of wiki) {
    items.push({
      title: w.title,
      link: `${SITE}${w.route}`,
      desc: w.description ?? '',
      date: new Date().toUTCString(),
    })
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${esc(TITLE)}</title>
    <link>${SITE}</link>
    <description>${esc(DESC)}</description>
    <language>zh-CN</language>
    <atom:link href="${SITE}/rss.xml" rel="self" type="application/rss+xml" />
${items
  .map(
    i => `    <item>
      <title>${esc(i.title)}</title>
      <link>${esc(i.link)}</link>
      <guid isPermaLink="true">${esc(i.link)}</guid>
      <description>${esc(i.desc)}</description>
      <pubDate>${i.date}</pubDate>
    </item>`,
  )
  .join('\n')}
  </channel>
</rss>
`

  setHeader(event, 'Content-Type', 'application/rss+xml; charset=utf-8')
  setHeader(event, 'Cache-Control', 'public, max-age=3600')
  return xml
})
