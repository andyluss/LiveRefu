<script setup lang="ts">
import nav from '~/assets/wiki-nav.json'

const counts = {
  main: nav.main.reduce((n, g) => n + g.items.length, 0),
  punks: nav.punks.reduce((n, p) => n + p.items.length, 0),
  appendix: nav.appendix.reduce((n, a) => n + a.items.length, 0),
}
const total = counts.main + counts.punks + counts.appendix

const sections = [
  { to: '/wiki', title: 'Wiki 知识库', desc: `论文集与朋克谱系专卷，共 ${total} 篇。交叉引用已全部可点击。` },
  { to: '/blog', title: '博客', desc: '编辑部写作与考据随笔。（M1 建设中）' },
  { to: '/gallery', title: '多媒体画廊', desc: '卡面、地图、单位设定与风格图的图集浏览。（M1 建设中）' },
  { to: '/forum', title: '论坛', desc: '读者讨论区。（M2 建设中）' },
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
  </div>
</template>
