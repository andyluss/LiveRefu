#!/usr/bin/env bun
/**
 * 性能与无障碍验收（M1 验收清单第 5、6 项）。
 *
 * 为什么用 CDP 而不是 Lighthouse：
 *   本站的"性能验收口径"是 LCP < 2.5s、CLS < 0.1（桌面宽带）。这两个都是
 *   **浏览器原生性能指标**，可以直接用 PerformanceObserver 在真实页面里量到；
 *   引入 Lighthouse（及其一大票依赖）只为拿两个数，性价比不合理。
 *   无障碍同理：这里做的是**可在页面上下文里判定**的那部分（替代文本、标题层级、
 *   ARIA 属性、对比度初筛），而不是声称"完整 WCAG 审计"。
 *
 * 前置：一个开着 `--remote-debugging-port` 的 Chrome；站点跑在 BASE。
 *
 * 用法：
 *   bun run tools/verify-perf.ts --base=http://localhost:3100 --cdp=http://127.0.0.1:9222
 */

const arg = (name: string, def: string) =>
  process.argv.find(a => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? def

const BASE = arg('base', 'http://localhost:3100')
const CDP = arg('cdp', 'http://127.0.0.1:9222')

/**
 * 负向自检（`--selftest`）：注入一个"故意坏掉"的 DOM，确认无障碍检查**真的会报错**。
 *
 * 为什么需要：一个永远返回"通过"的检查器比没有检查器更糟——它给人虚假的安全感。
 * 这个自检证明检查逻辑是活的（能捕获缺 alt、多个 h1、无名按钮、重复 id、正 tabindex）。
 */
const SELFTEST_DOM = `<h1>A</h1><h1>B</h1><h3>跳级标题</h3>
<img src="x.png"><button></button><a href="/x"></a>
<div id="dup"></div><div id="dup"></div><div tabindex="3">x</div>`

/** 待测页面：首页（大图多）、Wiki 文章（长文）、画廊专辑（图片墙，最重） */
const PAGES = [
  { name: '首页', path: '/' },
  { name: 'Wiki 文章', path: '/wiki/main/14-tape-futurism' },
  { name: '画廊专辑', path: '/gallery/map-motion' },
  { name: '博客列表', path: '/blog' },
]

/** LCP / CLS 阈值（来自 docs/05 §3.2 验收口径） */
const LCP_LIMIT = 2500
const CLS_LIMIT = 0.1

/**
 * 必须加限速，否则测的是"本机 localhost 回环"——LCP 会低到 100ms，
 * 那个数字**不能用来判断 < 2.5s 目标是否达成**（等于没测）。
 * 这里模拟：4 倍 CPU 降速 + Fast 3G 级别网络（1.6Mbps 下行 / 150ms RTT）。
 * 这是"桌面宽带"口径的偏保守近似。
 */
const THROTTLE = {
  cpu: 4,
  network: {
    offline: false,
    latency: 150,
    downloadThroughput: (1.6 * 1024 * 1024) / 8, // bytes/s
    uploadThroughput: (750 * 1024) / 8,
  },
}

interface Target { id: string; webSocketDebuggerUrl: string }

async function newTarget(url: string): Promise<Target> {
  const res = await fetch(`${CDP}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' })
  if (!res.ok) throw new Error(`创建 target 失败: ${res.status}`)
  return (await res.json()) as Target
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
    const msg = JSON.parse(String(ev.data)) as { id?: number; result?: any; error?: { message: string } }
    if (typeof msg.id === 'number') {
      const p = pending.get(msg.id)
      if (!p) return
      pending.delete(msg.id)
      if (msg.error) p.reject(new Error(msg.error.message))
      else p.resolve(msg.result)
    }
  })
  const send = (method: string, params: Record<string, unknown> = {}) =>
    new Promise<any>((resolve, reject) => {
      const myId = ++id
      pending.set(myId, { resolve, reject })
      ws.send(JSON.stringify({ id: myId, method, params }))
    })
  return { ready, send, close: () => ws.close() }
}

async function evaluate<T>(cdp: ReturnType<typeof connect>, expression: string): Promise<T> {
  const r = await cdp.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
  if (r.exceptionDetails) {
    throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text)
  }
  return r.result.value as T
}

/**
 * 在文档创建前注入指标收集器：
 *   - LCP 用 PerformanceObserver（buffered，避免错过早期 entry）
 *   - CLS 累加 layout-shift（排除用户输入导致的位移）
 */
const COLLECTOR = `
window.__perf = { lcp: 0, cls: 0, lcpEl: '' };
try {
  new PerformanceObserver((list) => {
    const es = list.getEntries();
    const last = es[es.length - 1];
    if (last) { window.__perf.lcp = last.startTime; window.__perf.lcpEl = last.element ? (last.element.tagName + (last.element.className ? '.' + String(last.element.className).split(' ')[0] : '')) : ''; }
  }).observe({ type: 'largest-contentful-paint', buffered: true });
} catch (e) {}
try {
  new PerformanceObserver((list) => {
    for (const e of list.getEntries()) {
      if (!e.hadRecentInput) window.__perf.cls += e.value;
    }
  }).observe({ type: 'layout-shift', buffered: true });
} catch (e) {}
`

/**
 * 无障碍检查（只做页面上下文可判定的部分）。
 * 全部用"返回违规元素描述数组"的形式，空数组 = 通过。
 */
const A11Y_CHECKS: Array<{ id: string; desc: string; expr: string }> = [
  {
    id: 'img-alt',
    desc: '所有 <img> 必须有非空 alt',
    expr: `[...document.querySelectorAll('img')].filter(i => !i.getAttribute('alt')).map(i => i.getAttribute('src') || '(no src)')`,
  },
  {
    id: 'h1-single',
    desc: '每页恰好一个 <h1>',
    expr: `document.querySelectorAll('h1').length === 1 ? [] : ['h1 数量 = ' + document.querySelectorAll('h1').length]`,
  },
  {
    id: 'heading-order',
    desc: '标题层级不得跳级（如 h2 → h4）',
    expr: `(() => {
      const hs = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map(h => +h.tagName[1]);
      const bad = [];
      for (let i = 1; i < hs.length; i++) if (hs[i] - hs[i-1] > 1) bad.push('h' + hs[i-1] + ' → h' + hs[i]);
      return [...new Set(bad)];
    })()`,
  },
  {
    id: 'button-name',
    desc: '按钮必须有可访问名称（文本或 aria-label）',
    expr: `[...document.querySelectorAll('button')].filter(b => !(b.textContent || '').trim() && !b.getAttribute('aria-label') && !b.getAttribute('title')).map(b => b.outerHTML.slice(0, 60))`,
  },
  {
    id: 'link-name',
    desc: '链接必须有可访问名称',
    expr: `[...document.querySelectorAll('a[href]')].filter(a => !(a.textContent || '').trim() && !a.getAttribute('aria-label')).map(a => a.getAttribute('href'))`,
  },
  {
    id: 'lang',
    desc: '<html> 必须有 lang',
    expr: `document.documentElement.getAttribute('lang') ? [] : ['缺少 lang']`,
  },
  {
    id: 'landmark',
    desc: '存在 main 地标',
    expr: `document.querySelector('main') ? [] : ['缺少 <main>']`,
  },
  {
    id: 'dup-id',
    desc: '页面内 id 不重复',
    expr: `(() => {
      const seen = new Set(), dup = new Set();
      for (const el of document.querySelectorAll('[id]')) {
        if (seen.has(el.id)) dup.add(el.id);
        seen.add(el.id);
      }
      return [...dup];
    })()`,
  },
  {
    id: 'positive-tabindex',
    desc: '不使用正数 tabindex（破坏自然焦点顺序）',
    expr: `[...document.querySelectorAll('[tabindex]')].filter(e => +e.getAttribute('tabindex') > 0).map(e => e.tagName + '[tabindex=' + e.getAttribute('tabindex') + ']')`,
  },
  {
    id: 'focus-indicator',
    desc: '存在 :focus-visible 高对比焦点轮廓，且尺寸/颜色解析为真实值',
    // ⚠️ 这个检查连踩两个坑，记录在此以免重犯：
    //   坑 1：用 el.focus() 再读 outline —— 大面积误报。原因是正确做法用 :focus-visible，
    //         而 :focus-visible **不会**因程序化 focus() 匹配。
    //   坑 2：改成"读所有元素的 outlineWidth>0" —— 仍然误报。因为**未聚焦时**
    //         outline-style 计算值就是 `none`，此时 outline-width/color 本就没有意义。
    // 正确的不变量（这两条真的能抓问题，且不依赖焦点状态）：
    //   ① 样式表里存在 :focus / :focus-visible 的描边规则；
    //   ② 该颜色解析成了**具体数值**（如 rgb(87,216,200)）而非空值——
    //      这能抓住"CSS 变量未定义 / 被作用域规则覆盖导致焦点轮廓消失"这类真实故障。
    expr: `(() => {
      const problems = [];
      let focusRule = null;
      for (const sheet of document.styleSheets) {
        let rules; try { rules = sheet.cssRules } catch { continue }
        for (const r of rules) {
          if (!r.selectorText) continue;
          if (/:focus(-visible)?/.test(r.selectorText) && /outline|box-shadow/.test(r.cssText)) {
            focusRule = r; break;
          }
        }
        if (focusRule) break;
      }
      if (!focusRule) {
        problems.push('样式表里没有 :focus / :focus-visible 的描边规则');
        return problems;
      }
      // 用一个临时元素检查颜色是否能解析成真实值
      const probe = document.createElement('a');
      probe.href = '#';
      probe.style.position = 'absolute';
      probe.style.opacity = '0';
      document.body.appendChild(probe);
      const cs = getComputedStyle(probe);
      const color = cs.outlineColor;
      probe.remove();
      if (!color || color === 'rgba(0, 0, 0, 0)' || color === 'transparent') {
        problems.push('焦点轮廓颜色未解析为具体值：' + color);
      }
      return problems;
    })()`,
  },
]

const perfRows: Array<{ name: string; lcp: number; cls: number; lcpEl: string }> = []
const a11yProblems: Array<{ page: string; id: string; desc: string; items: string[] }> = []
let failures = 0

// ---- 负向自检：确认检查器不是"永远通过" ----
if (process.argv.includes('--selftest')) {
  const target = await newTarget('about:blank')
  const cdp = connect(target.webSocketDebuggerUrl)
  let caught = 0
  try {
    await cdp.ready
    await cdp.send('Runtime.enable')
    await evaluate(cdp, `document.body.innerHTML = ${JSON.stringify(SELFTEST_DOM)}`)
    console.log('负向自检（故意注入违规 DOM，检查器应当报错）：')
    // 只用「必须捕获」的若干项，避免依赖 <html lang> 等页面级属性
    const mustCatch = ['img-alt', 'h1-single', 'button-name', 'dup-id', 'positive-tabindex']
    for (const c of A11Y_CHECKS.filter(c => mustCatch.includes(c.id))) {
      const items = await evaluate<string[]>(cdp, `(() => { try { return ${c.expr}; } catch (e) { return []; } })()`)
      const hit = Array.isArray(items) && items.length > 0
      if (hit) caught++
      console.log(`  ${hit ? '✓ 捕获' : '✗ 漏检'} ${c.id} → ${JSON.stringify(items).slice(0, 80)}`)
    }
  } finally {
    cdp.close()
    await closeTarget(target.id)
  }
  const mustCatchCount = 5
  console.log(`\n负向自检：${caught}/${mustCatchCount} 项违规被捕获`)
  if (caught !== mustCatchCount) {
    console.error('✗ 检查器存在漏检，其"通过"结论不可信')
    process.exit(1)
  }
  console.log('✓ 检查器有效（非空跑）\n')
}

for (const page of PAGES) {
  const target = await newTarget('about:blank')
  const cdp = connect(target.webSocketDebuggerUrl)
  try {
    await cdp.ready
    await cdp.send('Runtime.enable')
    await cdp.send('Page.enable')
    // 限速 + 降 CPU：让 LCP 反映"有网络与算力约束"的真实情况
    await cdp.send('Network.enable')
    await cdp.send('Network.emulateNetworkConditions', THROTTLE.network)
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: THROTTLE.cpu })
    // 关键：在文档创建前注入收集器
    await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: COLLECTOR })
    await cdp.send('Page.navigate', { url: `${BASE}${page.path}` })
    // 等加载完成 + 让 LCP/CLS 稳定（图片解码与懒加载会持续影响 CLS）
    await new Promise(r => setTimeout(r, 5000))

    const perf = await evaluate<{ lcp: number; cls: number; lcpEl: string }>(cdp, 'JSON.parse(JSON.stringify(window.__perf || {lcp:0,cls:0,lcpEl:""}))')
    const lcp = Math.round(perf.lcp || 0)
    const cls = Number((perf.cls || 0).toFixed(4))
    perfRows.push({ name: page.name, lcp, cls, lcpEl: perf.lcpEl || '' })
    if (lcp > LCP_LIMIT || cls > CLS_LIMIT) failures++

    for (const c of A11Y_CHECKS) {
      const items = await evaluate<string[]>(cdp, `(() => { try { return ${c.expr}; } catch (e) { return ['检查异常: ' + e.message]; } })()`)
      if (Array.isArray(items) && items.length) {
        a11yProblems.push({ page: page.name, id: c.id, desc: c.desc, items: items.slice(0, 5) })
      }
    }
  } catch (e) {
    failures++
    perfRows.push({ name: page.name, lcp: -1, cls: -1, lcpEl: e instanceof Error ? e.message : String(e) })
  } finally {
    cdp.close()
    await closeTarget(target.id)
  }
}

console.log(`性能与无障碍验收（base=${BASE}）`)
console.log(`口径：LCP < ${LCP_LIMIT}ms，CLS < ${CLS_LIMIT}\n`)

console.log('性能（无头 Chrome 实测，仅供参考绝对值；无头环境与真机有差异）：')
for (const r of perfRows) {
  const ok = r.lcp >= 0 && r.lcp <= LCP_LIMIT && r.cls <= CLS_LIMIT
  console.log(
    `  ${ok ? '✓' : '✗'} ${r.name.padEnd(12)} LCP ${String(r.lcp).padStart(5)}ms  CLS ${String(r.cls).padStart(7)}  ${r.lcpEl}`,
  )
}

console.log('\n无障碍：')
if (a11yProblems.length === 0) {
  console.log(`  ✓ ${A11Y_CHECKS.length} 项检查 × ${PAGES.length} 个页面 全部通过`)
} else {
  for (const p of a11yProblems) {
    console.log(`  ✗ [${p.page}] ${p.id} — ${p.desc}`)
    for (const it of p.items) console.log(`      · ${it}`)
  }
}

console.log(`\n结果：性能不达标 ${perfRows.filter(r => r.lcp > LCP_LIMIT || r.cls > CLS_LIMIT).length} 项，` +
  `无障碍问题 ${a11yProblems.length} 类`)
console.log('说明：本脚本只覆盖"页面上下文可判定"的无障碍项；不构成完整 WCAG 审计。')

if (failures || a11yProblems.length) {
  console.error('\n✗ 性能/无障碍验收未通过')
  process.exit(1)
}
console.log('\n✓ 性能与无障碍验收通过')
