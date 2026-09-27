<script setup lang="ts">
import nav from '~/assets/wiki-nav.json'

const counts = {
  main: nav.main.reduce((n, g) => n + g.items.length, 0),
  punks: nav.punks.reduce((n, p) => n + p.items.length, 0),
  appendix: nav.appendix.reduce((n, a) => n + a.items.length, 0),
}
const total = counts.main + counts.punks + counts.appendix

/** 最新博客（最多 3 篇）与画廊专辑（取前 4 个） */
const { data: latestPosts } = await useAsyncData('home:posts', () =>
  queryCollection('blog').where('draft', '=', false).order('date', 'DESC').limit(3).all(),
)
const { data: galleryCount } = await useAsyncData('home:galleryCount', () =>
  queryCollection('gallery').count(),
)

const sections = [
  { to: '/wiki', title: 'Wiki 知识库', desc: `论文集与朋克谱系专卷，共 ${total} 篇。交叉引用已全部可点击。` },
  { to: '/blog', title: '博客', desc: '编辑部写作：站点说明、方法论笔记与考据随笔。' },
  { to: '/gallery', title: '多媒体画廊', desc: `卡面、单位设定、战场地图与美学方案，共 ${galleryCount ?? 0} 件视觉素材。` },
  { to: '/forum', title: '论坛', desc: '读者讨论区。（M2 建设中）' },
  { to: '/search', title: '站内搜索', desc: '跨 Wiki 全文检索，⌘K 唤起。浏览器本地完成，无需外部服务。' },
]
</script>

<template>
  <div class="wrap">
    <section class="hero">
      <div class="hero__kicker">Retro-futurism Archive</div>
      <h1 class="hero__title">把「过去想象的未来」<br>归档、擦亮、再读一遍</h1>
      <p class="hero__lede">
        本站是复古未来主义的知识库与社区：收录从远古神话到千禧互联网美学的未来想象史，
        以及蒸汽/柴油/原子/磁带/赛博诸「朋克」谱系。正文以工作区 <code>doc/</code> 为唯一权威，
        构建期自动生成——所以知识库与原始文稿永不漂移。
      </p>
      <div class="hero__stats">
        <div><span class="stat__num">{{ total }}</span><span class="stat__label">Wiki 篇目</span></div>
        <div><span class="stat__num">21</span><span class="stat__label">主卷 · 七纪分期</span></div>
        <div><span class="stat__num">5</span><span class="stat__label">朋克专卷</span></div>
        <div><span class="stat__num">7</span><span class="stat__label">附录卷</span></div>
      </div>
    </section>

    <section class="section">
      <div class="section__head"><h2 class="section__title">入口</h2></div>
      <div class="grid grid--3">
        <NuxtLink v-for="s in sections" :key="s.to" :to="s.to" class="card">
          <h3 class="card__title">{{ s.title }}</h3>
          <p class="card__desc">{{ s.desc }}</p>
        </NuxtLink>
      </div>
    </section>

    <section class="section">
      <EraTimeline />
    </section>

    <section class="section">
      <div class="section__head"><h2 class="section__title">从哪里读起</h2></div>
      <div class="grid grid--3">
        <NuxtLink to="/wiki/main/00-general-introduction" class="card">
          <h3 class="card__title">00 总论 · 未来的考古学</h3>
          <p class="card__desc">全卷纲领：三层时间模型、七纪分期、四元素与七机制。</p>
        </NuxtLink>
        <NuxtLink to="/wiki/main/12-punk-genealogy" class="card">
          <h3 class="card__title">12 谱系篇 · 朋克宇宙学</h3>
          <p class="card__desc">「××朋克」命名三定律与全系谱地图。</p>
        </NuxtLink>
        <NuxtLink to="/wiki/main/17-vaporwave" class="card">
          <h3 class="card__title">17 蒸汽波篇</h3>
          <p class="card__desc">时代错置的听觉乡愁：蒸汽波与合成波辨析。</p>
        </NuxtLink>
      </div>
    </section>

    <section v-if="latestPosts?.length" class="section">
      <div class="section__head">
        <h2 class="section__title">最新博客</h2>
        <NuxtLink to="/blog" class="eras__src" style="margin-left:auto">全部 →</NuxtLink>
      </div>
      <div class="grid grid--3">
        <NuxtLink v-for="p in latestPosts" :key="p.path" :to="p.path" class="card">
          <h3 class="card__title">{{ p.title }}</h3>
          <p class="card__desc">{{ p.description }}</p>
        </NuxtLink>
      </div>
    </section>
  </div>
</template>
