/**
 * 结构化数据（JSON-LD）注入。
 *
 * 为什么需要：Wiki 篇目是长篇学术性文章，博客是时效性文章，
 * 两者用不同的 schema.org 类型标注能让搜索引擎正确理解内容层级与作者/发布时间。
 * 站点侧只做最必要的字段（不做 FAQ/BreadcrumbList 等花活，避免维护负担）。
 */

const SITE_NAME = '明日档案'
const SITE_URL = 'https://retro-futurism.example' // M3 部署时替换为真实域名

type Kind = 'article' | 'blog'

export function useStructuredData(input: {
  kind: Kind
  title: string
  description?: string
  path: string
  datePublished?: string
  dateModified?: string
  section?: string
  keywords?: string[]
  author?: string
}) {
  const json = computed(() => {
    const base = {
      '@context': 'https://schema.org',
      '@type': input.kind === 'blog' ? 'BlogPosting' : 'ScholarlyArticle',
      headline: input.title,
      name: input.title,
      url: `${SITE_URL}${input.path}`,
      inLanguage: 'zh-CN',
      isPartOf: {
        '@type': 'WebSite',
        name: SITE_NAME,
        url: SITE_URL,
      },
      publisher: { '@type': 'Organization', name: SITE_NAME },
    }
    const extra: Record<string, unknown> = {}
    if (input.description) extra.description = input.description
    if (input.keywords?.length) extra.keywords = input.keywords.join(',')
    if (input.section) extra.articleSection = input.section
    if (input.author) extra.author = { '@type': 'Person', name: input.author }
    if (input.datePublished) extra.datePublished = input.datePublished
    if (input.dateModified) extra.dateModified = input.dateModified
    return { ...base, ...extra }
  })

  useHead(() => ({
    script: [
      {
        type: 'application/ld+json',
        innerHTML: JSON.stringify(json.value),
      },
    ],
  }))
}
