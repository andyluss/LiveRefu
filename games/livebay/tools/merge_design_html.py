#!/usr/bin/env python3
"""把 docs-ai/design01/html/ 的所有页面融合成一份可离线阅读的 HTML。

用法（在 games/livebay/ 下）：
    python3 tools/merge_design_html.py

前置：先运行 tools/build_design_html.py 生成各页。
输出：docs-ai/design01/html/LiveBay-design01-all.html
"""

from __future__ import annotations

import html
import os
import re
from pathlib import Path

HERE = Path(__file__).resolve().parent
PROJECT = HERE.parent
HTML_DIR = PROJECT / "docs-ai" / "design01" / "html"
ASSETS = HTML_DIR / "assets"
OUT = HTML_DIR / "LiveBay-design01-all.html"
GENERATED = "2026-11-04"

DOC_GROUPS = [
    ("开始", ["README.html", "00_阅读指南与裁决规则.html", "01_项目北极星.html", "11_待人类裁决清单.html"]),
    ("世界观", [
        "world/README.html",
        "world/02_世界观_逍遥湾.html",
        "world/03_职业体系.html",
        "world/04_地理与三环.html",
        "world/05_社会系统_慢好三生保障体系.html",
        "world/06_舰队与组织.html",
        "world/07_外环夜班与岗位.html",
        "world/08_湾民生活.html",
        "world/09_故障与事故文化.html",
        "world/10_生存资源与舱段.html",
    ]),
    ("世界与职业", ["13_术语表.html"]),
    ("玩法", ["04_塔防玩法.html", "06_沉浸体验玩法.html", "07_放置养成玩法.html", "09_三玩法联动.html", "10_内容节奏与长期留存.html", "14_塔防NASApunk深化.html"]),
    ("玩法扩展", [
        "expansions/README.html",
        "expansions/01_分层总览.html",
        "expansions/02_L1_班次层.html",
        "expansions/03_L2_岗位层.html",
        "expansions/04_L3_城市层.html",
        "expansions/05_版本切片与决策.html",
        "expansions/06_实现对照与验收.html",
    ]),
    ("表现与工程", ["art/08_美术与音频方向.html", "tech/12_技术方案_Godot工程.html", "tech/15_专用游戏编辑器方案.html", "tech/16_模块化技术架构_NASApunk.html", "tech/17_可插拔扩展架构.html"]),
]

RULE_FILES = [
    "rules/index.html",
    "rules/a00_人类裁决与优先级.html",
    "rules/b00_规则分层与冲突.html",
    "rules/c00_文档与引用契约.html",
    "rules/biz/a01_买断与内购边界.html",
    "rules/biz/b01_切片与范围门槛.html",
    "rules/biz/c01_对外表达与证据.html",
    "rules/design/a01_岗位与无名主角.html",
    "rules/design/a02_三生与慢好.html",
    "rules/design/b01_班次循环.html",
    "rules/design/b02_选择必须有代价.html",
    "rules/design/b03_故障与低报.html",
    "rules/design/c01_数值与场景引用.html",
    "rules/art/a01_NASA朋克四件套.html",
    "rules/art/b01_三环三套语法.html",
    "rules/art/b02_可维修性.html",
    "rules/art/c01_色板字体与比例.html",
    "rules/tech/a01_单一数据源.html",
    "rules/tech/a02_模拟与视图分离.html",
    "rules/tech/b01_可逆工程.html",
    "rules/tech/b02_验收与不回归.html",
]


def strip_tags(value: str) -> str:
    return html.unescape(re.sub(r"<[^>]+>", "", value)).strip()


def extract(path: Path) -> tuple[str, str, str]:
    text = path.read_text(encoding="utf-8")
    match = re.search(r'<article class="prose">(.*?)</article>', text, re.S)
    if not match:
        raise SystemExit(f"找不到 article: {path}")
    article = match.group(1)
    h1 = re.search(r"<h1[^>]*>(.*?)</h1>", article, re.S)
    title = strip_tags(h1.group(1)) if h1 else path.stem
    return title, article.strip(), text


def section_id_for(path: Path, text: str) -> str:
    if path.name == "index.html" and path.parent == HTML_DIR / "rules":
        return "rules-overview"
    if path.parent == HTML_DIR:
        stem = path.stem
    else:
        rel = path.relative_to(HTML_DIR).as_posix()
        stem = rel[:-5].replace("/", "-")
    rule = re.search(r"<dt>规则 ID</dt><dd>([^<]+)</dd>", text)
    if rule:
        return "rule-" + re.sub(r"[^A-Za-z0-9-]", "-", rule.group(1))
    return "doc-" + re.sub(r"[^A-Za-z0-9\u4e00-\u9fff-]", "-", stem)


def rel_url(target: Path, start: Path) -> str:
    return Path(os.path.relpath(target, start)).as_posix()


def scope_fragment(fragment: str, page: Path, section: str, page_to_section: dict[Path, str]) -> str:
    # 先收集本页所有 id，统一加 section 前缀；SVG 的 url(#id) 也要改。
    ids = set(re.findall(r'\bid="([^"]+)"', fragment))
    mapping = {i: f"{section}--{i}" for i in ids}

    fragment = re.sub(
        r'\bid="([^"]+)"',
        lambda m: 'id="' + html.escape(mapping.get(m.group(1), f"{section}--{m.group(1)}"), quote=True) + '"',
        fragment,
    )

    def url_repl(m: re.Match[str]) -> str:
        old = m.group(1)
        return "url(#" + html.escape(mapping.get(old, f"{section}--{old}"), quote=True) + ")"

    fragment = re.sub(r"url\(#([^)]+)\)", url_repl, fragment)

    def href_repl(m: re.Match[str]) -> str:
        raw = html.unescape(m.group(2))
        if not raw or raw.startswith(("http://", "https://", "mailto:", "data:", "javascript:")):
            return m.group(1) + html.escape(raw, quote=True) + m.group(3)
        path, sep, anchor = raw.partition("#")
        if raw.startswith("#"):
            return m.group(1) + "#" + html.escape(mapping.get(anchor, f"{section}--{anchor}"), quote=True) + m.group(3)

        target = (page.parent / path).resolve() if path else page.resolve()
        if target == HTML_DIR / "index.html":
            new = "#top"
        elif target in page_to_section:
            target_section = page_to_section[target]
            new = "#" + target_section
            if anchor:
                new += "--" + anchor
        elif target.exists():
            new = rel_url(target, HTML_DIR) + (("#" + anchor) if anchor else "")
        else:
            new = raw
        return m.group(1) + html.escape(new, quote=True) + m.group(3)

    fragment = re.sub(r'(<a\b[^>]*?\bhref=")([^"]*)(")', href_repl, fragment)

    def src_repl(m: re.Match[str]) -> str:
        raw = html.unescape(m.group(2))
        if not raw or raw.startswith(("http://", "https://", "mailto:", "data:", "javascript:")):
            return m.group(1) + html.escape(raw, quote=True) + m.group(3)
        path, sep, tail = raw.partition("#")
        target = (page.parent / path).resolve() if path else page.resolve()
        new = rel_url(target, HTML_DIR) + (("#" + tail) if tail else "") if target.exists() else raw
        return m.group(1) + html.escape(new, quote=True) + m.group(3)

    fragment = re.sub(r'(<img\b[^>]*?\bsrc=")([^"]*)(")', src_repl, fragment)
    return fragment


def build_toc(groups: list[tuple[str, list[dict]]]) -> str:
    out = []
    for i, (name, pages) in enumerate(groups):
        open_attr = " open" if i == 0 else ""
        links = "".join(
            f'<li><a href="#{html.escape(p["section"], quote=True)}">{html.escape(p["title"])}</a></li>'
            for p in pages
        )
        out.append(
            f'<details class="merged-toc-group"{open_attr}><summary><span>{html.escape(name)}</span>'
            f'<span class="merged-count">{len(pages)}</span></summary><ul>{links}</ul></details>'
        )
    return "".join(out)


def main() -> None:
    doc_pages = []
    for group, names in DOC_GROUPS:
        pages = []
        for name in names:
            path = HTML_DIR / name
            title, article, text = extract(path)
            section = section_id_for(path, text)
            pages.append({"path": path, "title": title, "article": article, "section": section})
        doc_pages.append((group, pages))
    rule_pages = []
    for name in RULE_FILES:
        path = HTML_DIR / name
        title, article, text = extract(path)
        rule_pages.append({"path": path, "title": title, "article": article, "section": section_id_for(path, text)})

    all_pages = [p for _, pages in doc_pages for p in pages] + rule_pages
    page_to_section = {p["path"].resolve(): p["section"] for p in all_pages}
    page_to_section[(HTML_DIR / "index.html").resolve()] = "top"

    css = (ASSETS / "style.css").read_text(encoding="utf-8")
    theme_js = (ASSETS / "theme.js").read_text(encoding="utf-8")
    toc_groups = doc_pages + [("规则体系", rule_pages)]

    sections = []
    for p in all_pages:
        body = scope_fragment(p["article"], p["path"], p["section"], page_to_section)
        sections.append(
            f'<section class="merged-doc" id="{html.escape(p["section"], quote=True)}" data-doc="{html.escape(p["path"].name, quote=True)}">'
            f'{body}<p class="merged-back"><a href="#top">↑ 返回总目录</a></p></section>'
        )

    toc = build_toc(toc_groups)
    total = len(all_pages)
    custom_css = """
    body { background: var(--bg); }
    .merged-content { width: min(100% - 48px, 1080px); margin: 0 auto; padding: 0 0 72px; }
    .merged-header { padding: 38px 0 24px; border-bottom: 1px solid var(--line); }
    .merged-header-top { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
    .merged-header h1 { margin: 10px 0 8px; font-family: var(--serif); font-size: clamp(30px, 4vw, 48px); line-height: 1.15; }
    .merged-header .lede { max-width: 760px; color: var(--muted); font-size: 16px; line-height: 1.8; }
    .merged-toc { margin: 26px 0 0; padding: 16px 18px; border: 1px solid var(--line); border-radius: var(--radius); background: var(--surface); }
    .merged-toc h2 { margin: 0 0 12px; font-family: var(--mono); font-size: 11px; letter-spacing: 0.14em; color: var(--faint); }
    .merged-toc-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px 18px; }
    .merged-toc-group { border-top: 1px solid var(--line); padding: 8px 0 4px; }
    .merged-toc-group summary { display: flex; gap: 8px; align-items: center; cursor: pointer; padding: 4px 2px; font-weight: 600; list-style: none; }
    .merged-toc-group summary::-webkit-details-marker { display: none; }
    .merged-toc-group summary::after { content: "+"; margin-left: auto; color: var(--faint); font-family: var(--mono); }
    .merged-toc-group[open] summary::after { content: "−"; }
    .merged-count { color: var(--faint); font-family: var(--mono); font-size: 10px; font-weight: 400; }
    .merged-toc ul { margin: 4px 0 8px; padding-left: 1.2em; }
    .merged-toc li { margin: 3px 0; font-size: 13.5px; line-height: 1.5; }
    .merged-toc a { color: var(--muted); text-decoration: none; }
    .merged-toc a:hover { color: var(--accent); text-decoration: underline; }
    .merged-doc { padding-top: 42px; margin-top: 42px; border-top: 1px solid var(--line); }
    .merged-doc .merged-back { margin: 40px 0 0; font-family: var(--mono); font-size: 11px; }
    .merged-doc .merged-back a { color: var(--faint); text-decoration: none; }
    .merged-doc .merged-back a:hover { color: var(--accent); }
    .merged-foot { border-top: 1px solid var(--line); padding: 24px 0; color: var(--faint); font-size: 12px; display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
    .merged-top { position: fixed; right: 18px; bottom: 18px; z-index: 20; padding: 8px 10px; border: 1px solid var(--line); border-radius: 6px; background: var(--surface); color: var(--muted); text-decoration: none; font-family: var(--mono); font-size: 11px; }
    .merged-top:hover { color: var(--accent); border-color: var(--accent); text-decoration: none; }
    @media (max-width: 900px) {
      .merged-content { width: min(100% - 32px, 1080px); }
      .merged-toc-grid { grid-template-columns: 1fr; }
      html { scroll-padding-top: 16px; }
      .merged-doc { padding-top: 30px; margin-top: 30px; }
    }
    @media print {
      .merged-header, .merged-toc, .theme-switch, .merged-back, .merged-top { display: none !important; }
      .merged-content { width: 100%; max-width: none; padding: 0; }
      .merged-doc { break-before: page; border-top: 0; margin-top: 0; padding-top: 0; }
      body { background: #fff; }
    }
    """

    prepaint = """<script>
(function () {
  var KEY = 'lrds-theme';
  var mql = window.matchMedia('(prefers-color-scheme: dark)');
  var choice = 'system';
  try { var saved = localStorage.getItem(KEY); if (saved === 'system' || saved === 'light' || saved === 'dark') choice = saved; } catch (e) {}
  function apply() {
    var mode = choice === 'system' ? (mql.matches ? 'dark' : 'light') : choice;
    document.documentElement.dataset.theme = mode;
    document.documentElement.dataset.themeChoice = choice;
    document.documentElement.classList.add('js');
  }
  function onSystemChange() { if (document.documentElement.dataset.themeChoice === 'system') document.documentElement.dataset.theme = mql.matches ? 'dark' : 'light'; }
  apply();
  try { mql.addEventListener('change', onSystemChange); } catch (e) { try { mql.addListener(onSystemChange); } catch (e2) {} }
})();
</script>"""

    text = f"""<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<title>LiveBay design01 · 完整阅读版</title>
<meta name="description" content="LiveBay（逍遥湾）design01 全部文档与规则的单页 HTML 阅读版。">
{prepaint}
<style>
{css}
{custom_css}
</style>
</head>
<body>
<a class="skip-link" href="#content">跳到正文</a>
<main id="content" class="content merged-content">
<header class="merged-header" id="top">
<div class="merged-header-top">
<div><p class="eyebrow">LiveBay · design01 · complete edition</p><h1>逍遥湾 · 完整阅读版</h1></div>
{('<div class="theme-switch" role="group" aria-label="主题"><button type="button" data-theme-choice="system" aria-pressed="true">系统</button><button type="button" data-theme-choice="light" aria-pressed="false">浅色</button><button type="button" data-theme-choice="dark" aria-pressed="false">深色</button></div>')}
</div>
<p class="lede">把 design01 的 17 篇文档、20 条规则与 1 个规则总览融合成一份可离线阅读的 HTML。左侧不需要导航；上方总目录可以展开、收起。</p>
<div class="badges"><span class="badge ok">{total} 个章节</span><span class="badge">单文件</span><span class="badge">系统 / 浅色 / 深色</span><span class="badge">可打印</span></div>
<nav class="merged-toc" aria-label="总目录"><h2>总目录 / CONTENTS</h2><div class="merged-toc-grid">{toc}</div></nav>
</header>
{''.join(sections)}
<footer class="merged-foot"><span>LiveBay · design01 · 完整阅读版 · 生成于 {GENERATED}</span><span><a href="#top">返回目录</a></span></footer>
</main>
<a class="merged-top" href="#top" aria-label="回到目录">↑ 目录</a>
<script>
{theme_js}
</script>
</body>
</html>
"""
    OUT.write_text(text, encoding="utf-8")
    print(f"wrote {OUT.relative_to(PROJECT)} ({total} sections, {OUT.stat().st_size // 1024} KiB)")


if __name__ == "__main__":
    main()
