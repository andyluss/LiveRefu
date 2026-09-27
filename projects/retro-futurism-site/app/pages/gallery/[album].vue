<script setup lang="ts">
import { ALBUM_META } from '~/assets/albums'

const route = useRoute()
const albumKey = computed(() => String(route.params.album ?? ''))

const meta = computed(() => ALBUM_META.find(m => m.key === albumKey.value) ?? null)

const { data: items } = await useAsyncData(
  () => `gallery:album:${albumKey.value}`,
  () => queryCollection('gallery').where('album', '=', albumKey.value).order('order', 'ASC').all(),
  { watch: [albumKey] },
)

const albumTitle = computed(() => meta.value?.title ?? items.value?.[0]?.albumTitle ?? albumKey.value)

useShareMeta({
  kind: 'page',
  title: `${albumTitle.value} · 画廊`,
  description: meta.value?.note ?? `${items.value?.length ?? 0} 件视觉素材`,
  path: `/gallery/${albumKey.value}`,
  eyebrow: '多媒体画廊',
  badge: `${items.value?.length ?? 0} 件`,
})
</script>

<template>
  <div class="wrap">
    <div class="hero">
      <nav class="crumbs">
        <NuxtLink to="/gallery">画廊</NuxtLink><span>/</span>{{ albumTitle }}
      </nav>
      <div class="hero__kicker">Album</div>
      <h1 class="hero__title">{{ albumTitle }}</h1>
      <p v-if="meta" class="hero__lede">{{ meta.note }}</p>
      <p class="hero__lede">{{ items?.length ?? 0 }} 件 · 点击任意作品放大，键盘 ←→ 切换、ESC 关闭</p>
    </div>

    <section class="section">
      <p v-if="!items?.length" class="card__desc">该专辑暂无素材。</p>
      <GalleryGrid v-else :items="items" />
    </section>

    <section v-if="items?.length" class="section">
      <div class="section__head"><h2 class="section__title">来源与版权</h2></div>
      <p class="card__desc" style="max-width: 74ch">
        {{ items[0]?.credit }}。素材以 SVG 为源、位图为生成物；
        本站只读引用，未做任何修改。许可与署名沿用工作区既有约定。
      </p>
    </section>
  </div>
</template>
