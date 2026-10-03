<script setup lang="ts">
const { query, results, pending, error, searched, run, searchDebounced } = useSiteSearch()

const open = ref(false)
const inputEl = ref<HTMLInputElement | null>(null)
const activeIndex = ref(0)
const dialogEl = ref<HTMLElement | null>(null)

function openDialog() {
  open.value = true
  activeIndex.value = 0
  nextTick(() => inputEl.value?.focus())
}

function closeDialog() {
  open.value = false
}

async function goto(hit: { id: string }) {
  closeDialog()
  await navigateTo(hit.id)
}

function onInput() {
  activeIndex.value = 0
  searchDebounced(query.value)
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    e.preventDefault()
    closeDialog()
    return
  }
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    activeIndex.value = Math.min(activeIndex.value + 1, results.value.length - 1)
    return
  }
  if (e.key === 'ArrowUp') {
    e.preventDefault()
    activeIndex.value = Math.max(activeIndex.value - 1, 0)
    return
  }
  if (e.key === 'Enter') {
    const hit = results.value[activeIndex.value]
    if (hit) {
      e.preventDefault()
      void goto(hit)
    }
  }
}

/**
 * 简易焦点陷阱：Tab / Shift+Tab 在对话框内循环。
 * 面板里可聚焦元素不多（输入框 + 结果链接），够用且不引入依赖。
 */
function onTabTrap(e: KeyboardEvent) {
  if (e.key !== 'Tab' || !dialogEl.value) return
  const focusables = dialogEl.value.querySelectorAll<HTMLElement>(
    'input, button, a[href], [tabindex]:not([tabindex="-1"])',
  )
  if (focusables.length === 0) return
  const first = focusables[0]!
  const last = focusables[focusables.length - 1]!
  const active = document.activeElement
  if (e.shiftKey && active === first) {
    e.preventDefault()
    last.focus()
  } else if (!e.shiftKey && active === last) {
    e.preventDefault()
    first.focus()
  }
}

function onGlobalKey(e: KeyboardEvent) {
  // ⌘K / Ctrl+K 打开；"/" 也可（未在输入框内时）
  const isK = e.key === 'k' || e.key === 'K'
  if (isK && (e.metaKey || e.ctrlKey)) {
    e.preventDefault()
    open.value ? closeDialog() : openDialog()
    return
  }
  if (e.key === '/' && !open.value) {
    const el = document.activeElement
    const typing = el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || (el as HTMLElement | null)?.isContentEditable
    if (!typing) {
      e.preventDefault()
      openDialog()
    }
  }
}

onMounted(() => {
  window.addEventListener('keydown', onGlobalKey)
  // 支持 /search 直接进入搜索
  if (useRoute().path === '/search') openDialog()
})
onBeforeUnmount(() => window.removeEventListener('keydown', onGlobalKey))

/** 结果里命中词高亮片段（服务端返回 <mark>，仅用于本地内容，安全） */
function snippetHtml(hit: { snippets?: { content?: string }; content: string }) {
  return hit.snippets?.content || hit.content.slice(0, 140)
}

function breadcrumb(hit: { titles: string[]; title: string }) {
  const chain = [...(hit.titles ?? []), hit.title].filter(Boolean)
  return chain.join(' › ')
}
</script>

<template>
  <div>
    <!-- 触发按钮（头部用） -->
    <button class="deco-btn" type="button" title="站内搜索（⌘K）" @click="openDialog">
      搜索 ⌘K
    </button>

    <Teleport to="body">
      <div
        v-if="open"
        class="search-overlay"
        role="dialog"
        aria-modal="true"
        aria-label="站内搜索"
        @click.self="closeDialog"
      >
        <div ref="dialogEl" class="search-panel" @keydown="onKeydown" @keydown.tab="onTabTrap">
          <div class="search-head">
            <input
              ref="inputEl"
              v-model="query"
              class="search-input"
              type="search"
              placeholder="搜索论文、术语、人名…"
              autocomplete="off"
              aria-label="搜索关键词"
              @input="onInput"
            >
            <button class="deco-btn" type="button" @click="closeDialog">ESC</button>
          </div>

          <div class="search-body">
            <p v-if="error" class="search-hint search-hint--err">检索失败：{{ error }}</p>
            <p v-else-if="pending" class="search-hint">检索中…</p>
            <p v-else-if="query.trim() && searched && results.length === 0" class="search-hint">
              没有匹配「{{ query.trim() }}」的内容
            </p>
            <p v-else-if="!query.trim()" class="search-hint">
              输入关键词开始检索 · 支持 ↑↓ 选择、Enter 跳转
            </p>

            <ul v-if="results.length" class="search-list">
              <li v-for="(hit, i) in results" :key="hit.id">
                <a
                  :href="hit.id"
                  class="search-hit"
                  :class="{ active: i === activeIndex }"
                  @click.prevent="goto(hit)"
                  @mouseenter="activeIndex = i"
                >
                  <span class="search-hit__crumb">{{ breadcrumb(hit) }}</span>
                  <span class="search-hit__title" v-html="hit.snippets?.title || hit.title" />
                  <!-- eslint-disable-next-line vue/no-v-html -- 内容为本地 doc/ 生成，非用户输入 -->
                  <span class="search-hit__snippet" v-html="snippetHtml(hit)" />
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.search-overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  background: rgba(4, 8, 13, 0.72);
  backdrop-filter: blur(3px);
  display: flex;
  justify-content: center;
  padding: 8vh 1rem 1rem;
}
.search-panel {
  width: min(720px, 100%);
  max-height: 76vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-elev);
  border: 1px solid var(--teal);
  border-radius: var(--radius);
  box-shadow: 0 18px 60px rgba(0, 0, 0, 0.55);
  overflow: hidden;
}
.search-head {
  display: flex;
  gap: 0.6rem;
  align-items: center;
  padding: 0.7rem 0.8rem;
  border-bottom: 1px solid var(--line);
}
.search-input {
  flex: 1;
  background: var(--bg);
  border: 1px solid var(--line-strong);
  border-radius: var(--radius);
  color: var(--text);
  font-family: var(--font-ui);
  font-size: 1rem;
  padding: 0.55rem 0.7rem;
}
.search-input:focus {
  outline: 2px solid var(--teal);
  outline-offset: 1px;
  border-color: var(--teal);
}
.search-body {
  overflow-y: auto;
  padding: 0.4rem;
}
.search-hint {
  color: var(--text-faint);
  font-size: 0.85rem;
  margin: 0.9rem 0.7rem;
}
.search-hint--err {
  color: var(--rust);
}
.search-list {
  list-style: none;
  margin: 0;
  padding: 0;
}
.search-hit {
  display: block;
  padding: 0.55rem 0.7rem;
  border-radius: var(--radius);
  border-left: 2px solid transparent;
}
.search-hit:hover,
.search-hit.active {
  background: var(--bg-elev-2);
  border-left-color: var(--teal);
  text-decoration: none;
}
.search-hit__crumb {
  display: block;
  font-family: var(--font-mono);
  font-size: 0.66rem;
  letter-spacing: 0.08em;
  color: var(--text-faint);
  margin-bottom: 0.15rem;
}
.search-hit__title {
  display: block;
  color: var(--cream);
  font-size: 0.92rem;
  font-weight: 600;
}
.search-hit__snippet {
  display: block;
  color: var(--text-dim);
  font-size: 0.8rem;
  line-height: 1.6;
  margin-top: 0.15rem;
}
.search-hit__snippet :deep(mark) {
  background: var(--amber);
  color: #1a1206;
  border-radius: 2px;
  padding: 0 0.15em;
}
</style>
