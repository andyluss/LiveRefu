<script setup lang="ts">
import type { GalleryItem } from '~/assets/albums'

const props = defineProps<{
  items: GalleryItem[]
  /** 初始打开的下标；null 表示不打开 */
  startIndex?: number | null
}>()

const open = ref(props.startIndex !== null && props.startIndex !== undefined)
const index = ref(props.startIndex ?? 0)
const dialogEl = ref<HTMLElement | null>(null)
const closeBtn = ref<HTMLButtonElement | null>(null)

const current = computed(() => props.items[index.value] ?? null)

function show(i: number) {
  index.value = (i + props.items.length) % props.items.length
}

function next() { show(index.value + 1) }
function prev() { show(index.value - 1) }

function openAt(i: number) {
  index.value = i
  open.value = true
  nextTick(() => closeBtn.value?.focus())
}

function close() {
  open.value = false
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') { e.preventDefault(); close() }
  else if (e.key === 'ArrowRight') { e.preventDefault(); next() }
  else if (e.key === 'ArrowLeft') { e.preventDefault(); prev() }
}

/** 焦点陷阱：Tab 在灯箱内循环 */
function onTabTrap(e: KeyboardEvent) {
  if (e.key !== 'Tab' || !dialogEl.value) return
  const f = dialogEl.value.querySelectorAll<HTMLElement>('button, a[href], [tabindex]:not([tabindex="-1"])')
  if (f.length === 0) return
  const first = f[0]!
  const last = f[f.length - 1]!
  const active = document.activeElement
  if (e.shiftKey && active === first) { e.preventDefault(); last.focus() }
  else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus() }
}

defineExpose({ openAt })

// 打开时锁滚动
watch(open, (v) => {
  if (import.meta.client) document.body.style.overflow = v ? 'hidden' : ''
})
onBeforeUnmount(() => {
  if (import.meta.client) document.body.style.overflow = ''
})
</script>

<template>
  <div>
    <!-- 网格（瀑布流用 CSS columns） -->
    <div class="gal-grid">
      <button
        v-for="(item, i) in items"
        :key="item.src"
        class="gal-cell"
        type="button"
        :aria-label="`放大查看：${item.title}`"
        @click="openAt(i)"
      >
        <img :src="item.thumb || item.src" :alt="item.title" loading="lazy" decoding="async">
        <span class="gal-cell__label">{{ item.title }}</span>
      </button>
    </div>

    <Teleport to="body">
      <div
        v-if="open && current"
        class="lb-overlay"
        role="dialog"
        aria-modal="true"
        :aria-label="`作品查看：${current.title}`"
        @click.self="close"
        @keydown="onKey"
        @keydown.tab="onTabTrap"
      >
        <div ref="dialogEl" class="lb-panel">
          <div class="lb-bar">
            <span class="lb-count">{{ index + 1 }} / {{ items.length }}</span>
            <span class="lb-title">{{ current.title }}</span>
            <button ref="closeBtn" class="deco-btn" type="button" @click="close">关闭 ESC</button>
          </div>

          <div class="lb-stage">
            <button class="lb-nav lb-nav--prev" type="button" aria-label="上一张" @click="prev">‹</button>
            <img class="lb-img" :src="current.src" :alt="current.title">
            <button class="lb-nav lb-nav--next" type="button" aria-label="下一张" @click="next">›</button>
          </div>

          <div class="lb-foot">
            <span class="lb-album">{{ current.albumTitle || current.album }}</span>
            <span v-if="current.credit" class="lb-credit">来源：{{ current.credit }}</span>
            <p v-if="current.note" class="lb-note">{{ current.note }}</p>
            <a class="lb-raw" :href="current.src" target="_blank" rel="noopener">打开原图 ↗</a>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.gal-grid {
  columns: 4 220px;
  column-gap: 0.75rem;
}
.gal-cell {
  display: block;
  width: 100%;
  margin: 0 0 0.75rem;
  padding: 0;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--bg-elev);
  cursor: zoom-in;
  overflow: hidden;
  break-inside: avoid;
  position: relative;
}
.gal-cell:hover { border-color: var(--teal); }
.gal-cell:focus-visible { outline: 2px solid var(--teal); outline-offset: 2px; }
.gal-cell img { display: block; width: 100%; height: auto; }
.gal-cell__label {
  display: block;
  padding: 0.4rem 0.55rem;
  font-size: 0.74rem;
  color: var(--text-dim);
  text-align: left;
  border-top: 1px solid var(--line);
}

.lb-overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  background: rgba(3, 6, 10, 0.93);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2vh 1rem;
}
.lb-panel {
  width: min(1200px, 100%);
  max-height: 96vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-elev);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  overflow: hidden;
}
.lb-bar {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  padding: 0.55rem 0.8rem;
  border-bottom: 1px solid var(--line);
}
.lb-count { font-family: var(--font-mono); font-size: 0.75rem; color: var(--teal); }
.lb-title { color: var(--cream); font-size: 0.92rem; font-weight: 600; flex: 1; }
.lb-stage {
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 0;
  background: #06090d;
}
.lb-img { max-width: 100%; max-height: 72vh; object-fit: contain; display: block; }
.lb-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(18, 26, 38, 0.85);
  border: 1px solid var(--line);
  color: var(--cream);
  font-size: 1.6rem;
  line-height: 1;
  width: 2.4rem;
  height: 3.2rem;
  cursor: pointer;
  border-radius: var(--radius);
}
.lb-nav:hover { border-color: var(--teal); color: var(--teal-bright); }
.lb-nav--prev { left: 0.6rem; }
.lb-nav--next { right: 0.6rem; }
.lb-foot {
  padding: 0.6rem 0.9rem;
  border-top: 1px solid var(--line);
  font-size: 0.78rem;
  color: var(--text-faint);
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem 1rem;
  align-items: baseline;
}
.lb-album { color: var(--teal); font-family: var(--font-mono); font-size: 0.72rem; }
.lb-note { margin: 0; flex-basis: 100%; color: var(--text-dim); }
.lb-raw { margin-left: auto; }
</style>
