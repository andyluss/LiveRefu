#!/usr/bin/env bun
/**
 * 浏览器端验收：站内搜索（M1 的 W1 交付）。
 *
 * 为什么需要单独的浏览器验收：搜索走的是 **客户端** FTS
 * （`useSearchCollection` 在浏览器里下载索引并建表），
 * 服务端 curl 只能证明页面 200，**证明不了检索真的能出结果**。
 * 因此这里用 Chrome DevTools Protocol 真正在页面上输入关键词并读取结果。
 *
 * 前置：一个开着 `--remote-debugging-port=9222` 的 Chrome，以及跑在 BASE 上的站点。
 *
 * 用法：
 *   bun run tools/verify-search.ts --base=http://localhost:3100 --cdp=http://127.0.0.1:9222
 */

const arg = (name: string, def: string) =>
  process.argv.find(a => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? def

const BASE = arg('base', 'http://localhost:3100')
const CDP = arg('cdp', 'http://127.0.0.1:9222')

/** 期望能搜到的关键词（取自正文的真实术语） */
const CASES = ['蒸汽朋克', '原子朋克', '怀旧', 'Anemoia', '苏联', '磁带未来主义']

interface Target { id: string; type: string; url: string; webSocketDebuggerUrl: string }

async function newTarget(url: string): Promise<Target> {
  const res = await fetch(`${CDP}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' })
  if (!res.ok) throw new Error(`创建 target 失败: ${res.status} ${await res.text()}`)
  return (await res.json()) as Target
}

async function closeTarget(id: string) {
  await fetch(`${CDP}/json/close/${id}`).catch(() => {})
}

/** 极简 CDP 客户端（够用：发命令、等响应、收事件） */
function connect(wsUrl: string) {
  const ws = new WebSocket(wsUrl)
  let id = 0
  const pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>()
  const ready = new Promise<void>((resolve, reject) => {
    ws.addEventListener('open', () => resolve())
    ws.addEventListener('error', () => reject(new Error('WebSocket 连接失败')))
  })
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(String(ev.data)) as { id?: number; result?: unknown; error?: { message: string } }
    if (typeof msg.id === 'number') {
      const p = pending.get(msg.id)
      if (!p) return
      pending.delete(msg.id)
      if (msg.error) p.reject(new Error(msg.error.message))
      else p.resolve(msg.result)
    }
  })
  function send(method: string, params: Record<string, unknown> = {}) {
    const myId = ++id
    return new Promise<unknown>((resolve, reject) => {
      pending.set(myId, { resolve, reject })
      ws.send(JSON.stringify({ id: myId, method, params }))
    })
  }
  return { ready, send, close: () => ws.close() }
}

/** 在页面里求值，返回 JSON 化的结果 */
async function evaluate<T>(cdp: ReturnType<typeof connect>, expression: string): Promise<T> {
  const r = (await cdp.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  })) as { result: { value: T }; exceptionDetails?: { text: string; exception?: { description?: string } } }
  if (r.exceptionDetails) {
    throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text)
  }
  return r.result.value
}

const results: Array<{ term: string; ok: boolean; hits: number; detail: string }> = []
let failed = 0

for (const term of CASES) {
  const target = await newTarget(`${BASE}/search`)
  const cdp = connect(target.webSocketDebuggerUrl)
  try {
    await cdp.ready
    await cdp.send('Runtime.enable')
    // 等页面 hydration + 搜索框出现
    await evaluate(cdp, `new Promise(r => {
      const t0 = Date.now();
      (function poll(){
        if (document.querySelector('input[type=search]') || Date.now() - t0 > 15000) return r(true);
        setTimeout(poll, 100);
      })();
    })`)

    const out = await evaluate<{ hits: number; first: string; titles: string[] }>(cdp, `
      (async () => {
        const input = document.querySelector('input[type=search]');
        if (!input) return { hits: 0, first: '', titles: [], err: 'no search input' };
        // 触发 Vue 的 v-model：用原生 setter + input 事件
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
        setter.call(input, ${JSON.stringify(term)});
        input.dispatchEvent(new Event('input', { bubbles: true }));
        // 去抖 250ms + 首次建索引，给足时间
        const t0 = Date.now();
        while (Date.now() - t0 < 25000) {
          await new Promise(r => setTimeout(r, 200));
          const hits = document.querySelectorAll('.search-hit');
          if (hits.length > 0) {
            return {
              hits: hits.length,
              first: hits[0].querySelector('.search-hit__title')?.textContent?.trim() ?? '',
              titles: [...hits].slice(0, 3).map(h => h.querySelector('.search-hit__title')?.textContent?.trim() ?? ''),
            };
          }
        }
        return { hits: 0, first: '', titles: [], err: 'timeout' };
      })()
    `)

    const ok = out.hits > 0
    if (!ok) failed++
    results.push({ term, ok, hits: out.hits, detail: out.titles.join(' / ') || '无结果' })
  } catch (e) {
    failed++
    results.push({ term, ok: false, hits: 0, detail: e instanceof Error ? e.message : String(e) })
  } finally {
    cdp.close()
    await closeTarget(target.id)
  }
}

console.log(`站内搜索验收（base=${BASE}）\n`)
for (const r of results) {
  console.log(`  ${r.ok ? '✓' : '✗'} ${r.term.padEnd(14)} 命中 ${String(r.hits).padStart(2)}  ${r.detail}`)
}
console.log(`\n${results.filter(r => r.ok).length}/${results.length} 个关键词有结果`)
if (failed) {
  console.error(`✗ 搜索验收未通过（${failed} 项）`)
  process.exit(1)
}
console.log('✓ 搜索验收通过')
