#!/usr/bin/env node
/**
 * 生成 design/HUB.html —— 设计系统的一页式可视化总览。
 *
 * 为什么生成而不是手写：
 *   token 数、风格卡色板、组件使用数、文档索引都会变；手写页面必然过期。
 *   本脚本从 design/tokens、design/components、design/docs 与两个 Web 产品源码现读，
 *   生成一个自包含 HTML（内联 CSS/JS，无外部网络依赖），并用 --check 防止过期。
 *
 * 用法：
 *   node --experimental-strip-types design/tools/build_hub.ts
 *   node --experimental-strip-types design/tools/build_hub.ts --check
 *   node --experimental-strip-types design/tools/build_hub.ts --self-test
 */

import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { extname, join, relative } from 'node:path'

import {
  DESIGN_ROOT,
  WORKSPACE_ROOT,
  buildAll,
  contrast,
  dimensionToNumber,
  durationToNumber,
  firstDiff,
  getNumber,
  getString,
  getValue,
  loadTokens,
  round2,
  type TokenMap,
} from './token_lib.ts'

const OUT = join(DESIGN_ROOT, 'HUB.html')
const CHECK = process.argv.includes('--check')
const SELF_TEST = process.argv.includes('--self-test')

const UI_LEVELS = ['title-1', 'title-2', 'body', 'caption', 'number-lg']
const EDITORIAL_LEVELS = ['display', 'h1', 'h2', 'h3', 'body', 'caption', 'footnote']

interface ColorRow {
  path: string
  label: string
  group: string
  hex: string
  contrastBase: number | null
  contrastSurface: number | null
}

interface TypeRow {
  token: string
  size: number
  lineHeight: number
  weight: number
  use: string
}

interface StyleCard {
  name: string
  id: string
  mode: string
  colors: Array<{ name: string; hex: string; path: string }>
  lighting?: Record<string, unknown>
  source: string
  projection: string
}

interface ComponentRow {
  file: string
  title: string
  tokens: number
  usage: Record<string, number>
}

interface DocRow {
  file: string
  title: string
}

function esc(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function readText(path: string): string {
  return readFileSync(path, 'utf8')
}

function productNames(tokens: TokenMap): string[] {
  return [...new Set(
    [...tokens.keys()]
      .filter(p => p.startsWith('product.'))
      .map(p => p.split('.')[1]!),
  )].sort()
}

function productFile(name: string): string {
  const dir = join(DESIGN_ROOT, 'tokens/products')
  const file = readdirSync(dir).find(f => f.startsWith(`${name}.`) && f.endsWith('.tokens.json'))
  if (!file) throw new Error(`找不到产品 token 文件：${name}`)
  return join(dir, file)
}

function colorRows(tokens: TokenMap): ColorRow[] {
  const bgBase = getString(tokens, 'sys.color.bg.base')
  const bgSurface = getString(tokens, 'sys.color.bg.surface')
  return [...tokens]
    .filter(([p]) => p.startsWith('sys.color.'))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([path, t]) => {
      const hex = String(t.value)
      const opaque = /^#[0-9A-Fa-f]{6}$/.test(hex)
      return {
        path,
        label: path.replace('sys.color.', ''),
        group: path.replace('sys.color.', '').split('.')[0]!,
        hex,
        contrastBase: opaque ? round2(contrast(hex, bgBase)) : null,
        contrastSurface: opaque ? round2(contrast(hex, bgSurface)) : null,
      }
    })
}

function typeRows(tokens: TokenMap, ladder: 'ui' | 'editorial'): TypeRow[] {
  const levels = ladder === 'ui' ? UI_LEVELS : EDITORIAL_LEVELS
  return levels.map(level => ({
    token: level,
    size: dimensionToNumber(getString(tokens, `sys.type.${ladder}.${level}.size`)),
    lineHeight: getNumber(tokens, `sys.type.${ladder}.${level}.lineHeight`),
    weight: getNumber(tokens, `sys.type.${ladder}.${level}.weight`),
    use: getString(tokens, `sys.type.${ladder}.${level}.use`),
  }))
}

function styleCards(tokens: TokenMap): StyleCard[] {
  const cards: StyleCard[] = []
  for (const name of productNames(tokens)) {
    const file = productFile(name)
    const raw = JSON.parse(readText(file)) as any
    const meta = raw.meta ?? {}
    const colors = [...tokens]
      .filter(([p]) => p.startsWith(`product.${name}.color.`))
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([path, t]) => ({
        name: path.replace(`product.${name}.color.`, ''),
        hex: String(t.value),
        path,
      }))
    const era = meta.era ? String(meta.era).toUpperCase() : 'CONSOLE'
    const cardsId =
      meta.styleCard ?? `SC-${name.toUpperCase()}-${era}-v1`
    const projections: Record<string, string> = {
      'future-archive': '../projects/website/app/assets/tokens.generated.css',
      'future-debris': '../projects/mainline/future-debris/game/data/tokens.json',
      livefab: '../projects/livefab/portal/src/assets/tokens.generated.css',
      'tomorrows-channel': '../projects/tomorrows-channel/game/scenes/channel/skins/tape_channel_skin.tres',
    }
    cards.push({
      name: meta.name ?? name,
      id: String(cardsId),
      mode: meta.mode ?? meta.era ?? '—',
      colors,
      lighting: meta.lighting,
      source: relative(DESIGN_ROOT, file),
      projection: projections[name] ?? '',
    })
  }
  return cards
}

function walk(dir: string, exts: Set<string>, out: string[]): void {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (name === 'node_modules' || name === '.nuxt' || name === 'dist' || name === '.tmp') continue
    const st = statSync(full)
    if (st.isDirectory()) walk(full, exts, out)
    else if (exts.has(extname(name))) out.push(full)
  }
}

function componentUsage(): Record<string, Record<string, number>> {
  const classes: Record<string, string> = {
    button: 'lr-button',
    'form-field': 'lr-field',
    panel: 'lr-panel',
  }
  const sources = [
    { product: 'website', dir: join(WORKSPACE_ROOT, 'projects/website/app'), exts: new Set(['.vue', '.ts']) },
    { product: 'livefab', dir: join(WORKSPACE_ROOT, 'projects/livefab/portal/src'), exts: new Set(['.astro', '.ts', '.vue']) },
  ]
  const usage: Record<string, Record<string, number>> = {}
  for (const [id, cls] of Object.entries(classes)) usage[id] = {}
  for (const src of sources) {
    const files: string[] = []
    walk(src.dir, src.exts, files)
    for (const file of files) {
      const text = readText(file)
      for (const [id, cls] of Object.entries(classes)) {
        const n = (text.match(new RegExp(`\\b${cls}\\b`, 'g')) ?? []).length
        if (n > 0) usage[id]![src.product] = (usage[id]![src.product] ?? 0) + n
      }
    }
  }
  return usage
}

function components(): ComponentRow[] {
  const dir = join(DESIGN_ROOT, 'components')
  const usage = componentUsage()
  return readdirSync(dir)
    .filter(f => f.endsWith('.md') && f !== 'README.md')
    .sort()
    .map(file => {
      const text = readText(join(dir, file))
      const title = (text.match(/^#\s+(.+)$/m)?.[1] ?? file).trim()
      const id = file.replace(/\.md$/, '')
      const tokens = new Set(text.match(/--lr-[a-z0-9-]+/g) ?? []).size
      return { file, title, tokens, usage: usage[id] ?? {} }
    })
}

function docs(): DocRow[] {
  const dir = join(DESIGN_ROOT, 'docs')
  return readdirSync(dir)
    .filter(f => f.endsWith('.md'))
    .sort()
    .map(file => {
      const text = readText(join(dir, file))
      const title = (text.match(/^#\s+(.+)$/m)?.[1] ?? file).trim()
      return { file, title }
    })
}

function latestVersion(): string {
  const text = readText(join(DESIGN_ROOT, 'CHANGELOG.md'))
  const m = text.match(/^## \[(\d+\.\d+\.\d+)\]/m)
  return m?.[1] ?? '未发布'
}

function exceptionCounts(): { active: number; resolved: number } {
  const text = readText(join(DESIGN_ROOT, 'docs/exceptions.md'))
  const active = /（暂无 active 例外。）/.test(text) ? 0 : (text.match(/\| active \|/g) ?? []).length
  const resolved = (text.match(/\*\*EX-\d{8}-\d{2}\*\*/g) ?? []).length
  return { active, resolved }
}

function requireFile(rel: string): void {
  if (!existsSync(join(DESIGN_ROOT, rel))) throw new Error(`HUB 引用的本地文件不存在：${rel}`)
}

// ── HTML 片段 ──────────────────────────────────────────────────────────

function swatch(row: ColorRow): string {
  const contrastText = row.contrastBase === null
    ? 'alpha'
    : `${row.contrastBase.toFixed(2)}:1`
  return `<button class="swatch" type="button" data-search="${esc(`${row.path} ${row.hex}`)}" data-hex="${esc(row.hex)}" title="点击复制 ${esc(row.hex)}">
    <span class="swatch-chip" style="--c:${esc(row.hex)}"></span>
    <span class="swatch-meta"><b>${esc(row.label)}</b><code>${esc(row.hex)}</code><small>${contrastText}</small></span>
  </button>`
}

function colorGroups(rows: ColorRow[]): string {
  const order = ['bg', 'text', 'line', 'action', 'feedback', 'focus', 'material']
  const labels: Record<string, string> = {
    bg: '背景 / 表面', text: '文字', line: '线', action: '行动',
    feedback: '状态', focus: '焦点', material: '材质',
  }
  return order
    .filter(g => rows.some(r => r.group === g))
    .map(g => `<h4 class="group-title">${labels[g] ?? g}</h4>
      <div class="swatches">${rows.filter(r => r.group === g).map(swatch).join('')}</div>`)
    .join('')
}

function typeSample(rows: TypeRow[], ladder: string): string {
  return `<div class="type-list">${rows.map(r => `<div class="type-row">
    <div class="type-meta"><code>${esc(ladder)}.${esc(r.token)}</code><small>${r.size}px / ${r.lineHeight} / ${r.weight}</small></div>
    <div class="type-sample" style="font-size:${r.size}px;line-height:${r.lineHeight};font-weight:${r.weight}">把过去想象的未来，归档、擦亮、再读一遍</div>
  </div>`).join('')}</div>`
}

function styleCardHtml(card: StyleCard): string {
  const lighting = card.lighting
    ? `<div class="lighting">${Object.entries(card.lighting).map(([k, v]) =>
        `<span><b>${esc(k)}</b> ${esc(Array.isArray(v) ? v.join(' : ') : String(v))}</span>`).join('')}</div>`
    : ''
  return `<article class="card style-card">
    <div class="card-head"><h3>${esc(card.name)}</h3><code>${esc(card.id)}</code></div>
    <p class="muted">${card.colors.length} 个颜色 ｜ mode=${esc(card.mode)}</p>
    <div class="mini-swatches">${card.colors.map(c =>
      `<span class="mini" style="--c:${esc(c.hex)}" title="${esc(c.name)} ${esc(c.hex)}"></span>`).join('')}</div>
    ${lighting}
    <p class="links"><a href="${esc(card.source)}">源 JSON</a>${card.projection ? ` · <a href="${esc(card.projection)}">投影</a>` : ''}</p>
  </article>`
}

function componentRows(rows: ComponentRow[]): string {
  return rows.map(c => {
    const total = Object.values(c.usage).reduce((n, v) => n + v, 0)
    return `<tr><td><a href="components/${esc(c.file)}">${esc(c.title)}</a></td>
      <td>${c.tokens}</td><td>${c.usage.website ?? '—'}</td><td>${c.usage.livefab ?? '—'}</td>
      <td>${total}</td><td><span class="chip ok">已接入</span></td></tr>`
  }).join('')
}

function docCards(rows: DocRow[]): string {
  return `<div class="grid g3">${rows.map(d => `<a class="card doc-card" href="docs/${esc(d.file)}">
    <code>${esc(d.file.replace(/\.md$/, ''))}</code><h3>${esc(d.title)}</h3></a>`).join('')}</div>`
}

// ── 主生成 ─────────────────────────────────────────────────────────────

function generate(): string {
  const loaded = loadTokens(DESIGN_ROOT)
  if (loaded.errors.length) throw new Error(loaded.errors.join('\n'))
  const tokens = loaded.tokens

  const refCount = [...tokens.keys()].filter(p => p.startsWith('ref.')).length
  const sysCount = [...tokens.keys()].filter(p => p.startsWith('sys.')).length
  const productCount = [...tokens.keys()].filter(p => p.startsWith('product.')).length
  const colors = colorRows(tokens)
  const ui = typeRows(tokens, 'ui')
  const editorial = typeRows(tokens, 'editorial')
  const cards = styleCards(tokens)
  const comps = components()
  const docRows = docs()
  const generated = buildAll(DESIGN_ROOT, WORKSPACE_ROOT).length
  const version = latestVersion()
  const exceptions = exceptionCounts()
  const usage = componentUsage()

  const images = ['kits/web/preview.png', 'docs/shots/website-home.png', 'docs/shots/livefab-home.png', 'docs/shots/website-search-search.png']
  for (const img of images) requireFile(img)

  const bg = getString(tokens, 'sys.color.bg.base')
  const surface = getString(tokens, 'sys.color.bg.surface')
  const raised = getString(tokens, 'sys.color.bg.raised')
  const text = getString(tokens, 'sys.color.text.primary')
  const dim = getString(tokens, 'sys.color.text.secondary')
  const muted = getString(tokens, 'sys.color.text.muted')
  const line = getString(tokens, 'sys.color.line.subtle')
  const lineStrong = getString(tokens, 'sys.color.line.strong')
  const teal = getString(tokens, 'sys.color.action.primary')
  const tealHi = getString(tokens, 'sys.color.action.primaryHover')
  const amber = getString(tokens, 'sys.color.feedback.warning')
  const rust = getString(tokens, 'sys.color.feedback.danger')
  const ok = getString(tokens, 'sys.color.feedback.success')
  const focus = getString(tokens, 'sys.color.focus.ring')
  const sans = getValue(tokens, 'ref.font.family.sans') as string[]
  const mono = getValue(tokens, 'ref.font.family.mono') as string[]

  const total = tokens.size
  const pct = (n: number) => `${((n / total) * 100).toFixed(1)}%`

  const spaces = ['4', '8', '12', '16', '24', '32'].map(k => ({
    key: k, px: dimensionToNumber(getString(tokens, `sys.space.${k}`)),
  }))
  const sizes = {
    control: ['sm', 'md', 'lg'].map(k => ({ key: k, px: dimensionToNumber(getString(tokens, `sys.size.control.${k}`)) })),
    touch: dimensionToNumber(getString(tokens, 'sys.size.touch.min')),
    icon: ['sm', 'md', 'lg'].map(k => ({ key: k, px: dimensionToNumber(getString(tokens, `sys.size.icon.${k}`)) })),
  }
  const motion = ['fast', 'base', 'slow'].map(k => ({
    key: k, ms: durationToNumber(getString(tokens, `sys.motion.duration.${k}`)),
  }))

  const decisions = [
    ['D1', '定位', '治理系统，而非风格指南', '已裁决'],
    ['D2', '品牌架构', '母品牌背书 + 产品子品牌', '已裁决'],
    ['D3', '系统模型', '五层 + ref / sys / product 三层 token', '已裁决'],
    ['D4', '单一事实来源', 'JSON 为源 + 生成各端 + CI 对账', '已裁决'],
    ['D5', '视觉基调', '双模 Archive + Console', '已裁决'],
    ['D6', '介质优先级', 'Web + Godot 先行；打印/实体后置', '已裁决'],
    ['D7', '治理权限', '设计主控可否决 token 违规', '已裁决'],
    ['D8', '版本策略', 'SemVer + 稳定性分级 + 弃用窗口', '已裁决'],
    ['D9', '资产与法务', '开源字体 + 自有图标 + 溯源', '已裁决'],
    ['D10', '首版范围', '地基 + 两个试点；外观基本不变', '已裁决'],
    ['D-011', '青橙理念', '9 篇 / 三批 / 上位理念', '已裁决'],
  ] as const

  const roadmap = [
    ['P0 决策与收编', 'done'],
    ['P1 地基', 'done'],
    ['P2 双试点', 'done'],
    ['P3 扩展（LiveFab / 明日频道 / 组件 / App kit）', 'doing'],
    ['P4 印刷', 'todo'],
    ['P5 实体', 'todo'],
  ] as const

  const gates = [
    ['Token 结构 / 类型 / 别名 / 字阶', 'check_tokens.ts', '7/7'],
    ['对比度 / 层级 / focus 分离', 'check_contrast.ts', '7/7'],
    ['裸色值 / 裸尺寸', 'check_no_raw_values.ts', '8/8'],
    ['生成物无 diff', 'build_tokens.ts --check', '8/8'],
    ['明日频道 .tres 风格卡对账', 'check_tomorrows_channel_skin.ts', '7/7'],
    ['组件契约 + 组件 CSS', 'check_component_contracts.ts', '8/8'],
    ['组件真实消费者审计', 'check_component_usage.ts', '4/4'],
    ['Web 组件层产物一致', 'build_web_kit.ts --check', '3/3'],
    ['HUB 与源一致（含自检）', 'build_hub.ts --check', '4/4'],
  ] as const

  const lightVars = '--bg:#F7F3EA; --surface:#FFFDF8; --raised:#EDE6D8; --text:#1B222B; --dim:#4F5B68; --muted:#5E6773; --line:#D8D0C1; --line-strong:#8A8275; --teal:#0B6B63; --teal-hi:#09544E; --amber:#7A4E00; --rust:#A83A14; --ok:#2F6B3A; --focus:#1D4ED8'
  const evolutionMetrics = [
    { key: 'tokens', name: '共享 token', past: '0', now: String(total), target: '≤260' },
    { key: 'cards', name: '风格卡', past: '0', now: String(cards.length), target: '5' },
    { key: 'contracts', name: '组件契约', past: '0', now: String(comps.length), target: '3–5' },
    { key: 'products', name: '已接入/登记产品', past: '0', now: '4', target: '5' },
    { key: 'media', name: '已落地介质', past: '0', now: '2', target: '5' },
    { key: 'a11y', name: '无障碍', past: '无闸门', now: 'AA', target: 'App+SR' },
  ] as const

  const timeline: Array<{
    when: string
    kind: 'future' | 'now' | 'past'
    title: string
    body: string
    tags?: string[]
    values?: Record<string, string>
  }> = [
    { when: '2027 H2', kind: 'future', title: '实体 / 打印介质起步', body: '等实体产品形态确定；先做材质/工艺/包装决策清单，再谈印刷与量产。', tags: ['介质 5/5', '打印 kit', '实体规范'], values: { tokens: '≤260', cards: '5', contracts: '3–5', products: '5', media: '5', a11y: 'App+SR' } },
    { when: '2027 H1', kind: 'future', title: 'App v0.3 + 第 5 张风格卡', body: '首个 App 消费者接入 app/tokens.json；真机走查后再决定 Swift/Kotlin 常量。', tags: ['产品 5', '风格卡 5', '组件 3–5'], values: { tokens: '≤260', cards: '5', contracts: '3–5', products: '5', media: '3', a11y: 'App+SR' } },
    { when: '2026 Q4', kind: 'future', title: 'Archive 亮色 + Form Field 第二消费者', body: '网站阅读页先行；找不到真实表单就不扩 Form Field。', tags: ['Archive 亮色', 'Form Field', '无障碍审计'], values: { tokens: '≤240', cards: '4', contracts: '3', products: '4', media: '2', a11y: 'Archive' } },
    { when: '2026-10-22 12:16', kind: 'now', title: '现在：v0.2.0 已发布，v0.3 起步', body: 'App kit 可接入但无真实 App；HUB 支持系统/亮色/暗色；下一步是 Archive 亮色与首个 App。', tags: [`${total} token`, `${cards.length} 风格卡`, `${comps.length} 契约`, '4 产品', '0 active 例外', 'HUB 三态'], values: { tokens: String(total), cards: String(cards.length), contracts: String(comps.length), products: '4', media: '2', a11y: 'AA' } },
    { when: '2026-10-22 09:54', kind: 'past', title: '入门长文', body: '把设计系统的概念、治理与失败模式写成一篇可读的入门文章。', tags: ['1.7 万字符'] },
    { when: '2026-10-21 15:33', kind: 'past', title: 'HUB 三态主题', body: 'HUB 支持查询参数与 localStorage 记忆；打印强制亮色。', tags: ['系统/亮色/暗色'] },
    { when: '2026-10-21 15:14', kind: 'past', title: '一页式 HUB', body: '把 Token / 风格卡 / 组件 / 产品 / 验收 / 决策收进一页。', tags: ['7 个 Tab', '生成物 8'] },
    { when: '2026-10-21 13:56', kind: 'past', title: 'App kit 起步', body: '平台无关 JSON + iOS/Android 规范；但无真实消费者。', tags: ['app/tokens.json', '20 色', '5 字阶'] },
    { when: '2026-10-21 13:50', kind: 'past', title: 'v0.2.0 发布', body: '设计系统 v0.2.0、网站 0.29.0、LiveFab 0.4.0、未来残片 0.22.0、明日频道 0.2.5。', tags: ['229 token', '4 风格卡', '3 契约', '53 Tab'], values: { tokens: '229', cards: '4', contracts: '3', products: '4', media: '2', a11y: 'AA' } },
    { when: '2026-10-21 13:47', kind: 'past', title: '皮肤收口', body: '卡片交回 lr-panel，删除重复皮肤；发现 nowrap 回归并修复。', tags: ['8px 面板', '技术/描边按钮'] },
    { when: '2026-10-21 13:37', kind: 'past', title: '53 步 Tab 走查', body: '网站首页 / Wiki / 搜索 / LiveFab；Bun 运行时崩溃，改用 Node 完成。', tags: ['4 页', '0 缺失焦点'], values: { a11y: '0 缺失焦点' } },
    { when: '2026-10-21 13:25', kind: 'past', title: '共享 Web 组件层', body: '渐进接入网站与 LiveFab；产品皮肤暂时保留。', tags: ['button/panel/field'] },
    { when: '2026-10-21 13:12', kind: 'past', title: '3 个组件契约', body: 'button / form-field / panel 契约先于实现；尺寸 token 补齐。', tags: ['229 token'], values: { tokens: '229', contracts: '3' } },
    { when: '2026-10-21 13:09', kind: 'past', title: '风格卡 + M1/M2 block', body: '明日频道磁带卡登记；design/ 纳入结构闸门。', tags: ['4 风格卡', 'block'], values: { cards: '4', products: '4' } },
    { when: '2026-10-21 13:04', kind: 'past', title: '网站 token 化 + LiveFab', body: '网站全量颜色 token 化；LiveFab 接入 12 个颜色。', tags: ['2 产品', '裸值 0'], values: { tokens: '206', cards: '3', products: '3', media: '2' } },
    { when: '2026-10-21 12:43', kind: 'past', title: 'v0.1 地基', body: '三层 token、生成器、四道闸门、网站/游戏两个试点。', tags: ['186 token', '5 生成物', '4 闸门'], values: { tokens: '186', cards: '2', contracts: '0', products: '2', media: '2' } },
    { when: '2026-10-21 12:26', kind: 'past', title: '立项决策包', body: '先裁决治理、架构、双模、版本策略，再动手。', tags: ['D1–D10', '0 实现'] },
    { when: '2026-10 之前', kind: 'past', title: '没有统一系统之前', body: '网站 theme.css、游戏 tokens.json、LiveFab 内联样式、明日频道 .tres 各自演化。', tags: ['4 套视觉', 'focus 复用', '0 共享 token'], values: { tokens: '0', cards: '0', contracts: '0', products: '0', media: '0', a11y: '无闸门' } },
  ]

  const timelineHtml = timeline.map(item => `<tr class="${item.kind}">
    <td class="evo-main">
      <div class="tl-when">${esc(item.when)}${item.kind === 'now' ? ' <span class="tl-now">NOW</span>' : ''}</div>
      <h3>${esc(item.title)}</h3>
      <p>${esc(item.body)}</p>
      ${item.tags?.length ? `<div class="tl-tags">${item.tags.map(t => `<span class="tl-tag">${esc(t)}</span>`).join('')}</div>` : ''}
    </td>
    ${evolutionMetrics.map(m => {
      const v = item.values?.[m.key]
      return `<td class="mcell">${v ? `<span class="mval">${esc(v)}</span>` : '<span class="mempty">·</span>'}</td>`
    }).join('')}
  </tr>`).join('')

  const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>青橙设计 · LRDS HUB</title>
<script>
(function(){
  try {
    var q = new URLSearchParams(location.search).get('theme');
    var t = (q === 'light' || q === 'dark' || q === 'system')
      ? q
      : (localStorage.getItem('lrds-hub-theme') || 'system');
    document.documentElement.dataset.theme = t;
  } catch (e) {
    document.documentElement.dataset.theme = 'system';
  }
})();
</script>
<!-- 由 design/tools/build_hub.ts 生成；不要手改。 -->
<style>
  :root{
    --bg:${bg}; --surface:${surface}; --raised:${raised};
    --text:${text}; --dim:${dim}; --muted:${muted};
    --line:${line}; --line-strong:${lineStrong};
    --teal:${teal}; --teal-hi:${tealHi}; --amber:${amber}; --rust:${rust}; --ok:${ok}; --focus:${focus};
    --radius:8px; --gap:16px;
    --sans:${sans.join(', ')};
    --mono:${mono.join(', ')};
    color-scheme:dark;
  }
  html[data-theme="light"]{ ${lightVars}; color-scheme:light; }
  @media (prefers-color-scheme: light){
    html[data-theme="system"]{ ${lightVars}; color-scheme:light; }
  }
  *{box-sizing:border-box}
  html,body{margin:0;padding:0;background:var(--bg);color:var(--text);font:15px/1.65 var(--sans)}
  a{color:var(--focus);text-decoration:none;border-bottom:1px solid color-mix(in srgb,var(--focus) 40%,transparent)}
  a:hover{border-bottom-color:var(--focus)}
  code{font-family:var(--mono);background:var(--bg);border:1px solid var(--line);border-radius:4px;padding:1px 5px;font-size:.88em}
  .topbar{position:sticky;top:0;z-index:10;background:linear-gradient(180deg,var(--bg) 0%,var(--bg) 70%,color-mix(in srgb,var(--bg) 92%,transparent) 100%);border-bottom:1px solid var(--line);padding:12px 22px 0}
  .topline{display:flex;align-items:baseline;gap:14px;flex-wrap:wrap}
  .brand{font-size:19px;font-weight:700;letter-spacing:.03em}
  .brand .en{color:var(--muted);font-weight:400;font-size:12.5px;margin-left:8px}
  .stamp{margin-left:auto;color:var(--muted);font-size:12.5px;font-family:var(--mono)}
  .theme-switch{display:flex;gap:2px;border:1px solid var(--line);border-radius:999px;padding:2px;background:var(--bg)}
  .theme-switch button{appearance:none;border:0;background:transparent;color:var(--dim);font:inherit;font-size:12px;padding:4px 9px;border-radius:999px;cursor:pointer}
  .theme-switch button:hover{color:var(--text)}
  .theme-switch button[aria-pressed="true"]{background:var(--surface);color:var(--teal);font-weight:600;box-shadow:inset 0 0 0 1px var(--teal)}
  .theme-switch button:focus-visible{outline:2px solid var(--focus);outline-offset:1px}
  .hint{color:var(--dim);font-size:12.5px;margin:3px 0 10px}
  nav.tabs{display:flex;gap:4px;margin-top:10px;flex-wrap:wrap}
  nav.tabs button{appearance:none;background:transparent;color:var(--dim);border:1px solid transparent;border-bottom:none;border-radius:8px 8px 0 0;padding:9px 14px;font:inherit;font-size:14px;cursor:pointer}
  nav.tabs button:hover{color:var(--text);background:color-mix(in srgb,var(--text) 3%,transparent)}
  nav.tabs button[aria-selected="true"]{background:var(--surface);color:var(--text);border-color:var(--line);box-shadow:inset 0 2px 0 var(--teal)}
  nav.tabs button .n{color:var(--muted);font-size:12px;margin-right:6px}
  main{max-width:1200px;margin:0 auto;padding:22px}
  .panel{display:block}
  body.js .panel{display:none}
  body.js .panel.active{display:block;animation:fade .18s ease-out}
  @keyframes fade{from{opacity:0;transform:translateY(3px)}to{opacity:1;transform:none}}
  h2{font-size:20px;margin:2px 0 4px;padding-bottom:8px;border-bottom:1px solid var(--line)}
  h3{font-size:15px;margin:18px 0 8px;color:var(--teal)}
  h3:first-child{margin-top:4px}
  h4.group-title{font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);margin:18px 0 8px;font-family:var(--mono)}
  .lede{color:var(--dim);margin:8px 0 16px;max-width:80ch}
  .grid{display:grid;gap:var(--gap)}
  .g2{grid-template-columns:repeat(2,1fr)} .g3{grid-template-columns:repeat(3,1fr)} .g4{grid-template-columns:repeat(4,1fr)}
  .card{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);padding:15px 16px}
  .card h3{margin:0 0 6px;color:var(--text)}
  .card p{margin:6px 0;color:var(--dim);font-size:13.5px}
  .stats{display:grid;grid-template-columns:repeat(6,1fr);gap:12px;margin:10px 0 18px}
  .stat{background:var(--bg);border:1px solid var(--line);border-radius:var(--radius);padding:13px 14px}
  .stat .v{font-size:25px;font-weight:700;line-height:1.15;font-variant-numeric:tabular-nums;font-family:var(--mono)}
  .stat .l{color:var(--dim);font-size:12.5px;margin-top:3px}
  .stat.a .v{color:var(--teal)} .stat.b .v{color:var(--amber)} .stat.c .v{color:var(--ok)}
  .bar{display:flex;height:16px;border-radius:999px;overflow:hidden;border:1px solid var(--line);margin:10px 0 6px}
  .bar span{display:block;height:100%}
  .bar .r{background:var(--teal)} .bar .s{background:var(--amber)} .bar .p{background:var(--rust)}
  .bar-label{display:flex;gap:18px;flex-wrap:wrap;color:var(--dim);font-size:12.5px}
  .bar-label b{color:var(--text);font-family:var(--mono)}
  .swatches{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:8px}
  .swatch{display:flex;gap:10px;align-items:center;text-align:left;background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);padding:8px;color:var(--text);font:inherit;cursor:pointer}
  .swatch:hover,.swatch:focus-visible{border-color:var(--focus);outline:2px solid var(--focus);outline-offset:1px}
  .swatch-chip{width:38px;height:38px;border-radius:4px;background:var(--c);border:1px solid var(--line-strong);flex:none;
    background-image:linear-gradient(45deg,color-mix(in srgb,var(--text) 8%,transparent) 25%,transparent 25%,transparent 75%,color-mix(in srgb,var(--text) 8%,transparent) 75%),linear-gradient(45deg,color-mix(in srgb,var(--text) 8%,transparent) 25%,transparent 25%,transparent 75%,color-mix(in srgb,var(--text) 8%,transparent) 75%);background-size:10px 10px;background-position:0 0,5px 5px}
  .swatch-meta{display:grid;gap:1px;min-width:0}
  .swatch-meta b{font-size:12.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .swatch-meta code{font-size:11px;padding:0 4px;width:max-content}
  .swatch-meta small{color:var(--muted);font-size:11px}
  .type-list{display:grid;gap:10px}
  .type-row{display:grid;grid-template-columns:220px minmax(0,1fr);gap:16px;align-items:start;border-bottom:1px dashed var(--line);padding-bottom:10px}
  .type-meta{display:grid;gap:2px;color:var(--dim);font-size:12.5px}
  .type-meta small{color:var(--muted);font-family:var(--mono)}
  .type-sample{white-space:normal;overflow-wrap:anywhere}
  .scale-row{display:flex;align-items:center;gap:14px;margin:7px 0;color:var(--dim);font-size:12.5px}
  .scale-row .lab{width:120px;font-family:var(--mono);color:var(--text)}
  .scale-bar{height:12px;background:linear-gradient(90deg,var(--teal),var(--teal-hi));border-radius:3px;min-width:2px}
  .scale-box{background:var(--raised);border:1.5px solid var(--line-strong)}
  .card-head{display:flex;align-items:baseline;justify-content:space-between;gap:10px}
  .card-head code{font-size:10.5px;color:var(--dim)}
  .muted{color:var(--muted)}
  .mini-swatches{display:flex;flex-wrap:wrap;gap:4px;margin:10px 0}
  .mini{width:22px;height:22px;border-radius:3px;background:var(--c);border:1px solid var(--line-strong)}
  .lighting{display:flex;flex-wrap:wrap;gap:6px;color:var(--dim);font-size:12px}
  .lighting span{background:var(--bg);border:1px solid var(--line);border-radius:999px;padding:2px 8px}
  .lighting b{color:var(--text);font-family:var(--mono);font-weight:500}
  .links{margin:10px 0 0!important;font-size:12.5px}
  table{width:100%;border-collapse:collapse;margin:10px 0;font-size:13.5px}
  th,td{text-align:left;padding:8px 10px;border-bottom:1px solid var(--line);vertical-align:top}
  th{color:var(--muted);font-size:12px;font-weight:500;letter-spacing:.04em;text-transform:uppercase}
  tr:hover td{background:color-mix(in srgb,var(--text) 2%,transparent)}
  .chip{display:inline-block;border:1px solid var(--line);border-radius:999px;padding:2px 9px;font-size:11.5px;color:var(--dim);white-space:nowrap}
  .chip.ok{color:var(--ok);border-color:color-mix(in srgb,var(--ok) 40%,transparent)}
  .chip.acc{color:var(--teal);border-color:color-mix(in srgb,var(--teal) 40%,transparent)}
  .chip.warn{color:var(--amber);border-color:color-mix(in srgb,var(--amber) 40%,transparent)}
  .chip.todo{color:var(--rust);border-color:color-mix(in srgb,var(--rust) 40%,transparent)}
  .gate{display:flex;align-items:baseline;gap:10px;padding:8px 0;border-bottom:1px dashed var(--line)}
  .gate .dot{width:8px;height:8px;border-radius:50%;background:var(--ok);flex:none;margin-top:7px}
  .gate .name{flex:1}
  .gate code{font-size:11.5px}
  .gate .st{color:var(--ok);font-family:var(--mono);font-size:12px}
  .shots{display:grid;grid-template-columns:repeat(2,1fr);gap:14px;align-items:start}
  .shot{display:block;background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);overflow:hidden;border-bottom:1px solid var(--line)}
  .shot:hover{border-color:var(--line-strong)}
  .shot img{display:block;width:100%;height:auto;max-height:420px;object-fit:cover;object-position:top;border-bottom:1px solid var(--line)}
  .shot p{margin:10px 12px;color:var(--dim);font-size:12.5px}
  .doc-card{display:block;border-bottom:1px solid var(--line)}
  .doc-card h3{font-size:13.5px;margin:4px 0 0}
  .doc-card code{font-size:11px;color:var(--muted)}
  .callout{background:var(--surface);border-left:3px solid var(--teal);padding:12px 14px;border-radius:0 var(--radius) var(--radius) 0;color:var(--dim);margin:12px 0}
  .callout b{color:var(--text)}
  .evo-note{color:var(--dim);font-size:12.5px;margin:6px 0 12px}
  .tl-legend{display:flex;gap:16px;flex-wrap:wrap;color:var(--muted);font-size:11.5px;font-family:var(--mono);margin:6px 0 14px}
  .tl-legend b{color:var(--teal)}
  .evo-scroll{overflow-x:auto;border:1px solid var(--line);border-radius:var(--radius);background:var(--surface)}
  .evo-table{width:100%;min-width:1120px;border-collapse:separate;border-spacing:0;table-layout:fixed}
  .evo-table th,.evo-table td{border-bottom:1px solid var(--line);vertical-align:top}
  .evo-table thead th{background:var(--raised);padding:10px 8px;text-align:left;font-size:11px;color:var(--muted);font-weight:500;text-transform:none;letter-spacing:.02em}
  .evo-table thead th.evo-main{width:42%;padding-left:26px}
  .evo-table thead th.mh{width:9.6%;border-left:1px solid var(--line)}
  .evo-table thead th.mh span{display:block;color:var(--text);font-size:11.5px;font-family:var(--mono);line-height:1.3}
  .evo-table thead th.mh small{display:block;color:var(--muted);font-size:9.5px;font-family:var(--mono);margin-top:3px;line-height:1.3}
  .evo-table tbody td{border-left:1px solid var(--line);padding:0}
  .evo-table tbody td.evo-main{border-left:2px solid var(--line);padding:12px 14px 12px 26px;position:relative;background:var(--surface)}
  .evo-table tbody tr.future td.evo-main{border-left-color:var(--teal);border-left-style:dashed}
  .evo-table tbody tr.now td.evo-main{border-left-color:var(--teal)}
  .evo-table tbody td.evo-main::before{content:'';position:absolute;left:-7px;top:18px;width:12px;height:12px;border-radius:50%;background:var(--bg);border:2px solid var(--line-strong);z-index:2}
  .evo-table tbody tr.future td.evo-main::before{border-color:var(--teal);border-style:dashed}
  .evo-table tbody tr.now td.evo-main::before{background:var(--teal);border-color:var(--teal);box-shadow:0 0 0 4px color-mix(in srgb,var(--teal) 18%,transparent)}
  .evo-table tbody tr.past td.evo-main::before{background:var(--line);border-color:var(--line)}
  .evo-table tbody tr.now td{background:color-mix(in srgb,var(--teal) 7%,var(--surface))}
  .evo-table tbody td.evo-main h3{margin:0 0 4px;font-size:13.5px;color:var(--text)}
  .evo-table tbody td.evo-main p{margin:0;color:var(--dim);font-size:12px;line-height:1.5}
  .tl-tags{display:flex;flex-wrap:wrap;gap:4px;margin-top:7px}
  .tl-tag{font-family:var(--mono);font-size:10px;color:var(--dim);border:1px solid var(--line);border-radius:999px;padding:1px 6px;background:var(--bg)}
  .evo-table tbody tr.future .tl-tag{color:var(--amber);border-color:color-mix(in srgb,var(--amber) 35%,transparent);background:transparent}
  .evo-table tbody tr.now .tl-tag{color:var(--teal);border-color:color-mix(in srgb,var(--teal) 35%,transparent)}
  .evo-table tbody tr.past .tl-tag{color:var(--dim)}
  .evo-table tbody tr.future td.evo-main h3{color:var(--dim)}
  .evo-table tbody tr.past td.evo-main h3{color:var(--text)}
  .evo-table tbody td.mcell{width:9.6%;padding:12px 6px;text-align:center;font-family:var(--mono);font-size:11.5px}
  .evo-table tbody td.mcell .mval{display:inline-block;color:var(--teal);background:color-mix(in srgb,var(--teal) 8%,transparent);border:1px solid color-mix(in srgb,var(--teal) 35%,transparent);border-radius:999px;padding:2px 7px;font-size:10.5px;white-space:nowrap}
  .evo-table tbody tr.future td.mcell .mval{color:var(--amber);background:transparent;border-color:color-mix(in srgb,var(--amber) 40%,transparent)}
  .evo-table tbody tr.past td.mcell .mval{color:var(--dim);background:transparent;border-color:var(--line)}
  .evo-table tbody td.mcell .mempty{color:var(--line);opacity:.65}
  .tl-when{font-family:var(--mono);font-size:10.5px;color:var(--muted);letter-spacing:.04em;margin-bottom:3px}
  .tl-now{display:inline-block;background:var(--teal);color:var(--bg);border-radius:999px;padding:1px 6px;font-size:9px;font-weight:700;letter-spacing:.08em}
  .toast{position:fixed;right:18px;bottom:18px;background:var(--raised);border:1px solid var(--line-strong);color:var(--text);border-radius:8px;padding:8px 12px;font-size:12.5px;opacity:0;transform:translateY(4px);transition:.18s;pointer-events:none;z-index:50}
  .toast.on{opacity:1;transform:none}
  input[type=search]{width:100%;max-width:420px;background:var(--bg);border:1.5px solid var(--line-strong);border-radius:4px;color:var(--text);padding:8px 10px;font:inherit;font-size:13px;margin:8px 0 12px}
  input[type=search]:focus{outline:2px solid var(--focus);outline-offset:1px}
  @media (max-width:900px){.stats{grid-template-columns:repeat(3,1fr)}.g4,.g3,.g2,.shots,.metric-grid{grid-template-columns:1fr 1fr}.type-row{grid-template-columns:1fr}.topbar{padding:10px 14px 0}main{padding:16px}.timeline{padding-left:28px}.tl-item::before{left:-23px}}
  @media print{
    :root, html[data-theme]{
      --bg:#fff; --surface:#fff; --raised:#f5f5f5;
      --text:#111; --dim:#333; --muted:#444;
      --line:#bbb; --line-strong:#777;
      --teal:#0B6B63; --teal-hi:#09544E; --amber:#7A4E00; --rust:#A83A14; --ok:#2F6B3A; --focus:#1D4ED8;
      color-scheme:light;
    }
    body{background:#fff;color:#111}
    .topbar,nav.tabs,.toast,input[type=search],.theme-switch{display:none!important}
    main{max-width:none;padding:0}
    body.js .panel{display:block!important;break-inside:auto}
    .card,.stat,.shot,.gate,.tl-item{break-inside:avoid}
    a{color:#111;border-bottom:none}
    .swatch,.card,.stat{background:#fff;border-color:#bbb}
    .hint,.lede,.muted,.swatch-meta small{color:#444}
  }
</style>
</head>
<body>
<header class="topbar">
  <div class="topline">
    <div class="brand">青橙设计 · LRDS<span class="en">LiveRefu Design System</span></div>
    <div class="stamp">v${esc(version)} 已发布 ｜ App kit 起步（未发布）</div>
    <div class="theme-switch" role="group" aria-label="主题">
      <button type="button" data-theme-set="system" aria-pressed="true">系统</button>
      <button type="button" data-theme-set="light" aria-pressed="false">亮色</button>
      <button type="button" data-theme-set="dark" aria-pressed="false">暗色</button>
    </div>
  </div>
  <div class="hint">一页看完：总览 / 演进 / Token / 风格卡 / 组件 / 产品 / 验收 / 决策。由 <code>design/tools/build_hub.ts</code> 生成；点击色块可复制色值；右上角可切换系统 / 亮色 / 暗色。打印时自动展开全部 Tab。</div>
  <nav class="tabs" role="tablist">
    <button role="tab" data-tab="overview" aria-selected="true"><span class="n">01</span>总览</button>
    <button role="tab" data-tab="evolution"><span class="n">02</span>演进</button>
    <button role="tab" data-tab="tokens"><span class="n">03</span>Token</button>
    <button role="tab" data-tab="cards"><span class="n">04</span>风格卡</button>
    <button role="tab" data-tab="components"><span class="n">05</span>组件</button>
    <button role="tab" data-tab="products"><span class="n">06</span>产品</button>
    <button role="tab" data-tab="checks"><span class="n">07</span>验收</button>
    <button role="tab" data-tab="decisions"><span class="n">08</span>决策与文档</button>
  </nav>
</header>
<main>
  <section class="panel active" id="panel-overview">
    <h2>总览</h2>
    <p class="lede">一套语法，多种介质。设计系统不是配色表：它把品牌、语义 token、组件契约、介质适配、资产与评审收在一套可机器校验的结构里。</p>
    <div class="stats">
      <div class="stat a"><div class="v">${total}</div><div class="l">Token 总数</div></div>
      <div class="stat"><div class="v">${cards.length}</div><div class="l">风格卡</div></div>
      <div class="stat"><div class="v">${comps.length}</div><div class="l">组件契约</div></div>
      <div class="stat b"><div class="v">4</div><div class="l">已接入产品</div></div>
      <div class="stat c"><div class="v">${generated}</div><div class="l">生成物</div></div>
      <div class="stat"><div class="v">${exceptions.active}</div><div class="l">Active 例外</div></div>
    </div>
    <h3>Token 构成</h3>
    <div class="bar"><span class="r" style="width:${pct(refCount)}"></span><span class="s" style="width:${pct(sysCount)}"></span><span class="p" style="width:${pct(productCount)}"></span></div>
    <div class="bar-label"><span><b>ref ${refCount}</b> 原始值</span><span><b>sys ${sysCount}</b> 通用语义</span><span><b>product ${productCount}</b> 产品/纪元</span></div>
    <h3>八条原则</h3>
    <div class="grid g4">
      <div class="card"><h3>先语义，后色值</h3><p>业务代码只引用 <code>sys.*</code> 或 <code>product.*</code>。</p></div>
      <div class="card"><h3>一套语法，多种介质</h3><p>Web / Godot / App / 印刷共用层级与无障碍下限。</p></div>
      <div class="card"><h3>产品可变，理解方式不变</h3><p>换风格卡，不换信息位置与交互语法。</p></div>
      <div class="card"><h3>可访问性是闸门</h3><p>对比度、焦点、减少动态、缩放由机器守。</p></div>
      <div class="card"><h3>单一事实来源</h3><p>JSON 只写一次；CSS / Godot / App 由脚本生成。</p></div>
      <div class="card"><h3>设计是闸门</h3><p>实现前有规格，发布前有验收；设计债按 P1 处理。</p></div>
      <div class="card"><h3>先收编，再统一</h3><p>不推翻既有合理差异；先对齐语义，再替换取值。</p></div>
      <div class="card"><h3>两个试点</h3><p>没有真实消费者，不算交付。</p></div>
    </div>
    <h3>产品覆盖</h3>
    <table>
      <thead><tr><th>产品</th><th>介质</th><th>状态</th><th>消费什么</th></tr></thead>
      <tbody>
        <tr><td><a href="../projects/website/README.md">未来档案</a></td><td>Web</td><td><span class="chip ok">已发布 0.29.0</span></td><td>Web token + 组件层（button/panel/field）</td></tr>
        <tr><td><a href="../projects/livefab/README.md">LiveFab</a></td><td>Web</td><td><span class="chip ok">已发布 0.4.0</span></td><td>Web token + 组件层（button/panel）</td></tr>
        <tr><td><a href="../projects/mainline/future-debris/README.md">未来残片</a></td><td>Godot</td><td><span class="chip ok">已发布 0.22.0</span></td><td>Godot token → Theme</td></tr>
        <tr><td><a href="../projects/tomorrows-channel/README.md">明日频道</a></td><td>Godot</td><td><span class="chip acc">风格卡已登记 0.2.5</span></td><td>ChannelSkin .tres ↔ token 对账</td></tr>
        <tr><td>App kit</td><td>iOS / Android</td><td><span class="chip warn">起步，无消费者</span></td><td>平台无关 app/tokens.json</td></tr>
        <tr><td>Refu Game 001</td><td>Godot</td><td><span class="chip">冻结</span></td><td>不迁移；若复活按新产品接入</td></tr>
      </tbody>
    </table>
    <div class="callout"><b>当前边界</b>：设计系统 v0.2 已发布；App kit 是“可接入”而不是“已接入”。Form Field 只有网站搜索框一个真实消费者。</div>
  </section>

  <section class="panel" id="panel-evolution">
    <h2>演进</h2>
    <p class="lede">从未来的预期向下滚动，经过现在，回到已经发生的历史。未来是目标，<b>不是承诺</b>；现在是 2026-10-22 的快照；过去的时间取提交 author time，精确到分。</p>
    <div class="tl-legend"><span><b>↑ 未来预期</b>（非承诺）</span><span><b>● 现在</b>（2026-10-22 快照）</span><span><b>↓ 过去历史</b>（提交 / 发布）</span></div>
    <div class="evo-scroll">
      <table class="evo-table">
        <thead><tr><th class="evo-main">时间 / 事件</th>${evolutionMetrics.map(m => `<th class="mh"><span>${esc(m.name)}</span><small>${esc(m.past)} → ${esc(m.now)} → ${esc(m.target)}</small></th>`).join('')}</tr></thead>
        <tbody>${timelineHtml}</tbody>
      </table>
    </div>
    <div class="callout"><b>怎么读</b>：左列是时间与主事件，右边六列是同一时间点的指标快照；<b>·</b> 表示该点没有变化/没有新增。表头的小字是“过去 → 现在 → 预期”。未来目标不是 OKR，也不是日期承诺，只是当前判断下的方向。</div>
  </section>

  <section class="panel" id="panel-tokens">
    <h2>Token</h2>
    <p class="lede">颜色按语义角色分组；数值是当前 <code>sys.*</code> 取值。对比度是相对 <code>bg.base</code> 的 WCAG 比值（alpha 色不参与文字对比度）。</p>
    <input type="search" id="token-filter" placeholder="过滤 token 或色值，例如 focus / #8AB4F8">
    <div id="token-groups">${colorGroups(colors)}</div>

    <h3>UI 字阶（5 级）</h3>
    ${typeSample(ui, 'ui')}
    <h3>Editorial 字阶（7 级）</h3>
    ${typeSample(editorial, 'editorial')}

    <h3>尺寸 / 间距 / 圆角 / 描边 / 动效</h3>
    <div class="grid g2">
      <div class="card">
        <h3>间距（4 基数）</h3>
        ${spaces.map(s => `<div class="scale-row"><span class="lab">${s.key}px</span><span class="scale-bar" style="width:${s.px * 4}px"></span></div>`).join('')}
      </div>
      <div class="card">
        <h3>控件 / 触控 / 图标</h3>
        ${sizes.control.map(s => `<div class="scale-row"><span class="lab">control.${s.key}</span><span class="scale-bar" style="width:${s.px * 4}px"></span><span>${s.px}px</span></div>`).join('')}
        <div class="scale-row"><span class="lab">touch.min</span><span class="scale-bar" style="width:${sizes.touch * 4}px"></span><span>${sizes.touch}px</span></div>
        ${sizes.icon.map(s => `<div class="scale-row"><span class="lab">icon.${s.key}</span><span class="scale-bar" style="width:${s.px * 6}px"></span><span>${s.px}px</span></div>`).join('')}
      </div>
      <div class="card">
        <h3>圆角 / 描边</h3>
        <div class="grid g2">
          <div class="scale-box" style="border-radius:4px;padding:14px;text-align:center">4px control</div>
          <div class="scale-box" style="border-radius:8px;padding:14px;text-align:center">8px panel</div>
        </div>
        <p class="muted">交互描边 1.5px；焦点环 2px + offset 1px。</p>
      </div>
      <div class="card">
        <h3>动效</h3>
        ${motion.map(m => `<div class="scale-row"><span class="lab">${m.key}</span><span class="scale-bar" style="width:${m.ms}px"></span><span>${m.ms}ms</span></div>`).join('')}
        <p class="muted">standard / emphasis 两条曲线；减少动态时归零。</p>
      </div>
    </div>
  </section>

  <section class="panel" id="panel-cards">
    <h2>风格卡</h2>
    <p class="lede">风格卡不是主题：它换的是色板、材质、光源、装饰母题与图像处理；语法层（字阶、间距、焦点、信息位置）不变。</p>
    <div class="grid g2">${cards.map(styleCardHtml).join('')}</div>
    <h3>登记表</h3>
    <table>
      <thead><tr><th>ID</th><th>产品</th><th>颜色</th><th>源</th><th>投影</th></tr></thead>
      <tbody>${cards.map(c => `<tr><td><code>${esc(c.id)}</code></td><td>${esc(c.name)}</td><td>${c.colors.length}</td><td><a href="${esc(c.source)}">JSON</a></td><td>${c.projection ? `<a href="${esc(c.projection)}">打开</a>` : '—'}</td></tr>`).join('')}</tbody>
    </table>
    <p class="lede">完整可变/不变边界、对账方式见 <a href="docs/07_风格卡登记.md">07 风格卡登记</a>。</p>
  </section>

  <section class="panel" id="panel-components">
    <h2>组件</h2>
    <p class="lede">契约先于实现：只规定解剖、状态、键盘/无障碍、Do/Don't、跨端与 token。当前 3 个组件都已在真实产品接入；Form Field 只有网站搜索框一个消费者。</p>
    <table>
      <thead><tr><th>组件</th><th>Token 引用</th><th>网站</th><th>LiveFab</th><th>总引用</th><th>状态</th></tr></thead>
      <tbody>${componentRows(comps)}</tbody>
    </table>
    <div class="grid g3">
      ${comps.map(c => `<a class="card doc-card" href="components/${esc(c.file)}"><code>${esc(c.file)}</code><h3>${esc(c.title)}</h3><p>${c.tokens} 个 token 引用</p></a>`).join('')}
    </div>
    <h3>组件层预览</h3>
    <a class="shot" href="kits/web/preview.html"><img src="kits/web/preview.png" alt="LRDS Web Components 预览"><p>button / panel / field 的状态总览；真实渲染，不是手绘。点击看全图。</p></a>
    <div class="callout"><b>皮肤收口</b>：卡片 8px 圆角、技术/描边按钮变体已进入组件层；产品侧重复的 <code>.deco-btn</code> / <code>.card</code> / <code>.cta</code> / <code>ul.svc li</code> 基础皮肤已删除。见 <a href="docs/10_皮肤收口_v0.2.md">10 皮肤收口</a>。</div>
  </section>

  <section class="panel" id="panel-products">
    <h2>产品</h2>
    <p class="lede">同一套语法，不同介质。截图来自真实构建 + Headless Chrome，Tab 走查记录在 <a href="docs/09_产品走查_v0.2.md">09 产品走查</a>。</p>
    <div class="shots">
      <a class="shot" href="docs/shots/website-home.png"><img src="docs/shots/website-home.png" alt="未来档案首页"><p><b>未来档案</b> · Web · 0.29.0 ｜ 4 页 / 53 步 Tab / 0 缺失焦点 · 点击看全图</p></a>
      <a class="shot" href="docs/shots/livefab-home.png"><img src="docs/shots/livefab-home.png" alt="LiveFab 首页"><p><b>LiveFab</b> · Web · 0.4.0 ｜ 服务卡片与 CTA 已使用组件层 · 点击看全图</p></a>
      <a class="shot" href="docs/shots/website-search-search.png"><img src="docs/shots/website-search-search.png" alt="网站搜索弹窗"><p><b>搜索弹窗</b> · Meta+K 打开；输入框焦点使用独立蓝 · 点击看全图</p></a>
      <a class="shot" href="../projects/mainline/future-debris/docs/shots/theme_preview.png"><img src="../projects/mainline/future-debris/docs/shots/theme_preview.png" alt="未来残片主题预览"><p><b>未来残片</b> · Godot · 0.22.0 ｜ token → Theme，15 项断言 · 点击看全图</p></a>
    </div>
    <table>
      <thead><tr><th>产品</th><th>介质</th><th>版本</th><th>证据</th></tr></thead>
      <tbody>
        <tr><td>未来档案</td><td>Nuxt / Web</td><td>0.29.0</td><td><a href="../projects/website/README.md">README</a> · <a href="docs/09_产品走查_v0.2.md">走查</a></td></tr>
        <tr><td>LiveFab</td><td>Astro / Web</td><td>0.4.0</td><td><a href="../projects/livefab/README.md">README</a> · <a href="docs/09_产品走查_v0.2.md">走查</a></td></tr>
        <tr><td>未来残片</td><td>Godot</td><td>0.22.0</td><td><a href="../projects/mainline/future-debris/README.md">README</a> · <a href="../projects/mainline/future-debris/docs/shots/README.md">截图</a></td></tr>
        <tr><td>明日频道</td><td>Godot</td><td>0.2.5</td><td><a href="docs/07_风格卡登记.md">风格卡</a> · <a href="../projects/tomorrows-channel/game/scenes/channel/skins/tape_channel_skin.tres">.tres</a></td></tr>
        <tr><td>App kit</td><td>iOS / Android</td><td>未发布</td><td><a href="kits/app/README.md">规范</a> · <a href="tokens/dist/app/tokens.json">tokens.json</a>（无真实消费者）</td></tr>
      </tbody>
    </table>
  </section>

  <section class="panel" id="panel-checks">
    <h2>验收</h2>
    <p class="lede">机器守的部分：四道通用闸门 + 风格卡 + 组件契约 + 使用审计 + 生成物一致性。运行 <code>bash design/tools/check.sh</code> 可全部复跑。</p>
    <div class="grid g2">
      <div class="card">
        <h3>闸门</h3>
        ${gates.map(([name, tool, st]) => `<div class="gate"><span class="dot"></span><span class="name">${esc(name)}</span><code>${esc(tool)}</code><span class="st">${esc(st)}</span></div>`).join('')}
      </div>
      <div class="card">
        <h3>状态</h3>
        <p><span class="chip ok">M1/M2 block</span> <span class="chip ok">链接 0 失效</span> <span class="chip ok">对比度 AA</span> <span class="chip ok">Tab 0 缺失焦点</span></p>
        <p><span class="chip warn">Form Field 1 个消费者</span> <span class="chip warn">App kit 无消费者</span> <span class="chip">打印/实体后置</span></p>
        <h3>例外</h3>
        <p>Active <b>${exceptions.active}</b> ｜ Resolved <b>${exceptions.resolved}</b>。见 <a href="docs/exceptions.md">例外登记</a>。</p>
        <h3>已知债务</h3>
        <p>首个 App 消费者未出现；Form Field 等待第二个真实表单；打印/实体按 D6 后置。</p>
      </div>
    </div>
    <div class="callout"><b>运行时提醒</b>：网站构建产物在本机 Bun 1.4.0 下曾触发 NAPI 崩溃，走查改用 Node 完成；部署前需按目标运行时复核。详见 <a href="docs/09_产品走查_v0.2.md">09 产品走查 §一</a>。</div>
  </section>

  <section class="panel" id="panel-decisions">
    <h2>决策与文档</h2>
    <h3>决策总表</h3>
    <table>
      <thead><tr><th>#</th><th>决策</th><th>选择</th><th>状态</th></tr></thead>
      <tbody>${decisions.map(([id, name, choice, st]) => `<tr><td><code>${id}</code></td><td>${esc(name)}</td><td>${esc(choice)}</td><td><span class="chip ok">${esc(st)}</span></td></tr>`).join('')}</tbody>
    </table>
    <p class="lede">青橙理念（D-011）：<a href="philosophy/README.md">系列索引</a> · <a href="philosophy/00_总纲_青橙设计.md">00 总纲</a> · <a href="philosophy/01_未来考古_复古未来不是怀旧.md">01 未来考古</a> · <a href="philosophy/02_可感_从数字到现象.md">02 可感</a> · <a href="philosophy/03_可参与_技术如何保留人的位置.md">03 可参与</a> · <a href="philosophy/04_适当的未来_赛博朋克太阳朋克与中间地带.md">04 适当的未来</a> · <a href="philosophy/05_游戏作为未来实验室.md">05 游戏</a> · <a href="philosophy/06_多世界语法_共享问题不共享答案.md">06 多世界</a> · <a href="philosophy/07_边界_青橙设计拒绝什么.md">07 边界</a> · <a href="philosophy/08_青橙十问.md">08 十问</a>。9 篇已全部完稿。</p>
    <p class="lede">青橙全栈（P4 日志/备份/部署已落地，P5 待做）：<a href="fullstack/README.md">README</a> · <a href="fullstack/12_P4实现记录.md">P4 记录</a> · <a href="fullstack/08_决策清单.md">决策清单</a>。</p>
    <h3>路线</h3>
    <div class="grid g3">
      ${roadmap.map(([name, st]) => `<div class="card"><h3>${esc(name)}</h3><p><span class="chip ${st === 'done' ? 'ok' : st === 'doing' ? 'warn' : ''}">${st === 'done' ? '已完成' : st === 'doing' ? '进行中' : '未开始'}</span></p></div>`).join('')}
    </div>
    <h3>文档索引</h3>
    ${docCards(docRows)}
    <p class="lede">设计系统专项待办见 <a href="TODO.md">design/TODO.md</a>；跨项目最高优先级待办见 <a href="../TODO.md">根 TODO.md</a>。本页只汇总设计系统状态。</p>
    <h3>变更日志与发布</h3>
    <p class="lede">设计系统 <a href="CHANGELOG.md">CHANGELOG</a> ｜ 工作区 <a href="../CHANGELOG.md">CHANGELOG</a>。设计系统 tag：<code>design-v0.0.1</code> / <code>design-v0.1.0</code> / <code>design-v0.2.0</code>；工作区与产品 tag：<code>workspace-v0.5.0</code>、<code>website-v0.29.0</code>、<code>livefab-v0.4.0</code>、<code>future-debris-v0.22.0</code>、<code>tomorrows-channel-v0.2.5</code>。App kit 在 <code>[未发布]</code>。</p>
  </section>
</main>
<div class="toast" id="toast">已复制</div>
<script>
document.body.classList.add('js');
const tabs = [...document.querySelectorAll('nav.tabs button')];
const panels = [...document.querySelectorAll('.panel')];
function select(id, push){
  const pid = 'panel-' + id;
  if (!panels.some(p => p.id === pid)) id = panels[0].id.replace('panel-', '');
  const target = 'panel-' + id;
  panels.forEach(p => p.classList.toggle('active', p.id === target));
  tabs.forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === id)));
  if (push && location.hash.slice(1) !== id) history.replaceState(null, '', '#' + id);
  window.scrollTo({top: 0, behavior: 'instant'});
}
tabs.forEach(b => b.addEventListener('click', () => select(b.dataset.tab, true)));
let prev = null;
addEventListener('beforeprint', () => {
  prev = panels.filter(p => p.classList.contains('active')).map(p => p.id);
  panels.forEach(p => p.classList.add('active'));
});
addEventListener('afterprint', () => {
  if (prev) panels.forEach(p => p.classList.toggle('active', prev.includes(p.id)));
});
addEventListener('hashchange', () => select(location.hash.slice(1), false));
select(location.hash.slice(1) || 'overview', false);

const themeButtons = [...document.querySelectorAll('[data-theme-set]')];
function setTheme(t, persist){
  document.documentElement.dataset.theme = t;
  themeButtons.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.themeSet === t)));
  if (persist) { try { localStorage.setItem('lrds-hub-theme', t); } catch (e) {} }
}
themeButtons.forEach(b => b.addEventListener('click', () => setTheme(b.dataset.themeSet, true)));
setTheme(document.documentElement.dataset.theme || 'system', false);

const filter = document.getElementById('token-filter');
if (filter) filter.addEventListener('input', () => {
  const q = filter.value.trim().toLowerCase();
  document.querySelectorAll('#token-groups .swatch').forEach(el => {
    el.style.display = !q || el.dataset.search.toLowerCase().includes(q) ? '' : 'none';
  });
});

const toast = document.getElementById('toast');
document.querySelectorAll('.swatch[data-hex]').forEach(el => {
  el.addEventListener('click', async () => {
    const hex = el.dataset.hex;
    try { await navigator.clipboard.writeText(hex); }
    catch (e) {
      const ta = document.createElement('textarea');
      ta.value = hex; document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); ta.remove();
    }
    toast.textContent = '已复制 ' + hex;
    toast.classList.add('on');
    clearTimeout(window.__toast);
    window.__toast = setTimeout(() => toast.classList.remove('on'), 1200);
  });
});
</script>
</body>
</html>`

  // 本地链接 / 图片必须存在；HUB 不许引用不存在的文件。
  const refs = [...html.matchAll(/(?:href|src)="([^"]+)"/g)]
    .map(m => m[1]!)
    .filter(r => !/^(https?:|#|mailto:|data:)/.test(r))
  for (const ref of new Set(refs)) {
    if (!existsSync(join(DESIGN_ROOT, ref))) {
      throw new Error(`HUB 引用了不存在的本地文件：${ref}`)
    }
  }

  return html
}

function runSelfTest(): number {
  console.log('[self-test] HUB 生成器')
  const cases: Array<[string, boolean, string]> = [
    ['esc 转义 <', esc('<a>') === '&lt;a&gt;', 'HTML 注入防护'],
    ['相同 HTML 无 diff', firstDiff('<p>x</p>', '<p>x</p>') === null, '生成物比较'],
    ['不同 HTML 定位行', firstDiff('a\nb\n', 'a\nc\n')?.line === 2, '差异定位'],
    ['本地素材存在', existsSync(join(DESIGN_ROOT, 'kits/web/preview.png')), 'preview.png'],
  ]
  let passed = 0
  for (const [name, ok, why] of cases) {
    console.log(`  ${ok ? '✓' : '✗'} ${name}${ok ? '' : `  ← ${why}`}`)
    if (ok) passed++
  }
  console.log(`\n[self-test] ${passed}/${cases.length} 通过`)
  return passed === cases.length ? 0 : 1
}

function main(): number {
  if (SELF_TEST) return runSelfTest()
  const html = generate()
  if (CHECK) {
    if (!existsSync(OUT)) {
      console.error(`✗ 缺少 ${relative(WORKSPACE_ROOT, OUT)}；运行 build_hub.ts 生成。`)
      return 1
    }
    const diff = firstDiff(html, readFileSync(OUT, 'utf8'))
    if (diff) {
      console.error(`✗ HUB 已过期：${relative(WORKSPACE_ROOT, OUT)} 第 ${diff.line} 行`)
      console.error(`    期望：${diff.expected}`)
      console.error(`    实际：${diff.actual}`)
      console.error('  运行 `node --experimental-strip-types design/tools/build_hub.ts` 重新生成。')
      return 1
    }
    console.log(`✓ HUB 与源一致（${(html.length / 1024).toFixed(1)} KB）`)
    return 0
  }
  writeFileSync(OUT, html, 'utf8')
  console.log(`✓ 已生成 ${relative(WORKSPACE_ROOT, OUT)}（${(html.length / 1024).toFixed(1)} KB）`)
  return 0
}

process.exit(main())
