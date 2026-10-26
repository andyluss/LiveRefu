import { html } from '../qc.ts'

export default function layout({ title, children }: { title: string; children: unknown }) {
  return html`<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title>
<style>
:root{color-scheme:dark;--bg:#0b0f14;--surface:#111823;--text:#f3ede1;--dim:#9aa7b8;--line:#24303f;--teal:#4fd1c5}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:16px/1.65 ui-sans-serif,system-ui,sans-serif}
main{max-width:720px;margin:0 auto;padding:32px 20px}.card{background:var(--surface);border:1.5px solid var(--line);border-radius:8px;padding:16px 20px;margin:12px 0}
input,textarea{width:100%;background:var(--bg);color:var(--text);border:1.5px solid var(--line);border-radius:4px;padding:8px 10px;font:inherit}textarea{min-height:90px}
button{background:var(--surface);color:var(--text);border:1.5px solid var(--line);border-radius:4px;padding:8px 12px;font:inherit;cursor:pointer}.muted{color:var(--dim)}
a{color:var(--teal)}:focus-visible{outline:2px solid #8ab4f8;outline-offset:1px}
</style></head><body><main><h1>Guestbook</h1><p class="muted">第三个 dogfood：公开留言板。</p>${children}</main></body></html>`
}
