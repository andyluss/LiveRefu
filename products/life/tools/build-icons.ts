// SPDX-License-Identifier: UNLICENSED
import { execFileSync } from 'node:child_process'
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { APPS } from '../apps.ts'
import { LOGOS } from './build-logos.ts'

const ROOT = resolve(import.meta.dirname, '..')
const LOGO_DIR = resolve(ROOT, 'packages/web/logos')
const OUT = resolve(ROOT, 'packages/web/icons')
const INK = '#FFFDF7'

function svgMaskable(id: string): string {
  const spec = LOGOS[id]
  if (!spec) throw new Error(`缺少 logo：${id}`)
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
<rect width="512" height="512" fill="${spec.accent}"/>
<g transform="translate(64 64) scale(6)">
<rect width="64" height="64" fill="${spec.accent}"/>
<g fill="none" stroke="${INK}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round">${spec.glyph}</g>
</g>
</svg>\n`
}
function ico(pngs: Buffer[]): Buffer {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(pngs.length, 4)
  let offset = 6 + 16 * pngs.length
  const entries: Buffer[] = []
  pngs.forEach((data, i) => {
    const size = [16, 32, 48][i]
    const e = Buffer.alloc(16)
    e.writeUInt8(size === 256 ? 0 : size, 0); e.writeUInt8(size === 256 ? 0 : size, 1)
    e.writeUInt8(0, 2); e.writeUInt8(0, 3); e.writeUInt16LE(1, 4); e.writeUInt16LE(32, 6)
    e.writeUInt32LE(data.length, 8); e.writeUInt32LE(offset, 12)
    entries.push(e); offset += data.length
  })
  return Buffer.concat([header, ...entries, ...pngs])
}
for (const app of [...APPS, { id: 'life', name: 'Life', english: 'LIFE', description: 'Life 生活应用套件' }]) {
  const dir = resolve(OUT, app.id)
  mkdirSync(dir, { recursive: true })
  const logo = resolve(LOGO_DIR, `${app.id}.svg`)
  copyFileSync(logo, resolve(dir, 'favicon.svg'))
  execFileSync('rsvg-convert', ['-w', '16', '-h', '16', logo, '-o', resolve(dir, 'favicon-16.png')])
  execFileSync('rsvg-convert', ['-w', '32', '-h', '32', logo, '-o', resolve(dir, 'favicon-32.png')])
  execFileSync('rsvg-convert', ['-w', '48', '-h', '48', logo, '-o', resolve(dir, 'favicon-48.png')])
  execFileSync('rsvg-convert', ['-w', '180', '-h', '180', logo, '-o', resolve(dir, 'apple-touch-icon.png')])
  execFileSync('rsvg-convert', ['-w', '192', '-h', '192', logo, '-o', resolve(dir, 'icon-192.png')])
  execFileSync('rsvg-convert', ['-w', '512', '-h', '512', logo, '-o', resolve(dir, 'icon-512.png')])
  const mask = resolve(dir, 'maskable.svg')
  writeFileSync(mask, svgMaskable(app.id))
  execFileSync('rsvg-convert', ['-w', '512', '-h', '512', mask, '-o', resolve(dir, 'maskable-512.png')])
  const pngs = [16, 32, 48].map(size => readFileSync(resolve(dir, `favicon-${size}.png`)) as Buffer)
  writeFileSync(resolve(dir, 'favicon.ico'), ico(pngs))
  const accent = LOGOS[app.id].accent
  const manifest = {
    name: app.name, short_name: app.name, description: app.description,
    start_url: '/', scope: '/', display: 'standalone',
    background_color: '#F5EFE3', theme_color: accent,
    icons: [
      { src: `/shared/icons/${app.id}/icon-192.png`, sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: `/shared/icons/${app.id}/icon-512.png`, sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: `/shared/icons/${app.id}/maskable-512.png`, sizes: '512x512', type: 'image/png', purpose: 'maskable' }
    ]
  }
  writeFileSync(resolve(dir, 'manifest.webmanifest'), JSON.stringify(manifest, null, 2) + '\n')
  console.log(`icons → ${app.id}`)
}
