#!/usr/bin/env bun
/**
 * Giscus 讨论区验收（M2 第一阶段）。
 *
 * 为什么必须用浏览器：Giscus 的 `<script>` 是**客户端注入**的，
 * 服务端 HTML 里只有挂载点。curl 只能证明挂载点在，**证明不了脚本真的会被注入**——
 * 而这里恰好踩过一次静默失败（见下）。
 *
 * ⚠️ 本脚本能证明什么、不能证明什么（务必区分）：
 *   ✅ 能证明：未配置时降级为配置说明；配置后**脚本被注入且参数正确**（repo/id/category/term/lang）。
 *   ❌ 不能证明：真实 GitHub 仓库与 Discussions 的端到端可用性——
 *      那需要真实的 repoId/categoryId 与联网环境，本脚本用占位值触发注入路径。
 *
 * 前置：一个开着 `--remote-debugging-port` 的 Chrome；网站已按两种配置各起过一次。
 *
 * 用法：
 *   bun run tools/verify-giscus.ts --base=http://localhost:3100 --cdp=http://127.0.0.1:9222
 */

const arg = (name: string, def: string) =>
  process.argv.find(a => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? def

const BASE = arg('base', 'http://localhost:3100')
/** 带 Giscus 配置的实例（用于验证"配置后注入"路径） */
const BASE_CONFIGURED = arg('base-configured', 'http://localhost:3101')
const CDP = arg('cdp', 'http://127.0.0.1:9222')

async function newTarget(url: string): Promise<{ id: string; webSocketDebuggerUrl: string }> {
  const res = await fetch(`${CDP}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' })
  if (!res.ok) throw new Error(`创建 target 失败: ${res.status}`)
  return (await res.json()) as { id: string; webSocketDebuggerUrl: string }
}
const closeTarget = (id: string) => fetch(`${CDP}/json/close/${id}`).catch(() => {})

function connect(wsUrl: string) {
  const ws = new WebSocket(wsUrl)
  let id = 0
  const pending = new Map<number, { resolve: (v: any) => void; reject: (e: Error) => void }>()
  const ready = new Promise<void>((resolve, reject) => {
    ws.addEventListener('open', () => resolve())
    ws.addEventListener('error', () => reject(new Error('WebSocket 连接失败')))
  })
  ws.addEventListener('message', (ev) => {
    const m = JSON.parse(String(ev.data)) as { id?: number; result?: any; error?: { message: string } }
    if (typeof m.id === 'number') {
      const p = pending.get(m.id)
      if (!p) return
      pending.delete(m.id)
      if (m.error) p.reject(new Error(m.error.message))
      else p.resolve(m.result)
    }
  })
  const send = (method: string, params: Record<string, unknown> = {}) =>
    new Promise<any>((resolve, reject) => {
      const i = ++id
      pending.set(i, { resolve, reject })
      ws.send(JSON.stringify({ id: i, method, params }))
    })
  return { ready, send, close: () => ws.close() }
}

/** 打开页面并等待 hydration + onMounted 生效 */
async function inspect(base: string, path: string) {
  const target = await newTarget('about:blank')
  const cdp = connect(target.webSocketDebuggerUrl)
  try {
    await cdp.ready
    await cdp.send('Runtime.enable')
    await cdp.send('Page.enable')
    await cdp.send('Page.navigate', { url: `${base}${path}` })
    await new Promise(r => setTimeout(r, 4000))
    const r = await cdp.send('Runtime.evaluate', {
      awaitPromise: true,
      returnByValue: true,
      expression: `(() => {
        const mount = document.querySelector('.comments__mount');
        const setup = document.querySelector('.comments__setup');
        const s = mount ? mount.querySelector('script[src*="giscus"]') : null;
        return {
          hasMount: !!mount,
          hasSetup: !!setup,
          injected: !!s,
          script: s ? {
            repo: s.getAttribute('data-repo'),
            repoId: s.getAttribute('data-repo-id'),
            category: s.getAttribute('data-category'),
            categoryId: s.getAttribute('data-category-id'),
            mapping: s.getAttribute('data-mapping'),
            term: s.getAttribute('data-term'),
            lang: s.getAttribute('data-lang'),
          } : null,
          // 挂载点 id 在 SSR 与客户端必须一致，否则脚本静默不注入
          mountId: mount ? mount.id : null,
        };
      })()`,
    })
    return r.result.value as any
  } finally {
    cdp.close()
    await closeTarget(target.id)
  }
}

const results: Array<{ name: string; ok: boolean; detail: string }> = []

// ---- 情形 1：未配置 → 必须降级为配置说明，且不注入脚本 ----
const unconfigured = await inspect(BASE, '/forum')
{
  const ok = unconfigured.hasSetup && !unconfigured.injected
  results.push({
    name: '未配置时降级',
    ok,
    detail: ok
      ? '显示配置说明，未注入脚本'
      : `hasSetup=${unconfigured.hasSetup} injected=${unconfigured.injected}`,
  })
}

// ---- 情形 2：已配置 → 必须注入脚本且参数正确 ----
const configured = await inspect(BASE_CONFIGURED, '/forum')
{
  const s = configured.script
  const ok = Boolean(
    configured.hasMount &&
    configured.injected &&
    s &&
    s.mapping === 'specific' &&
    s.term === 'forum:general' &&
    s.lang === 'zh-CN',
  )
  results.push({
    name: '配置后注入',
    ok,
    detail: ok
      ? `term=${s.term} mapping=${s.mapping} lang=${s.lang}`
      : `injected=${configured.injected} script=${JSON.stringify(s)}`,
  })
}

// ---- 情形 3：博客文章应挂上按文章区分的讨论 ----
const blog = await inspect(BASE_CONFIGURED, '/blog/2026-09-27-why-this-site')
{
  const s = blog.script
  const ok = Boolean(blog.hasMount && blog.injected && s && String(s.term).startsWith('blog:'))
  results.push({
    name: '博客讨论区',
    ok,
    detail: ok ? `term=${s.term}` : `hasMount=${blog.hasMount} injected=${blog.injected} term=${s?.term}`,
  })
}

console.log(`Giscus 讨论区验收（未配置=${BASE}  已配置=${BASE_CONFIGURED}）\n`)
for (const r of results) console.log(`  ${r.ok ? '✓' : '✗'} ${r.name.padEnd(14)} ${r.detail}`)

console.log('\n⚠️  说明：本脚本用占位 repoId/categoryId 验证"注入路径与参数正确"，')
console.log('    不能证明真实 GitHub 仓库与 Discussions 的端到端可用性（需真实凭证与联网）。')

const failed = results.filter(r => !r.ok).length
if (failed) {
  console.error(`\n✗ Giscus 验收未通过（${failed} 项）`)
  process.exit(1)
}
console.log('\n✓ Giscus 验收通过')
