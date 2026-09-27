<script setup lang="ts">
useHead({ title: '论坛 · 明日档案' })

const config = useRuntimeConfig().public.giscus
const configured = computed(() => Boolean(config.repo && config.repoId && config.category && config.categoryId))

/**
 * D4 的「两段式」路线：先 Giscus 拿到"能讨论"的即时价值，讨论量起来后切自建。
 * 这里把切换的触发条件写清楚，避免"什么时候该换"变成模糊问题。
 */
const stages = computed(() => [
  {
    key: 'A',
    title: '第一阶段 · Giscus（当前）',
    status: configured.value ? '已接入' : '代码就绪 · 待配置',
    done: configured.value,
    points: [
      '半小时接入、零运维、零反垃圾',
      '免账号体系（用 GitHub 账号发言）',
      '代价：外观受限于 iframe、数据存在 GitHub Discussions',
    ],
  },
  {
    key: 'B',
    title: '第二阶段 · 站内自建论坛',
    status: '待触发',
    done: false,
    points: [
      '外观完全可控、数据自有、账号与站点统一',
      '工作量 1.5–2 周：注册登录 + 发帖/回复/分页/权限 + 基础反垃圾',
      '数据层已按 D5 的 Bundle A 预留（自托管 SQLite + Drizzle）',
    ],
  },
])

const triggers = [
  '月新增主题 > 50',
  '出现需要分区/置顶/版主管理的真实需求',
  'Giscus 的外观或数据归属成为明确障碍（含境内可达性）',
]
</script>

<template>
  <div class="wrap">
    <div class="hero">
      <div class="hero__kicker">Forum</div>
      <h1 class="hero__title">论坛</h1>
      <p class="hero__lede">
        读者讨论区。按决策记录 <strong>D4</strong>，本站对该栏目采取<strong>两段式</strong>：
        先用成熟的 Giscus 拿到"能讨论"的即时价值，等讨论量起来再切站内自建。
      </p>
    </div>

    <section class="section">
      <div class="section__head"><h2 class="section__title">两段式路线</h2></div>
      <div class="grid grid--3">
        <div v-for="s in stages" :key="s.key" class="card" :class="{ 'card--on': s.done }">
          <div class="stage__head">
            <h3 class="card__title">{{ s.title }}</h3>
            <span class="stage__status" :class="{ 'stage__status--on': s.done }">{{ s.status }}</span>
          </div>
          <ul class="stage__points">
            <li v-for="p in s.points" :key="p">{{ p }}</li>
          </ul>
        </div>
      </div>
      <p class="note">
        <strong>切换到第二阶段的触发条件</strong>（任一满足即值得评估）：
        {{ triggers.join('；') }}。
      </p>
    </section>

    <section class="section">
      <div class="section__head"><h2 class="section__title">综合讨论区</h2></div>
      <GiscusComments term="forum:general" />
    </section>

    <section class="section">
      <div class="section__head"><h2 class="section__title">为什么现在不做自建论坛</h2></div>
      <div class="prose">
        <p>
          论坛功能深度不是本站卖点，<strong>视觉一致性</strong>才是。
          但一上来就花 1.5–2 周做论坛，会拖垮"把 14 万字内容先变成可读站点"这个主线
          （见 <code>docs/01_项目概述与范围.md</code> 的资产盘点：本站的瓶颈从来不是"写什么"）。
        </p>
        <p>
          两段式让 M1 快速上线、又保留升级路径。同时数据层按 <code>Bundle A</code>
          选型（自托管 SQLite），<strong>不浪费这次选型</strong>——自建论坛所需的表结构
          与存储方案已经定好，等触发条件满足即可动工。
        </p>
        <p class="note">
          <strong>已知风险（需你确认）</strong>：Giscus 依赖 GitHub，
          <strong>境内网络可达性存疑</strong>。若你的读者主要在中国大陆，
          第一阶段的价值会大打折扣，应直接考虑第二阶段的站内自建论坛。
        </p>
      </div>
    </section>
  </div>
</template>

<style scoped>
.card--on { border-color: var(--teal); }
.stage__head { display: flex; align-items: baseline; gap: 0.6rem; flex-wrap: wrap; }
.stage__status {
  margin-left: auto;
  font-family: var(--font-mono);
  font-size: 0.66rem;
  color: var(--text-faint);
  border: 1px solid var(--line);
  border-radius: 999px;
  padding: 0.05rem 0.5rem;
  white-space: nowrap;
}
.stage__status--on { color: var(--teal-bright); border-color: var(--teal); }
.stage__points {
  margin: 0.6rem 0 0;
  padding-left: 1.1rem;
  color: var(--text-dim);
  font-size: 0.83rem;
  line-height: 1.8;
}
.note {
  margin-top: 1rem;
  color: var(--text-faint);
  font-size: 0.84rem;
  line-height: 1.8;
  border-left: 2px solid var(--line);
  padding-left: 0.9rem;
}
</style>
