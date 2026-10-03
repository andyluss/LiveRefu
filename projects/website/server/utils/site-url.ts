import type { H3Event } from 'h3'

/**
 * 解析站点根地址（服务端）。
 *
 * 为什么需要它：RSS 与 sitemap 里的 `<link>`/`<loc>` 以及 `og:image`
 * **必须是绝对地址**（订阅器与社交平台不解析相对路径），所以必须知道站点根。
 *
 * ⚠️ 这里修掉一个真实缺陷：早先 `rss.xml.ts` 与 `sitemap.xml.ts` 各自把
 * 域名**硬编码**成 `https://retro-futurism.example`——一旦部署到真实域名，
 * 生成的 RSS 与 sitemap **全是错的**（指向上线不了的示例域名），
 * 而且错了也不会报错，只有订阅或抓取时才发现。
 * 客户端侧的 `useSiteUrl()`（app/composables/useStructuredData.ts）也踩过同一个坑。
 *
 * 解析优先级：
 *   1. `NUXT_PUBLIC_SITE_URL`（部署时显式配置，最稳，不受反代头影响）
 *   2. 请求头 `x-forwarded-proto` / `x-forwarded-host`（反代后面）
 *   3. 请求的 `host`
 */
export function resolveSiteUrl(event: H3Event): string {
  const configured = process.env.NUXT_PUBLIC_SITE_URL
  if (configured) return configured.replace(/\/$/, '')

  const headers = getRequestHeaders(event)
  const host = headers['x-forwarded-host'] || headers.host
  if (!host) return ''

  const proto = headers['x-forwarded-proto'] || (host.startsWith('localhost') || host.startsWith('127.') ? 'http' : 'https')
  return `${proto}://${host}`
}

/** 拼绝对地址；根地址解析不出来时退化为相对路径（至少不比错误域名更糟） */
export function absoluteUrl(event: H3Event, path: string): string {
  const base = resolveSiteUrl(event)
  return base ? `${base}${path.startsWith('/') ? path : `/${path}`}` : path
}
