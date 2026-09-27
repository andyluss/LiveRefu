/**
 * sitemap.xml：`/sitemap.xml`
 *
 * 覆盖 Wiki 全部篇目 + 博客 + 画廊专辑 + 静态页。
 * 与 RSS 同理，手写一个路由即可，不引入额外依赖。
 */

import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { queryCollection } from '@nuxt/content/server'

const SITE = 'https://retro-futurism.example' // M3 部署时替换为真实域名

export default defineEventHandler(async (event) => {
  const [wiki, posts] = await Promise.all([
    queryCollection(event, 'wiki').order('volume', 'ASC').order('order', 'ASC').all(),
    queryCollection(event, 'blog').where('draft', '=', false).all(),
  ])

  // 画廊专辑列表从生成物读取（与 app/assets/albums.ts 同源）
  const albums: string[] = []
  const albumsFile = join(process.cwd(), 'app/assets/albums.ts')
  if (existsSync(albumsFile)) {
    for (const m of readFileSync(albumsFile, 'utf-8').matchAll(/key: '([^']+)'/g)) {
      albums.push(m[1]!)
    }
  }

  const urls: Array<{ loc: string; changefreq: string; priority: string }> = [
    { loc: '/', changefreq: 'weekly', priority: '1.0' },
    { loc: '/wiki', changefreq: 'weekly', priority: '0.9' },
    { loc: '/wiki/main', changefreq: 'monthly', priority: '0.7' },
    { loc: '/wiki/punks', changefreq: 'monthly', priority: '0.7' },
    { loc: '/wiki/appendix', changefreq: 'monthly', priority: '0.7' },
    { loc: '/blog', changefreq: 'weekly', priority: '0.8' },
    { loc: '/gallery', changefreq: 'monthly', priority: '0.8' },
    { loc: '/search', changefreq: 'yearly', priority: '0.3' },
    { loc: '/about', changefreq: 'yearly', priority: '0.4' },
  ]

  for (const w of wiki) urls.push({ loc: w.route, changefreq: 'monthly', priority: '0.6' })
  for (const p of posts) urls.push({ loc: p.path, changefreq: 'yearly', priority: '0.6' })
  for (const a of albums) urls.push({ loc: `/gallery/${a}`, changefreq: 'monthly', priority: '0.5' })

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(u => `  <url><loc>${SITE}${u.loc}</loc><changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`)
  .join('\n')}
</urlset>
`

  setHeader(event, 'Content-Type', 'application/xml; charset=utf-8')
  setHeader(event, 'Cache-Control', 'public, max-age=3600')
  return xml
})
