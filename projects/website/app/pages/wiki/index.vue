<script setup lang="ts">
import nav from '~/assets/wiki-nav.json'

useHead({ title: 'Wiki · 明日档案' })

const counts = computed(() => ({
  main: nav.main.reduce((n, g) => n + g.items.length, 0),
  punks: nav.punks.reduce((n, p) => n + p.items.length, 0),
  appendix: nav.appendix.reduce((n, a) => n + a.items.length, 0),
}))
</script>

<template>
  <div class="wrap">
    <div class="hero">
      <div class="hero__kicker">Knowledge Base</div>
      <h1 class="hero__title">复古未来主义知识库</h1>
      <p class="hero__lede">
        本站 Wiki 收录工作区已有的复古未来主义论文集与朋克谱系专卷。
        正文以 <code>doc/</code> 为唯一权威，构建期自动生成；篇目之间的「见 …」交叉引用已全部可点击。
      </p>
      <div class="hero__stats">
        <div>
          <span class="stat__num">{{ counts.main }}</span>
          <span class="stat__label">主卷篇目</span>
        </div>
        <div>
          <span class="stat__num">{{ counts.punks }}</span>
          <span class="stat__label">朋克卷篇目</span>
        </div>
        <div>
          <span class="stat__num">{{ counts.appendix }}</span>
          <span class="stat__label">附录卷篇目</span>
        </div>
      </div>
    </div>

    <section class="section">
      <div class="section__head"><h2 class="section__title">主卷 · 未来的考古</h2></div>
      <div class="grid grid--3">
        <NuxtLink v-for="g in nav.main" :key="g.title" to="/wiki/main" class="card">
          <h3 class="card__title">{{ g.title }}</h3>
          <p class="card__desc">{{ g.items.length }} 篇 · {{ g.items.map(i => i.text).join('、') }}</p>
        </NuxtLink>
      </div>
    </section>

    <section class="section">
      <div class="section__head"><h2 class="section__title">朋克五卷</h2></div>
      <div class="grid grid--3">
        <NuxtLink v-for="p in nav.punks" :key="p.slug" :to="p.route" class="card">
          <h3 class="card__title">{{ p.title }}</h3>
          <p class="card__desc">{{ p.items.length }} 篇 · 定义与谱系 / 历史年表 / 美学与视觉 / 批评与争议 …</p>
        </NuxtLink>
      </div>
    </section>

    <section class="section">
      <div class="section__head"><h2 class="section__title">附录卷</h2></div>
      <div class="grid grid--3">
        <NuxtLink v-for="a in nav.appendix" :key="a.slug" :to="a.route" class="card">
          <h3 class="card__title">{{ a.title }}</h3>
          <p class="card__desc">{{ a.items.length }} 篇</p>
        </NuxtLink>
      </div>
    </section>
  </div>
</template>
