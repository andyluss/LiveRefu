#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
structure_check —— 检测一棵目录树里每个目录是否都有合格的 STRUCTURE.md（对应元规则 M4）。

合格 = 每个目录有 `STRUCTURE.md`，且包含三部分：**目录结构** / **条目说明** / **文件关系图(mermaid)**。
本工具只**检测**，不生成；生成工具见 [`structure_gen.py`](structure_gen.py)。

用法：
  python3 .../structure_check.py                       # 检测 formal-system 树
  python3 .../structure_check.py --root <dir>          # 指定树根
  python3 .../structure_check.py --self-test           # 自检(造缺失目录能抓到)
退出码：0=全部合格；1=有缺失/不合格。
"""
import os
import re
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
DEFAULT_ROOT = os.path.normpath(os.path.join(HERE, "..", "..", ".."))  # formal-system
SKIP = {"__pycache__", "target", ".git", "node_modules"}
REQUIRED = ["目录结构", "条目说明", "文件关系图"]


def dirs_under(root):
    out = [root]
    for dirpath, dirnames, _ in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in SKIP and not d.startswith(".")]
        out.append(dirpath)
    return out


def validate(path):
    """返回 (ok, reason)。"""
    sp = os.path.join(path, "STRUCTURE.md")
    if not os.path.exists(sp):
        return False, "缺 STRUCTURE.md"
    try:
        text = open(sp, encoding="utf-8").read()
    except (OSError, UnicodeDecodeError):
        return False, "STRUCTURE.md 读取失败"
    missing = [r for r in REQUIRED if r not in text]
    if missing:
        return False, "缺小节: " + ", ".join(missing)
    if "mermaid" not in text:
        return False, "缺 mermaid 文件关系图"
    return True, ""


def self_test():
    base = tempfile.mkdtemp(prefix="struct-check-")
    good = os.path.join(base, "good")
    os.makedirs(good)
    open(os.path.join(good, "STRUCTURE.md"), "w", encoding="utf-8").write(
        "## 一、目录结构\n## 二、条目说明\n## 三、文件关系图（mermaid）\n```mermaid\ngraph TD\nA[x]\n```\n")
    bad = os.path.join(base, "bad")
    os.makedirs(bad)
    open(os.path.join(bad, "STRUCTURE.md"), "w", encoding="utf-8").write("## 只有结构\n")
    missing = os.path.join(base, "missing")
    os.makedirs(missing)

    ok_g = validate(good)[0]
    ok_b = validate(bad)[0]
    ok_m = validate(missing)[0]
    passed = ok_g and (not ok_b) and (not ok_m)
    print(f"  good: {ok_g}, bad(缺小节): {ok_b}, missing(缺文件): {ok_m}")
    print("self-test:", "PASS" if passed else "FAIL")
    return 0 if passed else 1


def main():
    if "--self-test" in sys.argv:
        return self_test()
    root = DEFAULT_ROOT
    if "--root" in sys.argv:
        i = sys.argv.index("--root")
        if i + 1 < len(sys.argv):
            root = sys.argv[i + 1]
    dirs = dirs_under(root)
    bad = []
    for d in dirs:
        ok, reason = validate(d)
        if not ok:
            bad.append((os.path.relpath(d, os.path.abspath(root)), reason))
    print(f"STRUCTURE.md 检测 · {len(dirs)} 个目录")
    for rel, reason in sorted(bad):
        print(f"  ✗ {rel}: {reason}")
    print(f"\n判定: 目录 {len(dirs)} · 不合格 {len(bad)}")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
