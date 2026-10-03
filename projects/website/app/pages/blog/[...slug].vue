<script setup lang="ts">
const route = useRoute()
const path = computed(() => String(route.path))

const { data: post } = await useAsyncData(
  () => `blog:${path.value}`,
  () => queryCollection('blog').path(path.value).first(),
  { watch: [path] },
)

if (!post.value) {
  throw createError({ statusCode: 404, statusMessage: '未找到这篇文章', fatal: true })
}

if (post.value) {
  useShareMeta({
    kind: 'blog',
    title: post.value.title,
    description: post.value.description,
    path: path.value,
    datePublished: post.value.date,
    dateModified: post.value.date,
    author: post.value.author,
    keywords: post.value.tags,
    eyebrow: '博客',
    badge: post.value.date?.slice(5, 10),
  })
} else {
  useSeoMeta({ title: '博客 · 明日档案' })
}

const fmtDate = (d: string) => d?.slice(0, 10) ?? ''
</script>

<template>
  <div v-if="post" class="wrap blogwrap">
    <nav class="crumbs">
      <NuxtLink to="/blog">博客</NuxtLink>
    </nav>

    <article class="article">
      <header class="article__head">
        <div class="article__meta">
          {{ fmtDate(post.date) }}<template v-if="post.author"> · {{ post.author }}</template>
        </div>
        <h1 class="article__title">{{ post.title }}</h1>
        <p v-if="post.description" class="article__sub">{{ post.description }}</p>
        <div v-if="post.tags?.length" class="article__tags">
          <span v-for="t in post.tags" :key="t" class="tag">{{ t }}</span>
        </div>
      </header>

      <div class="prose">
        <ContentRenderer :value="post" />
      </div>

      <nav class="pager">
        <NuxtLink to="/blog">
          <span class="pager__dir">← 返回</span>
          <span class="pager__title">全部文章</span>
        </NuxtLink>
      </nav>

      <GiscusComments :term="`blog:${path}`" />
    </article>
  </div>
</template>

<style scoped>
.blogwrap { padding: 2rem 0 4rem; }
.article { max-width: 74ch; }
</style>
