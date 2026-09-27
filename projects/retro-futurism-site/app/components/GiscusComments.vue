<script setup lang="ts">
/**
 * Giscus 评论/讨论组件（D4 论坛「两段式」的第一段）。
 *
 * 为什么用 Giscus（而不是一上来自建论坛）：见 docs/00_决策记录.md D4 ——
 * 半小时接入、零运维、零反垃圾，先把"能讨论"的即时价值拿到手；
 * 同时按 D5 的 Bundle A 把 SQLite 数据层预留好，讨论量起来后切自建。
 *
 * **未配置时不报错**：把需要你在 GitHub 侧准备的东西写成一份可执行的说明，
 * 站点在未配置状态下依然完整可用。
 */

const props = defineProps<{
  /** 讨论标题（用于 Giscus 的 term） */
  term: string
  /** 讨论分类；缺省用配置里的 category */
  category?: string
}>()

const config = useRuntimeConfig().public.giscus

const configured = computed(
  () => Boolean(config.repo && config.repoId && (props.category || config.category) && config.categoryId),
)

/**
 * 挂载点 id 必须**在服务端与客户端一致**。
 *
 * ⚠️ 踩过的坑：最初用 `Math.random()` 生成 id，导致 SSR 渲染出的 id 与客户端
 * hydration 时算出的 id 不同，`getElementById` 找不到元素，脚本静默不注入
 * ——页面看起来正常（挂载点还在），但讨论区永远空白。
 * 改用 `useId()`（Nuxt 提供的、SSR/CSR 一致的稳定 id）。
 */
const containerId = `giscus-${useId()}`

/** 主题：跟随本站暗色基调（Giscus 内置 dark 系列里最接近的） */
const GISCUS_THEME = 'dark_dimmed'

onMounted(() => {
  if (!configured.value) return
  const el = document.getElementById(containerId)
  if (!el || el.querySelector('script')) return

  const s = document.createElement('script')
  s.src = 'https://giscus.app/client.js'
  s.async = true
  s.crossOrigin = 'anonymous'
  s.setAttribute('data-repo', String(config.repo))
  s.setAttribute('data-repo-id', String(config.repoId))
  s.setAttribute('data-category', String(props.category || config.category))
  s.setAttribute('data-category-id', String(config.categoryId))
  s.setAttribute('data-mapping', 'specific')
  s.setAttribute('data-term', props.term)
  s.setAttribute('data-reactions-enabled', '1')
  s.setAttribute('data-emit-metadata', '0')
  s.setAttribute('data-input-position', 'top')
  s.setAttribute('data-theme', GISCUS_THEME)
  s.setAttribute('data-lang', 'zh-CN')
  s.setAttribute('data-loading', 'lazy')
  el.appendChild(s)
})

/** 配置说明（未配置时展示） */
const setupSteps = [
  '在 GitHub 建一个**公开**仓库（或用一个已有仓库）',
  '打开该仓库的 Settings → General → Features，勾选 **Discussions**',
  '访问 giscus.app，安装 **giscus App** 到该仓库',
  '在 giscus.app 页面填仓库名，选择 Discussion 分类（建议新建一个「Announcements」类），页面会给出 `data-repo-id` 与 `data-category-id`',
  '把四个值配到环境变量：`NUXT_PUBLIC_GISCUS_REPO`、`NUXT_PUBLIC_GISCUS_REPO_ID`、`NUXT_PUBLIC_GISCUS_CATEGORY`、`NUXT_PUBLIC_GISCUS_CATEGORY_ID`',
]
</script>

<template>
  <section class="comments">
    <div class="section__head">
      <h2 class="section__title">讨论</h2>
    </div>

    <template v-if="configured">
      <p class="comments__hint">
        讨论由 <a href="https://giscus.app" target="_blank" rel="noopener">Giscus</a> 驱动，
        内容存放于 GitHub Discussions（需 GitHub 账号登录后发言）。
      </p>
      <div :id="containerId" class="comments__mount" />
    </template>

    <div v-else class="comments__setup">
      <p class="comments__setup-title">⚠ 讨论区尚未接入（Giscus 未配置）</p>
      <p class="comments__hint">
        这是 <strong>M2</strong> 的当前状态：代码已就绪，但 Giscus 需要你在 GitHub 侧先准备好
        仓库与 Discussions。填好环境变量后本区块会自动生效，无需改代码。
      </p>
      <ol class="comments__steps">
        <li v-for="(s, i) in setupSteps" :key="i">{{ s }}</li>
      </ol>
      <p class="comments__hint">
        取舍说明见 <code>docs/00_决策记录.md</code> D4（先 Giscus 后自建）与
        <code>docs/07_实现记录_M2.md</code>。
      </p>
    </div>
  </section>
</template>

<style scoped>
.comments { margin-top: 3rem; }
.comments__hint { color: var(--text-faint); font-size: 0.84rem; line-height: 1.7; }
.comments__mount { margin-top: 0.6rem; }
.comments__setup {
  border: 1px dashed var(--line);
  border-radius: var(--radius);
  background: var(--bg-elev);
  padding: 1rem 1.2rem;
}
.comments__setup-title { color: var(--amber); font-weight: 600; margin: 0 0 0.5rem; font-size: 0.95rem; }
.comments__steps {
  color: var(--text-dim);
  font-size: 0.84rem;
  line-height: 1.9;
  padding-left: 1.3rem;
  margin: 0.6rem 0;
}
.comments__steps li { margin-bottom: 0.2rem; }
</style>
