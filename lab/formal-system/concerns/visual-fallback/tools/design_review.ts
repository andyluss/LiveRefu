#!/usr/bin/env node
// design_review —— S6 · 设计/手感复核面（截图网格 + 基调锚点）。
//
// 为每个频道生成一张"复核卡"：基调锚点 + 视觉/音景 token 摘要 + 截图槽位 + 人工复核清单。
// 等价于 ../tools/design_review.py，可被 node / deno / bun 直接运行。
//
// 产出：viz/design-review.html / .json

import * as fs from "node:fs";
import * as path from "node:path";

const HERE = path.dirname(path.resolve(process.argv[1]));

function find_workspace_root() {
  let d = HERE;
  for (;;) {
    if (fs.existsSync(path.join(d, ".git"))) return d;
    const parent = path.dirname(d);
    if (parent === d) return d;
    d = parent;
  }
}

const ROOT = find_workspace_root();
const TABLE = path.join(ROOT, "projects", "tomorrows-channel", "data", "tables", "channel.json");
const OUT = path.join(ROOT, "lab", "formal-system", "concerns", "visual-fallback", "viz", "design-review");

function load(p) {
  try {
    return JSON.parse(fs.readFileSync(p, "utf-8"));
  } catch (_e) {
    return null;
  }
}

function card(ch) {
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const lut = ch.lut || {};
  const skin = ch.skin || {};
  const tokens = (lut.tokens || []).concat(skin.container_tokens || []);
  const chips = tokens.slice(0, 8).map((t) => `<span class="chip">${esc(t)}</span>`).join("");
  return `<div class="chan">
  <div class="chan-head"><b>${esc(ch.name_zh)}</b><span>${esc(ch.channel_id)} · ${esc(ch.tier)}</span></div>
  <div class="screenshot">= 待补渲染 =</div>
  <div class="anchor">基调锚点：<b>「${esc(ch.tagline)}」</b></div>
  <div class="tokens">${chips}</div>
  <div class="checklist">
    <label><input type="checkbox"> 达到「${esc(ch.tagline)}」基调</label>
    <label><input type="checkbox"> 色调/氛围符合骨架</label>
    <label><input type="checkbox"> 可久处/不刺眼</label>
    <div class="revnote">想改的点：<input type="text" placeholder="(供人工记录)"></div>
  </div>
</div>`;
}

function pad2(n) { return String(n).padStart(2, "0"); }
function tzAbbr() {
  try {
    const parts = new Intl.DateTimeFormat("en-US", { timeZoneName: "short" })
      .formatToParts(new Date());
    const tz = parts.find((p) => p.type === "timeZoneName");
    return tz ? tz.value : "UTC";
  } catch (_e) {
    return "UTC";
  }
}
function hourNow() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ` +
    `${pad2(d.getHours())}:${pad2(d.getMinutes())} ${tzAbbr()}`;
}
function isoNow() {
  const d = new Date();
  const off = -d.getTimezoneOffset();
  const sgn = off >= 0 ? "+" : "-";
  const oh = pad2(Math.floor(Math.abs(off) / 60));
  const om = pad2(Math.abs(off) % 60);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}` +
    `T${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}` +
    `.${pad2(d.getMilliseconds())}${sgn}${oh}:${om}`;
}

function main() {
  const channels = load(TABLE) || [];
  const cards = channels.map(card).join("") || "<p class=dim>暂无频道</p>";
  const html = `<!doctype html>
<html lang="zh"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>S6 设计/手感复核面 · formal-system 可视验证面</title>
<style>:root{--fg:#1d2b3a;--dim:#6b7280;--bg:#f7f8fa;--card:#fff;--line:#e5e7eb;}
*{box-sizing:border-box} body{margin:0;font-family:-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;color:var(--fg);background:var(--bg);}
.wrap{max-width:1080px;margin:0 auto;padding:24px 20px 60px} h1{font-size:22px;margin:0 0 4px}
.sub{color:var(--dim);font-size:13px;margin-bottom:18px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px}
.chan{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px}
.chan-head{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px}
.chan-head span{color:var(--dim);font-size:12px}
.screenshot{height:150px;background:#eef1f4;border:1px dashed var(--line);border-radius:8px;display:flex;align-items:center;justify-content:center;color:var(--dim);font-size:12px;margin-bottom:8px}
.anchor{font-size:13px;margin-bottom:8px}.tokens{margin-bottom:8px}.chip{display:inline-block;background:#eef1f4;color:var(--dim);border-radius:999px;padding:2px 8px;font-size:11px;margin:2px}
.checklist label{display:block;font-size:13px;margin:4px 0}.revnote{display:flex;align-items:center;gap:4px;font-size:12px;color:var(--dim);margin-top:6px}
.revnote input{flex:1}.notes{color:var(--dim);font-size:13px;margin-top:16px}</style></head>
<body><div class="wrap"><h1>S6 · 设计/手感复核面</h1>
<div class="sub">formal-system 可视验证面 S6 · 生成 ${hourNow()} · 数据源 channel.json（基调锚点=tagline）</div>
<div class="grid">${cards}</div>
<div class="notes">说明：这是**不可形式化美学**（温暖/可久处）的人工兜底面——对照**基调锚点**逐格复核；
当前"待补渲染"槽位待实机截图填充；勾选与记录为人工复核结果，不愿自动判定。随 M2 三频道扩展即自动成网格。</div>
</div></body></html>`;

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT + ".html", html, "utf-8");
  fs.writeFileSync(OUT + ".json", JSON.stringify({
    generated: isoNow(),
    channels: channels.map((c) => ({ id: c.channel_id, name: c.name_zh, anchor: c.tagline })),
  }, null, 2) + "\n", "utf-8");

  console.log(`S6 设计/手感复核面 · ${channels.length} 个频道`);
  for (const c of channels) {
    console.log(`  🔲 ${c.channel_id} · ${c.name_zh} · 「${c.tagline}」`);
  }
  console.log(`  产出: ${OUT}.html / .json`);
  return 0;
}

process.exit(main());
