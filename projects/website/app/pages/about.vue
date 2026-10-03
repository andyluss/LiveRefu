<script setup lang="ts">
import nav from '~/assets/wiki-nav.json'

useHead({ title: '关于 · 明日档案' })

const total = nav.main.reduce((n, g) => n + g.items.length, 0)
  + nav.punks.reduce((n, p) => n + p.items.length, 0)
  + nav.appendix.reduce((n, a) => n + a.items.length, 0)
</script>

<template>
  <div class="wrap">
    <div class="hero">
      <div class="hero__kicker">About</div>
      <h1 class="hero__title">关于《明日档案》</h1>
      <p class="hero__lede">
        一个复古未来主义主题的知识库与社区站点。收录「过去时代所想象的未来」的想象史——
        从远古神话的彼岸，到蒸汽、原子、太空、信息诸纪，再到当代对这些未来的回收与再消费。
      </p>
    </div>

    <section class="section">
      <div class="section__head"><h2 class="section__title">内容从哪来</h2></div>
      <div class="prose">
        <p>
          本站的 Wiki 正文<strong>全部来自工作区 <code>doc/</code> 的既有论文集</strong>，
          共 {{ total }} 篇（主卷 21 + 朋克五卷 45 + 附录七卷 63）。
          博客栏目的文章是编辑部新写作，与 <code>doc/</code> 无关。
        </p>
        <p>
          站点在构建期由一个<strong>内容适配层</strong>把 <code>doc/</code> 单向转换成结构化内容：
          解析篇首的关键词与摘要为元数据、把「（见 16 末日篇）」这类纯文本交叉引用改写成可点击链接、
          再由引用关系生成每篇页脚的「被引用于」区块。
        </p>
        <p>
          <strong><code>doc/</code> 是内容的唯一权威</strong>，站点是它的呈现层。
          转换是单向且幂等的——原始文稿不被改动一个字节。
        </p>
      </div>
    </section>

    <section class="section">
      <div class="section__head"><h2 class="section__title">编辑部</h2></div>
      <div class="prose">
        <p>
          本站由 LiveRefu 工作区维护。《复古未来主义论文集》与各朋克专卷的作者为该工作区编辑部；
          站点本身的架构与实现由编辑部结合 AI 协作完成。
        </p>
        <p>
          引用本站内容时，请以<strong>原始文稿</strong>为准，并注明篇目名称与卷属（如「主卷 14 磁带篇」）。
          各篇正文的写作凡例（术语首现加粗附原文、交叉引用标注方式、事实不确定时按「约/一般认为/存疑」降档）
          见论文集总论 §四。
        </p>
      </div>
    </section>

    <section class="section">
      <div class="section__head"><h2 class="section__title">视觉素材与版权</h2></div>
      <div class="prose">
        <p>
          画廊栏目展示的视觉素材来自工作区 <code>doc/refu-game-001/美术/</code>，
          为关联项目《Refu Game 001 · 节点防线》的美术产出，共 99 件。
          素材以 SVG 为源、位图为生成物；本站<strong>只读引用，不做修改</strong>，
          也不复制进站点目录，而是经 <code>/media/**</code> 路由暴露。
        </p>
        <p>
          每条画廊条目都标注了 <code>credit</code>（来源路径）。如需转载，请一并保留署名与来源路径。
        </p>
      </div>
    </section>

    <section class="section">
      <div class="section__head"><h2 class="section__title">投稿与纠错</h2></div>
      <div class="prose">
        <p>
          论坛栏目（讨论、提问、补充考据）尚在建设中。当前如需指出事实错误或补充资料，
          请直接联系维护者；考据类补充会先并入 <code>doc/</code> 的原始文稿，再自动反映到站点。
        </p>
      </div>
    </section>

    <section class="section">
      <div class="section__head"><h2 class="section__title">技术</h2></div>
      <div class="prose">
        <p>
          Bun 1.4 + Nuxt 4 + Vue 3.5 + Nuxt Content 3。内容为 Markdown 文件式存储并纳入 Git；
          全文检索在浏览器本地完成，不依赖外部搜索服务。站点的存储与同步方案见项目文档的
          〈数据存储与同步方案〉（自托管 SQLite 取向，零外部服务）。
        </p>
      </div>
    </section>
  </div>
</template>
