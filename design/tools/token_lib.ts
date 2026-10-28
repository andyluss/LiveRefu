/**
 * LRDS token 库：加载、解析别名、校验、生成。
 *
 * 零第三方依赖；node / deno / bun 兼容（与工作区其它 TS 脚本一致）。
 * 单一事实来源是 design/tokens/ 下的 JSON；本文件只做“读入 → 解析 → 输出”，
 * 不在代码里硬编码任何设计值。
 */

import { readFileSync, readdirSync } from 'node:fs'
import { join, resolve, relative } from 'node:path'

// ══════════════════════════════════════════════════════════════════════
// 类型
// ══════════════════════════════════════════════════════════════════════

export type TokenType =
  | 'color'
  | 'dimension'
  | 'number'
  | 'fontWeight'
  | 'fontFamily'
  | 'duration'
  | 'cubicBezier'
  | 'shadow'
  | 'string'

export interface Token {
  /** 点分路径，如 sys.color.bg.base */
  path: string
  type: TokenType
  /** 解析后的值（别名已解开） */
  value: unknown
  /** 原始值（可能是 {ref...} 别名） */
  raw: unknown
  /** 来源文件（相对 design/） */
  file: string
  /** 若是别名，记录目标路径 */
  resolvedFrom?: string
}

export type TokenMap = Map<string, Token>

export interface LoadResult {
  tokens: TokenMap
  errors: string[]
  warnings: string[]
}

export interface BuildOutput {
  path: string
  content: string
  /** 给人看的相对路径 */
  label: string
}

export const DESIGN_ROOT = resolve(import.meta.dirname, '..')
export const WORKSPACE_ROOT = resolve(DESIGN_ROOT, '..')

const ALLOWED_TYPES: TokenType[] = [
  'color',
  'dimension',
  'number',
  'fontWeight',
  'fontFamily',
  'duration',
  'cubicBezier',
  'shadow',
  'string',
]

const UI_LEVELS = ['title-1', 'title-2', 'body', 'caption', 'number-lg']
const EDITORIAL_LEVELS = ['display', 'h1', 'h2', 'h3', 'body', 'caption', 'footnote']
const SPACING_SCALE = [4, 8, 12, 16, 24, 32]
const PRODUCTS = ['future-archive', 'future-debris', 'livefab', 'tomorrows-channel']
const WEB_PRODUCTS = ['future-archive', 'livefab']

const REQUIRED_SYS = [
  'sys.color.bg.base',
  'sys.color.bg.surface',
  'sys.color.bg.raised',
  'sys.color.bg.sunken',
  'sys.color.text.primary',
  'sys.color.text.secondary',
  'sys.color.text.muted',
  'sys.color.text.inverse',
  'sys.color.line.subtle',
  'sys.color.line.strong',
  'sys.color.action.primary',
  'sys.color.action.primaryHover',
  'sys.color.action.onPrimary',
  'sys.color.feedback.success',
  'sys.color.feedback.warning',
  'sys.color.feedback.danger',
  'sys.color.focus.ring',
  'sys.color.material.mid',
  'sys.color.material.highlight',
  'sys.color.material.shadow',
  'sys.space.4',
  'sys.space.8',
  'sys.space.12',
  'sys.space.16',
  'sys.space.24',
  'sys.space.32',
  'sys.radius.control',
  'sys.radius.panel',
  'sys.border.control',
  'sys.border.focus',
  'sys.border.focusOffset',
  'sys.motion.duration.fast',
  'sys.motion.duration.base',
  'sys.motion.duration.slow',
  'sys.motion.easing.standard',
  'sys.motion.easing.emphasis',
]

// ══════════════════════════════════════════════════════════════════════
// 读写与扁平化
// ══════════════════════════════════════════════════════════════════════

export function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8'))
}

function isTokenNode(node: unknown): node is Record<string, unknown> {
  return (
    typeof node === 'object' &&
    node !== null &&
    Object.prototype.hasOwnProperty.call(node, '$value') &&
    Object.prototype.hasOwnProperty.call(node, '$type')
  )
}

function flattenNode(
  node: unknown,
  prefix: string[],
  file: string,
  out: Token[],
  errors: string[],
): void {
  if (isTokenNode(node)) {
    const type = String(node.$type) as TokenType
    if (!ALLOWED_TYPES.includes(type)) {
      errors.push(`${file} · ${prefix.join('.')}：未知 $type "${String(node.$type)}"`)
      return
    }
    out.push({
      path: prefix.join('.'),
      type,
      value: node.$value,
      raw: node.$value,
      file,
    })
    return
  }
  if (typeof node !== 'object' || node === null || Array.isArray(node)) {
    // 既不是 token，也不是分组——多出现在 YAML/JSON 写错缩进时
    if (prefix.length > 0) {
      errors.push(`${file} · ${prefix.join('.')}：既不是 token（缺 $value/$type），也不是分组`)
    }
    return
  }
  for (const [key, value] of Object.entries(node)) {
    if (key.startsWith('$') || key === 'meta') continue
    flattenNode(value, [...prefix, key], file, out, errors)
  }
}

/** 读取一个 token 文件，扁平化为 path → Token */
export function flattenFile(path: string, designRoot = DESIGN_ROOT): Token[] {
  const rel = relative(designRoot, path)
  const errors: string[] = []
  const out: Token[] = []
  flattenNode(readJson(path), [], rel, out, errors)
  if (errors.length) {
    throw new Error(errors.join('\n'))
  }
  return out
}

// ══════════════════════════════════════════════════════════════════════
// 加载 + 别名解析 + 校验
// ══════════════════════════════════════════════════════════════════════

const ALIAS = /^\{([^{}]+)\}$/

export function loadTokens(designRoot = DESIGN_ROOT): LoadResult {
  const errors: string[] = []
  const warnings: string[] = []
  const tokens: TokenMap = new Map()

  const coreDir = join(designRoot, 'tokens/core')
  const productDir = join(designRoot, 'tokens/products')
  const files = [
    join(coreDir, 'ref.tokens.json'),
    join(coreDir, 'sys.tokens.json'),
    join(coreDir, 'component.tokens.json'),
    ...readdirSync(productDir)
      .filter(f => f.endsWith('.tokens.json'))
      .sort()
      .map(f => join(productDir, f)),
  ]

  for (const file of files) {
    let list: Token[]
    try {
      list = flattenFile(file, designRoot)
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e))
      continue
    }
    for (const token of list) {
      if (tokens.has(token.path)) {
        errors.push(
          `token 重复定义：${token.path}（${tokens.get(token.path)!.file} 与 ${token.file}）`,
        )
        continue
      }
      tokens.set(token.path, token)
    }
  }

  // 1) 解析别名
  resolveAliases(tokens, errors, warnings)

  // 2) 逐 token 校验值
  for (const token of tokens.values()) {
    const err = validateTokenValue(token)
    if (err) errors.push(`${token.path}：${err}`)
  }

  // 3) 结构校验
  errors.push(...validateStructure(tokens))

  // 4) 产品存在性
  for (const product of PRODUCTS) {
    const prefix = `product.${product}.color.`
    if (![...tokens.keys()].some(p => p.startsWith(prefix))) {
      errors.push(`缺少产品风格卡：${prefix}*（${product}）`)
    }
  }

  return { tokens, errors, warnings }
}

export function resolveAliases(
  tokens: TokenMap,
  errors: string[],
  warnings: string[],
): void {
  const resolving = new Set<string>()
  const resolved = new Set<string>()

  const resolveOne = (path: string): unknown => {
    const token = tokens.get(path)
    if (!token) throw new Error(`别名目标不存在：${path}`)
    if (resolved.has(path)) return token.value
    if (resolving.has(path)) throw new Error(`别名成环：${[...resolving, path].join(' → ')}`)
    const m = typeof token.raw === 'string' ? ALIAS.exec(token.raw) : null
    if (!m) {
      resolved.add(path)
      return token.value
    }
    const targetPath = m[1]!
    const target = tokens.get(targetPath)
    if (!target) throw new Error(`别名目标不存在：${path} → {${targetPath}}`)
    if (target.type !== token.type) {
      warnings.push(
        `别名类型不一致：${path} (${token.type}) → {${targetPath}} (${target.type})；以目标类型为准`,
      )
    }
    resolving.add(path)
    const value = resolveOne(targetPath)
    resolving.delete(path)
    token.value = value
    token.resolvedFrom = targetPath
    resolved.add(path)
    return value
  }

  for (const path of tokens.keys()) {
    try {
      resolveOne(path)
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e))
    }
  }
}

export function validateTokenValue(token: Token): string | null {
  const v = token.value
  switch (token.type) {
    case 'color':
      if (typeof v !== 'string' || !/^#[0-9A-Fa-f]{6}(?:[0-9A-Fa-f]{2})?$/.test(v)) {
        return `颜色值必须是 #RRGGBB 或 #RRGGBBAA，实际 ${JSON.stringify(v)}`
      }
      return null
    case 'dimension':
      if (typeof v !== 'string' || !/^-?\d+(?:\.\d+)?px$/.test(v)) {
        return `尺寸必须是 NNpx，实际 ${JSON.stringify(v)}`
      }
      return null
    case 'number':
      if (typeof v !== 'number' || !Number.isFinite(v)) {
        return `数值必须是有限 number，实际 ${JSON.stringify(v)}`
      }
      return null
    case 'fontWeight':
      if (typeof v !== 'number' || v < 100 || v > 900 || v % 100 !== 0) {
        return `字重必须是 100–900 的整百 number，实际 ${JSON.stringify(v)}`
      }
      return null
    case 'fontFamily':
      if (
        !Array.isArray(v) ||
        v.length === 0 ||
        v.some(x => typeof x !== 'string' || x.trim() === '')
      ) {
        return `字体族必须是非空字符串数组，实际 ${JSON.stringify(v)}`
      }
      return null
    case 'duration':
      if (typeof v !== 'string' || !/^\d+(?:\.\d+)?ms$/.test(v)) {
        return `时长必须是 NNms，实际 ${JSON.stringify(v)}`
      }
      return null
    case 'cubicBezier':
      if (
        !Array.isArray(v) ||
        v.length !== 4 ||
        v.some(x => typeof x !== 'number') ||
        v[0] < 0 ||
        v[0] > 1 ||
        v[2] < 0 ||
        v[2] > 1
      ) {
        return `缓动必须是 [x1,y1,x2,y2] 且 x 在 0–1，实际 ${JSON.stringify(v)}`
      }
      return null
    case 'shadow':
      if (typeof v !== 'string' || v.trim() === '') {
        return `阴影必须是非空字符串，实际 ${JSON.stringify(v)}`
      }
      return null
    case 'string':
      if (typeof v !== 'string') {
        return `字符串 token 必须是 string，实际 ${JSON.stringify(v)}`
      }
      return null
    default:
      return `未知类型 ${String(token.type)}`
  }
}

export function validateStructure(tokens: TokenMap): string[] {
  const errors: string[] = []
  for (const path of REQUIRED_SYS) {
    if (!tokens.has(path)) errors.push(`缺少必需的系统 token：${path}`)
  }

  const ui = UI_LEVELS.filter(level => tokens.has(`sys.type.ui.${level}.size`))
  if (ui.length !== UI_LEVELS.length) {
    errors.push(`UI 字号必须恰好 ${UI_LEVELS.length} 级，实际 ${ui.length} 级：${ui.join(', ')}`)
  }
  const editorial = EDITORIAL_LEVELS.filter(level =>
    tokens.has(`sys.type.editorial.${level}.size`),
  )
  if (editorial.length !== EDITORIAL_LEVELS.length) {
    errors.push(
      `Editorial 字号必须恰好 ${EDITORIAL_LEVELS.length} 级，实际 ${editorial.length} 级：${editorial.join(', ')}`,
    )
  }

  const spacing: number[] = []
  for (const key of ['4', '8', '12', '16', '24', '32']) {
    const t = tokens.get(`sys.space.${key}`)
    if (!t) continue
    try {
      spacing.push(dimensionToNumber(String(t.value)))
    } catch {
      // validateTokenValue 已经报过格式错误
    }
  }
  if (spacing.join(',') !== SPACING_SCALE.join(',')) {
    errors.push(`间距阶梯必须是 ${SPACING_SCALE.join(' / ')}，实际 ${spacing.join(' / ')}`)
  }

  for (const product of PRODUCTS) {
    for (const [path, token] of tokens) {
      if (!path.startsWith(`product.${product}.`)) continue
      if (token.type !== 'color') {
        errors.push(`产品颜色层只允许 color：${path} 是 ${token.type}`)
      }
    }
  }

  return errors
}

// ══════════════════════════════════════════════════════════════════════
// 通用工具
// ══════════════════════════════════════════════════════════════════════

export function get(tokens: TokenMap, path: string): Token {
  const t = tokens.get(path)
  if (!t) throw new Error(`缺少 token：${path}`)
  return t
}

export function getValue(tokens: TokenMap, path: string): unknown {
  return get(tokens, path).value
}

export function getColor(tokens: TokenMap, path: string): string {
  const v = getValue(tokens, path)
  if (typeof v !== 'string' || !/^#[0-9A-Fa-f]{6}$/.test(v)) {
    throw new Error(`${path} 不是颜色：${JSON.stringify(v)}`)
  }
  return v
}

export function getNumber(tokens: TokenMap, path: string): number {
  const v = getValue(tokens, path)
  if (typeof v !== 'number') throw new Error(`${path} 不是 number：${JSON.stringify(v)}`)
  return v
}

export function getString(tokens: TokenMap, path: string): string {
  const v = getValue(tokens, path)
  if (typeof v !== 'string') throw new Error(`${path} 不是 string：${JSON.stringify(v)}`)
  return v
}

export function dimensionToNumber(value: string): number {
  const m = /^(-?\d+(?:\.\d+)?)px$/.exec(value)
  if (!m) throw new Error(`不是 px 尺寸：${value}`)
  return Number(m[1])
}

export function durationToNumber(value: string): number {
  const m = /^(\d+(?:\.\d+)?)ms$/.exec(value)
  if (!m) throw new Error(`不是 ms 时长：${value}`)
  return Number(m[1])
}

export function kebab(input: string): string {
  return input
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([a-zA-Z])(\d)/g, '$1-$2')
    .replace(/[_\s.]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
}

/** sys.* → --lr-*；product.<name>.* → --lr-<name>-*；ref.* → --lr-ref-* */
export function cssVar(path: string): string {
  const parts = path.split('.')
  if (parts[0] === 'sys') {
    return `--lr-${parts.slice(1).map(kebab).join('-')}`
  }
  if (parts[0] === 'product') {
    const name = kebab(parts[1] ?? 'product')
    return `--lr-${name}-${parts.slice(2).map(kebab).join('-')}`
  }
  return `--lr-${parts.map(kebab).join('-')}`
}

/** 产品颜色 token → 简短的 CSS 名（去掉 color 段）：--lr-future-archive-bg-elev */
export function productCssVar(path: string): string {
  const parts = path.split('.')
  if (parts[0] !== 'product') throw new Error(`不是产品 token：${path}`)
  const name = kebab(parts[1] ?? 'product')
  const rest = parts.slice(2)
  if (rest[0] === 'color') rest.shift()
  return `--lr-${name}-${rest.map(kebab).join('-')}`
}

/** 产品颜色 token → Godot 现有命名：--bg-elev-1 / --line-strong / --power */
export function godotColorKey(path: string): string {
  const parts = path.split('.')
  const i = parts.lastIndexOf('color')
  if (i < 0) throw new Error(`不是颜色 token：${path}`)
  return `--${parts.slice(i + 1).map(kebab).join('-')}`
}

export function legacyAlias(path: string): string {
  const parts = path.split('.')
  const i = parts.lastIndexOf('color')
  if (i < 0) throw new Error(`不是颜色 token：${path}`)
  return `--${parts.slice(i + 1).map(kebab).join('-')}`
}

export function cssFontFamily(families: string[]): string {
  const generic = new Set([
    'serif',
    'sans-serif',
    'monospace',
    'cursive',
    'fantasy',
    'system-ui',
    'ui-serif',
    'ui-sans-serif',
    'ui-monospace',
    'ui-rounded',
    'emoji',
    'math',
    'fangsong',
  ])
  return families
    .map(f => (generic.has(f) || /^-?[a-zA-Z][a-zA-Z0-9-]*$/.test(f) ? f : `"${f}"`))
    .join(', ')
}

export function cssValue(token: Token): string {
  const v = token.value
  switch (token.type) {
    case 'fontFamily':
      return cssFontFamily(v as string[])
    case 'cubicBezier': {
      const a = v as number[]
      return `cubic-bezier(${a.join(', ')})`
    }
    case 'number':
    case 'fontWeight':
      return String(v)
    default:
      return String(v)
  }
}

// ══════════════════════════════════════════════════════════════════════
// 对比度
// ══════════════════════════════════════════════════════════════════════

export function parseHex(hex: string): [number, number, number] {
  const h = hex.replace('#', '').trim()
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h
  if (!/^[0-9A-Fa-f]{6}$/.test(full)) throw new Error(`不是 #RRGGBB：${hex}`)
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ]
}

function channelToLinear(c8: number): number {
  const c = c8 / 255
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

export function relativeLuminance(hex: string): number {
  const [r, g, b] = parseHex(hex)
  return 0.2126 * channelToLinear(r) + 0.7152 * channelToLinear(g) + 0.0722 * channelToLinear(b)
}

export function contrast(fg: string, bg: string): number {
  const l1 = relativeLuminance(fg)
  const l2 = relativeLuminance(bg)
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1]
  return (hi + 0.05) / (lo + 0.05)
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100
}

// ══════════════════════════════════════════════════════════════════════
// 生成：Web CSS
// ══════════════════════════════════════════════════════════════════════

function shouldEmitCss(token: Token): boolean {
  return token.type !== 'string'
}

export function buildWebCss(tokens: TokenMap, productName: string): string {
  const lines: string[] = []
  lines.push('/*')
  lines.push(' * AUTO-GENERATED by design/tools/build_tokens.ts — DO NOT EDIT.')
  lines.push(` * Product: ${productName}`)
  lines.push(' * Source: design/tokens/{core,products}/*.tokens.json')
  lines.push(' * Run: node design/tools/build_tokens.ts')
  lines.push(' */')
  lines.push('')
  lines.push(':root {')

  const section = (title: string) => {
    lines.push('')
    lines.push(`  /* ${title} */`)
  }

  section('sys.color')
  for (const [path, token] of [...tokens].sort(([a], [b]) => a.localeCompare(b))) {
    if (!path.startsWith('sys.color.')) continue
    lines.push(`  ${cssVar(path)}: ${cssValue(token)};`)
  }

  section('sys.type (UI + Editorial)')
  for (const [path, token] of [...tokens].sort(([a], [b]) => a.localeCompare(b))) {
    if (!path.startsWith('sys.type.') || !shouldEmitCss(token)) continue
    lines.push(`  ${cssVar(path)}: ${cssValue(token)};`)
  }

  section('sys.size / space / radius / border / motion / shadow / icon / grid')
  for (const [path, token] of [...tokens].sort(([a], [b]) => a.localeCompare(b))) {
    if (!/^sys\.(size|space|radius|border|motion|shadow|icon|grid)\./.test(path)) continue
    if (!shouldEmitCss(token)) continue
    lines.push(`  ${cssVar(path)}: ${cssValue(token)};`)
  }

  section('ref.font.family (for consumers that need the raw stack)')
  for (const [path, token] of [...tokens].sort(([a], [b]) => a.localeCompare(b))) {
    if (!path.startsWith('ref.font.family.')) continue
    lines.push(`  ${cssVar(path)}: ${cssValue(token)};`)
  }

  section('component (optional)')
  for (const [path, token] of [...tokens].sort(([a], [b]) => a.localeCompare(b))) {
    if (!path.startsWith('component.')) continue
    lines.push(`  ${cssVar(path)}: ${cssValue(token)};`)
  }

  section(`product.${productName}.color`)
  for (const [path, token] of [...tokens].sort(([a], [b]) => a.localeCompare(b))) {
    if (!path.startsWith(`product.${productName}.color.`)) continue
    lines.push(`  ${productCssVar(path)}: ${cssValue(token)};`)
  }

  section(`legacy aliases: ${productName}（迁移用；新代码请直接用 --lr-*）`)
  for (const [path] of [...tokens].sort(([a], [b]) => a.localeCompare(b))) {
    if (!path.startsWith(`product.${productName}.color.`)) continue
    lines.push(`  ${legacyAlias(path)}: var(${productCssVar(path)});`)
  }

  lines.push('}')
  lines.push('')
  return lines.join('\n')
}

// ══════════════════════════════════════════════════════════════════════
// 生成：Godot tokens.json（保持《未来残片》现有 schema）
// ══════════════════════════════════════════════════════════════════════

export function buildGodotJson(tokens: TokenMap): string {
  const colors: Record<string, string> = {}
  for (const [path, token] of [...tokens].sort(([a], [b]) => a.localeCompare(b))) {
    if (!path.startsWith('product.future-debris.color.')) continue
    colors[godotColorKey(path)] = String(token.value)
  }

  const typeScale = UI_LEVELS.map(level => ({
    token: level,
    size: dimensionToNumber(getString(tokens, `sys.type.ui.${level}.size`)),
    lineHeight: getNumber(tokens, `sys.type.ui.${level}.lineHeight`),
    weight: getNumber(tokens, `sys.type.ui.${level}.weight`),
    use: getString(tokens, `sys.type.ui.${level}.use`),
  }))

  const spacing = ['4', '8', '12', '16', '24', '32'].map(k =>
    dimensionToNumber(getString(tokens, `sys.space.${k}`)),
  )

  const monoGodot = getValue(tokens, 'ref.font.family.monoGodot') as string[]

  const data = {
    schemaVersion: 1,
    name: 'future-debris.tokens',
    note:
      'AUTO-GENERATED by design/tools/build_tokens.ts from design/tokens/ — DO NOT EDIT. ' +
      '权威契约仍是 docs/04_视觉语言与设计token.md；design/tools 与项目 check_tokens.py 双重对账。',
    sourceDoc: 'docs/04_视觉语言与设计token.md',
    colors,
    typeScale,
    fonts: {
      families: monoGodot,
      note: '用 Godot SystemFont 按名查找，不在仓库放字体二进制（沿用既有项目做法）。',
    },
    spacing: {
      scale: spacing,
      unit: 4,
    },
    radius: {
      control: dimensionToNumber(getString(tokens, 'sys.radius.control')),
      panel: dimensionToNumber(getString(tokens, 'sys.radius.panel')),
      note: '圆润感来自形状与材质，不来自超大圆角。',
    },
    stroke: {
      control: dimensionToNumber(getString(tokens, 'sys.border.control')),
      focus: dimensionToNumber(getString(tokens, 'sys.border.focus')),
      focusOffset: dimensionToNumber(getString(tokens, 'sys.border.focusOffset')),
    },
    shadow: {
      elevation: String(getValue(tokens, 'sys.shadow.elevated')),
      onlyFor: '浮起面（弹窗、拖拽中的卡）',
    },
    motion: {
      'dur-fast': durationToNumber(getString(tokens, 'sys.motion.duration.fast')),
      'dur-base': durationToNumber(getString(tokens, 'sys.motion.duration.base')),
      'dur-slow': durationToNumber(getString(tokens, 'sys.motion.duration.slow')),
      'ease-standard': getValue(tokens, 'sys.motion.easing.standard'),
      'ease-emphasis': getValue(tokens, 'sys.motion.easing.emphasis'),
    },
    icon: {
      canvas: dimensionToNumber(getString(tokens, 'sys.icon.canvas')),
      stroke: dimensionToNumber(getString(tokens, 'sys.icon.stroke')),
      rule: getString(tokens, 'sys.icon.rule'),
    },
    rootBackground: {
      token: '--bg-base',
      themePanelType: 'RootBackground',
      note: 'Godot 无全局背景色设置：由根 PanelContainer + RootBackground 面板类型提供。',
    },
  }

  return `${JSON.stringify(data, null, 2)}\n`
}

// ══════════════════════════════════════════════════════════════════════
// 生成：App token JSON（平台无关）
// ══════════════════════════════════════════════════════════════════════

export function buildAppJson(tokens: TokenMap): string {
  const colors: Record<string, string> = {}
  for (const [path, token] of [...tokens].sort(([a], [b]) => a.localeCompare(b))) {
    if (!path.startsWith('sys.color.')) continue
    colors[path.replace('sys.color.', '')] = String(token.value)
  }

  const type = UI_LEVELS.map(level => ({
    token: level,
    size: dimensionToNumber(getString(tokens, `sys.type.ui.${level}.size`)),
    lineHeight: getNumber(tokens, `sys.type.ui.${level}.lineHeight`),
    weight: getNumber(tokens, `sys.type.ui.${level}.weight`),
    use: getString(tokens, `sys.type.ui.${level}.use`),
  }))

  const data = {
    schemaVersion: 1,
    name: 'lrds.app.tokens',
    platform: 'ios-android',
    unit: 'logical-px',
    note:
      '由 design/tokens 生成。1 logical px 在基线上映射为 iOS pt / Android dp；' +
      '文字必须随系统 Dynamic Type / fontScale 缩放，不得用固定高度裁切。' +
      '颜色只引用 sys.* 语义；产品风格卡另行叠加。',
    colors,
    type,
    size: {
      control: {
        sm: dimensionToNumber(getString(tokens, 'sys.size.control.sm')),
        md: dimensionToNumber(getString(tokens, 'sys.size.control.md')),
        lg: dimensionToNumber(getString(tokens, 'sys.size.control.lg')),
      },
      touch: {
        min: dimensionToNumber(getString(tokens, 'sys.size.touch.min')),
      },
      icon: {
        sm: dimensionToNumber(getString(tokens, 'sys.size.icon.sm')),
        md: dimensionToNumber(getString(tokens, 'sys.size.icon.md')),
        lg: dimensionToNumber(getString(tokens, 'sys.size.icon.lg')),
      },
    },
    space: [4, 8, 12, 16, 24, 32],
    radius: {
      control: dimensionToNumber(getString(tokens, 'sys.radius.control')),
      panel: dimensionToNumber(getString(tokens, 'sys.radius.panel')),
    },
    border: {
      control: dimensionToNumber(getString(tokens, 'sys.border.control')),
      focus: dimensionToNumber(getString(tokens, 'sys.border.focus')),
      focusOffset: dimensionToNumber(getString(tokens, 'sys.border.focusOffset')),
    },
    motion: {
      fast: durationToNumber(getString(tokens, 'sys.motion.duration.fast')),
      base: durationToNumber(getString(tokens, 'sys.motion.duration.base')),
      slow: durationToNumber(getString(tokens, 'sys.motion.duration.slow')),
      standard: getValue(tokens, 'sys.motion.easing.standard'),
      emphasis: getValue(tokens, 'sys.motion.easing.emphasis'),
    },
    shadow: {
      elevated: String(getValue(tokens, 'sys.shadow.elevated')),
    },
    accessibility: {
      minTouchTarget: dimensionToNumber(getString(tokens, 'sys.size.touch.min')),
      minContrastText: 4.5,
      minContrastUi: 3,
      minTextScale: 2.0,
    },
  }

  return `${JSON.stringify(data, null, 2)}\n`
}

// ══════════════════════════════════════════════════════════════════════
// 生成：Markdown token 参考
// ══════════════════════════════════════════════════════════════════════

function table(headers: string[], rows: string[][]): string {
  const out: string[] = []
  out.push(`| ${headers.join(' | ')} |`)
  out.push(`| ${headers.map(() => '---').join(' | ')} |`)
  for (const row of rows) out.push(`| ${row.join(' | ')} |`)
  return out.join('\n')
}

export function buildDocs(tokens: TokenMap): string {
  const lines: string[] = []
  lines.push('# LRDS Token 参考（自动生成）')
  lines.push('')
  lines.push('> **不要手改**：本文件由 `design/tools/build_tokens.ts` 从 `design/tokens/` 生成。')
  lines.push('> 要改值，改源 JSON；要改说明，改源 JSON 的 `meta.note` 或本生成器。')
  lines.push('')

  const colorRows = [...tokens]
    .filter(([path]) => path.startsWith('sys.color.'))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([path, t]) => [`\`${path}\``, `\`${String(t.value)}\``, t.type])
  lines.push('## sys.color')
  lines.push('')
  lines.push(table(['token', '值', '类型'], colorRows))
  lines.push('')

  for (const [title, prefix] of [
    ['sys.type.ui', 'sys.type.ui.'],
    ['sys.type.editorial', 'sys.type.editorial.'],
  ] as const) {
    const levels =
      title === 'sys.type.ui' ? UI_LEVELS : EDITORIAL_LEVELS
    const rows = levels.map(level => [
      `\`${level}\``,
      getString(tokens, `${prefix}${level}.size`),
      String(getNumber(tokens, `${prefix}${level}.lineHeight`)),
      String(getNumber(tokens, `${prefix}${level}.weight`)),
      getString(tokens, `${prefix}${level}.use`),
    ])
    lines.push(`## ${title}`)
    lines.push('')
    lines.push(table(['层级', '字号', '行高', '字重', '用途'], rows))
    lines.push('')
  }

  for (const product of PRODUCTS) {
    const rows = [...tokens]
      .filter(([path]) => path.startsWith(`product.${product}.color.`))
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([path, t]) => [
        `\`${path.replace(`product.${product}.`, '')}\``,
        `\`${String(t.value)}\``,
        t.resolvedFrom ? `\`{${t.resolvedFrom}}\`` : '—',
      ])
    lines.push(`## product.${product}.color`)
    lines.push('')
    lines.push(table(['token', '值', '来源'], rows))
    lines.push('')
  }

  lines.push('## 尺度')
  lines.push('')
  const scaleRows = [
    ['size', 'control 32/40/48 · touch min 44 · icon 16/24/32', 'px'],
    ['space', '4 / 8 / 12 / 16 / 24 / 32', 'px'],
    ['radius', 'control 4 / panel 8', 'px'],
    ['border', 'control 1.5 / focus 2 / offset 1', 'px'],
    ['motion', 'fast 120 / base 220 / slow 420', 'ms'],
  ]
  lines.push(table(['类别', '值', '单位'], scaleRows))
  lines.push('')

  return lines.join('\n')
}

// ══════════════════════════════════════════════════════════════════════
// 构建全部产物
// ══════════════════════════════════════════════════════════════════════

export function buildAll(designRoot = DESIGN_ROOT, workspaceRoot = WORKSPACE_ROOT): BuildOutput[] {
  const loaded = loadTokens(designRoot)
  if (loaded.errors.length) {
    throw new Error(`token 校验失败：\n${loaded.errors.join('\n')}`)
  }

  const webByProduct = new Map(
    WEB_PRODUCTS.map(name => [name, buildWebCss(loaded.tokens, name)]),
  )
  const godot = buildGodotJson(loaded.tokens)
  const docs = buildDocs(loaded.tokens)

  return [
    ...WEB_PRODUCTS.map(name => ({
      path: join(designRoot, `tokens/dist/web/${name}.css`),
      content: webByProduct.get(name)!,
      label: `design/tokens/dist/web/${name}.css`,
    })),
    {
      path: join(designRoot, 'tokens/dist/godot/tokens.json'),
      content: godot,
      label: 'design/tokens/dist/godot/tokens.json',
    },
    {
      path: join(designRoot, 'tokens/dist/app/tokens.json'),
      content: buildAppJson(loaded.tokens),
      label: 'design/tokens/dist/app/tokens.json',
    },
    {
      path: join(designRoot, 'tokens/dist/docs/tokens.md'),
      content: docs,
      label: 'design/tokens/dist/docs/tokens.md',
    },
    {
      path: join(workspaceRoot, 'projects/website/app/assets/tokens.generated.css'),
      content: webByProduct.get('future-archive')!,
      label: 'projects/website/app/assets/tokens.generated.css',
    },
    {
      path: join(workspaceRoot, 'projects/livefab/portal/src/assets/tokens.generated.css'),
      content: webByProduct.get('livefab')!,
      label: 'projects/livefab/portal/src/assets/tokens.generated.css',
    },
    {
      path: join(workspaceRoot, 'projects/mainline/future-debris/game/data/tokens.json'),
      content: godot,
      label: 'projects/mainline/future-debris/game/data/tokens.json',
    },
  ]
}

// ══════════════════════════════════════════════════════════════════════
// 差异工具（供 --check 与自检）
// ══════════════════════════════════════════════════════════════════════

export interface Diff {
  line: number
  expected: string
  actual: string
}

export function firstDiff(expected: string, actual: string): Diff | null {
  const a = expected.split('\n')
  const b = actual.split('\n')
  const max = Math.max(a.length, b.length)
  for (let i = 0; i < max; i++) {
    if ((a[i] ?? '') !== (b[i] ?? '')) {
      return { line: i + 1, expected: a[i] ?? '<EOF>', actual: b[i] ?? '<EOF>' }
    }
  }
  return null
}
