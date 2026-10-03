<script setup lang="ts">
import nav from '~/assets/wiki-nav.json'

useHead({ title: '主卷 · 未来的考古 · 明日档案' })
</script>

<template>
  <div class="wrap wiki-layout">
    <WikiSidebar />

    <div class="article">
      <nav class="crumbs">
        <NuxtLink to="/wiki">Wiki</NuxtLink><span>/</span>主卷
      </nav>

      <header class="article__head">
        <div class="article__meta">21 篇 · 四段结构</div>
        <h1 class="article__title">主卷 · 未来的考古</h1>
        <p class="article__sub">
          《复古未来主义论文集》主卷 00—20：从理论地基出发，按年代发掘「当时的未来」，
          再回收「××朋克」全谱系，最后收束于当代乡愁与多元未来。
        </p>
      </header>

      <section v-for="g in nav.main" :key="g.title" class="section" style="padding-top: 0">
        <div class="section__head"><h2 class="section__title">{{ g.title }}</h2></div>
        <ul class="sidebar__list">
          <li v-for="item in g.items" :key="item.route">
            <NuxtLink :to="item.route">{{ item.text }}</NuxtLink>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>
