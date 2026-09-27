import sharp from 'sharp'

/**
 * OG 分享图生成（1200×630）。
 *
 * 为什么自研而不是引入 `nuxt-og-image`（M1 未完成项里挂着的那条）：
 *   项目里**已经有 `sharp`**——它是 `@nuxt/image` 的传递依赖，且已经进了构建产物
 *   （`.output/server/node_modules/sharp`）。用 sharp 把一段 SVG 渲成 PNG
 *   只需几十行，而 `nuxt-og-image` 会带来一整套运行时依赖、Satori/WASM 与
 *   自己的字体管线。**为了一个 1200×630 的卡片引入那些不划算。**
 *
 * ⚠️ **部署注意（CJK 字体）**：macOS 上 sharp 通过系统字体（librsvg/fontconfig）
 *    能直接渲染中文；但**精简的 Linux 容器常常一个 CJK 字体都没有**，
 *    此时中文会渲染成空白或方块。所以：
 *      - 部署清单里必须包含一个 CJK 字体（见 docs/08）；
 *      - [`tools/verify-og.ts`](../../tools/verify-og.ts) 会实际渲染中文并检查
 *        像素是否真的画出来了——**字体缺失会被测出来，而不是悄悄发出一张空白图**。
 */

const FONT_STACK =
  "'Noto Sans CJK SC','Source Han Sans SC','PingFang SC','Hiragino Sans GB','Microsoft YaHei','WenQuanYi Micro Hei','Noto Sans SC',sans-serif"

export interface OgInput {
  /** 主标题（通常是文章标题） */
  title: string
  /** 上方的小字（如「主卷 · 14 磁带篇」） */
  eyebrow?: string
  /** 右下角标注 */
  badge?: string
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * 按显示宽度折行。
 *
 * 中日韩字符按 1 个"全角单位"、拉丁字符约按 0.55 个计算——
 * 这样中英混排的标题不会出现"一行挤满、一行空荡"。这是近似，
 * 不追求排版精度（OG 图只在小尺寸缩略图里被看到）。
 */
function wrapByWidth(text: string, maxUnits: number): string[] {
  const lines: string[] = []
  let cur = ''
  let units = 0
  const width = (ch: string) => (/[\u2E80-\u9FFF\uF900-\uFAFF\uFF00-\uFFEF]/.test(ch) ? 1 : 0.55)

  for (const ch of text) {
    if (ch === '\n') {
      lines.push(cur)
      cur = ''
      units = 0
      continue
    }
    const w = width(ch)
    if (units + w > maxUnits && cur) {
      lines.push(cur)
      cur = ch
      units = w
    } else {
      cur += ch
      units += w
    }
  }
  if (cur) lines.push(cur)
  return lines
}

/** 可用宽度内、给定字号下每行能容纳的"全角单位"数（留 2% 余量，避免贴边） */
function maxUnitsFor(fontSize: number, availableWidth: number): number {
  return Math.max(6, Math.floor((availableWidth * 0.98) / fontSize))
}

/** 生成 OG 图的 SVG（视觉语言与站点主题一致：原子时代配色 + 扫描线） */
export function buildOgSvg(input: OgInput): { svg: string; lines: string[] } {
  const W = 1200
  const H = 630
  const PAD = 80
  const AVAIL = W - PAD * 2

  // 字号先定、再按该字号折行——顺序不能反：
  // 折行依赖字号（一行能放几个字 = 可用宽度 ÷ 字号）。若先按写死的单位数折行，
  // 大字号标题会从右边溢出（第一版就是这么错的）。
  // 字号随标题长度自适应：短标题大、长标题小。
  const len = [...input.title].length
  const fontSize = len <= 14 ? 68 : len <= 22 ? 60 : len <= 34 ? 52 : 44
  const maxUnits = maxUnitsFor(fontSize, AVAIL)

  const all = wrapByWidth(input.title, maxUnits)
  const MAX_LINES = 3
  const lines = all.slice(0, MAX_LINES)
  if (all.length > MAX_LINES) {
    lines[MAX_LINES - 1] = lines[MAX_LINES - 1]!.slice(0, -1) + '…'
  }

  const lineHeight = Math.round(fontSize * 1.32)
  // 标题块的垂直位置：眉标基线 188，标题首行基线从 274 起；
  // 最多 3 行（3 × 1.32 × 68 ≈ 269），末行基线 ≤ 527，不与底部信息线（538）相撞。
  const titleTop = 274

  const titleSpans = lines
    .map((l, i) => `<tspan x="${PAD}" y="${titleTop + i * lineHeight}">${escapeXml(l)}</tspan>`)
    .join('')

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#121a26"/>
      <stop offset="100%" stop-color="#0b1017"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.85" cy="0.1" r="0.7">
      <stop offset="0%" stop-color="#3fb8ab" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="#3fb8ab" stop-opacity="0"/>
    </radialGradient>
    <pattern id="scan" width="4" height="4" patternUnits="userSpaceOnUse">
      <rect width="4" height="1" fill="#000000" opacity="0.16"/>
    </pattern>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#sky)"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>
  <rect width="${W}" height="${H}" fill="url(#scan)"/>

  <!-- 左侧主色条 -->
  <rect x="0" y="0" width="8" height="${H}" fill="#3fb8ab"/>

  <!-- 站点标识 -->
  <text x="${PAD}" y="104" font-family="${FONT_STACK}" font-size="30" font-weight="700"
        fill="#e8d9a0" letter-spacing="2">明日档案</text>
  <text x="${PAD}" y="134" font-family="${FONT_STACK}" font-size="15"
        fill="#808d9f" letter-spacing="4.5">RETRO-FUTURISM ARCHIVE</text>
  <line x1="${PAD}" y1="164" x2="${W - PAD}" y2="164" stroke="#24303f" stroke-width="1"/>

  <!-- 眉标：基线 188（下沉部约到 193），标题首行基线 274 —— 留出约 60px 净空。
       （第一版眉标 208 / 标题 250，视觉上叠在一起；第二版 196/258 仍偏紧。） -->
  ${input.eyebrow ? `<text x="${PAD}" y="188" font-family="${FONT_STACK}" font-size="22" fill="#3fb8ab" letter-spacing="1">${escapeXml(input.eyebrow)}</text>` : ''}

  <!-- 标题 -->
  <text font-family="${FONT_STACK}" font-size="${fontSize}" font-weight="700" fill="#e8d9a0">${titleSpans}</text>

  <!-- 底部信息 -->
  <line x1="${PAD}" y1="${H - 92}" x2="${W - PAD}" y2="${H - 92}" stroke="#24303f" stroke-width="1"/>
  <text x="${PAD}" y="${H - 50}" font-family="${FONT_STACK}" font-size="20" fill="#9aa7b8">复古未来主义知识库 · 未来的考古学</text>
  ${input.badge ? `<text x="${W - PAD}" y="${H - 50}" text-anchor="end" font-family="${FONT_STACK}" font-size="20" fill="#57d8c8">${escapeXml(input.badge)}</text>` : ''}
</svg>`

  return { svg, lines }
}

/** 渲染为 PNG */
export async function renderOgPng(input: OgInput): Promise<Buffer> {
  const { svg } = buildOgSvg(input)
  return sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer()
}
