// SPDX-License-Identifier: Apache-2.0
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, relative, resolve } from 'node:path'
import { contrast, parseColor } from './checks.ts'
import type { JsonValue } from './types.ts'
import { SKIN_ROLES } from './skin.ts'

export const CORE_ROLES = [
  'bg', 'surface', 'surfaceRaised', 'surfaceSunken',
  'text', 'textMuted', 'textInverse',
  'action', 'onAction', 'actionHover',
  'focus', 'border', 'borderStrong',
  'danger', 'success', 'warning'
] as const
export const B_ROLES = SKIN_ROLES.filter(r => !(CORE_ROLES as readonly string[]).includes(r))

export interface AdaptTheme { id: string; name?: string; mode?: 'light' | 'dark'; roles: Record<string, string> }
export interface AdaptProfile {
  source?: { root?: string; format?: 'dtcg' | 'css' | 'tailwind' | 'style-dictionary' | 'figma' }
  theme?: { id: string; name?: string; mode?: 'light' | 'dark' }
  themes?: AdaptTheme[]
  roles?: Record<string, string>
  component?: Record<string, string>
  missing?: 'fail' | 'warn'
}
export interface AdaptIssue { path: string; message: string }
export interface AdaptSuggestion { role: string; source: string; confidence: 'high' | 'low' }
export interface AdaptResult {
  ok: boolean
  out: string
  theme: string
  themes: string[]
  format: string
  sourceTokens: number
  mappedRoles: number
  issues: AdaptIssue[]
  suggestions: AdaptSuggestion[]
  sourceHash: string
  files: string[]
  suggestionFile?: string
}

type SourceToken = { path: string; value: JsonValue; type: string; file: string }
type Source = { tokens: Map<string, SourceToken>; hash: string; files: string[]; format: string }

function collectFiles(path: string): string[] {
  const out: string[] = []
  const walk = (p: string) => {
    for (const name of readdirSync(p).sort()) {
      if (name.startsWith('.')) continue
      const abs = join(p, name)
      if (statSync(abs).isDirectory()) walk(abs)
      else if (name.endsWith('.json') || name.endsWith('.css')) out.push(abs)
    }
  }
  if (statSync(path).isDirectory()) walk(path); else out.push(path)
  return out
}

function inferType(value: string): string {
  if (/^#[0-9a-f]{3,8}$/i.test(value) || /^rgba?\(/i.test(value)) return 'color'
  if (/^-?\d+(\.\d+)?px$/.test(value)) return 'dimension'
  if (/^-?\d+(\.\d+)?ms$/.test(value)) return 'duration'
  if (/^-?\d+(\.\d+)?$/.test(value)) return 'number'
  return 'string'
}
function safeId(selector: string): string {
  if (selector === ':root' || selector === 'html') return 'default'
  const dark = /dark/i.test(selector)
  if (dark) return 'dark'
  return selector.replace(/[^a-z0-9-]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'theme'
}
function parseCss(file: string, raw: string): SourceToken[] {
  const out: SourceToken[] = []
  const clean = raw.replace(/\/\*[\s\S]*?\*\//g, '')
  for (const m of clean.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selector = m[1]!.trim()
    const body = m[2]!
    if (!selector || selector.startsWith('@')) continue
    const theme = safeId(selector)
    for (const d of body.matchAll(/(--[a-zA-Z0-9_-]+)\s*:\s*([^;]+);/g)) {
      const name = d[1]!.slice(2)
      const rawValue = d[2]!.trim()
      const varRef = rawValue.match(/^var\(--([a-zA-Z0-9_-]+)\)$/)
      const value = varRef ? `{css.${theme}.${varRef[1]}}` : rawValue
      out.push({ path: `css.${theme}.${name}`, value, type: inferType(rawValue), file })
    }
  }
  return out
}
function parseTailwind(file: string, raw: string): SourceToken[] {
  const data = JSON.parse(raw) as any
  const colors = data?.theme?.extend?.colors || data?.theme?.colors || data?.colors
  if (!colors || typeof colors !== 'object') return []
  const out: SourceToken[] = []
  const walk = (value: any, prefix: string) => {
    if (typeof value === 'string') { out.push({ path: `tailwind.color.${prefix}`, value, type: 'color', file }); return }
    if (value && typeof value === 'object' && !Array.isArray(value)) for (const [k, v] of Object.entries(value)) walk(v, prefix ? `${prefix}.${k}` : k)
  }
  walk(colors, '')
  return out
}
function parseLoose(file: string, raw: string): SourceToken[] {
  const data = JSON.parse(raw) as JsonValue
  const out: SourceToken[] = []
  const walk = (value: JsonValue, prefix: string) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return
    const obj = value as Record<string, JsonValue>
    if ('$value' in obj || 'value' in obj && ('type' in obj || typeof obj.value === 'string')) {
      if (!prefix) throw new Error(`${file} 存在空 token 路径`)
      const type = String(obj.$type || obj.type || inferType(String(obj.$value ?? obj.value))).toLowerCase()
      out.push({ path: prefix, value: (obj.$value ?? obj.value) as JsonValue, type, file })
      return
    }
    for (const [key, child] of Object.entries(obj)) {
      if (key === '$schema' || key === 'meta') continue
      walk(child, prefix ? `${prefix}.${key}` : key)
    }
  }
  walk(data, '')
  return out
}
function setPath(root: Record<string, JsonValue>, path: string, value: JsonValue): void {
  const parts = path.split('.').filter(Boolean)
  let cur: Record<string, JsonValue> = root
  for (const part of parts.slice(0, -1)) {
    if (!cur[part] || typeof cur[part] !== 'object' || Array.isArray(cur[part])) cur[part] = {} as JsonValue
    cur = cur[part] as Record<string, JsonValue>
  }
  cur[parts[parts.length - 1]!] = value
}

function collectTokens(root: string, format: string): Source {
  const files = collectFiles(root)
  const hash = createHash('sha256')
  const tokens = new Map<string, SourceToken>()
  for (const file of files) {
    const raw = readFileSync(file, 'utf8')
    hash.update(file).update(raw)
    if (format === 'css' || file.endsWith('.css')) {
      if (format === 'dtcg') throw new Error(`DTCG 源不能包含 CSS：${relative(root, file)}`)
      for (const t of parseCss(file, raw)) tokens.set(t.path, t)
      continue
    }
    if (format === 'tailwind' || file.endsWith('.json') && /tailwind/i.test(file)) {
      for (const t of parseTailwind(file, raw)) tokens.set(t.path, t)
      continue
    }
    if (format === 'style-dictionary' || format === 'figma') {
      for (const t of parseLoose(file, raw)) tokens.set(t.path, t)
      continue
    }
    let data: JsonValue
    try { data = JSON.parse(raw) as JsonValue } catch (e) { throw new Error(`${relative(root, file)}: JSON 解析失败：${(e as Error).message}`) }
    const walk = (value: JsonValue, prefix: string) => {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        const obj = value as Record<string, JsonValue>
        if ('$value' in obj) {
          if (!prefix) throw new Error(`${relative(root, file)} 存在空 token 路径`)
          if (typeof obj.$type !== 'string') throw new Error(`${prefix}: 缺少 $type`)
          tokens.set(prefix, { path: prefix, value: obj.$value, type: obj.$type, file })
          return
        }
        for (const [key, child] of Object.entries(obj)) {
          if (key === '$schema' || key === 'meta') continue
          walk(child, prefix ? `${prefix}.${key}` : key)
        }
      }
    }
    walk(data, '')
  }
  return { tokens, hash: hash.digest('hex'), files: files.map(f => relative(root, f)), format }
}
function aliasTarget(value: JsonValue, tokens: Map<string, SourceToken>): string | null {
  if (typeof value !== 'string') return null
  const m = value.match(/^\{([^{}]+)\}$/)
  return m && tokens.has(m[1]!) ? m[1]! : null
}
function rewriteValue(value: JsonValue, tokens: Map<string, SourceToken>, issues: AdaptIssue[], path: string): JsonValue {
  const target = aliasTarget(value, tokens)
  if (target) return `{ref.source.external.${target}}`
  if (typeof value === 'string' && /^\{[^{}]+\}$/.test(value) && !/^rgba?\(/i.test(value)) issues.push({ path, message: `别名目标不存在：${value}` })
  return value
}
function resolvedColor(path: string, tokens: Map<string, SourceToken>, seen = new Set<string>()): string | null {
  if (seen.has(path)) return null
  seen.add(path)
  const t = tokens.get(path)
  if (!t) return null
  const target = aliasTarget(t.value, tokens)
  if (target) return resolvedColor(target, tokens, seen)
  return typeof t.value === 'string' && /^#[0-9a-f]{3,8}$/i.test(t.value) ? t.value : null
}

function normalizeThemes(profile: AdaptProfile): AdaptTheme[] {
  if (profile.themes?.length) return profile.themes
  if (profile.theme && profile.roles) return [{ ...profile.theme, roles: profile.roles }]
  return []
}
function detectFormat(sourceRoot: string, profile: AdaptProfile): string {
  if (profile.source?.format) return profile.source.format
  const files = collectFiles(sourceRoot)
  if (files.some(f => f.endsWith('.css'))) return 'css'
  if (files.some(f => /tailwind/i.test(f))) return 'tailwind'
  if (files.some(f => /style[-_]?dictionary/i.test(f))) return 'style-dictionary'
  if (files.some(f => /figma|tokens[-_]?studio/i.test(f))) return 'figma'
  return 'dtcg'
}
function suggestRoles(tokens: Map<string, SourceToken>, mapped: Set<string>): AdaptSuggestion[] {
  const keywords: Record<string, string[]> = {
    textSubtle: ['faint', 'subtle', 'tertiary'], textLink: ['link'], textVisited: ['visited'], textDisabled: ['disabled'],
    surfaceHover: ['hover'], borderSubtle: ['border', 'subtle'], divider: ['divider', 'line'], actionPressed: ['pressed', 'active'],
    actionDisabled: ['disabled'], secondaryAction: ['secondary'], onSecondaryAction: ['secondary'], ghostAction: ['ghost'],
    onDanger: ['danger', 'error'], dangerSubtle: ['danger', 'error'], onSuccess: ['success'], successSubtle: ['success'],
    onWarning: ['warning'], warningSubtle: ['warning'], info: ['info'], onInfo: ['info'], infoSubtle: ['info'],
    accent: ['accent', 'brand'], accent2: ['accent', 'secondary'], selection: ['selection'], codeBg: ['code'], codeText: ['code'],
    chart1: ['chart', 'data', 'graph'], chart2: ['chart', 'data', 'graph'], chart3: ['chart', 'data', 'graph'],
    chart4: ['chart', 'data', 'graph'], chart5: ['chart', 'data', 'graph'], chart6: ['chart', 'data', 'graph']
  }
  const paths = [...tokens.values()].filter(t => t.type === 'color').map(t => t.path)
  return Object.entries(keywords).flatMap(([role, keys]) => {
    if (mapped.has(role)) return []
    const hit = paths.find(p => keys.some(k => p.toLowerCase().includes(k)))
    if (!hit) return []
    const normalized = role.replace(/([A-Z])/g, '-$1').toLowerCase()
    return [{ role, source: hit, confidence: hit.toLowerCase().endsWith(normalized) ? 'high' : 'low' }]
  })
}

/** Convert DTCG/CSS/Tailwind source + explicit mapping into a schema-compatible vault. */
export function adaptVault(options: { source: string; profile: string; out: string; check?: boolean; dryRun?: boolean; suggest?: boolean; suggestOut?: string }): AdaptResult {
  const profilePath = resolve(options.profile)
  const sourceRoot = resolve(options.source)
  let profile: AdaptProfile
  try { profile = JSON.parse(readFileSync(profilePath, 'utf8')) as AdaptProfile } catch (e) { throw new Error(`profile 读取失败：${(e as Error).message}`) }
  const themes = normalizeThemes(profile)
  if (!themes.length) throw new Error('profile.themes 或 theme+roles 缺失')
  for (const t of themes) if (!/^[a-z0-9][a-z0-9-]*$/.test(t.id)) throw new Error(`theme.id 非法：${t.id}`)
  const format = detectFormat(sourceRoot, profile)
  const { tokens, hash, files } = collectTokens(sourceRoot, format)
  const issues: AdaptIssue[] = []
  const rewritten = new Map<string, JsonValue>()
  for (const [path, token] of tokens) rewritten.set(path, rewriteValue(token.value, tokens, issues, path))
  for (const theme of themes) {
    for (const role of CORE_ROLES) {
      const sourcePath = theme.roles[role]
      if (!sourcePath) { issues.push({ path: `${theme.id}.roles.${role}`, message: '缺少核心角色映射' }); continue }
      if (!tokens.has(sourcePath)) { issues.push({ path: `${theme.id}.roles.${role}`, message: `源 token 不存在：${sourcePath}` }); continue }
      if (tokens.get(sourcePath)!.type !== 'color') issues.push({ path: `${theme.id}.roles.${role}`, message: `角色必须是 color：${sourcePath}` })
    }
  }
  const suggestions = (options.suggest || options.suggestOut) ? suggestRoles(tokens, new Set(CORE_ROLES)) : []
  if (issues.length) return { ok: false, out: resolve(options.out), theme: themes[0]!.id, themes: themes.map(t => t.id), format, sourceTokens: tokens.size, mappedRoles: 0, issues, suggestions, sourceHash: hash, files: [], suggestionFile: undefined }
  const ref: Record<string, JsonValue> = { source: { external: Object.fromEntries([...rewritten].map(([path, value]) => [path, { $value: value, $type: tokens.get(path)!.type }])) } }
  const sys: Record<string, JsonValue> = { color: {} }
  const def = themes[0]!
  for (const role of CORE_ROLES) (sys.color as Record<string, JsonValue>)[role] = { $value: `{ref.source.external.${def.roles[role]}}`, $type: 'color' }
  const product: Record<string, JsonValue> = {}
  for (const theme of themes.slice(1)) {
    const block: Record<string, JsonValue> = {}
    for (const role of CORE_ROLES) {
      const sourcePath = theme.roles[role]
      if (!sourcePath || sourcePath === def.roles[role]) continue
      block[role] = { $value: `{ref.source.external.${sourcePath}}`, $type: 'color' }
    }
    if (Object.keys(block).length) product[theme.id] = { role: block }
  }
  const component: Record<string, JsonValue> = {}
  for (const [key, target] of Object.entries(profile.component || {})) {
    if (target.startsWith('sys.')) {
      if (!target.startsWith('sys.color.')) { issues.push({ path: `component.${key}`, message: `component 只允许 sys.color.* 或源 token：${target}` }); continue }
      setPath(component, key, { $value: `{${target}}`, $type: 'color' })
      continue
    }
    if (!tokens.has(target)) { issues.push({ path: `component.${key}`, message: `源 token 不存在：${target}` }); continue }
    setPath(component, key, { $value: `{ref.source.external.${target}}`, $type: tokens.get(target)!.type })
  }
  if (issues.length) return { ok: false, out: resolve(options.out), theme: def.id, themes: themes.map(t => t.id), format, sourceTokens: tokens.size, mappedRoles: CORE_ROLES.length, issues, suggestions, sourceHash: hash, files: [], suggestionFile: undefined }
  const meta = { name: def.name || def.id, version: '1.0.0', note: `Generated by LiveDSO adapt; source=${relative(process.cwd(), sourceRoot)}; sourceHash=${hash}; profile=${relative(process.cwd(), profilePath)}`, mode: def.mode || 'light', sourceHash: hash, format, themes: themes.map(t => ({ id: t.id, name: t.name || t.id, mode: t.mode || 'light' })) }
  const generated: Record<string, JsonValue> = { meta, ref, sys }
  if (Object.keys(product).length) generated.product = product
  if (Object.keys(component).length) generated.component = component
  const cards = themes.map(theme => {
    const roles: Record<string, string> = {}
    for (const role of CORE_ROLES) roles[role] = (product[theme.id] as any)?.role?.[role] ? `product.${theme.id}.role.${role}` : `sys.color.${role}`
    return { id: theme.id, name: theme.name || theme.id, era: 'generated', note: `${theme.mode || 'light'} theme generated from ${relative(process.cwd(), sourceRoot)}; sourceHash=${hash}`, mode: theme.mode || 'light', colors: CORE_ROLES.map(role => roles[role]), roles }
  })
  const filesOut = ['tokens/tokens.json', ...cards.map(c => `style-cards/${c.id}.style.json`), 'README.md']
  const out = resolve(options.out)
  let suggestionFile: string | undefined
  if (options.suggestOut) {
    suggestionFile = resolve(options.suggestOut)
    if (!options.dryRun) {
      mkdirSync(resolve(suggestionFile, '..'), { recursive: true })
      writeFileSync(suggestionFile, JSON.stringify({ note: 'Suggestions only; review before merging into profile.roles.', theme: def.id, roles: Object.fromEntries(suggestions.map(s => [s.role, s.source])), suggestions }, null, 2) + '\n', 'utf8')
    }
  }
  if (options.dryRun) return { ok: true, out, theme: def.id, themes: themes.map(t => t.id), format, sourceTokens: tokens.size, mappedRoles: CORE_ROLES.length, issues, suggestions, sourceHash: hash, files: filesOut, suggestionFile }
  const writeAll = (base: string) => {
    const write = (p: string, data: string) => { const abs = resolve(base, p); mkdirSync(resolve(abs, '..'), { recursive: true }); writeFileSync(abs, data, 'utf8') }
    write('tokens/tokens.json', JSON.stringify(generated, null, 2) + '\n')
    for (const card of cards) write(`style-cards/${card.id}.style.json`, JSON.stringify(card, null, 2) + '\n')
    write('README.md', `# ${def.name || def.id}\n\n> Generated by LiveDSO \`adapt\`; do not hand-edit.\n\n- source: \`${relative(process.cwd(), sourceRoot)}\`\n- source hash: \`${hash}\`\n- profile: \`${relative(process.cwd(), profilePath)}\`\n- format: ${format}\n- themes: ${themes.map(t => t.id).join(', ')}\n- source tokens: ${tokens.size}\n`)
  }
  // contrast is checked per theme before writing
  for (const theme of themes) {
    const colors = Object.fromEntries(CORE_ROLES.map(role => [role, resolvedColor(theme.roles[role]!, tokens)]))
    const pairs: Array<[string, string, number]> = [['text', 'bg', 4.5], ['text', 'surface', 4.5], ['textMuted', 'surface', 4.5], ['onAction', 'action', 4.5], ['focus', 'surface', 3], ['border', 'surface', 3]]
    for (const [fg, bg, min] of pairs) {
      const f = colors[fg] ? parseColor(colors[fg]!) : null
      const b = colors[bg] ? parseColor(colors[bg]!) : null
      if (!f || !b) { issues.push({ path: `${theme.id}.${fg}/${bg}`, message: '无法解析颜色' }); continue }
      const ratio = contrast(f, b)
      if (ratio + 0.005 < min) issues.push({ path: `${theme.id}.${fg}/${bg}`, message: `对比度 ${ratio.toFixed(2)}:1 < ${min}:1` })
    }
  }
  if (issues.length) return { ok: false, out, theme: def.id, themes: themes.map(t => t.id), format, sourceTokens: tokens.size, mappedRoles: CORE_ROLES.length, issues, suggestions, sourceHash: hash, files: filesOut, suggestionFile }
  if (options.check) {
    if (!existsSync(out)) {
      issues.push({ path: out, message: '生成物不存在，请先运行 adapt' })
    } else {
      const tmp = mkdtempSync(join(tmpdir(), 'livedso-adapt-check-'))
      try {
        writeAll(tmp)
        for (const file of filesOut) {
          if (!existsSync(resolve(out, file)) || readFileSync(resolve(out, file), 'utf8') !== readFileSync(resolve(tmp, file), 'utf8')) issues.push({ path: file, message: '生成物与源不一致，请重新 adapt' })
        }
      } finally { rmSync(tmp, { recursive: true, force: true }) }
    }
  } else {
    writeAll(out)
  }

  return { ok: issues.length === 0, out, theme: def.id, themes: themes.map(t => t.id), format, sourceTokens: tokens.size, mappedRoles: CORE_ROLES.length, issues, suggestions, sourceHash: hash, files: filesOut, suggestionFile }
}
