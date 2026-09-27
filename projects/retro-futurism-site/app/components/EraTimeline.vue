<script setup lang="ts">
import { ERAS } from '~/assets/eras'
import nav from '~/assets/wiki-nav.json'

const props = defineProps<{
  /** 紧凑模式（首页用），不显示每个纪的详细说明 */
  compact?: boolean
}>()

/** 主卷导航里「NN 篇名」的查找表，用于给每个纪挂上对应篇目链接 */
const mainItems = nav.main.flatMap(g => g.items)
const linkForOrder = (order: number) =>
  mainItems.find(i => i.text.startsWith(String(order).padStart(2, '0')))

/**
 * 点击纪元 → 跳到该纪代表篇目的第一页。
 * 这样时间轴不只是装饰，而是真的能导航（见 docs/03 §六「导航本身传达知识体系」）。
 */
const targetFor = (orders: number[]) => {
  for (const o of orders) {
    const found = linkForOrder(o)
    if (found) return found.route
  }
  return '/wiki/main'
}
</script>

<template>
  <section class="eras">
    <div class="section__head">
      <h2 class="section__title">七纪分期 · 按「想象的技术」读未来史</h2>
      <NuxtLink to="/wiki/main/00-general-introduction#_21-七纪分期" class="eras__src">出处 §2.1</NuxtLink>
    </div>

    <ol class="eras__list">
      <li v-for="era in ERAS" :key="era.name" class="era">
        <NuxtLink :to="targetFor(era.orders)" class="era__link">
          <span class="era__period">{{ era.period }}</span>
          <span class="era__name">{{ era.name }}</span>
          <template v-if="!props.compact">
            <span class="era__form">{{ era.form }}</span>
            <span class="era__materials">{{ era.materials }}</span>
          </template>
          <span class="era__orders">
            <span v-for="o in era.orders" :key="o" class="era__order">
              {{ String(o).padStart(2, '0') }}
            </span>
          </span>
        </NuxtLink>
      </li>
    </ol>
  </section>
</template>

<style scoped>
.eras__src {
  margin-left: auto;
  font-family: var(--font-mono);
  font-size: 0.7rem;
  color: var(--text-faint);
}
.eras__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 0.75rem;
}
.era__link {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  height: 100%;
  padding: 0.9rem 1rem;
  background: var(--bg-elev);
  border: 1px solid var(--line-strong);
  border-top: 2px solid var(--teal);
  border-radius: var(--radius);
}
.era__link:hover {
  border-color: var(--teal);
  border-top-color: var(--teal-bright);
  text-decoration: none;
  background: var(--bg-elev-2);
}
.era__period {
  font-family: var(--font-mono);
  font-size: 0.68rem;
  letter-spacing: 0.08em;
  color: var(--text-faint);
}
.era__name {
  color: var(--cream);
  font-weight: 700;
  font-size: 1.02rem;
  letter-spacing: 0.06em;
}
.era__form {
  color: var(--text-dim);
  font-size: 0.8rem;
  line-height: 1.6;
}
.era__materials {
  color: var(--text-faint);
  font-size: 0.74rem;
  line-height: 1.6;
}
.era__orders {
  margin-top: auto;
  padding-top: 0.4rem;
  display: flex;
  gap: 0.3rem;
}
.era__order {
  font-family: var(--font-mono);
  font-size: 0.66rem;
  color: var(--teal);
  border: 1px solid var(--line);
  border-radius: 3px;
  padding: 0 0.3rem;
}
</style>
