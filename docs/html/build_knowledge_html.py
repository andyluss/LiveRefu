#!/usr/bin/env python3
"""把一棵 Markdown 知识库树生成可离线阅读的 HTML。

用法（在仓库根目录）：
    python3 docs/html/build_knowledge_html.py \
        --source docs/retro-futurism \
        --output docs/retro-futurism/html \
        --title "复古未来主义论文集" \
        --include-dir-prefix 附录_

设计目标：复用 docs/html/assets 下的样式与主题脚本，供后续知识库直接复用。
生成物不要手改；改 Markdown 或 docs/html/assets 后重跑。
"""

from __future__ import annotations

import argparse
import html
import os
import re
import shutil
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DOCS_HTML = Path(__file__).resolve().parent
ASSETS = DOCS_HTML / "assets"
GENERATED = "2026-11-04"

PAGE = """<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<title>__TITLE__</title>
<meta name="description" content="__DESC__">
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
<link rel="stylesheet" href="__ASSETS__/style.css">
<script defer src="__ASSETS__/theme.js"></script>
</head>
<body>
<a class="skip-link" href="#content">跳到正文</a>
<div class="app">
<aside class="sidebar">
__NAV__
<div class="sidebar-foot">
<p>知识库 HTML 阅读版。<br>样式与脚本复用 <code>docs/html/</code>。</p>
<p><a href="__SOURCE__">查看源 Markdown</a></p>
</div>
</aside>
<div class="main">
<header class="topbar">
<div class="topbar-left"><span class="topbar-kicker">retro-futurism</span><span class="topbar-title">__TOPBAR__</span></div>
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
<span>LiveRefu · 复古未来主义文集 · 生成于 __GENERATED__</span>
<span><a href="__INDEX__">总览</a> · <a href="__SOURCE__">源 Markdown</a></span>
</footer>
</div>
</div>
</body>
</html>
"""


def strip_md(text: str) -> str:
    text = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", text)
    text = re.sub(r"[`*_>#]", "", text)
    return re.sub(r"\s+", " ", text).strip()


def extract(path: Path) -> tuple[str, str, str]:
    text = path.read_text(encoding="utf-8")
    h1 = re.search(r"^#\s+(.+)$", text, re.M)
    title = strip_md(h1.group(1)) if h1 else path.stem
    summary = ""
    for line in text.splitlines():
        if line.startswith("> "):
            candidate = strip_md(line[2:])
            if candidate:
                summary = candidate
            break
    return title, summary, text


def short_title(title: str, limit: int = 22) -> str:
    part = title.split("·", 1)[-1].strip() if "·" in title else title
    return part if len(part) <= limit else part[: limit - 1] + "…"


def nav_label(title: str) -> str:
    """侧栏用的短标签：编号 + 冒号/破折号前的主题。"""
    m = re.match(r"(\d{2})\s*[·:：]\s*(.+)", title)
    if m:
        num, body = m.group(1), m.group(2)
    else:
        num, body = "", title.split("·")[-1].strip()
    head = re.split(r"[：:—]", body, 1)[0].strip()
    label = f"{num} {head}".strip()
    return label if len(label) <= 18 else label[:17] + "…"


def appendix_label(name: str) -> str:
    return name.removeprefix("附录_").removesuffix("卷")


def to_output(path: Path, source: Path) -> str:
    if path == source / "README.md":
        return "README.html"
    if path.parent == source:
        return path.stem + ".html"
    rel = path.relative_to(source)
    if path.name == "README.md":
        return (rel.parent / "index.html").as_posix()
    return rel.with_suffix(".html").as_posix()


def rel_url(target: Path, start: Path) -> str:
    return Path(os.path.relpath(target, start)).as_posix()


def wrap_tables(fragment: str) -> str:
    return fragment.replace("<table>", '<div class="table-wrap"><table>').replace("</table>", "</table></div>")


def toc_from(fragment: str) -> str:
    items = []
    for m in re.finditer(r'<h([23])\s+id="([^"]+)"[^>]*>(.*?)</h\1>', fragment, re.S):
        level, ident, raw = m.group(1), m.group(2), m.group(3)
        text = strip_md(re.sub(r"<[^>]+>", "", raw))
        if text:
            items.append(f'<li class="{"sub" if level == "3" else ""}"><a href="#{html.escape(ident)}">{html.escape(text)}</a></li>')
    if len(items) < 2:
        return ""
    return '<details class="toc" open><summary>本页目录</summary><ul class="toc-list">' + "".join(items) + "</ul></details>"


def theme_switch() -> str:
    return (
        '<div class="theme-switch" role="group" aria-label="主题">'
        '<button type="button" data-theme-choice="system" aria-pressed="true">系统</button>'
        '<button type="button" data-theme-choice="light" aria-pressed="false">浅色</button>'
        '<button type="button" data-theme-choice="dark" aria-pressed="false">深色</button>'
        "</div>"
    )


def nav_group(title: str, links: list[str], count: int | None = None, open_group: bool = False) -> str:
    open_attr = " open" if open_group else ""
    count_html = f'<span class="nav-count">{count}</span>' if count is not None else ""
    return (
        f'<details class="nav-group"{open_attr}><summary><span>{html.escape(title)}</span>{count_html}</summary>'
        f'<div class="nav-links">{"".join(links)}</div></details>'
    )


class Site:
    def __init__(self, source: Path, output: Path, title: str, subtitle: str):
        self.source = source
        self.output = output
        self.title = title
        self.subtitle = subtitle
        self.readme = source / "README.md"
        self.main: list[Path] = []
        self.reference: list[Path] = []
        self.appendices: list[tuple[str, list[Path]]] = []
        self.pages: dict[Path, str] = {}
        self.titles: dict[Path, str] = {}
        self.summaries: dict[Path, str] = {}
        self.raw: dict[Path, str] = {}

    def discover(self, include_prefix: str, exclude_dirs: set[str]) -> None:
        top = sorted(p for p in self.source.glob("*.md") if p.is_file())
        self.main = [p for p in top if re.match(r"\d{2}_", p.name)]
        self.reference = [p for p in top if p != self.readme and p not in self.main]
        for d in sorted(p for p in self.source.iterdir() if p.is_dir()):
            if d.name in exclude_dirs or (include_prefix and not d.name.startswith(include_prefix)):
                continue
            if not (d / "README.md").exists():
                continue
            docs = [d / "README.md"] + sorted(
                p for p in d.glob("*.md") if p != d / "README.md"
            )
            self.appendices.append((d.name, docs))
        all_docs = [self.readme] + self.main + self.reference
        for _, docs in self.appendices:
            all_docs += docs
        for p in all_docs:
            out = to_output(p, self.source)
            self.pages[p] = out
            t, s, raw = extract(p)
            self.titles[p] = t
            self.summaries[p] = s
            self.raw[p] = raw

    def out_path(self, md: Path) -> Path:
        return self.output / self.pages[md]

    def page_title(self, md: Path) -> str:
        return self.titles.get(md, md.stem)

    def appendix_of(self, md: Path) -> tuple[str, list[Path]] | None:
        for name, docs in self.appendices:
            if md in docs:
                return name, docs
        return None

    def href(self, md: Path, page: Path) -> str:
        return rel_url(self.out_path(md), page.parent)

    def nav(self, current: Path, active_appendix: str | None) -> str:
        current_page = self.out_path(current) if current in self.pages else self.output / "index.html"

        def link(md: Path, label: str, cls: str = "") -> str:
            active = ' aria-current="page"' if md == current else ""
            c = f' class="{cls}"' if cls else ""
            return f'<a href="{html.escape(self.href(md, current_page), quote=True)}"{c}{active}>{html.escape(label)}</a>'

        out = [
            f'<a class="brand" href="{html.escape(rel_url(self.output / "index.html", current_page.parent), quote=True)}">'
            '<span class="brand-kicker">LiveRefu · knowledge</span>'
            f'<span class="brand-title">{html.escape(self.title)}</span>'
            '<span class="brand-sub">知识库 · HTML 阅读版</span></a>'
        ]
        out.append('<nav class="nav">')
        out.append('<div class="nav-group"><h2>总览</h2>')
        out.append(f'<a href="{html.escape(rel_url(self.output / "index.html", current_page.parent), quote=True)}">文集总览</a>')
        out.append(link(self.readme, "卷首 README"))
        out.append("</div>")
        out.append(nav_group("主卷", [link(p, nav_label(self.page_title(p))) for p in self.main], len(self.main)))
        out.append(nav_group("附录", [link(docs[0], appendix_label(name)) for name, docs in self.appendices], len(self.appendices)))
        if active_appendix:
            docs = next(docs for name, docs in self.appendices if name == active_appendix)
            out.append(nav_group(
                appendix_label(active_appendix),
                [link(p, nav_label(self.page_title(p))) for p in docs],
                len(docs),
                open_group=True,
            ))
        out.append(nav_group("参考", [link(p, short_title(self.page_title(p), 18)) for p in self.reference], len(self.reference)))
        out.append("</nav>")
        return "".join(out)


def resolve_href(site: Site, href: str, source: Path, page: Path) -> str:
    if not href or href.startswith(("http://", "https://", "mailto:", "data:", "javascript:", "#")):
        return href
    path, sep, anchor = href.partition("#")
    if not path or path.startswith("/"):
        return href
    target = (source.parent / path).resolve()
    if target in site.pages:
        out = rel_url(site.out_path(target), page.parent)
    elif target.exists():
        out = rel_url(target, page.parent)
    else:
        return href
    return out + sep + anchor


def rewrite_links(site: Site, fragment: str, source: Path, page: Path) -> str:
    def repl(m: re.Match[str]) -> str:
        raw = html.unescape(m.group(2))
        return m.group(1) + html.escape(resolve_href(site, raw, source, page), quote=True) + m.group(3)

    fragment = re.sub(r'(<a\b[^>]*?\bhref=")([^"]*)(")', repl, fragment)
    fragment = re.sub(r'(<img\b[^>]*?\bsrc=")([^"]*)(")', repl, fragment)
    return fragment


def pager(site: Site, order: list[Path], current: Path) -> str:
    if current not in order:
        return ""
    i = order.index(current)
    prev_md = order[i - 1] if i > 0 else None
    next_md = order[i + 1] if i + 1 < len(order) else None

    def link(md: Path | None, direction: str) -> str:
        if md is None:
            return ""
        target = site.out_path(md)
        label = "文集总览" if target.name == "index.html" and target.parent == site.output else site.page_title(md)
        url = rel_url(target, site.out_path(current).parent)
        return (
            f'<a class="{direction}" href="{html.escape(url, quote=True)}">'
            f'<span class="dir">{direction}</span><span class="label">{html.escape(label)}</span></a>'
        )

    return f'<nav class="pager" aria-label="上一篇 / 下一篇">{link(prev_md, "prev")}{link(next_md, "next")}</nav>'


def page_shell(site: Site, title: str, desc: str, current: Path, topbar: str,
               body: str, toc: str = "", pager_html: str = "", active_appendix: str | None = None,
               index_page: bool = False, page_override: Path | None = None) -> str:
    page = page_override or (site.out_path(current) if current in site.pages else site.output / "index.html")
    assets = rel_url(ASSETS, page.parent)
    source = rel_url(current, page.parent) if current in site.pages else "../README.md"
    index = rel_url(site.output / "index.html", page.parent)
    nav = _index_nav(site, page) if index_page else site.nav(current, active_appendix)
    return (
        PAGE.replace("__TITLE__", html.escape(title))
        .replace("__DESC__", html.escape(desc))
        .replace("__ASSETS__", html.escape(assets, quote=True))
        .replace("__NAV__", nav)
        .replace("__THEME__", theme_switch())
        .replace("__TOPBAR__", html.escape(topbar))
        .replace("__TOC__", toc)
        .replace("__BODY__", body)
        .replace("__PAGER__", pager_html)
        .replace("__SOURCE__", html.escape(source, quote=True))
        .replace("__INDEX__", html.escape(index, quote=True))
        .replace("__GENERATED__", GENERATED)
    )


def _index_nav(site: Site, page: Path) -> str:
    out = [
        f'<a class="brand" href="{html.escape(rel_url(site.output / "index.html", page.parent), quote=True)}">'
        '<span class="brand-kicker">LiveRefu · knowledge</span>'
        f'<span class="brand-title">{html.escape(site.title)}</span>'
        '<span class="brand-sub">知识库 · HTML 阅读版</span></a>',
        '<nav class="nav"><div class="nav-group"><h2>总览</h2>'
        f'<a href="{html.escape(rel_url(site.output / "index.html", page.parent), quote=True)}" aria-current="page">文集总览</a>'
        f'<a href="{html.escape(rel_url(site.out_path(site.readme), page.parent), quote=True)}">卷首 README</a></div>',
    ]
    main_links = [
        f'<a href="{html.escape(rel_url(site.out_path(p), page.parent), quote=True)}">{html.escape(nav_label(site.page_title(p)))}</a>'
        for p in site.main
    ]
    app_links = [
        f'<a href="{html.escape(rel_url(site.out_path(docs[0]), page.parent), quote=True)}">{html.escape(appendix_label(name))}</a>'
        for name, docs in site.appendices
    ]
    ref_links = [
        f'<a href="{html.escape(rel_url(site.out_path(p), page.parent), quote=True)}">{html.escape(nav_label(site.page_title(p)))}</a>'
        for p in site.reference
    ]
    out.append(nav_group("主卷", main_links, len(main_links)))
    out.append(nav_group("附录", app_links, len(app_links)))
    out.append(nav_group("参考", ref_links, len(ref_links)))
    out.append("</nav>")
    return "".join(out)


def card(site: Site, md: Path, kicker: str, page: Path) -> str:
    summary = site.summaries.get(md, "")
    if len(summary) > 110:
        summary = summary[:109] + "…"
    return (
        f'<a class="doc-card" href="{html.escape(rel_url(site.out_path(md), page.parent), quote=True)}">'
        f'<span class="kicker">{html.escape(kicker)}</span>'
        f'<h3>{html.escape(site.page_title(md))}</h3>'
        f'<p>{html.escape(summary)}</p></a>'
    )


def build_index(site: Site) -> None:
    page = site.output / "index.html"
    main_cards = "".join(card(site, p, "主卷", page) for p in site.main)
    app_cards = "".join(card(site, docs[0], "附录", page) for _, docs in site.appendices)
    ref_cards = "".join(card(site, p, "参考", page) for p in site.reference)
    stats_md = site.reference[0] if site.reference else site.readme
    body = f'''<section class="hero">
<p class="eyebrow">LiveRefu · retro-futurism</p>
<h1>{html.escape(site.title)}</h1>
<p class="lede">{html.escape(site.subtitle)}</p>
<div class="badges">
<span class="badge ok">{len(site.main)} 篇主卷</span>
<span class="badge">{len(site.appendices)} 卷附录</span>
<span class="badge">{len(site.pages)} 篇文档</span>
<span class="badge">约 20 万字</span>
</div>
<div class="hero-actions">
<a class="button" href="{html.escape(rel_url(site.out_path(site.readme), page.parent), quote=True)}">从卷首开始</a>
<a class="button ghost" href="{html.escape(rel_url(site.out_path(stats_md), page.parent), quote=True)}">看全卷统计</a>
</div>
</section>
<section class="section"><h2>主卷</h2><p class="section-note">从 00 总论到 20 结语，按考古顺序阅读。</p><div class="card-grid">{main_cards}</div></section>
<section class="section"><h2>附录卷</h2><p class="section-note">八个专题附录：从千禧美学到 NASA朋克。</p><div class="card-grid">{app_cards}</div></section>
<section class="section"><h2>参考</h2><div class="card-grid">{ref_cards}</div></section>
<section class="section"><h2>怎么读</h2>
<p>第一次读：先看卷首 README，再从 00 总论开始；想查数据，直接看全卷统计；想钻一个专题，从附录卷的 README 进入。</p>
<p>每一页都可以用左侧目录跳转；主卷与附录各自有上一篇/下一篇。所有页面支持系统 / 浅色 / 深色，可离线打开。</p>
</section>'''
    text = page_shell(
        site, f"{site.title} · 总览", site.subtitle, site.readme, "文集总览", body,
        toc="", pager_html="", index_page=True, page_override=page,
    )
    text = "<!-- 由 docs/html/build_knowledge_html.py 生成；不要手改。 -->\n" + text
    page.write_text(text, encoding="utf-8")
    print("built index.html")


def build_pages(site: Site) -> None:
    for md, out in site.pages.items():
        page = site.output / out
        page.parent.mkdir(parents=True, exist_ok=True)
        body = subprocess.run(
            ["pandoc", "-f", "gfm", "-t", "html", "--wrap=none", "--no-highlight"],
            input=site.raw[md], check=True, capture_output=True, text=True,
        ).stdout
        body = wrap_tables(rewrite_links(site, body, md, page))
        toc = toc_from(body)
        app = site.appendix_of(md)
        if app:
            order = app[1]
        elif md in site.main:
            order = site.main
        else:
            order = []
        text = page_shell(
            site, site.page_title(md), site.summaries.get(md, ""), md,
            short_title(site.page_title(md), 34), body,
            toc=toc, pager_html=pager(site, order, md),
            active_appendix=app[0] if app else None,
        )
        text = f"<!-- 由 docs/html/build_knowledge_html.py 从 {rel_url(md, page.parent)} 生成；不要手改。 -->\n" + text
        page.write_text(text, encoding="utf-8")
        print(f"built {out}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", default="docs/retro-futurism")
    parser.add_argument("--output", default="")
    parser.add_argument("--title", default="复古未来主义论文集")
    parser.add_argument("--subtitle", default="一部关于“过去如何想象未来”的纵向考古，以及八卷专题附录。")
    parser.add_argument("--include-dir-prefix", default="附录_")
    parser.add_argument("--exclude-dir", action="append", default=None)
    args = parser.parse_args()
    if shutil.which("pandoc") is None:
        raise SystemExit("需要 pandoc")
    source = (ROOT / args.source).resolve()
    output = (ROOT / args.output).resolve() if args.output else source / "html"
    excludes = set(args.exclude_dir or ["html", "合订本", "原朋克五卷残留"])
    site = Site(source, output, args.title, args.subtitle)
    site.discover(args.include_dir_prefix, excludes)
    output.mkdir(parents=True, exist_ok=True)
    build_index(site)
    build_pages(site)
    print(f"done -> {output} ({len(site.pages)} pages)")


if __name__ == "__main__":
    main()
