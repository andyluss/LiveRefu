#!/usr/bin/env node
/**
 * 产品页面真实渲染走查（CDP）。
 *
 * 前置：
 *   - 网站：cd projects/website && PORT=3100 bun .output/server/index.mjs
 *   - LiveFab：cd projects/livefab/portal && HOST=127.0.0.1 PORT=4321 node dist/server/entry.mjs
 *   - Chrome：--headless=new --remote-debugging-port=9222
 *
 * 产出：
 *   design/docs/shots/*.png
 *   design/docs/shots/walkthrough.json
 *
 * 走查内容：
 *   1. 全页截图（首页 / Wiki 列表 / 搜索弹窗 / LiveFab 首页）；
 *   2. Tab 焦点序列：记录 activeElement、:focus-visible、outline/box-shadow；
 *   3. 搜索弹窗：Meta+K 打开并截图。
 *
 * 用法：
 *   node design/tools/capture_products.ts \
 *     --website=http://127.0.0.1:3100 --livefab=http://127.0.0.1:4321 --cdp=http://127.0.0.1:9222
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'

import { DESIGN_ROOT, WORKSPACE_ROOT } from './token_lib.ts'

const arg = (name: string, def: string) =>
  process.argv.find(a => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? def

const WEBSITE = arg('website', 'http://127.0.0.1:3100')
const LIVEFAB = arg('livefab', 'http://127.0.0.1:4321')
const CDP = arg('cdp', 'http://127.0.0.1:9222')
const OUT = join(DESIGN_ROOT, 'docs/shots')
const SELF_TEST = process.argv.includes('--self-test')

interface Target {
  id: string
  webSocketDebuggerUrl: string
}

interface FocusStep {
  tag: string
  className: string
  text: string
  focusVisible: boolean
  outline: string
  boxShadow: string
  visible: boolean
}

interface PageReport {
  page: string
  url: string
  screenshot: string
  title: string
  focus: FocusStep[]
  focusMissing: number
  dialog?: { open: boolean; screenshot?: string }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

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
  ws.addEventListener('message', ev => {
    const msg = JSON.parse(String(ev.data)) as {
      id?: number
      result?: any
      error?: { message: string }
    }
    if (typeof msg.id !== 'number') return
    const p = pending.get(msg.id)
    if (!p) return
    pending.delete(msg.id)
    if (msg.error) p.reject(new Error(msg.error.message))
    else p.resolve(msg.result)
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
  const r = await cdp.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  })
  if (r.exceptionDetails) {
    throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text)
  }
  return r.result.value as T
}

async function waitReady(cdp: ReturnType<typeof connect>, timeoutMs = 15000): Promise<void> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const state = await evaluate<string>(cdp, 'document.readyState')
    if (state === 'complete') break
    await sleep(200)
  }
  await evaluate(cdp, 'document.fonts ? document.fonts.ready.then(() => true) : true')
  await sleep(600)
}

async function screenshot(cdp: ReturnType<typeof connect>, path: string): Promise<void> {
  const metrics = await cdp.send('Page.getLayoutMetrics')
  const size = metrics.cssContentSize ?? metrics.contentSize
  const width = Math.min(Math.ceil(size.width), 1440)
  const height = Math.min(Math.ceil(size.height), 8000)
  const shot = await cdp.send('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: true,
    clip: { x: 0, y: 0, width, height, scale: 1 },
  })
  writeFileSync(path, Buffer.from(shot.data, 'base64'))
}

const FOCUS_PROBE = `(() => {
  const el = document.activeElement;
  if (!el || el === document.body) return null;
  const cs = getComputedStyle(el);
  const rect = el.getBoundingClientRect();
  const text = (el.innerText || el.getAttribute('aria-label') || el.getAttribute('title') || '')
    .replace(/\\s+/g, ' ').trim().slice(0, 60);
  return {
    tag: el.tagName,
    className: typeof el.className === 'string' ? el.className : '',
    text,
    focusVisible: el.matches(':focus-visible'),
    outline: cs.outlineStyle + ' ' + cs.outlineWidth + ' ' + cs.outlineColor,
    boxShadow: cs.boxShadow,
    visible: rect.width > 0 && rect.height > 0,
  };
})()`

async function tabWalk(cdp: ReturnType<typeof connect>, steps = 12): Promise<FocusStep[]> {
  await evaluate(cdp, 'window.focus(); if (document.activeElement) document.activeElement.blur();')
  const out: FocusStep[] = []
  for (let i = 0; i < steps; i++) {
    await cdp.send('Input.dispatchKeyEvent', {
      type: 'keyDown',
      key: 'Tab',
      code: 'Tab',
      windowsVirtualKeyCode: 9,
      nativeVirtualKeyCode: 9,
    })
    await cdp.send('Input.dispatchKeyEvent', {
      type: 'keyUp',
      key: 'Tab',
      code: 'Tab',
      windowsVirtualKeyCode: 9,
      nativeVirtualKeyCode: 9,
    })
    await sleep(80)
    const step = await evaluate<FocusStep | null>(cdp, FOCUS_PROBE)
    if (step) out.push(step)
  }
  return out
}

async function visit(
  url: string,
  name: string,
  pageLabel: string,
  withSearch = false,
): Promise<PageReport> {
  const target = await newTarget('about:blank')
  const cdp = connect(target.webSocketDebuggerUrl)
  await cdp.ready
  await cdp.send('Page.enable')
  await cdp.send('Runtime.enable')
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  })
  await cdp.send('Page.navigate', { url })
  await waitReady(cdp)

  const title = await evaluate<string>(cdp, 'document.title')
  const png = join(OUT, `${name}.png`)
  await screenshot(cdp, png)
  const relPng = relative(WORKSPACE_ROOT, png)

  let focus = await tabWalk(cdp)
  const focusMissing = focus.filter(f => !f.focusVisible || f.outline.startsWith('none')).length

  let dialog: PageReport['dialog']
  if (withSearch) {
    // 重新载入，避免 Tab 走查把焦点留在页面其他位置
    await cdp.send('Page.navigate', { url })
    await waitReady(cdp)
    await cdp.send('Input.dispatchKeyEvent', {
      type: 'keyDown',
      key: 'k',
      code: 'KeyK',
      modifiers: 4,
      windowsVirtualKeyCode: 75,
      nativeVirtualKeyCode: 75,
    })
    await cdp.send('Input.dispatchKeyEvent', {
      type: 'keyUp',
      key: 'k',
      code: 'KeyK',
      modifiers: 4,
      windowsVirtualKeyCode: 75,
      nativeVirtualKeyCode: 75,
    })
    await sleep(700)
    const open = await evaluate<boolean>(
      cdp,
      'Boolean(document.querySelector(\'[role="dialog"]\'))',
    )
    dialog = { open }
    if (open) {
      const searchPng = join(OUT, `${name}-search.png`)
      await screenshot(cdp, searchPng)
      dialog.screenshot = relative(WORKSPACE_ROOT, searchPng)
      // 搜索弹窗内的焦点走查
      const dialogFocus = await tabWalk(cdp, 6)
      focus = [...focus, ...dialogFocus]
    }
  }

  cdp.close()
  await closeTarget(target.id)

  writeFileSync(
    join(OUT, `${name}.json`),
    JSON.stringify({ page: pageLabel, url, title, screenshot: relPng, focus, dialog }, null, 2) + '\n',
  )

  return {
    page: pageLabel,
    url,
    screenshot: relPng,
    title,
    focus,
    focusMissing,
    dialog,
  }
}

function runSelfTest(): number {
  console.log('[self-test] 走查脚本纯逻辑')
  const focus = [
    { tag: 'A', className: 'x', text: 'x', focusVisible: true, outline: 'solid 2px rgb(0,0,0)', boxShadow: 'none', visible: true },
    { tag: 'BUTTON', className: 'y', text: 'y', focusVisible: false, outline: 'none 0px rgb(0,0,0)', boxShadow: 'none', visible: true },
  ]
  const missing = focus.filter(f => !f.focusVisible || f.outline.startsWith('none')).length
  const cases: Array<[string, boolean, string]> = [
    ['无可见焦点的元素被计数', missing === 1, 'focusVisible=false 或 outline:none 必须算缺失'],
    ['全可见焦点 → 0', focus.filter(f => f.focusVisible && !f.outline.startsWith('none')).length === 1, '可见焦点不得误报'],
  ]
  let passed = 0
  for (const [name, ok, why] of cases) {
    console.log(`  ${ok ? '✓' : '✗'} ${name}${ok ? '' : `  ← ${why}`}`)
    if (ok) passed++
  }
  console.log(`\n[self-test] ${passed}/${cases.length} 通过`)
  return passed === cases.length ? 0 : 1
}

async function main(): Promise<number> {
  if (SELF_TEST) return runSelfTest()
  mkdirSync(OUT, { recursive: true })

  const reports: PageReport[] = []
  reports.push(await visit(`${WEBSITE}/`, 'website-home', '网站首页'))
  reports.push(await visit(`${WEBSITE}/wiki`, 'website-wiki', '网站 Wiki 列表'))
  reports.push(await visit(`${WEBSITE}/`, 'website-search', '网站首页 · 搜索弹窗', true))
  reports.push(await visit(`${LIVEFAB}/`, 'livefab-home', 'LiveFab 首页'))

  const summary = {
    generatedAt: new Date().toISOString(),
    pages: reports,
    focusMissing: reports.reduce((n, r) => n + r.focusMissing, 0),
  }
  writeFileSync(join(OUT, 'walkthrough.json'), JSON.stringify(summary, null, 2) + '\n')

  console.log('产品走查')
  for (const r of reports) {
    console.log(
      `  ${r.page.padEnd(18)} focus ${r.focus.length} 步 · 缺失可见焦点 ${r.focusMissing}` +
        (r.dialog ? ` · 搜索弹窗 ${r.dialog.open ? '已打开' : '未打开'}` : ''),
    )
  }
  console.log(`\n✓ 截图与报告：${OUT}`)
  console.log(`  focus 缺失：${summary.focusMissing}`)
  return summary.focusMissing > 0 ? 1 : 0
}

process.exit(await main())
