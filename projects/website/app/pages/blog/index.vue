<script setup lang="ts">
useHead({ title: '博客 · 明日档案' })

const { data: posts } = await useAsyncData('blog:list', () =>
  queryCollection('blog')
    .where('draft', '=', false)
    .order('date', 'DESC')
    .all(),
)

const allTags = computed(() => {
  const set = new Set<string>()
  for (const p of posts.value ?? []) for (const t of p.tags ?? []) set.add(t)
  return [...set].sort()
})

const activeTag = ref<string | null>(null)
const filtered = computed(() =>
  activeTag.value
    ? (posts.value ?? []).filter(p => (p.tags ?? []).includes(activeTag.value!))
    : (posts.value ?? []),
)

const fmtDate = (d: string) => d?.slice(0, 10) ?? ''
</script>

<template>
  <div class="wrap">
    <div class="hero">
      <div class="hero__kicker">Blog</div>
      <h1 class="hero__title">博客</h1>
      <p class="hero__lede">
        编辑部写作：站点说明、方法论笔记、以及读论文集时顺手记下的东西。
        与 Wiki 不同，这里是<strong>新写作</strong>，不是 <code>doc/</code> 的呈现。
      </p>
    </div>

    <section class="section">
      <div v-if="allTags.length" class="tagbar">
        <button
          class="tag tag--btn"
          type="button"
          :class="{ 'tag--on': activeTag === null }"
          @click="activeTag = null"
        >
          全部（{{ posts?.length ?? 0 }}）
        </button>
        <button
          v-for="t in allTags"
          :key="t"
          class="tag tag--btn"
          type="button"
          :class="{ 'tag--on': activeTag === t }"
          @click="activeTag = t"
        >
          {{ t }}
        </button>
      </div>

      <p v-if="!filtered.length" class="card__desc">该标签下暂无文章。</p>

      <ul class="postlist">
        <li v-for="p in filtered" :key="p.path">
          <NuxtLink :to="p.path" class="postcard">
            <span class="postcard__date">{{ fmtDate(p.date) }}</span>
            <span class="postcard__title">{{ p.title }}</span>
            <span v-if="p.description" class="postcard__desc">{{ p.description }}</span>
            <span class="postcard__tags">
              <span v-for="t in p.tags" :key="t" class="tag">{{ t }}</span>
            </span>
          </NuxtLink>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.tagbar { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-bottom: 1.4rem; }
.tag--btn { cursor: pointer; background: var(--bg-elev-2); }
.tag--btn:hover { color: var(--teal-bright); border-color: var(--teal); }
.tag--on { color: var(--teal-bright); border-color: var(--teal); }

.postlist { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.8rem; }
.postcard {
  display: grid;
  grid-template-columns: 7rem minmax(0, 1fr);
  gap: 0.3rem 1rem;
  padding: 1rem 1.2rem;
  background: var(--bg-elev);
  border: 1px solid var(--line);
  border-left: 2px solid var(--teal);
  border-radius: var(--radius);
}
.postcard:hover { border-color: var(--teal); background: var(--bg-elev-2); text-decoration: none; }
.postcard__date {
  font-family: var(--font-mono);
  font-size: 0.74rem;
  color: var(--text-faint);
  grid-row: span 2;
  padding-top: 0.15rem;
}
.postcard__title { color: var(--cream); font-weight: 600; font-size: 1.04rem; }
.postcard__desc { color: var(--text-dim); font-size: 0.86rem; line-height: 1.7; grid-column: 2; }
.postcard__tags { grid-column: 2; display: flex; gap: 0.35rem; flex-wrap: wrap; margin-top: 0.3rem; }

@media (max-width: 640px) {
  .postcard { grid-template-columns: 1fr; }
  .postcard__date { grid-row: auto; }
  .postcard__desc, .postcard__tags { grid-column: 1; }
}
</style>
