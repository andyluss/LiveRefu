<script setup lang="ts">
import nav from '~/assets/wiki-nav.json'

const route = useRoute()
const isActive = (r: string) => route.path === r
</script>

<template>
  <aside class="sidebar">
    <div v-for="group in nav.main" :key="group.title" class="sidebar__group">
      <div class="sidebar__label">{{ group.title }}</div>
      <ul class="sidebar__list">
        <li v-for="item in group.items" :key="item.route">
          <NuxtLink :to="item.route" :class="{ active: isActive(item.route) }">
            {{ item.text }}
          </NuxtLink>
        </li>
      </ul>
    </div>

    <div class="sidebar__group">
      <div class="sidebar__label">朋克五卷</div>
      <ul class="sidebar__list">
        <li v-for="p in nav.punks" :key="p.slug">
          <NuxtLink :to="p.route" :class="{ active: isActive(p.route) }">{{ p.title }}</NuxtLink>
        </li>
      </ul>
    </div>

    <div class="sidebar__group">
      <div class="sidebar__label">附录卷</div>
      <ul class="sidebar__list">
        <li v-for="a in nav.appendix" :key="a.slug">
          <NuxtLink :to="a.route" :class="{ active: isActive(a.route) }">{{ a.title }}</NuxtLink>
        </li>
      </ul>
    </div>
  </aside>
</template>
