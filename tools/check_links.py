#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
校验工作区内所有 Markdown 文件中的内部相对链接是否有效。

用途：先于提交运行，发现写错深度的相对链接(如 ../doc 应为 ../../doc)、把中文/%
编码写错、或指向已移动/删除文件的链接。

用法：
    python3 tools/check_links.py            # 扫描全部 md
    python3 tools/check_links.py --sub studio   # 只扫描 studio/ 子目录
    python3 tools/check_links.py -v         # 连同"有效链接"一起打印(默认只列失效)

说明：
    - 仅处理 Markdown 相对/内部链接(含 ![] 图片)。外链(http/https/mailto)、纯锚点(#)、
      以及无目标(仅锚点)的条目会被跳过。
    - 使用工作区根目录作为基准: 以 "/" 开头的链接按工作区根解析(根相对);
      否则按"链接所在文件目录 + 链接"解析(常规相对), 与本地 IDE/预览器行为一致。
"""

import os
import re
import sys
import urllib.parse

# 以本脚本(工作区/tools/)为基准定位工作区根: 上溯到 .git 所在目录
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
if not os.path.isdir(os.path.join(ROOT, ".git")):
    ROOT = HERE  # 兜底: 找不到 .git 就用 tools/ 的上一级

# 匹配 Markdown 链接/图片: [text](url) / ![alt](url)
LINK_RE = re.compile(r"!?\[([^\]]*)\]\(([^)]+)\)")


def walk_md(start):
    for base, dirs, files in os.walk(start):
        dirs[:] = [d for d in dirs if d != ".git"]
        for f in sorted(files):
            if f.endswith(".md"):
                yield os.path.join(base, f)


def collect_links(path):
    """返回 (相对文件路径的文本, 链接URL, 绝对目标路径或None-表示跳过) 列表。"""
    out = []
    try:
        with open(path, encoding="utf-8") as fh:
            text = fh.read()
    except OSError:
        return out
    rel_dir = os.path.dirname(path)
    for m in LINK_RE.finditer(text):
        url = m.group(2).strip()
        if url.startswith("<") and url.endswith(">"):
            url = url[1:-1].strip()
        if url.startswith(("http://", "https://", "mailto:", "tel:")):
            continue                       # 外链跳过
        if url.startswith("#"):
            continue                       # 纯锚点跳过
        target = url.split("#")[0].split("?")[0]
        if target == "":
            continue                       # 仅锚点(如 [x](#sec))跳过
        try:
            target = urllib.parse.unquote(target)
        except Exception:
            pass
        target = target.replace("\\", "/")
        if target.startswith("/"):
            abs_target = os.path.join(ROOT, target.lstrip("/"))
        else:
            abs_target = os.path.normpath(os.path.join(rel_dir, target))
        out.append((url, abs_target))
    return out


def main():
    argv = sys.argv[1:]
    sub = None
    verbose = False
    i = 0
    while i < len(argv):
        a = argv[i]
        if a == "--sub":
            if i + 1 < len(argv):
                sub = argv[i + 1]
                i += 1
            else:
                print("--sub 需要一个目录参数"); return 2
        elif a in ("-v", "--verbose"):
            verbose = True
        else:
            print(f"未知参数: {a}"); return 2
        i += 1

    start = os.path.join(ROOT, sub) if sub else ROOT
    if not os.path.isdir(start):
        print(f"目录不存在: {start}"); return 2

    files = sorted(walk_md(start))
    total = 0
    broken = []
    for path in files:
        for url, abs_target in collect_links(path):
            total += 1
            if not os.path.exists(abs_target):
                broken.append((path, url, abs_target))
            elif verbose:
                ok = "ok" if os.path.exists(abs_target) else "MISS"
                print(f"  [{ok}] {os.path.relpath(path, ROOT)} :: {url}")

    print(f"扫描 Markdown: {len(files)} 个文件")
    print(f"内部链接总数: {total} 个")
    print(f"失效链接: {len(broken)} 个")
    if broken:
        cur = None
        for f, url, tgt in broken:
            if f != cur:
                print(f"\n### {os.path.relpath(f, ROOT)}")
                cur = f
            print(f"   -> {url}   [缺: {os.path.relpath(tgt, ROOT)}]")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
