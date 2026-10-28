#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const ROOT = resolve(import.meta.dirname, '..')
const web = (name: string) => readFileSync(resolve(ROOT, 'web', name), 'utf8')
const html = web('index.html')
const app = web('app.js')
const i18n = web('i18n.js')

function argumentsOf(name: string): string | undefined {
  const i = process.argv.indexOf(name)
  return i >= 0 ? process.argv[i + 1] : undefined
}
const JSON_OUT = process.argv.includes('--json')

function dictionaryKeys(): Set<string> {
  const block = i18n.match(/const EN = \{([\s\S]*?)\n  \};/)?.[1] || ''
  const keys = new Set<string>()
  for (const m of block.matchAll(/'((?:\\'|[^'])*)'\s*:/g)) keys.add(m[1]!.replace(/\\'/g, "'"))
  return keys
}
function textNodes(source: string): string[] {
  const clean = source.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<!--[\s\S]*?-->/g, '')
  return [...clean.matchAll(/>([^<>]+)</g)].map(m => m[1]!.replace(/\s+/g, ' ').trim()).filter(s => /[\u4e00-\u9fff]/.test(s))
}
function attrs(source: string): string[] {
  const out: string[] = []
  for (const m of source.matchAll(/(?:placeholder|aria-label|title|alt)="([^"]*)"/g)) if (m[1] && /[\u4e00-\u9fff]/.test(m[1])) out.push(m[1])
  return out
}
function unique<T>(list: T[]): T[] { return [...new Set(list)] }
function hasBehavior(pattern: RegExp): boolean { return pattern.test(i18n) || pattern.test(app) }

const keys = dictionaryKeys()
const visible = unique(textNodes(html))
const attributes = unique(attrs(html))
const missingVisible = visible.filter(s => !keys.has(s))
const missingAttrs = attributes.filter(s => !keys.has(s))
const behaviors = [
  ['?lang force override', /new URLSearchParams\(location\.search\)\.get\('lang'\)/.test(i18n)],
  ['switch removes ?lang', /searchParams\.delete\('lang'\)/.test(i18n)],
  ['API sends lang', /lang=\$\{lang\}/.test(app)],
  ['localStorage persistence', /localStorage\.(getItem|setItem)\('livedso-locale'/.test(i18n)],
  ['html lang sync', /document\.documentElement\.lang/.test(i18n)],
  ['router hash', /hashchange/.test(app)],
  ['skin selector', /skin-select/.test(html) && /applySkin/.test(app)]
] as const
const behaviorFailed = behaviors.filter(([, ok]) => !ok)

const report = {
  dictionary: keys.size,
  staticText: { total: visible.length, covered: visible.length - missingVisible.length, missing: missingVisible },
  attributes: { total: attributes.length, covered: attributes.length - missingAttrs.length, missing: missingAttrs },
  behaviors: behaviors.map(([name, ok]) => ({ name, ok })),
  ok: missingVisible.length === 0 && missingAttrs.length === 0 && behaviorFailed.length === 0
}
if (JSON_OUT) {
  console.log(JSON.stringify(report, null, 2))
  process.exitCode = report.ok ? 0 : 1
} else {
  console.log('LiveAtelier · i18n audit')
  console.log(`dictionary entries      ${keys.size}`)
  console.log(`static text coverage    ${report.staticText.covered}/${report.staticText.total}`)
  console.log(`attribute coverage      ${report.attributes.covered}/${report.attributes.total}`)
  console.log('\nbehaviors')
  for (const b of report.behaviors) console.log(`  ${b.ok ? '✓' : '✗'} ${b.name}`)
  if (missingVisible.length || missingAttrs.length) {
    console.log('\nmissing translations')
    for (const s of missingVisible) console.log(`  ? ${s}`)
    for (const s of missingAttrs) console.log(`  ? [attr] ${s}`)
  }
  console.log(`\n${report.ok ? '✓ i18n audit passed' : '✗ i18n audit failed'}`)
  process.exitCode = report.ok ? 0 : 1
}
