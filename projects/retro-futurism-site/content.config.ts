import { defineContentConfig, defineCollection, z } from '@nuxt/content'

/**
 * 内容集合定义。
 *
 * - `wiki`：正文由 `tools/sync-content.ts` 从 doc/ 单向生成，
 *   frontmatter 字段即该脚本写入的字段（见 docs/03_信息架构与内容模型.md §3.1）。
 * - `blog`：**手写**（Nuxt Content 原生用法），是新写作，与 doc/ 无关（见 §3.2）。
 * - `gallery`：画廊条目，由 `content/gallery/*.md` 的 frontmatter 描述（见 §3.3）。
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

    blog: defineCollection({
      type: 'page',
      source: 'blog/**/*.md',
      schema: z.object({
        title: z.string(),
        description: z.string().optional(),
        date: z.string(),
        tags: z.array(z.string()).default([]),
        cover: z.string().optional(),
        author: z.string().optional(),
        draft: z.boolean().default(false),
      }),
    }),

    gallery: defineCollection({
      type: 'data',
      source: 'gallery/**/*.md',
      schema: z.object({
        title: z.string(),
        album: z.string(),
        albumTitle: z.string().optional(),
        media: z.enum(['image', 'video', 'svg', 'pdf']).default('image'),
        src: z.string(),
        thumb: z.string().optional(),
        era: z.string().optional(),
        tags: z.array(z.string()).default([]),
        credit: z.string(),
        note: z.string().optional(),
        order: z.number().default(0),
      }),
    }),
  },
})
