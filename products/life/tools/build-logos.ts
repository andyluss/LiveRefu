// SPDX-License-Identifier: UNLICENSED
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const ROOT = resolve(import.meta.dirname, '..')
const INK = '#FFFDF7'
const LOGOS: Record<string, { accent: string; label: string; glyph: string }> = {
  life: { accent: '#0F6B63', label: 'Life 小孩头像', glyph: '<circle cx="32" cy="33" r="16"/><path d="M17 30c1-11 7-18 15-18 9 0 14 7 15 18-2-4-5-6-8-6-3 0-5 1-7 3-3 3-7 3-10 0-1-1-3-1-5 3z" fill="#FFFDF7" stroke="none"/><path d="M32 11c0-3 2-5 5-5" /><circle cx="26" cy="34" r="1.6" fill="#FFFDF7" stroke="none"/><circle cx="38" cy="34" r="1.6" fill="#FFFDF7" stroke="none"/><path d="M28 41c2 2 6 2 8 0"/><path d="M23 26c3-3 6-4 9-4 4 0 7 1 9 4" opacity=".5"/>' },
  ledger: { accent: '#4F6D7A', label: '慢慢记', glyph: '<rect x="18" y="16" width="28" height="32" rx="4"/><path d="M24 24h16M24 31h16M24 38h10"/>' },
  sleep: { accent: '#0F6B63', label: '好好睡', glyph: '<path d="M40 18a18 18 0 1 0 5 30 15 15 0 0 1-5-30z"/><path d="M43 23l1.5 3 3 .5-2.3 2 .5 3-2.7-1.5-2.7 1.5.5-3-2.3-2 3-.5z" fill="#FFFDF7" stroke="none"/>' },
  meal: { accent: '#8A5A00', label: '慢慢吃', glyph: '<path d="M16 32h32a16 16 0 0 1-32 0z"/><path d="M24 24c0-3 3-3 3-6M33 24c0-3 3-3 3-6M42 24c0-3 3-3 3-6"/>' },
  move: { accent: '#8A3B24', label: '慢慢走', glyph: '<path d="M14 40c9-1 15-6 18-14 2-5 6-8 10-8"/><path d="M20 48c8-1 14-5 17-12"/><circle cx="43" cy="19" r="3" fill="#FFFDF7" stroke="none"/><path d="M14 30l6-2M42 42l6-2"/>' },
  read: { accent: '#3B5B8A', label: '慢慢读', glyph: '<path d="M15 20c6-3 12-3 17 1 5-4 11-4 17-1v26c-6-3-12-3-17 0-5-3-11-3-17 0z"/><path d="M32 21v26"/>' },
  home: { accent: '#4F6B3A', label: '好好住', glyph: '<path d="M14 31L32 16l18 15"/><path d="M19 29v19h26V29"/><path d="M28 48V36h8v12"/>' },
  wear: { accent: '#7A4E6D', label: '好好穿', glyph: '<path d="M32 23a5 5 0 1 1 5 5l-5 3-15 12h30L32 31"/><path d="M17 43h30"/>' },
  hydrate: { accent: '#2F6F8A', label: '慢慢喝', glyph: '<path d="M32 16c-7 9-13 16-13 24a13 13 0 0 0 26 0c0-8-6-15-13-24z"/><path d="M25 42c2 3 5 4 7 4" opacity=".65"/>' },
  journal: { accent: '#5B4A7A', label: '慢慢写', glyph: '<path d="M20 46l4-12 16-18 8 8-16 18z"/><path d="M38 18l8 8M24 34l8 8"/>' },
  watch: { accent: '#6B4F8A', label: '慢慢看', glyph: '<rect x="14" y="20" width="36" height="24" rx="3"/><path d="M27 27l10 5-10 5z" fill="#FFFDF7" stroke="none"/><path d="M20 16v4M44 16v4M20 44v4M44 44v4"/>' },
  listen: { accent: '#4F6D7A', label: '慢慢听', glyph: '<path d="M16 34v-2a16 16 0 0 1 32 0v2"/><rect x="13" y="32" width="8" height="14" rx="3"/><rect x="43" y="32" width="8" height="14" rx="3"/><path d="M25 49c3 2 5 3 7 3"/>' },
  learn: { accent: '#3B6B5A', label: '慢慢学', glyph: '<path d="M12 26l20-9 20 9-20 9z"/><path d="M20 30v10c6 5 18 5 24 0V30M52 26v13"/>' },
  travel: { accent: '#3B5B8A', label: '慢慢行', glyph: '<circle cx="32" cy="28" r="13"/><path d="M32 15v6M32 35v6M19 28h6M39 28h6"/><path d="M32 41l-5 10h10z" fill="#FFFDF7" stroke="none"/>' },
  care: { accent: '#4F6B3A', label: '好好养', glyph: '<path d="M32 48V27"/><path d="M32 36c-8 0-13-5-13-13 8 0 13 5 13 13zM32 30c0-8 5-13 13-13 0 8-5 13-13 13z"/><path d="M22 48h20"/>' },
  organize: { accent: '#6B5B3A', label: '好好整', glyph: '<rect x="15" y="15" width="14" height="14" rx="2"/><rect x="35" y="15" width="14" height="14" rx="2"/><rect x="15" y="35" width="14" height="14" rx="2"/><path d="M42 34v16M34 42h16"/>' },
  connect: { accent: '#8A4B5A', label: '慢慢聊', glyph: '<path d="M14 20h24v16H24l-6 6v-6h-4z"/><path d="M28 32h20v12h-4v5l-5-5h-7"/>' }
}
for (const [id, spec] of Object.entries(LOGOS)) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="${spec.label}">
<rect width="64" height="64" rx="15" fill="${spec.accent}"/>
<rect x="1" y="1" width="62" height="62" rx="14" fill="none" stroke="#FFFDF7" stroke-opacity=".18"/>
<g fill="none" stroke="#FFFDF7" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round">${spec.glyph}</g>
</svg>\n`
  mkdirSync(resolve(ROOT, 'brand/logos'), { recursive: true })
  mkdirSync(resolve(ROOT, 'packages/web/logos'), { recursive: true })
  writeFileSync(resolve(ROOT, 'brand/logos', `${id}.svg`), svg)
  writeFileSync(resolve(ROOT, 'packages/web/logos', `${id}.svg`), svg)
}
console.log(`logos → ${Object.keys(LOGOS).length} brand marks`)
