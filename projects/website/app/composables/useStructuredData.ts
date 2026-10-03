/**
 * OG / Twitter 分享卡片与结构化数据（JSON-LD）。
 *
 * 两条设计决定：
 *  1. **OG 图是动态生成的**（`/og.png`，见 server/og/render.ts），不预生成上千张文件。
 *     129 篇 Wiki + 博客都会得到自己的卡片，而磁盘上不多一个文件。
 *  2. **URL 从请求推导**，不再硬编码域名——早先 `useStructuredData` 里写死了
 *     `https://retro-futurism.example`，一旦换域名、或在本地/预览环境，
 *     生成的 canonical 与 og:url 就是错的。改用 `useRequestURL()`。
 */

const SITE_NAME = '明日档案'

export interface ShareInput {
  title: string
  description?: string
  /** 页面路径（以 / 开头），用于拼绝对地址 */
  path: string
  kind: 'article' | 'blog' | 'page'
  datePublished?: string
  dateModified?: string
  section?: string
  keywords?: string[]
  author?: string
  /** 上方小字（OG 图上的眉标），如「主卷 · 14 磁带篇」 */
  eyebrow?: string
  /** OG 图右下角标注 */
  badge?: string
}

/**
 * 请求的站点根地址。
 * 优先用运行时配置里的 siteUrl（部署时可显式指定、且更稳），
 * 否则从请求头推导（本地开发与预览环境自然就对）。
 */
export function useSiteUrl(): string {
  const cfg = useRuntimeConfig()
  const configured = (cfg.public as { siteUrl?: string }).siteUrl
  if (configured) return String(configured).replace(/\/$/, '')
  try {
    const u = useRequestURL()
    return `${u.protocol}//${u.host}`
  } catch {
    return ''
  }
}

/** 拼出本页的 OG 图地址 */
export function ogImageUrl(input: { title: string; eyebrow?: string; badge?: string; siteUrl: string }): string {
  const params = new URLSearchParams({ title: input.title })
  if (input.eyebrow) params.set('eyebrow', input.eyebrow)
  if (input.badge) params.set('badge', input.badge)
  return `${input.siteUrl}/og.png?${params.toString()}`
}

/**
 * 一次性挂上 OG/Twitter 卡片元信息。
 *
 * 注意：og:image **必须是绝对地址**，社交平台不会解析相对路径——
 * 所以这里依赖 useSiteUrl()，而不是像普通 canonical 那样用相对路径。
 */
export function useShareMeta(input: ShareInput) {
  const siteUrl = useSiteUrl()
  const url = siteUrl ? `${siteUrl}${input.path}` : input.path
  const image = ogImageUrl({ title: input.title, eyebrow: input.eyebrow, badge: input.badge, siteUrl })

  useSeoMeta({
    title: `${input.title} · ${SITE_NAME}`,
    description: input.description,
    ogTitle: input.title,
    ogDescription: input.description,
    ogUrl: url,
    ogSiteName: SITE_NAME,
    ogType: input.kind === 'page' ? 'website' : 'article',
    ogImage: image,
    ogImageWidth: 1200,
    ogImageHeight: 630,
    ogLocale: 'zh_CN',
    twitterCard: 'summary_large_image',
    twitterTitle: input.title,
    twitterDescription: input.description,
    twitterImage: image,
  })

  useHead({
    link: [
      { rel: 'canonical', href: url },
      // RSS 自动发现，便于阅读器/爬虫找到订阅源
      { rel: 'alternate', type: 'application/rss+xml', title: `${SITE_NAME} · RSS`, href: `${siteUrl}/rss.xml` },
    ],
  })

  if (input.kind !== 'page') {
    const jsonld: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': input.kind === 'blog' ? 'BlogPosting' : 'ScholarlyArticle',
      headline: input.title,
      name: input.title,
      url,
      inLanguage: 'zh-CN',
      image,
      isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: siteUrl },
      publisher: { '@type': 'Organization', name: SITE_NAME, url: siteUrl },
    }
    if (input.description) jsonld.description = input.description
    if (input.keywords?.length) jsonld.keywords = input.keywords.join(',')
    if (input.section) jsonld.articleSection = input.section
    if (input.author) jsonld.author = { '@type': 'Person', name: input.author }
    if (input.datePublished) jsonld.datePublished = input.datePublished
    if (input.dateModified) jsonld.dateModified = input.dateModified

    useHead({
      script: [{ type: 'application/ld+json', innerHTML: JSON.stringify(jsonld) }],
    })
  }
}
