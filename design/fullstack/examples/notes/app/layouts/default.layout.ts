import { html } from '../qc.ts'

export default function layout({ title, children }: { title: string; children: unknown }) {
  return html`<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <style>
    :root { color-scheme: dark; --bg:#0b0f14; --surface:#111823; --raised:#18222f; --text:#f3ede1; --dim:#9aa7b8; --faint:#808d9f; --line:#24303f; --teal:#4fd1c5; --orange:#ff6b35; --focus:#8ab4f8; }
    * { box-sizing: border-box; }
    body { margin:0; background:var(--bg); color:var(--text); font:16px/1.65 ui-sans-serif, system-ui, -apple-system, "PingFang SC", sans-serif; }
    a { color:var(--teal); }
    main { max-width:760px; margin:0 auto; padding:32px 20px 64px; }
    h1 { font-size:28px; margin:0 0 8px; }
    .muted { color:var(--dim); }
    .card { background:var(--surface); border:1.5px solid var(--line); border-radius:8px; padding:16px 20px; margin:12px 0; }
    .card h2 { margin:0 0 4px; font-size:20px; }
    .card p { margin:4px 0; color:var(--dim); }
    input, textarea { width:100%; background:var(--bg); color:var(--text); border:1.5px solid var(--line); border-radius:4px; padding:8px 10px; font:inherit; }
    textarea { min-height:100px; }
    button { background:var(--surface); color:var(--text); border:1.5px solid var(--line); border-radius:4px; padding:8px 12px; font:inherit; cursor:pointer; }
    button:hover { border-color:var(--teal); color:var(--teal); }
    .row { display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
    .danger { color:var(--orange); border-color:var(--orange); }
    :focus-visible { outline:2px solid var(--focus); outline-offset:1px; }
  </style>
</head>
<body><main>
  <header class="row" style="justify-content:space-between;margin-bottom:20px">
    <strong>青橙全栈 · Notes</strong>
    <a href="/">全部笔记</a>
  </header>
  ${children}
</main></body>
</html>`
}
