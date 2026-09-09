#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
structure_gen —— 为目录生成 STRUCTURE.md（结构 + 细节说明 + 文件关系图 mermaid）。

对应元规则 M4（目录说明与统一索引）：每个目录以 `STRUCTURE.md` 自我描述——目录结构、每条目细节说明、
文件之间的关系图。本工具用于**生成**（也可 `--check` 只探测缺失）。

用法：
  python3 .../structure_gen.py                        # 为 formal-system 树每个目录生成 STRUCTURE.md
  python3 .../structure_gen.py --root <dir>           # 指定树根
  python3 .../structure_gen.py --only <dir>           # 只生成某个目录
  python3 .../structure_gen.py --check                # 只探测缺 STRUCTURE.md 的目录, 不写
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
# meta-rules/tools -> meta-rules -> concerns -> formal-system
DEFAULT_ROOT = os.path.normpath(os.path.join(HERE, "..", "..", ".."))
SKIP = {"__pycache__", "target", ".git", "node_modules"}
LINK_RE = re.compile(r"\]\(([^)]+\.md|[^)]+\.(png|svg|jpg))\)")

SYM = {"README.md": "出入口说明", "STRUCTURE.md": "目录结构(本文件)", "CHANGELOG.md": "变更日志",
       "EXPERIMENT.md": "交接启动文档", "meta-rules-config.json": "元规则判定配置"}


def dirs_under(root):
    out = [root]
    for dirpath, dirnames, _ in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in SKIP and not d.startswith(".")]
        out.append(dirpath)
    return out


def one_line(path, name):
    """给一个条目一行简要说明。"""
    if name in SYM:
        return SYM[name]
    fp = os.path.join(path, name)
    if os.path.isdir(fp):
        return "（子目录，见其 STRUCTURE.md）"
    lower = name.lower()
    if lower.endswith(".md"):
        # 取首个 # 标题
        try:
            for line in open(fp, encoding="utf-8"):
                s = line.strip()
                if s.startswith("# "):
                    return s[2:].strip()[:48]
        except Exception:
            pass
        return "（Markdown 文档）"
    if lower.endswith((".py", ".rs")):
        return "（代码文件）"
    if lower.endswith((".json",)):
        try:
            d = json.load(open(fp, encoding="utf-8"))
            if isinstance(d, dict) and d.get("concern"):
                return f"配置：{d['concern']}"
        except Exception:
            pass
        return "（JSON 配置/数据）"
    if lower.endswith((".html", ".svg", ".png", ".jpg")) or name.startswith("."):
        return "（资源/产物）"
    return "（文件）"


def tree_lines(path, prefix=""):
    entries = sorted(e for e in os.listdir(path) if e not in SKIP and not e.startswith("."))
    lines = []
    for e in entries:
        lines.append(prefix + ("├─ " if e != entries[-1] else "└─ ") + e)
    return lines


def rel_edges(path):
    """md 同目录互链 -> (src, dst) 边，用于关系图。"""
    edges = []
    for name in sorted(os.listdir(path)):
        if not name.lower().endswith(".md") or name in ("STRUCTURE.md",):
            continue
        src = os.path.splitext(name)[0]
        try:
            text = open(os.path.join(path, name), encoding="utf-8").read()
        except Exception:
            continue
        for m in LINK_RE.finditer(text):
            tgt = m.group(1).split("#")[0].lstrip("./")
            b = os.path.basename(tgt)
            if b == name:
                continue
            base = os.path.splitext(b)[0]
            if base:
                edges.append((src, base))
    return edges


def mermaid(path):
    nodes = sorted(e for e in os.listdir(path) if e not in SKIP and not e.startswith("."))
    parts = ["```mermaid", "graph TD"]
    ide = {}
    for i, e in enumerate(nodes):
        ide[e] = f"N{i}"
        if os.path.isdir(os.path.join(path, e)):
            parts.append(f"    N{i}{{{{{e}}}}}")
        else:
            parts.append(f"    N{i}[{e}]")
    for a, b in set(rel_edges(path)):
        if a in ide and b in ide and a != b:
            parts.append(f"    {ide[a]} -->|link| {ide[b]}")
    parts.append("```")
    return "\n".join(parts)


def structure_md(path, root):
    name = os.path.basename(os.path.abspath(path)) or os.sep
    rel = os.path.relpath(os.path.abspath(path), os.path.abspath(root))
    title = f"# {name} · 目录结构与文件关系"
    entries = sorted(e for e in os.listdir(path) if e not in SKIP and not e.startswith("."))
    rows = "".join(f"| `{e}` | {one_line(path, e)} |\n" for e in entries)
    if not entries:
        rows = "（空目录，暂无条目）\n"
    return f"""{title}

> 目录 `{rel or '.'}` 的说明。属 **目录自描述**（元规则 M4 目录说明与统一索引）：列结构 + 条目说明 + 文件关系图；
> 这类说明由树根 README 末尾统一索引。

## 一、目录结构

```
{os.path.basename(os.path.abspath(path))}/
{chr(10).join(tree_lines(path, "    "))}
```

## 二、条目说明

| 条目 | 说明 |
| --- | --- |
{rows}

## 三、文件关系图（mermaid）

{mermaid(path)}
"""


def main():
    root = DEFAULT_ROOT
    only = None
    if "--root" in sys.argv:
        i = sys.argv.index("--root")
        if i + 1 < len(sys.argv):
            root = sys.argv[i + 1]
    if "--only" in sys.argv:
        i = sys.argv.index("--only")
        if i + 1 < len(sys.argv):
            only = sys.argv[i + 1]
    check = "--check" in sys.argv

    targets = [os.path.abspath(only)] if only else dirs_under(root)
    missing = []
    written = []
    for d in targets:
        sp = os.path.join(d, "STRUCTURE.md")
        if check and not os.path.exists(sp):
            missing.append(os.path.relpath(d, os.path.abspath(root)))
        elif not check and not os.path.exists(sp):
            with open(sp, "w", encoding="utf-8") as f:
                f.write(structure_md(d, root))
            written.append(os.path.relpath(d, os.path.abspath(root)))

    if check:
        print(f"检测 {len(targets)} 个目录，缺 STRUCTURE.md：{len(missing)}")
        for m in missing:
            print("  ✗ " + m)
    else:
        print(f"已为 {len(written)} 个目录生成 STRUCTURE.md")
        for w in written:
            print("  ✔ " + w)
    return 1 if (check and missing) else 0


if __name__ == "__main__":
    sys.exit(main())
