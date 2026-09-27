import { defineContentConfig, defineCollection, z } from '@nuxt/content'

/**
 * 内容集合定义。
 *
 * `wiki` 集合的正文由 `tools/sync-content.ts` 从 doc/ 单向生成，
 * frontmatter 字段即该脚本写入的字段（见 docs/03_信息架构与内容模型.md §3.1）。
 */
export default defineContentConfig({
  collections: {
    wiki: defineCollection({
      type: 'page',
      source: 'wiki/**/*.md',
      schema: z.object({
        title: z.string(),
        subtitle: z.string().optional(),
        volume: z.enum(['main', 'punks', 'appendix']),
        series: z.string().optional(),
        order: z.number(),
        route: z.string(),
        tags: z.array(z.string()).default([]),
        description: z.string().optional(),
      }),
    }),
  },
})
