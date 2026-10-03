<script setup lang="ts">
import { ALBUM_META } from '~/assets/albums'

useHead({ title: '画廊 · 明日档案' })

const { data: albums } = await useAsyncData('gallery:albums', async () => {
  const items = await queryCollection('gallery').order('album', 'ASC').order('order', 'ASC').all()
  const groups = new Map<string, typeof items>()
  for (const it of items) {
    if (!groups.has(it.album)) groups.set(it.album, [])
    groups.get(it.album)!.push(it)
  }
  // 按 ALBUM_META 顺序输出，未知专辑追加在后
  const known = ALBUM_META.map(m => ({
    ...m,
    cover: groups.get(m.key)?.[0]?.src ?? '',
    count: groups.get(m.key)?.length ?? 0,
  })).filter(a => a.count > 0)
  const extra = [...groups.keys()]
    .filter(k => !ALBUM_META.some(m => m.key === k))
    .map(k => ({
      key: k,
      title: groups.get(k)![0]!.albumTitle || k,
      note: '',
      cover: groups.get(k)![0]!.src,
      count: groups.get(k)!.length,
    }))
  return [...known, ...extra]
})

const total = computed(() => (albums.value ?? []).reduce((n, a) => n + a.count, 0))
</script>

<template>
  <div class="wrap">
    <div class="hero">
      <div class="hero__kicker">Gallery</div>
      <h1 class="hero__title">多媒体画廊</h1>
      <p class="hero__lede">
        来自工作区 <code>doc/refu-game-001/美术/</code> 的视觉素材——卡面、单位设定、战场地图、
        地图动态与两套美学方案。共 {{ total }} 件，按专辑浏览；点开可放大，支持键盘 ←→ 切换。
      </p>
      <p class="hero__lede">
        素材<strong>不复制进站点</strong>：按「<code>doc/</code> 是唯一内容权威」的原则，
        它们经 <code>/media/**</code> 只读暴露，因此站点与原始美术永不漂移。
      </p>
    </div>

    <section class="section">
      <div class="section__head"><h2 class="section__title">专辑</h2></div>
      <div class="grid grid--3">
        <NuxtLink v-for="a in albums" :key="a.key" :to="`/gallery/${a.key}`" class="album">
          <div class="album__cover">
            <img :src="a.cover" :alt="a.title" loading="lazy" decoding="async">
          </div>
          <div class="album__body">
            <h3 class="card__title">{{ a.title }}</h3>
            <p class="card__desc">{{ a.note }}</p>
            <span class="album__count">{{ a.count }} 件</span>
          </div>
        </NuxtLink>
      </div>
    </section>
  </div>
</template>

<style scoped>
.album {
  display: flex;
  flex-direction: column;
  background: var(--bg-elev);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  overflow: hidden;
}
.album:hover { border-color: var(--teal); text-decoration: none; }
.album__cover {
  aspect-ratio: 4 / 3;
  background: #06090d;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.album__cover img { width: 100%; height: 100%; object-fit: cover; }
.album__body { padding: 0.9rem 1rem 1rem; display: flex; flex-direction: column; gap: 0.35rem; }
.album__count {
  margin-top: auto;
  font-family: var(--font-mono);
  font-size: 0.7rem;
  color: var(--teal);
}
</style>
