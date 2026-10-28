#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const ROOT = resolve(import.meta.dirname, '..')
const allowed = new Set(['$schema', 'meta', 'ref', 'sys', 'component', 'product'])
const types = new Set(['color', 'dimension', 'number', 'fontWeight', 'fontFamily', 'duration', 'cubicBezier', 'shadow', 'string'])

export interface SchemaIssue { file: string; path: string; message: string }
export interface SchemaResult { vault: string; files: number; issues: SchemaIssue[]; ok: boolean }

function walk(value: unknown, path: string, file: string, issues: SchemaIssue[]): void {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return
  const obj = value as Record<string, unknown>
  if ('$value' in obj) {
    if (!('$type' in obj)) issues.push({ file, path, message: '缺少 $type' })
    else if (!types.has(String(obj.$type))) issues.push({ file, path, message: `非法 $type: ${String(obj.$type)}` })
    for (const key of Object.keys(obj)) if (!['$value', '$type', 'deprecated', 'replacedBy', 'deprecationNote'].includes(key)) issues.push({ file, path, message: `token 多余字段: ${key}` })
    return
  }
  for (const [key, child] of Object.entries(obj)) walk(child, path ? `${path}.${key}` : key, file, issues)
}

export function checkVaultSchema(root: string): SchemaResult {
  const files = readdirSync(join(root, 'tokens')).filter(f => f.endsWith('.json')).sort()
  const issues: SchemaIssue[] = []
  for (const name of files) {
    const file = join(root, 'tokens', name)
    if (!statSync(file).isFile()) continue
    let data: Record<string, unknown>
    try { data = JSON.parse(readFileSync(file, 'utf8')) } catch (e) { issues.push({ file: name, path: '', message: `JSON 解析失败：${(e as Error).message}` }); continue }
    if (!data.meta || typeof data.meta !== 'object') issues.push({ file: name, path: 'meta', message: '缺少 meta' })
    else if (!String((data.meta as Record<string, unknown>).name || '').trim()) issues.push({ file: name, path: 'meta.name', message: '缺少 meta.name' })
    for (const key of Object.keys(data)) {
      if (!allowed.has(key)) issues.push({ file: name, path: key, message: `LRDS schema 不允许顶层 ${key}` })
      else if (!['$schema', 'meta'].includes(key)) walk(data[key], key, name, issues)
    }
  }
  return { vault: root, files: files.length, issues, ok: issues.length === 0 }
}

const isMain = import.meta.url === pathToFileURL(process.argv[1] || '').href
if (isMain) {
  const json = process.argv.includes('--json')
  const idx = process.argv.indexOf('--vault')
  const only = idx >= 0 ? process.argv[idx + 1] : ''
  const pilot = process.argv.includes('--pilot')
  const pilots = ['minimal', 'lrds-sample', 'lrds-real', 'material-3']
  const roots = pilot
    ? pilots.map(id => resolve(ROOT, 'vaults', id))
    : only
      ? [resolve(ROOT, 'vaults', only)]
      : readdirSync(join(ROOT, 'vaults')).map(id => join(ROOT, 'vaults', id)).filter(p => statSync(p).isDirectory())
  const results = roots.map(checkVaultSchema)
  if (json) console.log(JSON.stringify(only ? results[0] : results, null, 2))
  else {
    console.log('LiveDSO · LRDS vault schema audit')
    for (const r of results) {
      console.log(`${r.ok ? '✓' : '✗'} ${r.vault.split('/').pop()} · ${r.files} files · ${r.issues.length} issues`)
      for (const i of r.issues.slice(0, 6)) console.log(`    ${i.file} ${i.path}: ${i.message}`)
      if (r.issues.length > 6) console.log(`    … ${r.issues.length - 6} more`)
    }
    console.log(`\n${results.every(r => r.ok) ? '✓ schema audit passed' : '✗ schema audit failed'}`)
  }
  process.exitCode = results.every(r => r.ok) ? 0 : 1
}
