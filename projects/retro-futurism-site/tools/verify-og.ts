#!/usr/bin/env bun
/**
 * OG 分享图验收（M3）。
 *
 * 为什么不能只"看一眼"：第一版 OG 图有两个**肉眼容易漏掉**的排版缺陷——
 *   ① 标题按写死的"单位数"折行、**没考虑字号**，66px 下一行宽约 1122px，
 *      超出可用宽度 1040px，文字**从右边溢出**；
 *   ② 眉标基线（208）与标题首行基线（250）太近，**视觉上叠在一起**。
 * 两个问题在缩略图尺寸下都不明显。所以这里用**像素级断言**把版式约束固定下来：
 *   右侧留白区不得出现文字像素、上方留白区不得有内容、标题行不得压到底部信息线。
 *
 * 同时验证"字体缺失会让中文渲染不出来"这个部署风险：
 *   统计标题区域的**高亮像素数**，若接近 0 说明字号/字体没生效（中文可能是空白）。
 *
 * 用法：
 *   bun run tools/verify-og.ts --base=http://localhost:3100
 */

import sharp from 'sharp'

const arg = (name: string, def: string) =>
  process.argv.find(a => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? def
const BASE = arg('base', 'http://localhost:3100')

const results: Array<{ name: string; ok: boolean; detail: string }> = []
const record = (name: string, ok: boolean, detail: string) => {
  results.push({ name, ok, detail })
  console.log(`  ${ok ? '✓' : '✗'} ${name.padEnd(28)} ${detail}`)
}

const W = 1200
const H = 630
/** 与 server/utils/og-render.ts 的 PAD 保持一致 */
const PAD = 80
/** 左侧主色条的宽度（那段是刻意的实色，不算"内容溢出"） */
const ACCENT_BAR = 8

interface Pixels {
  data: Buffer
  width: number
  height: number
  channels: number
}

async function fetchOg(query: string): Promise<{ status: number; type: string; buf: Buffer }> {
  const res = await fetch(`${BASE}/og.png?${query}`)
  const buf = Buffer.from(await res.arrayBuffer())
  return { status: res.status, type: res.headers.get('content-type') ?? '', buf }
}

async function pixels(buf: Buffer): Promise<Pixels> {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  return { data, width: info.width, height: info.height, channels: info.channels }
}

/** 判定某像素是否为"亮内容"（背景是深色 #0b1017~#121a26，内容为奶黄/青绿，亮度差异显著） */
function isContent(px: Pixels, x: number, y: number): boolean {
  const i = (y * px.width + x) * px.channels
  const r = px.data[i]!, g = px.data[i + 1]!, b = px.data[i + 2]!
  // 背景三通道都在 40 以下；文字与青色条明显更亮
  return r + g + b > 180
}

function countContent(px: Pixels, x0: number, y0: number, x1: number, y1: number): number {
  let n = 0
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if (isContent(px, x, y)) n++
  return n
}

console.log(`OG 图验收（base=${BASE}）\n`)

// ---- 1) 基本响应 ----
const basic = await fetchOg(`title=${encodeURIComponent('磁带篇：磁带未来主义——模拟接口的暖未来')}&eyebrow=${encodeURIComponent('主卷 · 14 磁带篇')}&badge=14`)
record('端点可用', basic.status === 200 && basic.type.includes('image/png'), `${basic.status} ${basic.type} ${basic.buf.length}B`)

const meta = await sharp(basic.buf).metadata()
record('尺寸 1200×630', meta.width === W && meta.height === H, `${meta.width}×${meta.height} ${meta.format}`)

const px = await pixels(basic.buf)

// ---- 2) 中文真的渲染出来了（防"字体缺失导致空白"） ----
// 标题区域：y 230–540，x PAD–(W-PAD)
const titleInk = countContent(px, PAD, 230, W - PAD, 540)
record('标题区有文字像素', titleInk > 500, `${titleInk} 个内容像素（>500 视为中文已渲染）`)

// ---- 3) 不溢出左右边界 ----
// 右侧留白（x ≥ W-PAD+4）：除装饰外不应有内容
const rightInk = countContent(px, W - PAD + 4, 0, W, H)
record('右侧不溢出', rightInk === 0, rightInk === 0 ? '右侧留白干净' : `${rightInk} 个像素越界`)

// ---- 4) 眉标与标题之间有真实净空 ----
// 不用"取一段固定 y 带看有没有像素"——那只是近似，会被字形下沉部
// （「卷」「带」的撇）与不同字号的上升高度搞出**误报**（我连踩两次）。
// 直接量两块文字的**墨迹真实边界**，再断言净空 ≥ 12px，这才是有意义的判据。
function inkBounds(px: Pixels, x0: number, y0: number, x1: number, y1: number) {
  let top = -1
  let bottom = -1
  for (let y = y0; y < y1; y++) {
    let rowHasInk = false
    for (let x = x0; x < x1; x++) {
      if (isContent(px, x, y)) { rowHasInk = true; break }
    }
    if (rowHasInk) {
      if (top === -1) top = y
      bottom = y
    }
  }
  return { top, bottom }
}

const eyebrowBounds = inkBounds(px, PAD, 160, W - PAD, 208)
const titleBounds = inkBounds(px, PAD, 208, W - PAD, 540)
const clearGap = titleBounds.top - eyebrowBounds.bottom
record(
  '眉标与标题有净空',
  eyebrowBounds.bottom > 0 && titleBounds.top > 0 && clearGap >= 12,
  `眉标墨迹 ${eyebrowBounds.top}–${eyebrowBounds.bottom}，标题自 ${titleBounds.top} 起，净空 ${clearGap}px（需 ≥12）`,
)

// ---- 5) 标题不压到底部信息线 ----
// 底部信息线在 y=538；取 500–530 作为"标题末行下方"的缓冲带检查是否有越界文字
const bottomInk = countContent(px, PAD, 500, W - PAD, 534)
record('标题不压底部线', bottomInk === 0, bottomInk === 0 ? '标题区在缓冲带之上' : `${bottomInk} 个像素越过缓冲带`)

// ---- 6) 超长标题仍不溢出（折行+截断的核心回归） ----
const longTitle = '这是一个特别长的标题'.repeat(6)
const long = await fetchOg(`title=${encodeURIComponent(longTitle)}&badge=99`)
const longPx = await pixels(long.buf)
const longRight = countContent(longPx, W - PAD + 4, 0, W, H)
const longBottom = countContent(longPx, PAD, 500, W - PAD, 534)
record('超长标题不溢出', long.status === 200 && longRight === 0 && longBottom === 0,
  `右侧越界 ${longRight} · 底部越界 ${longBottom}`)

// ---- 7) 缓存头（无鉴权动态端点的成本控制） ----
const res = await fetch(`${BASE}/og.png?title=x`)
const cc = res.headers.get('cache-control') ?? ''
record('带强缓存头', /max-age=\d{4,}/.test(cc), cc || '(无)')

const failed = results.filter(r => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} 项通过`)
if (failed.length) {
  console.error('✗ OG 图验收未通过')
  process.exit(1)
}
console.log('✓ OG 图验收通过（含"不溢出/不重叠"的像素级断言）')
