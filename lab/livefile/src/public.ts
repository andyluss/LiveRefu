import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { ArchiveIndex } from './types.ts'

function esc(v: string): string {
  return String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] || c))
}
export function publicHtml(index: ArchiveIndex): string {
  const items = index.items.filter(i => i.isPublic)
  const cards = items.map(i => {
    let image = ''
    if (/\.(svg|png|jpe?g)$/i.test(i.path)) {
      const file = join(index.root, i.path)
      if (existsSync(file)) {
        const mime = i.path.toLowerCase().endsWith('.svg') ? 'image/svg+xml' : i.path.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg'
        image = `<img src="data:${mime};base64,${readFileSync(file).toString('base64')}" alt="${esc(i.title)}">`
      }
    }
    return `<article><div class="type">${esc(i.type)}</div><h2>${esc(i.title)}</h2><p>${esc(i.collections.join(' · ') || '未归类')} ｜ ${esc(i.created)}</p>${i.preview ? `<pre>${esc(i.preview.slice(0, 600))}</pre>` : ''}${image}<small>${esc(i.license || '许可未标')}</small></article>`
  }).join('')
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(index.root.split('/').pop() || 'archive')} · 公开档案</title><style>body{margin:0;background:#F7F3EA;color:#1B222B;font:15px/1.7 system-ui,sans-serif}main{max-width:980px;margin:0 auto;padding:40px 20px}h1{font:600 34px/1.1 Georgia,serif}header p{color:#4F5B68;max-width:65ch}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:14px;margin-top:28px}article{background:#FFFDF8;border:1px solid #D8D0C1;border-radius:8px;padding:14px}.type{font:10px monospace;color:#0B6B63;letter-spacing:.1em;text-transform:uppercase}h2{font:600 20px/1.3 Georgia,serif;margin:4px 0 2px}p{color:#4F5B68;font-size:12px;margin:0 0 8px}pre{white-space:pre-wrap;font:11px/1.5 monospace;color:#4F5B68;max-height:160px;overflow:hidden}img{max-width:100%;border-radius:4px;display:block;margin:8px 0}small{font:10px monospace;color:#5E6773}footer{margin-top:30px;color:#5E6773;font-size:11px}</style></head><body><main><header><h1>${esc(index.root.split('/').pop() || 'archive')}</h1><p>公开档案 · 只包含标记为 public 的条目。生成时间 ${new Date().toISOString()}。</p></header><div class="grid">${cards || '<p>没有公开条目。</p>'}</div><footer>由 LiveFile 本地生成 · 不是完整档案，不包含私密条目。</footer></main></body></html>`
}
