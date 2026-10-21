#!/usr/bin/env node
/**
 * 《明日频道》磁带风格卡对账（第四道之外的“风格卡”闸门）。
 *
 * 为什么需要：ChannelSkin 的最后一段是**手写的 .tres**，而设计系统里现在有
 * `product.tomorrows-channel.*` 的登记。两份值一旦分叉，界面会“看起来变了但没人知道为什么”。
 * 本脚本把 `.tres` 的颜色/光照/装饰参数逐项与 token 源对账。
 *
 * 口径：
 *   - 颜色：Color(r,g,b,a) 的 sRGB 分量 ×255 取整 → #RRGGBB，与 token 完全一致；
 *   - 光照：device_warm_k / lamp_warm_k / glow_ratio / decor_enabled / scanline_opacity / decor_font_name
 *     与 token 文件 `meta.lighting` 一致。
 *
 * 用法：
 *   node --experimental-strip-types design/tools/check_tomorrows_channel_skin.ts
 *   node --experimental-strip-types design/tools/check_tomorrows_channel_skin.ts --self-test
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import {
  DESIGN_ROOT,
  WORKSPACE_ROOT,
  getColor,
  loadTokens,
  readJson,
} from './token_lib.ts'

const SKIN = join(
  WORKSPACE_ROOT,
  'projects/tomorrows-channel/game/scenes/channel/skins/tape_channel_skin.tres',
)
const TOKENS_FILE = join(
  DESIGN_ROOT,
  'tokens/products/tomorrows-channel.tape.tokens.json',
)
const SELF_TEST = process.argv.includes('--self-test')

/** .tres 字段 → product token 名 */
const COLOR_FIELDS: Record<string, string> = {
  lut_base_dark: 'baseDark',
  lut_mid_beige: 'midBeige',
  lut_lit_warm: 'litWarm',
  lut_phosphor_amber: 'phosphorAmber',
  lut_phosphor_green: 'phosphorGreen',
  lut_emphasis: 'emphasis',
  housing_beige: 'housingBeige',
  housing_dark: 'housingDark',
  dial_amber: 'dialAmber',
}

const TOKEN_TO_FIELD = new Map(
  Object.entries(COLOR_FIELDS).map(([field, token]) => [token, field]),
)

interface ParsedSkin {
  colors: Map<string, string>
  scalars: Map<string, string>
}

function parseNumbers(text: string): number[] {
  return [...text.matchAll(/[-+]?\d*\.?\d+/g)].map(m => Number(m[0]))
}

export function colorToHex(args: number[]): string {
  if (args.length < 3) throw new Error(`Color 参数不足：${args.join(', ')}`)
  const [r, g, b] = args.map(x => Math.round(x * 255))
  return `#${[r, g, b].map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase()}`
}

export function parseTres(text: string): ParsedSkin {
  const colors = new Map<string, string>()
  const scalars = new Map<string, string>()
  for (const line of text.split('\n')) {
    const color = /^\s*(\w+)\s*=\s*Color\(([^)]+)\)/.exec(line)
    if (color) {
      colors.set(color[1]!, colorToHex(parseNumbers(color[2]!)))
      continue
    }
    const scalar = /^\s*(\w+)\s*=\s*(.+?)\s*$/.exec(line)
    if (!scalar) continue
    const key = scalar[1]!
    if (key === 'script' || key === 'resource') continue
    scalars.set(key, scalar[2]!)
  }
  return { colors, scalars }
}

function eqNumber(actual: string | undefined, expected: number, label: string): string | null {
  if (actual === undefined) return `缺少字段：${label}`
  const n = Number(actual)
  if (!Number.isFinite(n)) return `${label} 不是数字：${actual}`
  return Math.abs(n - expected) <= 0.001 ? null : `${label} 不一致：.tres ${n} vs token ${expected}`
}

function eqString(actual: string | undefined, expected: string, label: string): string | null {
  if (actual === undefined) return `缺少字段：${label}`
  const normalized = actual.replace(/^"|"$/g, '')
  return normalized === expected ? null : `${label} 不一致：.tres ${actual} vs token ${JSON.stringify(expected)}`
}

export function compareColors(
  parsed: ParsedSkin,
  expected: Map<string, string>,
): string[] {
  const errors: string[] = []
  for (const [tokenName, want] of expected) {
    const field = TOKEN_TO_FIELD.get(tokenName)
    if (!field) {
      errors.push(`未知的明日频道颜色 token：${tokenName}`)
      continue
    }
    const actual = parsed.colors.get(field)
    if (actual === undefined) {
      errors.push(`.tres 缺少颜色字段：${field}`)
      continue
    }
    if (actual.toUpperCase() !== want.toUpperCase()) {
      errors.push(`${field} 不一致：.tres ${actual} vs token ${want}`)
    }
  }
  return errors
}

export function compareLighting(
  parsed: ParsedSkin,
  meta: Record<string, unknown>,
): string[] {
  const errors: string[] = []
  const lighting = meta.lighting as Record<string, unknown> | undefined
  if (!lighting) return ['token 文件缺少 meta.lighting']

  const checks: Array<string | null> = [
    eqNumber(parsed.scalars.get('device_warm_k'), Number(lighting.deviceWarmK), 'device_warm_k'),
    eqNumber(parsed.scalars.get('lamp_warm_k'), Number(lighting.lampWarmK), 'lamp_warm_k'),
    eqNumber(
      parsed.scalars.get('scanline_opacity'),
      Number(lighting.scanlineOpacity),
      'scanline_opacity',
    ),
    eqString(parsed.scalars.get('decor_font_name'), String(lighting.decorFontName), 'decor_font_name'),
  ]
  for (const e of checks) if (e) errors.push(e)

  const glow = parsed.scalars.get('glow_ratio')
  if (glow === undefined) {
    errors.push('缺少字段：glow_ratio')
  } else {
    const inner = glow.slice(glow.indexOf('(') + 1, glow.lastIndexOf(')'))
    const nums = parseNumbers(inner)
    const want = lighting.glowRatio as number[]
    if (nums.length !== 2 || nums[0] !== want[0] || nums[1] !== want[1]) {
      errors.push(`glow_ratio 不一致：.tres ${glow} vs token ${JSON.stringify(want)}`)
    }
  }

  const decor = parsed.scalars.get('decor_enabled')
  if (decor === undefined) {
    errors.push('缺少字段：decor_enabled')
  } else if ((decor === 'true') !== Boolean(lighting.decorEnabled)) {
    errors.push(`decor_enabled 不一致：.tres ${decor} vs token ${Boolean(lighting.decorEnabled)}`)
  }

  return errors
}

function runSelfTest(): number {
  console.log('[self-test] 风格卡解析与对账')
  const fixture = `[resource]
lut_base_dark = Color(0.133333, 0.0862745, 0.0627451, 1)
lut_mid_beige = Color(0.780392, 0.701961, 0.580392, 1)
device_warm_k = 2400.0
lamp_warm_k = 2800.0
glow_ratio = Vector2(0.6, 0.4)
decor_enabled = true
scanline_opacity = 0.08
decor_font_name = ""
`
  const parsed = parseTres(fixture)
  const expected = new Map<string, string>([
    ['baseDark', '#221610'],
    ['midBeige', '#C7B394'],
  ])
  const meta = {
    lighting: {
      deviceWarmK: 2400,
      lampWarmK: 2800,
      glowRatio: [0.6, 0.4],
      decorEnabled: true,
      scanlineOpacity: 0.08,
      decorFontName: '',
    },
  }

  const cases: Array<[string, boolean, string]> = [
    ['Color(1, .690196, 0) → #FFB000', colorToHex([1, 0.690196, 0]) === '#FFB000', '浮点取整'],
    ['解析 2 个颜色', parsed.colors.size === 2, 'Color 行解析'],
    ['解析 6 个标量', parsed.scalars.size === 6, '光照/装饰字段解析'],
    ['颜色一致 → 无错误', compareColors(parsed, expected).length === 0, '一致不得误报'],
    [
      '颜色不一致 → 报错',
      compareColors(parsed, new Map([['baseDark', '#000000']])).some(e =>
        e.includes('lut_base_dark'),
      ),
      '分叉必须被检出',
    ],
    ['光照一致 → 无错误', compareLighting(parsed, meta).length === 0, '光照一致不得误报'],
    [
      '色温不一致 → 报错',
      compareLighting(parsed, { lighting: { ...meta.lighting, lampWarmK: 3000 } }).some(e =>
        e.includes('lamp_warm_k'),
      ),
      '色温分叉必须被检出',
    ],
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

  let parsed: ParsedSkin
  try {
    parsed = parseTres(readFileSync(SKIN, 'utf8'))
  } catch (e) {
    console.error(`✗ 读不到皮肤资源：${SKIN}`)
    console.error(e instanceof Error ? e.message : String(e))
    return 1
  }

  const loaded = loadTokens(DESIGN_ROOT)
  if (loaded.errors.length) {
    console.error('✗ token 源有错误，先修 token：')
    for (const e of loaded.errors) console.error(`  - ${e}`)
    return 1
  }

  const expected = new Map<string, string>()
  for (const tokenName of Object.values(COLOR_FIELDS)) {
    expected.set(
      tokenName,
      getColor(loaded.tokens, `product.tomorrows-channel.color.${tokenName}`),
    )
  }

  const root = readJson(TOKENS_FILE) as Record<string, unknown>
  const meta = root.meta as Record<string, unknown>
  const errors = [
    ...compareColors(parsed, expected),
    ...compareLighting(parsed, meta),
  ]

  console.log('《明日频道》磁带风格卡对账 · SC-TOMORROWS-CHANNEL-TAPE-v1')
  console.log(`  颜色 ${Object.keys(COLOR_FIELDS).length} 项 ｜ 光照/装饰 6 项`)
  console.log(`  引擎投影：${SKIN.replace(`${WORKSPACE_ROOT}/`, '')}`)

  if (errors.length) {
    console.error(`\n✗ ${errors.length} 项不一致：`)
    for (const e of errors) console.error(`  - ${e}`)
    return 1
  }

  console.log('✓ 颜色、色温、光比、装饰参数全部一致')
  return 0
}

process.exit(main())
