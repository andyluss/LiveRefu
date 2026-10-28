#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0
import { spawn } from 'node:child_process'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { startServer } from '../src/server.ts'

const PORT = Number(process.env.SKIN_SNAPSHOT_PORT || 4519)
const CDP_PORT = Number(process.env.CHROME_DEBUG_PORT || 9229)
const LIMIT = Number(process.argv.indexOf('--limit') >= 0 ? process.argv[process.argv.indexOf('--limit') + 1] : 0)
const ONLY_VAULT = process.argv.indexOf('--vault') >= 0 ? process.argv[process.argv.indexOf('--vault') + 1] : ''
const OUT = process.argv.indexOf('--out') >= 0 ? process.argv[process.argv.indexOf('--out') + 1] : 'reports/skin-shots'
const views = ['overview', 'tokens', 'checks']
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))
const chromePath = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

class CDP {
  private ws: WebSocket
  private id = 0
  private pending = new Map<number, { resolve: (v: any) => void; reject: (e: any) => void }>()
  constructor(url: string) {
    this.ws = new WebSocket(url)
    this.ws.addEventListener('message', (event) => {
      const msg = JSON.parse(String(event.data))
      if (msg.id && this.pending.has(msg.id)) {
        const p = this.pending.get(msg.id)!
        this.pending.delete(msg.id)
        if (msg.error) p.reject(new Error(msg.error.message)); else p.resolve(msg.result)
      }
    })
  }
  async open(): Promise<void> {
    if (this.ws.readyState === WebSocket.OPEN) return
    await new Promise<void>((resolve, reject) => {
      this.ws.addEventListener('open', () => resolve(), { once: true })
      this.ws.addEventListener('error', () => reject(new Error('CDP websocket failed')), { once: true })
    })
  }
  send(method: string, params: Record<string, unknown> = {}): Promise<any> {
    return new Promise((resolve, reject) => {
      const id = ++this.id
      this.pending.set(id, { resolve, reject })
      this.ws.send(JSON.stringify({ id, method, params }))
    })
  }
  async eval(expression: string): Promise<any> {
    const r = await this.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.text || 'Runtime error')
    return r.result?.value
  }
  close(): void { this.ws.close() }
}
async function reachable(url: string): Promise<boolean> {
  try { const r = await fetch(url); return r.ok } catch { return false }
}

const server = await startServer({ port: PORT, plugins: join(import.meta.dirname, '..', 'plugins') })
const profile = mkdtempSync(join(tmpdir(), 'livedso-skin-'))
const chrome = spawn(chromePath, [
  '--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
  `--user-data-dir=${profile}`, `--remote-debugging-port=${CDP_PORT}`,
  '--window-size=1440,1000', `http://127.0.0.1:${PORT}/?lang=zh#/overview`
], { stdio: 'ignore' })

let cdp: CDP | null = null
try {
  let wsUrl = ''
  for (let i = 0; i < 60; i++) {
    try {
      const list = await fetch(`http://127.0.0.1:${CDP_PORT}/json`).then(r => r.json()) as Array<{ type?: string; webSocketDebuggerUrl?: string }>
      const page = list.find(t => t.type === 'page' && t.webSocketDebuggerUrl)
      if (page?.webSocketDebuggerUrl) { wsUrl = page.webSocketDebuggerUrl; break }
    } catch {}
    await sleep(200)
  }
  if (!wsUrl) throw new Error(`Chrome CDP 不可用（${chromePath}）；请设置 CHROME_PATH`)
  cdp = new CDP(wsUrl); await cdp.open()
  await cdp.send('Runtime.enable'); await cdp.send('Page.enable')
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false })
  await sleep(900)
  const vaults = await cdp.eval(`Array.from(document.querySelectorAll('#vault-select option')).map(o => o.value)`) as string[]
  const wanted = ONLY_VAULT ? vaults.filter(v => v === ONLY_VAULT) : vaults
  if (!wanted.length) throw new Error(`没有匹配的 vault：${ONLY_VAULT || '(全部)'}`)
  mkdirSync(OUT, { recursive: true })
  const manifest: Array<{ vault: string; card: string; view: string; file: string }> = []
  let taken = 0
  for (const vault of wanted) {
    await cdp.eval(`(()=>{const s=document.querySelector('#vault-select');s.value=${JSON.stringify(vault)};s.dispatchEvent(new Event('change',{bubbles:true}))})()`)
    await sleep(800)
    const cards = await cdp.eval(`Array.from(document.querySelectorAll('#skin-select option')).map(o => o.value).filter(Boolean)`) as string[]
    for (const card of cards) {
      if (LIMIT && taken >= LIMIT) break
      await cdp.eval(`(()=>{const s=document.querySelector('#skin-select');s.value=${JSON.stringify(card)};s.dispatchEvent(new Event('change',{bubbles:true}))})()`)
      await sleep(350)
      for (const view of views) {
        await cdp.eval(`location.hash='#/${view}'`)
        await sleep(400)
        const shot = await cdp.send('Page.captureScreenshot', { format: 'png' })
        const dir = join(OUT, vault, card); mkdirSync(dir, { recursive: true })
        const file = join(dir, `${view}.png`)
        writeFileSync(file, Buffer.from(shot.data, 'base64'))
        manifest.push({ vault, card, view, file })
      }
      taken++
      console.log(`${vault}/${card} · ${views.length} views`)
    }
    if (LIMIT && taken >= LIMIT) break
  }
  writeFileSync(join(OUT, 'manifest.json'), JSON.stringify({ generatedAt: new Date().toISOString(), vaults: wanted.length, cards: taken, shots: manifest.length, manifest }, null, 2) + '\n')
  console.log(`\n✓ ${taken} cards · ${manifest.length} screenshots → ${OUT}`)
} finally {
  cdp?.close()
  chrome.kill('SIGTERM')
  await server.close().catch(() => {})
  await sleep(250)
  try { rmSync(profile, { recursive: true, force: true }) } catch {}
}
