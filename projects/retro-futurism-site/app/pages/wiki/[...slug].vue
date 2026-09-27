<script setup lang="ts">
import nav from '~/assets/wiki-nav.json'
import backrefs from '~/assets/wiki-backrefs.json'

const route = useRoute()
const slug = computed(() => {
  const s = route.params.slug
  return Array.isArray(s) ? s : [s as string]
})

const path = computed(() => `/wiki/${slug.value.join('/')}`)

/**
 * 卷索引路由（如 /wiki/punks/atompunk、/wiki/appendix/solarpunk）：
 * 这类路径不是"某一篇"，而是"某一卷的目录页"，由 VolumeIndex 渲染。
 */
const volumeIndex = computed(() => {
  const [kind, seriesSlug] = slug.value
  if (slug.value.length !== 2) return null
  if (kind === 'punks' || kind === 'appendix') return { kind, slug: seriesSlug! } as const
  return null
})

const { data: doc } = await useAsyncData(
  () => `wiki:${path.value}`,
  () => (volumeIndex.value ? Promise.resolve(null) : queryCollection('wiki').where('route', '=', path.value).first()),
  { watch: [path] },
)

if (!volumeIndex.value && !doc.value) {
  throw createError({ statusCode: 404, statusMessage: '未找到该篇目', fatal: true })
}

useHead(() => ({
  title: `${doc.value?.title ?? 'Wiki'} · 明日档案`,
  meta: doc.value?.description ? [{ name: 'description', content: doc.value.description }] : [],
}))

/** 本篇的反向链接（谁引用了我） */
const myRefs = computed(() => (backrefs as Record<string, Array<{ text: string; route: string }>>)[path.value] ?? [])

/** 上下篇：在所属分卷的导航序列里找相邻项 */
const siblings = computed(() => {
  const d = doc.value
  if (!d) return [] as Array<{ text: string; route: string }>
  if (d.volume === 'main') return nav.main.flatMap(g => g.items)
  if (d.volume === 'punks') return nav.punks.find(p => p.slug === d.series)?.items ?? []
  return nav.appendix.find(a => a.slug === d.series)?.items ?? []
})

const idx = computed(() => siblings.value.findIndex(i => i.route === path.value))
const prev = computed(() => (idx.value > 0 ? siblings.value[idx.value - 1] : null))
const next = computed(() => (idx.value >= 0 && idx.value < siblings.value.length - 1 ? siblings.value[idx.value + 1] : null))

const crumbs = computed(() => {
  const d = doc.value
  if (!d) return []
  if (d.volume === 'main') return [{ label: 'Wiki', to: '/wiki' }, { label: '主卷', to: '/wiki/main' }]
  if (d.volume === 'punks') {
    const p = nav.punks.find(x => x.slug === d.series)
    return [{ label: 'Wiki', to: '/wiki' }, { label: '朋克五卷', to: '/wiki/punks' }, { label: p?.title ?? '', to: p?.route ?? '/wiki/punks' }]
  }
  const a = nav.appendix.find(x => x.slug === d.series)
  return [{ label: 'Wiki', to: '/wiki' }, { label: '附录卷', to: '/wiki' }, { label: a?.title ?? '', to: a?.route ?? '/wiki' }]
})
</script>

<template>
  <WikiVolumeIndex v-if="volumeIndex" :kind="volumeIndex.kind" :slug="volumeIndex.slug" />

  <div v-else class="wrap wiki-layout wiki-layout--with-toc">
    <WikiSidebar />

    <article v-if="doc" class="article">
      <nav class="crumbs">
        <template v-for="(c, i) in crumbs" :key="c.to">
          <span v-if="i > 0">/</span>
          <NuxtLink :to="c.to">{{ c.label }}</NuxtLink>
        </template>
      </nav>

      <header class="article__head">
        <div class="article__meta">{{ doc.volume === 'main' ? '主卷' : doc.volume === 'punks' ? '朋克卷' : '附录卷' }}</div>
        <h1 class="article__title">{{ doc.title }}</h1>
        <p v-if="doc.subtitle" class="article__sub">{{ doc.subtitle }}</p>
        <div v-if="doc.tags?.length" class="article__tags">
          <span v-for="t in doc.tags" :key="t" class="tag">{{ t }}</span>
        </div>
      </header>

      <div class="prose">
        <ContentRenderer :value="doc" />
      </div>

      <nav v-if="prev || next" class="pager">
        <NuxtLink v-if="prev" :to="prev.route">
          <span class="pager__dir">← 上一篇</span>
          <span class="pager__title">{{ prev.text }}</span>
        </NuxtLink>
        <span v-else />
        <NuxtLink v-if="next" :to="next.route" class="next">
          <span class="pager__dir">下一篇 →</span>
          <span class="pager__title">{{ next.text }}</span>
        </NuxtLink>
      </nav>

      <section v-if="myRefs.length" class="backrefs">
        <div class="section__title">被引用于（{{ myRefs.length }}）</div>
        <ul class="backrefs__list">
          <li v-for="r in myRefs" :key="r.route">
            <NuxtLink :to="r.route">{{ r.text }}</NuxtLink>
          </li>
        </ul>
      </section>
    </article>

    <aside class="toc">
      <div class="sidebar__label">本篇目录</div>
      <ul v-if="doc?.body?.toc?.links?.length" class="toc__list">
        <li v-for="l in doc.body.toc.links" :key="l.id">
          <a :href="`#${l.id}`">{{ l.text }}</a>
          <ul v-if="l.children?.length" class="toc__list">
            <li v-for="c in l.children" :key="c.id" class="depth-3">
              <a :href="`#${c.id}`">{{ c.text }}</a>
            </li>
          </ul>
        </li>
      </ul>
      <p v-else class="card__desc">（本篇无小节标题）</p>
    </aside>
  </div>
</template>
