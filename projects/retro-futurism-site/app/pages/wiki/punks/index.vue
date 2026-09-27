<script setup lang="ts">
import nav from '~/assets/wiki-nav.json'

useHead({ title: '朋克五卷 · 明日档案' })
</script>

<template>
  <div class="wrap wiki-layout">
    <WikiSidebar />

    <div class="article">
      <nav class="crumbs">
        <NuxtLink to="/wiki">Wiki</NuxtLink><span>/</span>朋克五卷
      </nav>

      <header class="article__head">
        <div class="article__meta">5 卷 · 每卷 9 篇</div>
        <h1 class="article__title">朋克五卷</h1>
        <p class="article__sub">
          原子朋克 / 生物朋克 / 赛博朋克 / 柴油朋克 / 蒸汽朋克——每卷结构同构
          （对读篇、定义与谱系、历史年表、美学与视觉、思想政治与批评、作品与媒介、中文语境、批评与争议、资料库）。
        </p>
      </header>

      <div class="grid grid--3">
        <NuxtLink v-for="p in nav.punks" :key="p.slug" :to="p.route" class="card">
          <h3 class="card__title">{{ p.title }}</h3>
          <p class="card__desc">{{ p.items.length }} 篇</p>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
