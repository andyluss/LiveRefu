<script setup lang="ts">
const { enabled, toggle } = useCrt()

const navLinks = [
  { to: '/wiki', label: 'Wiki' },
  { to: '/blog', label: '博客' },
  { to: '/gallery', label: '画廊' },
  { to: '/forum', label: '论坛' },
]
</script>

<template>
  <div class="site">
    <header class="site-header">
      <div class="wrap site-header__inner">
        <NuxtLink to="/" class="brand">
          明日档案
          <span class="brand__sub">Retro-futurism Archive</span>
        </NuxtLink>

        <nav class="nav">
          <NuxtLink v-for="l in navLinks" :key="l.to" :to="l.to">{{ l.label }}</NuxtLink>
        </nav>

        <button
          class="deco-btn"
          type="button"
          :aria-pressed="enabled"
          title="CRT 扫描线质感（可关闭）"
          @click="toggle"
        >
          CRT {{ enabled ? 'ON' : 'OFF' }}
        </button>
      </div>
    </header>

    <main>
      <slot />
    </main>

    <footer class="site-footer">
      <div class="wrap">
        《明日档案》· 复古未来主义知识库 —— 内容正文以
        <code>doc/</code> 为唯一权威，本站在构建期由
        <code>tools/sync-content.ts</code> 单向生成。
      </div>
    </footer>
  </div>
</template>

<style scoped>
.site { display: flex; flex-direction: column; min-height: 100vh; }
main { flex: 1; }
</style>
