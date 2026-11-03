#!/usr/bin/env python3
"""把 docs-ai/design01 的 Markdown 生成可离线阅读的 HTML。

用法（在 games/livebay 下）：
    python3 tools/build_design_html.py

依赖：pandoc（用于 Markdown -> HTML 片段）、Python 3。
输出：docs-ai/design01/html/*.html + html/assets/{style.css,theme.js}

生成物不要手改；改 Markdown 或 tools/design_html/ 里的样式/脚本后重跑。
"""

from __future__ import annotations

import html
import json
import re
import shutil
import subprocess
from pathlib import Path

HERE = Path(__file__).resolve().parent
PROJECT = HERE.parent
DESIGN = PROJECT / "docs-ai" / "design01"
OUT = DESIGN / "html"
ASSETS_SRC = HERE / "design_html"
ASSETS_OUT = OUT / "assets"
GENERATED = "2026-11-03"

# (markdown 文件名, 分组, 标题, 一句话说明)
DOCS = [
    ("README.md", "开始", "策划文档集 · 总览", "这套文档是什么、怎么用、状态标记与阅读顺序。"),
    ("00_阅读指南与裁决规则.md", "开始", "阅读指南与裁决规则", "决策卡、AI 边界、没有裁决时的默认规则。"),
    ("01_项目北极星.md", "开始", "项目北极星", "一句话、三支柱、非目标与停止条件。"),
    ("11_待人类裁决清单.md", "开始", "待人类裁决清单", "P0/P1 已裁决，P2 待定；附完整裁决记录。"),
    ("02_世界观_逍遥湾.md", "世界与职业", "世界观：逍遥湾", "月牙城、三环、200 年、双轨与低报事故。"),
    ("05_社会系统_慢好三生保障体系.md", "世界与职业", "慢好三生保障体系", "生存 / 生活 / 生产；慢 + 好。"),
    ("03_职业体系.md", "世界与职业", "职业体系", "16 个职业候选，第一职业护卫兵、第二护理师。"),
    ("13_术语表.md", "世界与职业", "术语表", "统一用词，避免文档、代码、UI 三种叫法。"),
    ("04_塔防玩法.md", "玩法", "塔防：岗位防线", "弧形路径、故障停塔、五波与失败叙事。"),
    ("06_沉浸体验玩法.md", "玩法", "沉浸体验玩法", "一班、一舱、一个没有完美答案的选择。"),
    ("07_放置养成玩法.md", "玩法", "放置养成玩法", "舱室、湾民、离线产出，不逼玩家回来。"),
    ("09_三玩法联动.md", "玩法", "三玩法联动", "v0.1 L0，v0.2 L1；先各自成立，再共享世界。"),
    ("10_内容节奏与长期留存.md", "玩法", "内容节奏与长期留存", "买断 + 内购、版本节奏与反 FOMO。"),
    ("08_美术与音频方向.md", "表现与工程", "美术与音频方向", "NASApunk 落地、2D 矢量与声音层次。"),
    ("12_技术方案_Godot工程.md", "表现与工程", "技术方案：Godot 工程", "架构、数据契约、测试与扩展点。"),
]
MD_SET = {md for md, *_ in DOCS}
GROUPS = ["开始", "世界与职业", "玩法", "表现与工程"]


def to_html_name(md_name: str) -> str:
    if md_name == "README.md":
        return "README.html"
    return md_name[:-3] + ".html"


HTML_BY_MD = {md: to_html_name(md) for md in MD_SET}
DOC_BY_MD = {md: {"md": md, "html": to_html_name(md), "group": group, "title": title, "desc": desc}
             for md, group, title, desc in DOCS}
DOC_BY_HTML = {v["html"]: v for v in DOC_BY_MD.values()}


def split_frontmatter(text: str) -> tuple[dict, str]:
    """读取 YAML frontmatter；只支持本项目的扁平键 + 列表。"""
    if not text.startswith("---\n"):
        return {}, text
    end = text.find("\n---", 4)
    if end < 0:
        return {}, text
    yaml_text = text[4:end]
    body = text[end + 4:].lstrip("\n")
    meta: dict = {}
    current: str | None = None
    for line in yaml_text.splitlines():
        if not line.strip():
            continue
        if line.startswith("  - "):
            if current is None:
                continue
            meta.setdefault(current, []).append(unquote_yaml(line[4:].strip()))
            continue
        key, sep, rest = line.partition(":")
        if not sep:
            continue
        key = key.strip()
        rest = rest.strip()
        if rest == "":
            current = key
            meta[key] = []
        else:
            current = None
            meta[key] = unquote_yaml(rest)
    return meta, body


def unquote_yaml(value: str) -> str:
    if value.startswith('"') and value.endswith('"'):
        try:
            return json.loads(value)
        except Exception:
            return value[1:-1]
    if value.startswith("'") and value.endswith("'"):
        return value[1:-1]
    return value


def link_label(value: str) -> str:
    raw = value.rstrip("/")
    base = raw.rsplit("/", 1)[-1]
    if base == "README.md":
        parent = raw.rsplit("/", 1)[-2] if "/" in raw else ""
        if parent == "附录_NASA朋克卷":
            return "NASApunk 附录卷"
        if parent == "livebay":
            return "项目 README"
        if parent == "design01":
            return "策划文档集"
        return parent or "README"
    if base == "概念设定.md":
        return "概念设定"
    if base == "game":
        return "Godot 工程"
    if base.endswith(".md"):
        return base[:-3]
    if base.endswith(".html"):
        return base[:-5]
    return base


def is_path(value: str) -> bool:
    # 只把真正的路径当链接；状态/决策权里的 "/" 不是路径。
    return (
        value.startswith(("./", "../", "/"))
        or value.endswith((".md", ".html"))
        or (value.endswith("/") and " " not in value)
    )


def meta_value_html(value: str, is_html_field: bool = False) -> str:
    if is_html_field:
        return f'<a href="{html.escape(rewrite_href(value), quote=True)}">HTML 阅读版</a>'
    if is_path(value):
        href = rewrite_href(value)
        return f'<a href="{html.escape(href, quote=True)}">{html.escape(link_label(value))}</a>'
    return html.escape(value)


def render_meta(meta: dict) -> str:
    labels = [
        ("doc_type", "文档类型"),
        ("status", "状态"),
        ("version", "版本"),
        ("date", "日期"),
        ("author", "作者"),
        ("source", "来源"),
        ("authority", "决策权"),
        ("scope", "适用范围"),
        ("html", "HTML 阅读版"),
        ("upstream", "上游"),
        ("related", "关联"),
    ]
    rows: list[str] = []
    for key, label in labels:
        if key not in meta:
            continue
        value = meta[key]
        if isinstance(value, list):
            parts = [meta_value_html(item, is_html_field=(key == "html")) for item in value]
            rendered = " · ".join(parts)
        else:
            rendered = meta_value_html(value, is_html_field=(key == "html"))
        rows.append(f"<dt>{label}</dt><dd>{rendered}</dd>")
    if not rows:
        return ""
    return f'<div class="doc-meta" aria-label="文档元数据"><dl>{"".join(rows)}</dl></div>'


def rewrite_href(href: str) -> str:
    if not href or href.startswith(("http://", "https://", "mailto:", "data:", "javascript:", "#")):
        return href
    path, sep, anchor = href.partition("#")
    if not path:
        return "#" + anchor
    if path.startswith("html/"):
        return path[5:] + sep + anchor
    if path.endswith(".md"):
        base = Path(path).name
        # 只把 design01 内的裸文件名 / ./文件名 映射为 HTML；
        # ../../README.md 这类外部源文档不能误映射成 design01 的 README.html。
        if (path == base or path == "./" + base) and base in HTML_BY_MD:
            return HTML_BY_MD[base] + sep + anchor
        return "../" + path + sep + anchor
    if path.startswith("/"):
        return href
    return "../" + path + sep + anchor


def rewrite_links(fragment: str) -> str:
    def repl_href(match: re.Match[str]) -> str:
        return match.group(1) + html.escape(rewrite_href(html.unescape(match.group(2))), quote=True) + match.group(3)

    fragment = re.sub(r'(<a\b[^>]*?\bhref=")([^"]*)(")', repl_href, fragment)
    fragment = re.sub(r'(<img\b[^>]*?\bsrc=")([^"]*)(")', repl_href, fragment)
    return fragment


def wrap_tables(fragment: str) -> str:
    return fragment.replace("<table>", '<div class="table-wrap"><table>').replace("</table>", "</table></div>")


def strip_tags(value: str) -> str:
    return html.unescape(re.sub(r"<[^>]+>", "", value)).strip()


def toc_from(fragment: str) -> str:
    items: list[str] = []
    for match in re.finditer(r'<h([23])\s+id="([^"]+)"[^>]*>(.*?)</h\1>', fragment, re.S):
        level, ident, raw = match.group(1), match.group(2), match.group(3)
        text = strip_tags(raw)
        if not text:
            continue
        cls = "sub" if level == "3" else ""
        items.append(f'<li class="{cls}"><a href="#{html.escape(ident)}">{html.escape(text)}</a></li>')
    if len(items) < 2:
        return ""
    return (
        '<details class="toc" open><summary>本页目录</summary>'
        '<ul class="toc-list">' + "".join(items) + "</ul></details>"
    )


def nav_html(current: str) -> str:
    blocks: list[str] = []
    for group in GROUPS:
        links: list[str] = []
        for md, doc_group, title, _desc in DOCS:
            if doc_group != group:
                continue
            doc = DOC_BY_MD[md]
            active = ' aria-current="page"' if doc["html"] == current else ""
            links.append(f'<a href="{doc["html"]}"{active}>{html.escape(title)}</a>')
        blocks.append(
            f'<div class="nav-group"><h2>{html.escape(group)}</h2>{"".join(links)}</div>'
        )
    index_active = ' aria-current="page"' if current == "index.html" else ""
    return (
        '<a class="brand" href="index.html">'
        '<span class="brand-kicker">LiveBay · design01</span>'
        '<span class="brand-title">逍遥湾</span>'
        '<span class="brand-sub">策划文档集 · HTML 阅读版</span>'
        "</a>"
        f'<details class="nav-fold" open><summary>文档目录</summary><nav class="nav">'
        f'<div class="nav-group"><h2>索引</h2><a href="index.html"{index_active}>文档索引</a></div>'
        + "".join(blocks)
        + "</nav></details>"
    )


def theme_switch() -> str:
    return (
        '<div class="theme-switch" role="group" aria-label="主题">'
        '<button type="button" data-theme-choice="system" aria-pressed="true">系统</button>'
        '<button type="button" data-theme-choice="light" aria-pressed="false">浅色</button>'
        '<button type="button" data-theme-choice="dark" aria-pressed="false">深色</button>'
        "</div>"
    )


PAGE = """<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<title>__TITLE__ · LiveBay design01</title>
<meta name="description" content="__DESCRIPTION__">
<script>
(function () {
  var KEY = 'lrds-theme';
  var mql = window.matchMedia('(prefers-color-scheme: dark)');
  var choice = 'system';
  try {
    var saved = localStorage.getItem(KEY);
    if (saved === 'system' || saved === 'light' || saved === 'dark') choice = saved;
  } catch (e) {}
  function apply() {
    var mode = choice === 'system' ? (mql.matches ? 'dark' : 'light') : choice;
    document.documentElement.dataset.theme = mode;
    document.documentElement.dataset.themeChoice = choice;
    document.documentElement.classList.add('js');
  }
  function onSystemChange() {
    if (document.documentElement.dataset.themeChoice === 'system') {
      document.documentElement.dataset.theme = mql.matches ? 'dark' : 'light';
    }
  }
  apply();
  try { mql.addEventListener('change', onSystemChange); }
  catch (e) { try { mql.addListener(onSystemChange); } catch (e2) {} }
})();
</script>
<link rel="stylesheet" href="assets/style.css">
<script defer src="assets/theme.js"></script>
</head>
<body>
<a class="skip-link" href="#content">跳到正文</a>
<div class="app">
<aside class="sidebar">
__NAV__
<div class="sidebar-foot">
<p>AI 策划参考，非决定。<br>人类裁决记录见 <a href="11_待人类裁决清单.html">11</a>。</p>
<p><a href="../__SOURCE__">查看源 Markdown</a></p>
</div>
</aside>
<div class="main">
<header class="topbar">
<div class="topbar-left"><span class="topbar-kicker">design01</span><span class="topbar-title">__TOPBAR__</span></div>
__THEME__
</header>
<main id="content" class="content">
__TOC__
<article class="prose">
__BODY__
</article>
__PAGER__
</main>
<footer class="page-foot">
<span>LiveBay · design01 · 生成于 __GENERATED__</span>
<span><a href="index.html">索引</a> · <a href="../__SOURCE__">源 Markdown</a></span>
</footer>
</div>
</div>
</body>
</html>
"""


INDEX_BODY = """<section class="hero">
<p class="eyebrow">LiveBay · design01 · HTML reader</p>
<h1>逍遥湾 · 策划文档集</h1>
<p class="lede">一套把「人类裁决」和「AI 候选」分开的策划文档。适合从头读，也适合直接跳到待裁决清单。所有页面支持系统 / 浅色 / 深色，可离线打开。</p>
<div class="badges">
<span class="badge ok">P0 / P1 已裁决</span>
<span class="badge warn">P2 待定</span>
<span class="badge">14 篇 + README</span>
<span class="badge">2026-11-03</span>
</div>
<div class="hero-actions">
<a class="button" href="README.html">从总览开始</a>
<a class="button ghost" href="11_待人类裁决清单.html">看裁决记录</a>
<a class="button ghost" href="../shots/v0.1_gameplay.mp4">实机演示 ↗</a>
</div>
</section>

<section class="section">
<h2>先看这四篇</h2>
<p class="section-note">如果你只有 20 分钟：先读总览与北极星，再翻裁决记录，最后看社会系统。</p>
<div class="card-grid">
__QUICK_CARDS__
</div>
</section>

<section class="section">
<h2>文档地图</h2>
<p class="section-note">按主题分组；每篇都是独立页面，左侧目录可以随时跳转。</p>
__MAP__
</section>

<section class="section">
<h2>当前裁决</h2>
<p class="section-note">P0 与 P1 已清空；只剩平台、更新节奏、语言三项 P2。</p>
<div class="decision-columns">
<div class="decision-box">
<h3>P0 · 创意与范围</h3>
<dl>
<dt>D01</dt><dd>B 有裂缝的善意</dd>
<dt>D02</dt><dd>D 混合；首版 A+C</dd>
<dt>D03</dt><dd>生存 / 生活 / 生产；慢好 = 慢 + 好</dd>
<dt>D04</dt><dd>C 无名岗位人</dd>
<dt>D05</dt><dd>护卫兵 v0.1；护理师 v0.2</dd>
<dt>D16</dt><dd>垂直切片</dd>
</dl>
</div>
<div class="decision-box">
<h3>P1 · 体验与商业</h3>
<dl>
<dt>D06</dt><dd>200 年（第七代）</dd>
<dt>D07</dt><dd>双轨：日常算法 / 危机议会</dd>
<dt>D08</dt><dd>低报事故（只埋线索）</dd>
<dt>D09</dt><dd>弧形路径</dd>
<dt>D10</dt><dd>重试 + 可跳过复盘</dd>
<dt>D11</dt><dd>v0.1 L0；v0.2 L1</dd>
<dt>D12</dt><dd>买断 + 内购（仅外观/扩展）</dd>
<dt>D13</dt><dd>2D 矢量 / 程序化</dd>
<dt>D15</dt><dd>叙事量中</dd>
</dl>
</div>
</div>
</section>

<section class="section">
<h2>实机演示</h2>
<div class="video-card">
<a href="../shots/v0.1_gameplay.mp4"><img src="../shots/v0.1_gameplay_poster.png" alt="LiveBay v0.1 实机演示封面"></a>
<div>
<h3>50 秒 · 从第 1 波到第 5 波</h3>
<p>1280×720，H.264，无音频。包含建造、故障停塔与结算。</p>
<a class="button" href="../shots/v0.1_gameplay.mp4">播放视频 ↗</a>
</div>
</div>
</section>
"""


def page_shell(title: str, description: str, current: str, topbar: str, body: str,
               toc: str = "", pager: str = "", source: str = "README.md") -> str:
    return (
        PAGE.replace("__TITLE__", html.escape(title))
        .replace("__DESCRIPTION__", html.escape(description))
        .replace("__NAV__", nav_html(current))
        .replace("__THEME__", theme_switch())
        .replace("__TOPBAR__", html.escape(topbar))
        .replace("__TOC__", toc)
        .replace("__BODY__", body)
        .replace("__PAGER__", pager)
        .replace("__SOURCE__", source)
        .replace("__GENERATED__", GENERATED)
    )


def card_html(doc: dict) -> str:
    return (
        f'<a class="doc-card" href="{doc["html"]}">'
        f'<span class="kicker">{html.escape(doc["group"])}</span>'
        f'<h3>{html.escape(doc["title"])}</h3>'
        f'<p>{html.escape(doc["desc"])}</p>'
        "</a>"
    )


def pager_html(current_html: str) -> str:
    order = ["index.html"] + [DOC_BY_MD[md]["html"] for md, *_ in DOCS]
    if current_html not in order:
        return ""
    index = order.index(current_html)
    prev_html = order[index - 1] if index > 0 else None
    next_html = order[index + 1] if index + 1 < len(order) else None

    def link(target: str, direction: str) -> str:
        if target == "index.html":
            title, url = "文档索引", "index.html"
        else:
            doc = DOC_BY_HTML[target]
            title, url = doc["title"], doc["html"]
        return (
            f'<a class="{direction}" href="{url}">'
            f'<span class="dir">{direction}</span>'
            f'<span class="label">{html.escape(title)}</span>'
            "</a>"
        )

    left = link(prev_html, "prev") if prev_html else ""
    right = link(next_html, "next") if next_html else ""
    if not left and not right:
        return ""
    return f'<nav class="pager" aria-label="上一篇 / 下一篇">{left}{right}</nav>'


def build_index() -> None:
    quick = "".join(card_html(DOC_BY_MD[md]) for md in [
        "00_阅读指南与裁决规则.md",
        "01_项目北极星.md",
        "11_待人类裁决清单.md",
        "05_社会系统_慢好三生保障体系.md",
    ])
    map_blocks: list[str] = []
    for group in GROUPS:
        cards = "".join(card_html(DOC_BY_MD[md]) for md, g, *_ in DOCS if g == group)
        map_blocks.append(f'<h3>{html.escape(group)}</h3><div class="card-grid">{cards}</div>')
    body = INDEX_BODY.replace("__QUICK_CARDS__", quick).replace("__MAP__", "".join(map_blocks))
    text = page_shell(
        "文档索引",
        "LiveBay（逍遥湾）design01 策划文档集 HTML 阅读版，P0/P1 已裁决。",
        "index.html",
        "文档索引",
        body,
        source="README.md",
    )
    (OUT / "index.html").write_text(text, encoding="utf-8")


def build_docs() -> None:
    for md, group, title, desc in DOCS:
        md_path = DESIGN / md
        meta, body_md = split_frontmatter(md_path.read_text(encoding="utf-8"))
        body = subprocess.run(
            ["pandoc", "-f", "gfm", "-t", "html", "--wrap=none", "--no-highlight"],
            input=body_md,
            check=True,
            capture_output=True,
            text=True,
        ).stdout
        body = wrap_tables(rewrite_links(body))
        meta_html = render_meta(meta)
        if meta_html:
            body = re.sub(r"(</h1>)", r"\1\n" + meta_html, body, count=1)
        toc = toc_from(body)
        html_name = to_html_name(md)
        text = page_shell(
            title,
            desc,
            html_name,
            title,
            body,
            toc=toc,
            pager=pager_html(html_name),
            source=md,
        )
        text = f"<!-- 由 tools/build_design_html.py 从 ../{md} 生成；不要手改。 -->\n" + text
        (OUT / html_name).write_text(text, encoding="utf-8")
        print(f"built {html_name}")


def main() -> None:
    if shutil.which("pandoc") is None:
        raise SystemExit("需要 pandoc 才能生成 HTML；请先安装 pandoc。")
    OUT.mkdir(parents=True, exist_ok=True)
    ASSETS_OUT.mkdir(parents=True, exist_ok=True)
    for name in ("style.css", "theme.js"):
        shutil.copyfile(ASSETS_SRC / name, ASSETS_OUT / name)
    build_index()
    build_docs()
    print(f"done -> {OUT}")


if __name__ == "__main__":
    main()
