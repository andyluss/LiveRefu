// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2026-09-27',
  devtools: { enabled: true },

  modules: ['@nuxt/content', '@nuxt/image'],

  /**
   * 运行时配置。
   *
   * Giscus（D4 论坛「两段式」的第一段）需要你在 GitHub 上先准备好仓库与 Discussions，
   * 然后把四个值填进环境变量（或在部署平台配置）。**留空时组件会显示配置说明而非报错**，
   * 这样站点在未配置状态下依然完整可用。
   *
   * 详见 docs/07_实现记录_M2.md §一。
   */
  runtimeConfig: {
    public: {
      giscus: {
        repo: process.env.NUXT_PUBLIC_GISCUS_REPO || '',
        repoId: process.env.NUXT_PUBLIC_GISCUS_REPO_ID || '',
        category: process.env.NUXT_PUBLIC_GISCUS_CATEGORY || '',
        categoryId: process.env.NUXT_PUBLIC_GISCUS_CATEGORY_ID || '',
      },
    },
  },

  css: ['~/assets/theme.css'],

  app: {
    head: {
      htmlAttrs: { lang: 'zh-CN' },
      title: '明日档案 · 复古未来主义',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        {
          name: 'description',
          content: '复古未来主义知识库与社区：Wiki 论文全集、朋克谱系专卷、多媒体画廊与博客。',
        },
      ],
    },
  },

  // 内容由 tools/sync-content.ts 从 doc/ 生成；此处只声明构建行为
  content: {
    build: {
      markdown: {
        toc: { depth: 3, searchDepth: 3 },
      },
    },
  },
})
