#!/usr/bin/env node
// data_invariants —— S5 · 数据不变量可视化（图表）。
//
// 读主项目 data/tables/*.json，把数据不变量画成图，让人类复核数值/配比是否符合设计直觉。
// 等价于 ../tools/data_invariants.py，可被 node / deno / bun 直接运行。
//
// 产出：viz/data-invariants.html / .json

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
const DATA = path.join(ROOT, "projects", "tomorrows-channel", "data", "tables");
const OUT = path.join(ROOT, "lab", "formal-system", "concerns", "visual-fallback", "viz", "data-invariants");
const DESIGN_RATIO = { common: 70, rare: 25, cult: 5 };

function load(name) {
  try {
    return JSON.parse(fs.readFileSync(path.join(DATA, name), "utf-8"));
  } catch (_e) {
    return null;
  }
}

// 与 Python str(float) 对齐：整数值的 float 在 Python 里会带 .0（如 600.0）。
function pyNum(v) {
  if (Number.isInteger(v)) return v.toFixed(1);
  return String(v);
}

function svg_bars(items, color = "#2a9d8f", maxv = null, label = "", w = 720) {
  if (!items.length) return "<p class=dim>无数据</p>";
  const values = items.map((item) => item[1]);
  let mx = maxv;
  if (!mx) {
    mx = values.length ? Math.max(...values) : 1;
    if (!mx) mx = 1;
  }
  const bar_h = 24;
  const h = bar_h * items.length + 20;
  let y = 6;
  const out = [`<svg viewBox="0 0 ${w} ${h}" width="100%"><text x="0" y="0" class="axis">${label}</text>`];
  for (const [name, v, ok] of items) {
    const bw = Math.max(2, (v / mx) * (w - 120));
    const barcol = ok ? color : "#f4a261";
    out.push(`<text x="0" y="${y + 16}" class="lab">${name}</text>`);
    out.push(`<rect x="0" y="${y + 4}" width="${pyNum(bw)}" height="${bar_h - 8}" rx="3" fill="${barcol}"/>`);
    out.push(`<text x="${pyNum(bw + 6)}" y="${y + 16}" class="val">${v}${ok ? "" : " ⚠"}</text>`);
    y += bar_h;
  }
  out.push("</svg>");
  return out.join("");
}

function pyDict(obj) {
  return "{" + Object.entries(obj).map(([k, v]) => `'${k}': ${v}`).join(", ") + "}";
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
  const meta = load("meta.json") || {};
  const timer = load("timer.json") || [];
  const mixer = load("mixer_track.json") || [];
  const content = load("content_card.json") || [];
  const channel = load("channel.json") || [];

  const invariants = [];

  // 1) 配比 vs 设计
  const cnt = { common: 0, rare: 0, cult: 0 };
  for (const c of content) {
    const r = c.rarity || "";
    cnt[r] = (cnt[r] || 0) + 1;
  }
  const total = Math.max(1, content.length);
  const ratio_items = [];
  for (const [r, target] of Object.entries(DESIGN_RATIO)) {
    const actual = Math.round(100 * (cnt[r] || 0) / total);
    ratio_items.push([`${r} (${actual}%)`, actual, Math.abs(actual - target) <= 15]);
  }
  const ok_ratio = ratio_items.every(([, , ok]) => ok) && total >= 10;
  const ratio_actual = {};
  for (const r of Object.keys(DESIGN_RATIO)) {
    ratio_actual[r] = Math.round(100 * (cnt[r] || 0) / Math.max(1, total));
  }
  invariants.push(["稀有度配比", ratio_items, ok_ratio,
    `实际 ${pyDict(ratio_actual)} vs 设计 70/25/5（M1 仅 ${total} 卡 → 偏离属预期，量产需回填配比）`]);

  // 2) duration_min in [focus_min, focus_max]（等价于 Python 的 fmin <= x <= fmax 链式比较）
  const fmin = meta.focus_min, fmax = meta.focus_max;
  const dur = [];
  for (const t of timer) {
    if (t.timer_id === "focus_default") {
      const x = t.duration_min != null ? t.duration_min : -1;
      dur.push(["focus_default", t.duration_min, fmin <= x && x <= fmax]);
    }
  }
  for (const t of timer) {
    if (t.timer_id === "break_default") {
      const x = t.duration_min != null ? t.duration_min : -1;
      dur.push(["break_default", t.duration_min, fmin <= x && x <= fmax]);
    }
  }
  // Python: ok_dur = all(...) and dur  -> 全真时返回 dur 本身（truthy 列表），否则 False
  const ok_dur = dur.every(([, , ok]) => ok) && dur;
  invariants.push(["各时段 duration_min（应在 [focus_min, focus_max]）", dur, ok_dur, `范围 [${fmin}, ${fmax}]`]);

  // 3) default_volume in [0,1]
  const vol = mixer.map((t) => [
    String(t.track_id || "").slice(0, 22),
    t.default_volume,
    (t.default_volume != null ? t.default_volume : -1) >= 0 && (t.default_volume != null ? t.default_volume : -1) <= 1,
  ]);
  const ok_vol = vol.every(([, , ok]) => ok) && vol;
  invariants.push(["各轨 default_volume（应在 [0,1]）", vol, ok_vol, "线性 0–1"]);

  // 4) collect_frag per rarity (design 3/5/8)
  const cf = [["common", 3, true], ["rare", 5, true], ["cult", 8, true]];
  const actual_cf = {};
  for (const c of content) actual_cf[c.rarity] = c.collect_frag;
  const cf_items = cf.map(([r, d]) => {
    const got = actual_cf[r] != null ? actual_cf[r] : d;
    return [r, got, got === d];
  });
  const ok_cf = cf_items.every(([, , ok]) => ok);
  invariants.push(["collect_frag 初值（设计 common3/rare5/cult8）", cf_items, ok_cf, "按 GDD B-2"]);

  // 5) LUT/container token 数量
  const tok = [];
  for (const ch of channel) {
    const lut = ((ch.lut || {}).tokens || []).length;
    const cont = ((ch.skin || {}).container_tokens || []).length;
    tok.push([`${ch.channel_id} · LUT`, lut, lut >= 1]);
    tok.push([`${ch.channel_id} · 容器`, cont, cont >= 1]);
  }
  const ok_tok = tok.every(([, , ok]) => ok) && tok;
  invariants.push(["每频道 LUT/容器 token 数量（≥1）", tok, ok_tok, "M1 磁带 6 LUT / 8 容器"]);

  // render
  const sections = [];
  for (const [title, items, ok, note] of invariants) {
    sections.push(`<div class="card"><h2>${title} <span class="badge">${ok ? "✅" : "⚠ 需复核"}</span></h2>` +
      svg_bars(items, ok ? "#2a9d8f" : "#f4a261") + `<div class="notes">${note}</div></div>`);
  }
  const html = `<!doctype html>
<html lang="zh"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>S5 数据不变量 · formal-system 可视验证面</title>
<style>:root{--fg:#1d2b3a;--dim:#6b7280;--bg:#f7f8fa;--card:#fff;--line:#e5e7eb;}
*{box-sizing:border-box} body{margin:0;font-family:-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;color:var(--fg);background:var(--bg);}
.wrap{max-width:1000px;margin:0 auto;padding:24px 20px 60px} h1{font-size:22px;margin:0 0 4px}
.sub{color:var(--dim);font-size:13px;margin-bottom:18px}.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:16px;margin-bottom:18px}
h2{font-size:16px;margin:0 0 8px}.badge{font-size:12px;color:var(--dim);font-weight:400}
.notes{color:var(--dim);font-size:13px;margin-top:6px} svg text.lab{fill:var(--fg);font-size:12px}
svg text.val{fill:var(--dim);font-size:12px} svg .axis{fill:var(--dim);font-size:11px}</style></head>
<body><div class="wrap"><h1>S5 · 数据不变量可视化</h1>
<div class="sub">formal-system 可视验证面 S5 · 生成 ${hourNow()} · 数据源 data/tables/*.json + 设计常数</div>
${sections.join("")}
<div class="notes">边注：这些不变量已由 schema 机器校验；这里的价值是让人类一眼看出"配比/数值是否如**设计直觉**"——例如 M1 仅 3 卡时配比必然偏离 70/25/5，属预期，量产需回填。</div>
</div></body></html>`;

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT + ".html", html, "utf-8");
  fs.writeFileSync(OUT + ".json", JSON.stringify({
    generated: isoNow(),
    invariants: invariants.map(([t, , ok, n]) => ({ title: t, ok, note: n })),
  }, null, 2) + "\n", "utf-8");

  console.log(`S5 数据不变量 · ${invariants.length} 项`);
  for (const [t, , ok, n] of invariants) {
    console.log(`  ${ok ? "✅" : "⚠"} ${t}: ${n}`);
  }
  console.log(`  产出: ${OUT}.html / .json`);
  return 0;
}

process.exit(main());
