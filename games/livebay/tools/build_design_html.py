#!/usr/bin/env python3
"""把 docs-ai/design01 的 Markdown 生成可离线阅读的 HTML。

用法（在 games/livebay 下）：
    python3 tools/build_design_html.py

依赖：pandoc（用于 Markdown -> HTML 片段）、Python 3。
输出：docs-ai/design01/html/*.html、html/rules/**/*.html + html/assets/{style.css,theme.js}

生成物不要手改；改 Markdown 或 tools/design_html/ 里的样式/脚本后重跑。
"""

from __future__ import annotations

import html
import json
import os
import re
import shutil
import subprocess
from pathlib import Path

HERE = Path(__file__).resolve().parent
PROJECT = HERE.parent
DESIGN = PROJECT / "docs-ai" / "design01"
OUT = DESIGN / "html"
RULES_SRC = DESIGN / "rules"
RULES_OUT = OUT / "rules"
ASSETS_SRC = HERE / "design_html"
ASSETS_OUT = OUT / "assets"
GENERATED = "2026-11-04"

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
    ("14_塔防NASApunk深化.md", "玩法", "塔防 NASApunk 深化", "检查单、第 5 波降级故障、事故记录；轻量包。"),
    ("08_美术与音频方向.md", "表现与工程", "美术与音频方向", "NASApunk 落地、2D 矢量与声音层次。"),
    ("12_技术方案_Godot工程.md", "表现与工程", "技术方案：Godot 工程", "架构、数据契约、测试与扩展点。"),
    ("15_专用游戏编辑器方案.md", "表现与工程", "专用游戏编辑器方案", "Godot 插件、Python 数据桥、分阶段 WYSIWYG。"),
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


RULE_CATEGORIES = ["root", "biz", "design", "art", "tech"]
CATEGORY_LABELS = {
    "root": "根",
    "biz": "商业",
    "design": "设计",
    "art": "艺术",
    "tech": "技术",
}
CATEGORY_EN = {
    "root": "ROOT",
    "biz": "BIZ",
    "design": "DES",
    "art": "ART",
    "tech": "TECH",
}
LAYER_LABELS = {"a": "a · 底层", "b": "b · 中层", "c": "c · 表层"}
LAYER_NAMES = {"a": "底层 / 公理", "b": "中层 / 结构", "c": "表层 / 表达"}
LAYER_ORDER = {"a": 0, "b": 1, "c": 2}


def rule_summary(body: str) -> str:
    match = re.search(r"^> \*\*一句话\*\*：(.+)$", body, re.M)
    if not match:
        return ""
    text = match.group(1)
    text = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", text)
    text = re.sub(r"[`*_>#]", "", text)
    return text.strip()


def load_rules() -> list[dict]:
    items: list[dict] = []
    for path in sorted(RULES_SRC.rglob("*.md")):
        if path.name == "README.md":
            continue
        text = path.read_text(encoding="utf-8")
        meta, body = split_frontmatter(text)
        rule_id = str(meta.get("rule_id", "")).strip()
        if not rule_id:
            continue
        rel = path.relative_to(RULES_SRC).as_posix()
        category = str(meta.get("category") or (path.parent.name if path.parent != RULES_SRC else "root"))
        title = str(meta.get("title") or rule_id)
        short = title.split("·", 1)[-1].strip() if "·" in title else title
        html_rel = f"rules/{Path(rel).with_suffix('.html').as_posix()}"
        items.append({
            "id": rule_id,
            "layer": str(meta.get("layer", "")),
            "category": category,
            "title": title,
            "short": short,
            "summary": rule_summary(body),
            "md": path,
            "md_rel": f"rules/{rel}",
            "html_rel": html_rel,
        })
    items.sort(key=lambda r: (RULE_CATEGORIES.index(r["category"]) if r["category"] in RULE_CATEGORIES else 99,
                              LAYER_ORDER.get(r["layer"], 9), r["id"]))
    return items


RULE_DATA = load_rules()
RULE_BY_ID = {r["id"]: r for r in RULE_DATA}
RULE_BY_MD = {r["md_rel"]: r for r in RULE_DATA}
RULE_ORDER = [r["html_rel"] for r in RULE_DATA]
RULE_MD_TO_HTML = {r["md_rel"]: r["html_rel"] for r in RULE_DATA}
RULE_MD_TO_HTML["rules/README.md"] = "rules/index.html"


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


def generated_html_for(md_path: Path) -> Path | None:
    try:
        rel = md_path.resolve().relative_to(DESIGN.resolve()).as_posix()
    except ValueError:
        return None
    if rel in DOC_BY_MD:
        return OUT / DOC_BY_MD[rel]["html"]
    if rel in RULE_MD_TO_HTML:
        return OUT / RULE_MD_TO_HTML[rel]
    return None


def rel_url(target: Path, start: Path) -> str:
    return Path(os.path.relpath(target, start)).as_posix()


def resolve_href(href: str, source_path: Path, html_file: Path) -> str:
    """把 Markdown 里的相对链接解析成 HTML 页面里的相对链接。"""
    if not href or href.startswith(("http://", "https://", "mailto:", "data:", "javascript:", "#")):
        return href
    path, sep, anchor = href.partition("#")
    if not path:
        return "#" + anchor
    if path.startswith("/"):
        return href
    target = (source_path.parent / path).resolve()
    if path.endswith(".md"):
        html_target = generated_html_for(target)
        if html_target is not None:
            return rel_url(html_target, html_file.parent) + sep + anchor
    if target.exists():
        return rel_url(target, html_file.parent) + sep + anchor
    return href


def meta_value_html(value: str, source: Path, html_file: Path, is_html_field: bool = False) -> str:
    if is_html_field:
        return f'<a href="{html.escape(resolve_href(value, source, html_file), quote=True)}">HTML 阅读版</a>'
    if is_path(value):
        href = resolve_href(value, source, html_file)
        label = link_label(value)
        try:
            rel = (source.parent / value).resolve().relative_to(DESIGN.resolve()).as_posix()
            rule = RULE_BY_MD.get(rel)
            if rule:
                label = rule["short"] or rule["id"]
        except ValueError:
            pass
        return f'<a href="{html.escape(href, quote=True)}">{html.escape(label)}</a>'
    return html.escape(value)


def rule_link_html(rule_id: str, html_file: Path) -> str:
    rule = RULE_BY_ID.get(rule_id)
    if not rule:
        return html.escape(rule_id)
    target = OUT / rule["html_rel"]
    return f'<a href="{html.escape(rel_url(target, html_file.parent), quote=True)}">{html.escape(rule_id)}</a>'


def render_meta(meta: dict, source: Path, html_file: Path) -> str:
    labels = [
        ("rule_id", "规则 ID"),
        ("layer", "层级"),
        ("category", "类别"),
        ("doc_type", "文档类型"),
        ("status", "状态"),
        ("version", "版本"),
        ("date", "日期"),
        ("author", "作者"),
        ("source", "来源"),
        ("authority", "决策权"),
        ("scope", "适用范围"),
        ("rules", "遵循规则"),
        ("html", "HTML 阅读版"),
        ("upstream", "上游"),
        ("related", "关联"),
    ]
    rows: list[str] = []
    for key, label in labels:
        if key not in meta:
            continue
        value = meta[key]
        if key == "rules":
            values = value if isinstance(value, list) else [value]
            rendered = " · ".join(rule_link_html(str(item), html_file) for item in values)
        elif key == "layer":
            rendered = html.escape(LAYER_LABELS.get(str(value), str(value)))
        elif key == "category":
            rendered = html.escape(CATEGORY_LABELS.get(str(value), str(value)))
        elif isinstance(value, list):
            parts = [meta_value_html(item, source, html_file, is_html_field=(key == "html")) for item in value]
            rendered = " · ".join(parts)
        else:
            rendered = meta_value_html(value, source, html_file, is_html_field=(key == "html"))
        rows.append(f"<dt>{label}</dt><dd>{rendered}</dd>")
    if not rows:
        return ""
    return f'<div class="doc-meta" aria-label="文档元数据"><dl>{"".join(rows)}</dl></div>'


def rewrite_links(fragment: str, source: Path, html_file: Path) -> str:
    def repl_href(match: re.Match[str]) -> str:
        raw = html.unescape(match.group(2))
        return match.group(1) + html.escape(resolve_href(raw, source, html_file), quote=True) + match.group(3)

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


def nav_html(current: str, base: str = ".") -> str:
    prefix = "" if base == "." else base + "/"
    blocks: list[str] = []
    for group in GROUPS:
        links: list[str] = []
        for md, doc_group, title, _desc in DOCS:
            if doc_group != group:
                continue
            doc = DOC_BY_MD[md]
            active = ' aria-current="page"' if doc["html"] == current else ""
            links.append(f'<a href="{prefix}{doc["html"]}"{active}>{html.escape(title)}</a>')
        blocks.append(
            f'<div class="nav-group"><h2>{html.escape(group)}</h2>{"".join(links)}</div>'
        )
    index_active = ' aria-current="page"' if current == "index.html" else ""
    rules_active = ' aria-current="page"' if current.startswith("rules/") else ""
    rules_block = (
        '<div class="nav-group"><h2>规则</h2>'
        f'<a href="{prefix}rules/index.html"{rules_active}>规则总览</a>'
        '</div>'
    )
    return (
        f'<a class="brand" href="{prefix}index.html">'
        '<span class="brand-kicker">LiveBay · design01</span>'
        '<span class="brand-title">逍遥湾</span>'
        '<span class="brand-sub">策划文档集 · HTML 阅读版</span>'
        "</a>"
        f'<details class="nav-fold" open><summary>文档目录</summary><nav class="nav">'
        f'<div class="nav-group"><h2>索引</h2><a href="{prefix}index.html"{index_active}>文档索引</a></div>'
        + "".join(blocks)
        + rules_block
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
<link rel="stylesheet" href="__BASE__/assets/style.css">
<script defer src="__BASE__/assets/theme.js"></script>
</head>
<body>
<a class="skip-link" href="#content">跳到正文</a>
<div class="app">
<aside class="sidebar">
__NAV__
<div class="sidebar-foot">
<p>AI 策划参考，非决定。<br>人类裁决记录见 <a href="__BASE__/11_待人类裁决清单.html">11</a>。</p>
<p><a href="__SOURCE__">查看源 Markdown</a></p>
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
<span><a href="__BASE__/index.html">索引</a> · <a href="__SOURCE__">源 Markdown</a></span>
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
<span class="badge">16 篇 + README</span>
<span class="badge">20 条规则</span>
<span class="badge">2026-11-04</span>
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

<section class="section" id="rules">
<h2>规则体系</h2>
<p class="section-note">20 条规则，分 a / b / c 三层与商业 / 设计 / 艺术 / 技术四类；总览页有分类矩阵、层级说明和关系图。</p>
<div class="card-grid">
<a class="doc-card" href="rules/index.html">
<span class="kicker">规则</span>
<h3>规则总览：20 条</h3>
<p>先看分类 × 层级矩阵，再看根规则与类别规则的关系。</p>
</a>
<a class="doc-card" href="rules/index.html#matrix">
<span class="kicker">规则</span>
<h3>分类 × 层级矩阵</h3>
<p>一眼看到每条规则在什么类别、什么层级，以及空缺。</p>
</a>
<a class="doc-card" href="rules/index.html#map">
<span class="kicker">规则</span>
<h3>规则关系图</h3>
<p>根规则 → 四大类别 → 20 条规则；附关键依赖。</p>
</a>
</div>
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
               toc: str = "", pager: str = "", source_path: Path | None = None,
               base: str = ".", html_file: Path | None = None) -> str:
    if source_path is None:
        source_path = DESIGN / "README.md"
    if html_file is None:
        html_file = OUT / current
    source_href = rel_url(source_path, html_file.parent)
    return (
        PAGE.replace("__TITLE__", html.escape(title))
        .replace("__DESCRIPTION__", html.escape(description))
        .replace("__NAV__", nav_html(current, base))
        .replace("__THEME__", theme_switch())
        .replace("__TOPBAR__", html.escape(topbar))
        .replace("__TOC__", toc)
        .replace("__BODY__", body)
        .replace("__PAGER__", pager)
        .replace("__SOURCE__", html.escape(source_href, quote=True))
        .replace("__BASE__", base)
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
        source_path=DESIGN / "README.md",
        html_file=OUT / "index.html",
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
        html_name = to_html_name(md)
        html_file = OUT / html_name
        body = wrap_tables(rewrite_links(body, md_path, html_file))
        meta_html = render_meta(meta, md_path, html_file)
        if meta_html:
            body = re.sub(r"(</h1>)", r"\1\n" + meta_html, body, count=1)
        toc = toc_from(body)
        text = page_shell(
            title,
            desc,
            html_name,
            title,
            body,
            toc=toc,
            pager=pager_html(html_name),
            source_path=md_path,
            html_file=html_file,
        )
        text = f"<!-- 由 tools/build_design_html.py 从 ../{md} 生成；不要手改。 -->\n" + text
        (OUT / html_name).write_text(text, encoding="utf-8")
        print(f"built {html_name}")




def rule_href_from_overview(rule: dict) -> str:
    return rule["html_rel"][len("rules/"):]


def layer_badge(layer: str) -> str:
    return f'<span class="layer-badge layer-{html.escape(layer)}">{html.escape(LAYER_LABELS.get(layer, layer))}</span>'


def rule_card_html(rule: dict) -> str:
    return (
        f'<a class="rule-card" href="{html.escape(rule_href_from_overview(rule), quote=True)}">'
        f'<span class="rule-card-top"><span class="rule-id">{html.escape(rule["id"])}</span>{layer_badge(rule["layer"])}</span>'
        f'<h4>{html.escape(rule["short"])}</h4>'
        f'<p>{html.escape(rule["summary"])}</p>'
        "</a>"
    )


def rule_matrix_html() -> str:
    head = "".join(f"<th>{html.escape(LAYER_LABELS[l])}</th>" for l in ("a", "b", "c"))
    rows: list[str] = []
    for category in RULE_CATEGORIES:
        cells: list[str] = []
        for layer in ("a", "b", "c"):
            items = [r for r in RULE_DATA if r["category"] == category and r["layer"] == layer]
            if items:
                parts = [
                    f'<a class="rule-chip layer-{layer}" href="{html.escape(rule_href_from_overview(r), quote=True)}" title="{html.escape(r["short"], quote=True)}">{html.escape(r["id"])}</a>'
                    for r in items
                ]
                cells.append("<br>".join(parts))
            else:
                cells.append('<span class="rule-empty">—</span>')
        rows.append(
            f'<tr><th scope="row">{html.escape(CATEGORY_LABELS[category])}<span class="rule-cat-en">{html.escape(CATEGORY_EN[category])}</span></th>'
            + "".join(f"<td>{c}</td>" for c in cells)
            + "</tr>"
        )
    return (
        '<div class="table-wrap rule-matrix-wrap"><table class="rule-matrix">'
        f'<thead><tr><th>类别</th>{head}</tr></thead><tbody>{"".join(rows)}</tbody></table></div>'
    )


def rule_map_svg() -> str:
    width, height = 1200, 600
    cats = [
        ("biz", 30), ("design", 320), ("art", 610), ("tech", 900),
    ]
    parts = [
        f'<svg class="rule-map" viewBox="0 0 {width} {height}" role="img" aria-label="规则分类与层级关系图">',
        '<g class="rule-map-edges">',
    ]
    for _, x in cats:
        cx = x + 125
        parts.append(f'<path class="edge" d="M 600 86 C 600 118, {cx} 116, {cx} 150"/>')
    parts.append("</g>")
    parts.append(
        '<a href="#cat-root"><rect class="root-box" x="400" y="10" width="400" height="76" rx="10"/>'
        '<text class="root-title" x="600" y="42" text-anchor="middle">ROOT / 根规则</text>'
        '<text class="root-sub" x="600" y="66" text-anchor="middle">人类裁决 · 分层冲突 · 文档契约</text></a>'
    )
    for category, x in cats:
        items = [r for r in RULE_DATA if r["category"] == category]
        href = "#cat-" + category
        parts.append(
            f'<a href="{href}"><rect class="cat-box cat-{category}" x="{x}" y="150" width="250" height="50" rx="8"/>'
            f'<text class="cat-title" x="{x + 14}" y="181">{html.escape(CATEGORY_EN[category])} · {html.escape(CATEGORY_LABELS[category])}</text>'
            f'<text class="cat-count" x="{x + 236}" y="181" text-anchor="end">{len(items)} 条</text></a>'
        )
        for i, rule in enumerate(items):
            y = 222 + i * 54
            short = rule["short"]
            if len(short) > 13:
                short = short[:12] + "…"
            href = html.escape(rule_href_from_overview(rule), quote=True)
            parts.append(
                f'<a href="{href}"><g class="rule-node chip-{rule["layer"]}">'
                f'<rect x="{x + 8}" y="{y}" width="234" height="42" rx="6"/>'
                f'<text class="node-id" x="{x + 20}" y="{y + 18}">{html.escape(rule["id"])}</text>'
                f'<text class="node-title" x="{x + 20}" y="{y + 34}">{html.escape(short)}</text>'
                f'<text class="node-layer" x="{x + 228}" y="{y + 26}" text-anchor="end">{html.escape(rule["layer"])}</text>'
                "</g></a>"
            )
    parts.append('<g class="rule-map-legend">')
    for i, (layer, label) in enumerate([("a", "a 底层 / 公理"), ("b", "b 中层 / 结构"), ("c", "c 表层 / 表达")]):
        x = 30 + i * 210
        parts.append(f'<rect class="chip-{layer}" x="{x}" y="570" width="16" height="16" rx="3"/>')
        parts.append(f'<text x="{x + 24}" y="583">{html.escape(label)}</text>')
    parts.append("</g></svg>")
    return "".join(parts)


def rule_overview_body() -> str:
    a_count = sum(1 for r in RULE_DATA if r["layer"] == "a")
    b_count = sum(1 for r in RULE_DATA if r["layer"] == "b")
    c_count = sum(1 for r in RULE_DATA if r["layer"] == "c")
    layers = [
        ("a", "底层 / 公理", "项目为什么存在；改它等于换项目。", a_count),
        ("b", "中层 / 结构", "项目怎么运转；可调，但要评审。", b_count),
        ("c", "表层 / 表达", "项目长什么样、怎么写；可快速调整。", c_count),
    ]
    layer_cards = "".join(
        f'<article class="layer-card layer-card-{layer}"><div class="layer-card-head">{layer_badge(layer)}<span class="layer-count">{count} 条</span></div>'
        f'<h3>{html.escape(name)}</h3><p>{html.escape(desc)}</p></article>'
        for layer, name, desc, count in layers
    )
    all_cards: list[str] = []
    for category in RULE_CATEGORIES:
        items = [r for r in RULE_DATA if r["category"] == category]
        all_cards.append(
            f'<section class="rule-category" id="cat-{category}"><div class="rule-category-head">'
            f'<h3>{html.escape(CATEGORY_LABELS[category])} <span>{html.escape(CATEGORY_EN[category])}</span></h3>'
            f'<span class="rule-count">{len(items)} 条</span></div>'
            f'<div class="rule-grid">{"".join(rule_card_html(r) for r in items)}</div></section>'
        )
    edges = [
        ("ROOT-A0", "ROOT-B0", "人类裁决决定规则如何分层与修订"),
        ("ROOT-B0", "ROOT-C0", "分层规则要求文档可引用、可验收"),
        ("BIZ-A1", "DES-A2", "不卖数值，保护“慢好”"),
        ("DES-C1", "TECH-A1", "数值引用必须落到单一数据源"),
        ("DES-B3", "DES-B2", "故障把“没有完美答案”变成可玩选择"),
        ("ART-A1", "ART-B1 / B2 / C1", "四件套向下展开为空间、维修与色板"),
        ("TECH-A1", "TECH-B1 / B2", "单一数据源让改动可逆、验收可重复"),
    ]
    edge_list = "".join(
        f'<li><span class="edge-from"><code>{html.escape(a)}</code></span>'
        f'<span class="edge-arrow" aria-hidden="true">→</span>'
        f'<span class="edge-to"><code>{html.escape(b)}</code></span>'
        f'<span class="edge-note">{html.escape(note)}</span></li>'
        for a, b, note in edges
    )
    matrix = rule_matrix_html()
    svg = rule_map_svg()
    return f'''<section class="hero">
<p class="eyebrow">LiveBay · design01 · rules</p>
<h1>规则体系</h1>
<p class="lede">20 条规则，3 层，4 类 + 根规则。它们不是建议，而是项目在压力下仍然不跑偏的约束：a 层是公理，b 层是结构，c 层是表达。</p>
<div class="badges">
<span class="badge ok">20 条规则</span>
<span class="badge">a / b / c 三层</span>
<span class="badge">商业 · 设计 · 艺术 · 技术</span>
<span class="badge">2026-11-04</span>
</div>
<div class="hero-actions">
<a class="button" href="../index.html">返回文档索引</a>
<a class="button ghost" href="../README.html">策划总览</a>
<a class="button ghost" href="#matrix">直接看矩阵</a>
</div>
</section>

<section class="section" id="layers">
<h2>三层：a / b / c</h2>
<p class="section-note">层级不是重要性排序，而是“改动代价”的排序。越靠底层，越不能随手改。</p>
<div class="layer-grid">{layer_cards}</div>
</section>

<section class="section" id="matrix">
<h2>分类 × 层级</h2>
<p class="section-note">横轴是 a / b / c，纵轴是根 / 商业 / 设计 / 艺术 / 技术。点规则 ID 进入单页。</p>
{matrix}
</section>

<section class="section" id="map">
<h2>关系图</h2>
<p class="section-note">根规则在最上方；四大类别向下展开为具体规则。颜色只表示层级。</p>
<div class="rule-map-wrap">{svg}</div>
<h3>关键依赖</h3>
<ul class="rule-edges-list">{edge_list}</ul>
</section>

<section class="section" id="rules">
<h2>全部规则</h2>
<p class="section-note">按类别分组；每张卡片都可以直接打开。规则正文含形式化、通俗解释、条款、验收与反例。</p>
{"".join(all_cards)}
</section>

<section class="section" id="reading">
<h2>怎么读</h2>
<ol class="rule-reading">
<li><strong>先看三层</strong>：a 层决定什么不能做，b 层决定怎么运转，c 层决定怎么表达。</li>
<li><strong>再看矩阵</strong>：找自己关心的类别与层级，不必从头读 20 条。</li>
<li><strong>最后看关系</strong>：根规则 → 类别规则 → 具体条款；冲突时按 <code>ROOT-B0</code> 判定。</li>
<li><strong>写文档/代码时</strong>：用规则 ID 引用，如 <code>DES-B3</code>，不要只写“按设计规则”。</li>
</ol>
</section>
'''


def rule_pager_html(rule: dict) -> str:
    order = ["rules/index.html"] + RULE_ORDER
    current = rule["html_rel"]
    index = order.index(current)
    prev_target = order[index - 1] if index > 0 else "rules/index.html"
    next_target = order[index + 1] if index + 1 < len(order) else "rules/index.html"

    def link(target: str, direction: str) -> str:
        if target == "rules/index.html":
            title = "规则总览"
        else:
            target_rule = next((r for r in RULE_DATA if r["html_rel"] == target), None)
            title = target_rule["title"] if target_rule else target
        url = rel_url(OUT / target, (OUT / current).parent)
        return (
            f'<a class="{direction}" href="{html.escape(url, quote=True)}">'
            f'<span class="dir">{direction}</span>'
            f'<span class="label">{html.escape(title)}</span>'
            "</a>"
        )

    return f'<nav class="pager" aria-label="上一条 / 下一条规则">{link(prev_target, "prev")}{link(next_target, "next")}</nav>'


def build_rules_index() -> None:
    body = rule_overview_body()
    html_file = RULES_OUT / "index.html"
    text = page_shell(
        "规则总览",
        "LiveBay 规则体系：20 条规则，a/b/c 三层，商业/设计/艺术/技术四类；含分类矩阵与关系图。",
        "rules/index.html",
        "规则总览",
        body,
        toc=toc_from(body),
        source_path=RULES_SRC / "README.md",
        base="..",
        html_file=html_file,
    )
    text = "<!-- 由 tools/build_design_html.py 生成；不要手改。 -->\n" + text
    html_file.write_text(text, encoding="utf-8")
    print("built rules/index.html")


def build_rules() -> None:
    RULES_OUT.mkdir(parents=True, exist_ok=True)
    build_rules_index()
    for rule in RULE_DATA:
        md_path = rule["md"]
        meta, body_md = split_frontmatter(md_path.read_text(encoding="utf-8"))
        html_file = OUT / rule["html_rel"]
        html_file.parent.mkdir(parents=True, exist_ok=True)
        body = subprocess.run(
            ["pandoc", "-f", "gfm", "-t", "html", "--wrap=none", "--no-highlight"],
            input=body_md,
            check=True,
            capture_output=True,
            text=True,
        ).stdout
        body = wrap_tables(rewrite_links(body, md_path, html_file))
        meta_html = render_meta(meta, md_path, html_file)
        if meta_html:
            body = re.sub(r"(</h1>)", r"\1\n" + meta_html, body, count=1)
        toc = toc_from(body)
        depth = len(Path(rule["html_rel"]).parts) - 1
        base = "/".join([".."] * depth) or "."
        text = page_shell(
            rule["title"],
            rule["summary"] or rule["title"],
            rule["html_rel"],
            f"规则 · {rule['id']}",
            body,
            toc=toc,
            pager=rule_pager_html(rule),
            source_path=md_path,
            base=base,
            html_file=html_file,
        )
        source_href = rel_url(md_path, html_file.parent)
        text = f"<!-- 由 tools/build_design_html.py 从 {source_href} 生成；不要手改。 -->\n" + text
        html_file.write_text(text, encoding="utf-8")
        print(f"built {rule['html_rel']}")


def main() -> None:
    if shutil.which("pandoc") is None:
        raise SystemExit("需要 pandoc 才能生成 HTML；请先安装 pandoc。")
    OUT.mkdir(parents=True, exist_ok=True)
    ASSETS_OUT.mkdir(parents=True, exist_ok=True)
    for name in ("style.css", "theme.js"):
        shutil.copyfile(ASSETS_SRC / name, ASSETS_OUT / name)
    build_index()
    build_docs()
    build_rules()
    print(f"done -> {OUT}")


if __name__ == "__main__":
    main()
