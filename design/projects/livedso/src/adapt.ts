// SPDX-License-Identifier: Apache-2.0
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, relative, resolve } from 'node:path'
import { contrast, parseColor } from './checks.ts'
import type { JsonValue } from './types.ts'

export const CORE_ROLES = [
  'bg', 'surface', 'surfaceRaised', 'surfaceSunken',
  'text', 'textMuted', 'textInverse',
  'action', 'onAction', 'actionHover',
  'focus', 'border', 'borderStrong',
  'danger', 'success', 'warning'
] as const

export interface AdaptProfile {
  source?: { root?: string; format?: string }
  theme: { id: string; name?: string; mode?: 'light' | 'dark' }
  roles: Record<string, string>
  missing?: 'fail' | 'warn'
}

export interface AdaptIssue { path: string; message: string }
export interface AdaptResult {
  ok: boolean
  out: string
  theme: string
  sourceTokens: number
  mappedRoles: number
  issues: AdaptIssue[]
  sourceHash: string
  files: string[]
}

type SourceToken = { path: string; value: JsonValue; type: string; file: string }

function collectFiles(path: string): string[] {
  const out: string[] = []
  const walk = (p: string) => {
    for (const name of readdirSync(p).sort()) {
      if (name.startsWith('.')) continue
      const abs = join(p, name)
      if (statSync(abs).isDirectory()) walk(abs)
      else if (name.endsWith('.json')) out.push(abs)
    }
  }
  if (statSync(path).isDirectory()) walk(path); else out.push(path)
  return out
}

function collectTokens(root: string): { tokens: Map<string, SourceToken>; hash: string; files: string[] } {
  const files = collectFiles(root)
  const hash = createHash('sha256')
  const tokens = new Map<string, SourceToken>()
  const walk = (value: JsonValue, prefix: string, file: string) => {
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
        walk(child, prefix ? `${prefix}.${key}` : key, file)
      }
    }
  }
  for (const file of files) {
    const raw = readFileSync(file, 'utf8')
    hash.update(file).update(raw)
    let data: JsonValue
    try { data = JSON.parse(raw) as JsonValue } catch (e) { throw new Error(`${relative(root, file)}: JSON 解析失败：${(e as Error).message}`) }
    walk(data, '', file)
  }
  return { tokens, hash: hash.digest('hex'), files: files.map(f => relative(root, f)) }
}

function aliasTarget(value: JsonValue, tokens: Map<string, SourceToken>): string | null {
  if (typeof value !== 'string') return null
  const m = value.match(/^\{([^{}]+)\}$/)
  if (!m) return null
  return tokens.has(m[1]!) ? m[1]! : null
}

function rewriteValue(value: JsonValue, tokens: Map<string, SourceToken>, errors: AdaptIssue[], path: string): JsonValue {
  const target = aliasTarget(value, tokens)
  if (target) return `{ref.source.external.${target}}`
  if (typeof value === 'string' && /^\{[^{}]+\}$/.test(value)) errors.push({ path, message: `别名目标不存在：${value}` })
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

/** Convert a DTCG source + explicit mapping profile into a schema-compatible LiveDSO vault. */
export function adaptVault(options: { source: string; profile: string; out: string; check?: boolean; dryRun?: boolean }): AdaptResult {
  const profilePath = resolve(options.profile)
  const sourceRoot = resolve(options.source)
  let profile: AdaptProfile
  try { profile = JSON.parse(readFileSync(profilePath, 'utf8')) as AdaptProfile } catch (e) { throw new Error(`profile 读取失败：${(e as Error).message}`) }
  if (!profile.theme?.id) throw new Error('profile.theme.id 缺失')
  if (!/^[a-z0-9][a-z0-9-]*$/.test(profile.theme.id)) throw new Error('profile.theme.id 只能使用小写字母/数字/连字符')
  if (!profile.roles || typeof profile.roles !== 'object') throw new Error('profile.roles 缺失')
  const { tokens, hash, files } = collectTokens(sourceRoot)
  const issues: AdaptIssue[] = []
  const aliasMap = new Map<string, JsonValue>()
  for (const [path, token] of tokens) aliasMap.set(path, rewriteValue(token.value, tokens, issues, path))
  for (const role of CORE_ROLES) {
    const sourcePath = profile.roles[role]
    if (!sourcePath) { issues.push({ path: `roles.${role}`, message: '缺少核心角色映射' }); continue }
    if (!tokens.has(sourcePath)) { issues.push({ path: `roles.${role}`, message: `源 token 不存在：${sourcePath}` }); continue }
    if (tokens.get(sourcePath)!.type !== 'color') issues.push({ path: `roles.${role}`, message: `角色必须是 color：${sourcePath}` })
  }
  for (const [role, sourcePath] of Object.entries(profile.roles)) {
    if (!CORE_ROLES.includes(role as never)) issues.push({ path: `roles.${role}`, message: `未知核心角色：${role}` })
    if (!tokens.has(sourcePath)) issues.push({ path: `roles.${role}`, message: `源 token 不存在：${sourcePath}` })
  }
  if (issues.length) return { ok: false, out: options.out, theme: profile.theme.id, sourceTokens: tokens.size, mappedRoles: 0, issues, sourceHash: hash, files: [] }
  const ref: Record<string, JsonValue> = { source: { external: Object.fromEntries([...aliasMap].map(([path, value]) => [path, { $value: value, $type: tokens.get(path)!.type }])) } }
  const sys: Record<string, JsonValue> = { color: {} }
  const colorRoles = sys.color as Record<string, JsonValue>
  for (const role of CORE_ROLES) {
    const sourcePath = profile.roles[role]
    if (sourcePath && tokens.has(sourcePath)) colorRoles[role] = { $value: `{ref.source.external.${sourcePath}}`, $type: 'color' }
  }
  const generated = {
    meta: {
      name: profile.theme.name || profile.theme.id,
      version: '1.0.0',
      note: `Generated by LiveDSO adapt; source=${relative(process.cwd(), sourceRoot)}; sourceHash=${hash}; profile=${relative(process.cwd(), profilePath)}`,
      mode: profile.theme.mode || 'light',
      sourceHash: hash
    },
    ref,
    sys
  }
  const card = {
    id: profile.theme.id,
    name: profile.theme.name || profile.theme.id,
    era: 'generated',
    note: `Generated from ${relative(process.cwd(), sourceRoot)}; sourceHash=${hash}`,
    colors: CORE_ROLES.map(role => `sys.color.${role}`),
    mode: profile.theme.mode || 'light',
    roles: Object.fromEntries(CORE_ROLES.map(role => [role, `sys.color.${role}`]))
  }
  const out = resolve(options.out)
  const filesOut = ['tokens/tokens.json', `style-cards/${profile.theme.id}.style.json`, 'README.md']
  if (options.dryRun) return { ok: issues.length === 0, out, theme: profile.theme.id, sourceTokens: tokens.size, mappedRoles: CORE_ROLES.length, issues, sourceHash: hash, files: filesOut }
  const write = (p: string, data: string) => { mkdirSync(resolve(out, p, '..'), { recursive: true }); writeFileSync(resolve(out, p), data, 'utf8') }
  // Contrast is checked after the mapped values are known.
  const colors = Object.fromEntries(CORE_ROLES.map(role => [role, resolvedColor(profile.roles[role]!, tokens)]))
  const pairs: Array<[string, string, number]> = [
    ['text', 'bg', 4.5], ['text', 'surface', 4.5], ['textMuted', 'surface', 4.5],
    ['onAction', 'action', 4.5], ['focus', 'surface', 3], ['border', 'surface', 3]
  ]
  for (const [fg, bg, min] of pairs) {
    const f = colors[fg] ? parseColor(colors[fg]!) : null
    const b = colors[bg] ? parseColor(colors[bg]!) : null
    if (!f || !b) { issues.push({ path: `${fg}/${bg}`, message: '无法解析颜色' }); continue }
    const ratio = contrast(f, b)
    if (ratio + 0.005 < min) issues.push({ path: `${fg}/${bg}`, message: `对比度 ${ratio.toFixed(2)}:1 < ${min}:1` })
  }
  if (issues.length) return { ok: false, out, theme: profile.theme.id, sourceTokens: tokens.size, mappedRoles: CORE_ROLES.length, issues, sourceHash: hash, files: filesOut }
  write('tokens/tokens.json', JSON.stringify(generated, null, 2) + '\n')
  write(`style-cards/${profile.theme.id}.style.json`, JSON.stringify(card, null, 2) + '\n')
  write('README.md', `# ${profile.theme.name || profile.theme.id}\n\n> Generated by LiveDSO \`adapt\`; do not hand-edit.\n\n- source: \`${relative(process.cwd(), sourceRoot)}\`\n- source hash: \`${hash}\`\n- profile: \`${relative(process.cwd(), profilePath)}\`\n- source tokens: ${tokens.size}\n- core roles: ${CORE_ROLES.length}\n`)
  if (options.check) {
    const tmp = mkdtempSync(join(tmpdir(), 'livedso-adapt-check-'))
    try {
      const expected = adaptVault({ source: sourceRoot, profile: profilePath, out: tmp })
      for (const file of filesOut) {
        if (!existsSync(resolve(out, file))) { issues.push({ path: file, message: '生成物缺失' }); continue }
        if (readFileSync(resolve(out, file), 'utf8') !== readFileSync(resolve(tmp, file), 'utf8')) issues.push({ path: file, message: '生成物与源不一致，请重新 adapt' })
      }
      void expected
    } finally { rmSync(tmp, { recursive: true, force: true }) }
  }
  return { ok: issues.length === 0, out, theme: profile.theme.id, sourceTokens: tokens.size, mappedRoles: CORE_ROLES.length, issues, sourceHash: hash, files: filesOut }
}
