// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2026-09-27',
  devtools: { enabled: true },

  modules: ['@nuxt/content', '@nuxt/image'],

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
