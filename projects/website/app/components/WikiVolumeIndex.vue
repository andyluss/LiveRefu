<script setup lang="ts">
import nav from '~/assets/wiki-nav.json'

const props = defineProps<{
  kind: 'punks' | 'appendix'
  slug: string
}>()

const series = computed(() => {
  const list = props.kind === 'punks' ? nav.punks : nav.appendix
  return list.find(x => x.slug === props.slug) ?? null
})

if (!series.value) {
  throw createError({ statusCode: 404, statusMessage: '未找到该卷', fatal: true })
}

useHead(() => ({ title: `${series.value?.title ?? '卷'} · 明日档案` }))
</script>

<template>
  <div class="wrap wiki-layout">
    <WikiSidebar />

    <div v-if="series" class="article">
      <nav class="crumbs">
        <NuxtLink to="/wiki">Wiki</NuxtLink><span>/</span>
        <NuxtLink :to="kind === 'punks' ? '/wiki/punks' : '/wiki'">
          {{ kind === 'punks' ? '朋克五卷' : '附录卷' }}
        </NuxtLink>
      </nav>

      <header class="article__head">
        <div class="article__meta">{{ series.items.length }} 篇</div>
        <h1 class="article__title">{{ series.title }}</h1>
        <p class="article__sub">
          {{ kind === 'punks'
            ? '本卷结构：对读篇 · 定义与谱系 · 历史年表 · 美学与视觉 · 思想政治与批评 · 作品与媒介 · 中文语境 · 批评与争议 · 资料库。'
            : '本卷为该主题的独立调研卷，结构与朋克卷同构。' }}
        </p>
      </header>

      <ul class="sidebar__list">
        <li v-for="item in series.items" :key="item.route">
          <NuxtLink :to="item.route">{{ item.text }}</NuxtLink>
        </li>
      </ul>
    </div>
  </div>
</template>
