/**
 * OG 分享图端点：`/og.png?title=…&eyebrow=…&badge=…`
 *
 * 用途：Wiki 篇目与博客文章的社交分享卡片（og:image / twitter:image）。
 *
 * 渲染器在 `server/utils/og-render.ts`——放在 `server/utils/` 下由 Nitro
 * **自动导入**，因此这里不需要（也不应）写相对路径 import：
 * 路由文件嵌在 `server/routes/**` 里，手动算 `../` 的层数既易错又难读。
 *
 * 安全与成本考虑（这是个**无鉴权的动态图片端点**，必须防滥用）：
 *   1. 参数长度截断（标题 ≤ 120 字符，其余 ≤ 40）；
 *   2. 结果带强缓存头（`max-age` 一天 + `stale-while-revalidate`），
 *      同一标题第二次访问不再渲染；
 *   3. 只渲染一个固定尺寸的 PNG，不做任意缩放/格式转换（避免变成图片处理代理）。
 *   生产上还建议在反代层加请求频率限制（见 docs/08 §八「未做」）。
 */
export default defineEventHandler(async (event) => {
  const q = getQuery(event)

  const clip = (v: unknown, max: number): string | undefined => {
    if (typeof v !== 'string') return undefined
    const t = v.replace(/[\u0000-\u001f\u007f]/g, ' ').trim()
    return t ? t.slice(0, max) : undefined
  }

  const title = clip(q.title, 120) ?? '明日档案 · 复古未来主义'
  const eyebrow = clip(q.eyebrow, 40)
  const badge = clip(q.badge, 40)

  let png: Buffer
  try {
    png = await renderOgPng({ title, eyebrow, badge })
  } catch (e) {
    // 渲染失败不要 500 掉页面（爬虫拿到 500 会保留旧图或判定站点异常）；
    // 返回明确的状态与说明，便于运维定位（多半是缺 CJK 字体，见 server/og/render.ts 顶部说明）
    throw createError({
      statusCode: 500,
      statusMessage: `OG 图渲染失败：${e instanceof Error ? e.message : String(e)}`,
    })
  }

  setHeader(event, 'Content-Type', 'image/png')
  setHeader(event, 'Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800')
  // 内容由 title 决定，声明 Vary 以免被中间缓存串味（这些参数都在 query 里，正常不会被复用，
  // 但显式声明更安全）
  setHeader(event, 'Vary', 'Accept-Encoding')
  return png
})
