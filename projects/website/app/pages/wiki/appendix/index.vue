<script setup lang="ts">
import nav from '~/assets/wiki-nav.json'

useHead({ title: '附录卷 · 明日档案' })
</script>

<template>
  <div class="wrap wiki-layout">
    <WikiSidebar />

    <div class="article">
      <nav class="crumbs">
        <NuxtLink to="/wiki">Wiki</NuxtLink><span>/</span>附录卷
      </nav>

      <header class="article__head">
        <div class="article__meta">{{ nav.appendix.length }} 卷</div>
        <h1 class="article__title">附录卷</h1>
        <p class="article__sub">
          主卷之外的主题调研卷：每卷结构同构（对读篇、定义与谱系、历史年表、美学与视觉、批评与争议、中文语境、资料库）。
        </p>
      </header>

      <div class="grid grid--3">
        <NuxtLink v-for="a in nav.appendix" :key="a.slug" :to="a.route" class="card">
          <h3 class="card__title">{{ a.title }}</h3>
          <p class="card__desc">{{ a.items.length }} 篇</p>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
