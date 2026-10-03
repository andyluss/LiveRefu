<script setup lang="ts">
useHead({ title: '搜索 · 明日档案' })
</script>

<template>
  <div class="wrap">
    <div class="hero">
      <div class="hero__kicker">Search</div>
      <h1 class="hero__title">站内搜索</h1>
      <p class="hero__lede">
        搜索覆盖全部 129 篇 Wiki 正文与小节。按
        <kbd>⌘K</kbd>（Windows/Linux 用 <kbd>Ctrl+K</kbd>）在任意页面唤起搜索框；
        也可在非输入状态下直接按 <kbd>/</kbd>。
      </p>
      <p class="hero__lede">
        上方搜索框已自动打开。检索在<strong>浏览器本地</strong>完成（Nuxt Content 内置全文索引），
        不需要任何外部搜索服务。
      </p>
    </div>
  </div>
</template>

<style scoped>
kbd {
  font-family: var(--font-mono);
  font-size: 0.85em;
  background: var(--bg-elev-2);
  border: 1px solid var(--line);
  border-radius: 3px;
  padding: 0.05em 0.4em;
  color: var(--cream);
}
</style>
