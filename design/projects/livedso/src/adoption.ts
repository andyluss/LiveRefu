// SPDX-License-Identifier: Apache-2.0
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { extname, join, relative, resolve } from 'node:path'
import type { Vault } from './types.ts'
import { toCssVariable } from './tokens.ts'

export interface AdoptionFile {
  path: string
  tokenRefs: number
  deprecatedRefs: number
  rawColors: number
  unknownRefs: string[]
}

export interface AdoptionResult {
  root: string
  filesScanned: number
  filesWithTokens: number
  filesWithRawColor: number
  tokenRefs: number
  deprecatedRefs: number
  rawColors: number
  unknownRefs: number
  tokens: Array<{ path: string; count: number }>
  deprecated: Array<{ file: string; path: string }>
  unknown: Array<{ file: string; name: string }>
  files: AdoptionFile[]
  errors: string[]
}

const EXTS = new Set(['.css', '.scss', '.sass', '.less', '.ts', '.tsx', '.js', '.jsx', '.vue', '.svelte', '.astro', '.html', '.htm'])
const SKIP = new Set(['node_modules', '.git', '.build', '.next', '.nuxt', '.output', 'dist', 'build', 'coverage', 'vendor', 'backups', '__pycache__'])

function walk(dir: string, out: string[]): void {
  for (const name of readdirSync(dir)) {
    if (name.startsWith('.') && name !== '.') continue
    const abs = join(dir, name)
    let st
    try { st = statSync(abs) } catch { continue }
    if (st.isDirectory()) { if (!SKIP.has(name)) walk(abs, out); continue }
    if (EXTS.has(extname(name).toLowerCase())) out.push(abs)
  }
}

export function scanAdoption(root: string, vault: Vault): AdoptionResult {
  const absRoot = resolve(root)
  const errors: string[] = []
  if (!existsSync(absRoot) || !statSync(absRoot).isDirectory()) {
    return { root: absRoot, filesScanned: 0, filesWithTokens: 0, filesWithRawColor: 0, tokenRefs: 0, deprecatedRefs: 0, rawColors: 0, unknownRefs: 0, tokens: [], deprecated: [], unknown: [], files: [], errors: [`目录不存在：${absRoot}`] }
  }
  const varToPath = new Map<string, string>()
  for (const t of vault.tokens.values()) varToPath.set(toCssVariable(t.path), t.path)
  const files: string[] = []
  walk(absRoot, files)
  const counts = new Map<string, number>()
  const unknown: Array<{ file: string; name: string }> = []
  const deprecated: Array<{ file: string; path: string }> = []
  const records: AdoptionFile[] = []
  for (const file of files) {
    let text = ''
    try { text = readFileSync(file, 'utf8') } catch { continue }
    const rel = relative(absRoot, file).split('\\').join('/')
    const refs = [...text.matchAll(/var\(\s*(--[a-zA-Z0-9_-]+)/g)].map(m => m[1]!)
    const raw = [...text.matchAll(/#[0-9a-fA-F]{3,8}\b/g)].map(m => m[0])
    const missing: string[] = []
    let knownRefs = 0
    for (const name of refs) {
      const path = varToPath.get(name)
      if (path) { counts.set(path, (counts.get(path) || 0) + 1); knownRefs++; if (vault.tokens.get(path)?.deprecated) deprecated.push({ file: rel, path }) }
      else if (name.startsWith('--dso-')) { missing.push(name); unknown.push({ file: rel, name }) }
    }
    if (knownRefs || raw.length || missing.length) {
      records.push({ path: rel, tokenRefs: knownRefs, rawColors: raw.length, unknownRefs: missing })
    }
  }
  const tokens = [...counts.entries()].map(([path, count]) => ({ path, count })).sort((a, b) => b.count - a.count || a.path.localeCompare(b.path))
  const rawColors = records.reduce((n, f) => n + f.rawColors, 0)
  return {
    root: absRoot,
    filesScanned: files.length,
    filesWithTokens: records.filter(f => f.tokenRefs > 0).length,
    filesWithRawColor: records.filter(f => f.rawColors > 0).length,
    tokenRefs: records.reduce((n, f) => n + f.tokenRefs, 0),
    deprecatedRefs: deprecated.length,
    rawColors,
    unknownRefs: unknown.length,
    tokens,
    deprecated,
    unknown,
    files: records.sort((a, b) => b.tokenRefs + b.rawColors - (a.tokenRefs + a.rawColors)),
    errors
  }
}

export function adoptionMarkdown(result: AdoptionResult): string {
  return `# LiveDSO · Adoption Scan

> Root: \`${result.root}\` ｜ Files: ${result.filesScanned} ｜ Generated: ${new Date().toISOString()}

## Summary

| Metric | Value |
| --- | ---: |
| Files scanned | ${result.filesScanned} |
| Files using tokens | ${result.filesWithTokens} |
| Token refs | ${result.tokenRefs} |
| Files with raw colors | ${result.filesWithRawColor} |
| Raw color literals | ${result.rawColors} |
| Unknown --dso vars | ${result.unknownRefs} |
| Deprecated token refs | ${result.deprecatedRefs} |

## Top tokens

${result.tokens.slice(0, 20).map(t => `- \`${t.path}\` — ${t.count}`).join('\n') || '- none'}

## Deprecated token refs

${result.deprecated.map(d => `- \`${d.path}\` — ${d.file}`).join('\n') || '- none'}

## Unknown references

${result.unknown.map(u => `- \`${u.name}\` — ${u.file}`).join('\n') || '- none'}

## Files

${result.files.slice(0, 80).map(f => `- \`${f.path}\` — tokens ${f.tokenRefs} ／ raw ${f.rawColors}${f.unknownRefs.length ? ' ／ unknown ' + f.unknownRefs.length : ''}`).join('\n') || '- none'}
`
}
