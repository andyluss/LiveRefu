#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""check_file_size.py —— 强制 .gd 文件的"小文件"预算。

规则（用户决策，见 docs/06_文件预算与拆分约定.md）：
  * 核心逻辑层（core/、autoload/、tools/ 下的 .gd）：代码行 <= 50，物理行 <= 100
  * 界面/表现层（app/、view/）：代码行 <= 100，物理行 <= 200
  * 工具脚本（tools/*.py / *.swift / *.sh）不在约束内（决策：本轮只拆 .gd）

"代码行"口径：去掉首尾空白后，非空行、不以 # 开头的行、且不落在三引号多行块内。
（于是中文设计注释与空行不计入 50 行预算，但物理行仍有兜底上限。）

用法：
    python3 tools/check_file_size.py            # 全量检查（越界则非零退出）
    python3 tools/check_file_size.py --top 15   # 附带打印最长的 15 个文件
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
CODE_ROOT = PROJECT_ROOT / "game"
CORE_DIRS = ("core", "autoload", "tools", "data")
CORE_BUDGET = (50, 100)   # (代码行, 物理行)
UI_BUDGET = (100, 200)
CODE_LINE = re.compile(r"^\s*(#|$)")
DQUOTE = chr(34) * 3
SQUOTE = chr(39) * 3
TRIPLE = (DQUOTE, SQUOTE)


def count(path: Path) -> dict:
    code = 0
    physical = 0
    in_block = None
    for raw in path.read_text(encoding="utf-8").splitlines():
        physical += 1
        line = raw.strip()
        if in_block is not None:
            if in_block in line:
                in_block = None
            continue
        if line.startswith(TRIPLE):
            marker = line[:3]
            if not (len(line) > 3 and line.endswith(marker)):
                in_block = marker
            continue
        if CODE_LINE.match(line):
            continue
        code += 1
    return {"code": code, "physical": physical}


def budget_for(path: Path):
    rel = path.relative_to(CODE_ROOT / "scripts")
    layer = rel.parts[0] if len(rel.parts) > 1 else ""
    return CORE_BUDGET if layer in CORE_DIRS else UI_BUDGET


def scan() -> list:
    rows = []
    for path in sorted(CODE_ROOT.rglob("*.gd")):
        if "/probe/" in path.as_posix():
            continue
        stats = count(path)
        code_cap, phys_cap = budget_for(path)
        stats.update({
            "path": path.relative_to(PROJECT_ROOT).as_posix(),
            "code_cap": code_cap,
            "phys_cap": phys_cap,
            "over": stats["code"] > code_cap or stats["physical"] > phys_cap,
        })
        rows.append(stats)
    return rows


def report(rows: list, top: int) -> list:
    over = [r for r in rows if r["over"]]
    if top:
        print("最长的 %d 个 .gd（代码行/物理行 vs 预算）：" % top)
        for r in sorted(rows, key=lambda x: -x["code"])[:top]:
            print("  %s %4d/%4d  预算 %d/%d  %s" % (
                "X" if r["over"] else " ", r["code"], r["physical"],
                r["code_cap"], r["phys_cap"], r["path"]))
        print("")
    for r in sorted(over, key=lambda x: -x["code"]):
        reasons = []
        if r["code"] > r["code_cap"]:
            reasons.append("代码行 %d > %d" % (r["code"], r["code_cap"]))
        if r["physical"] > r["phys_cap"]:
            reasons.append("物理行 %d > %d" % (r["physical"], r["phys_cap"]))
        print("  超出：%s（%s）" % (r["path"], "，".join(reasons)))
    print("文件预算检查：%s（%d 个 .gd，超预算 %d 个；核心 <=50 代码行，界面 <=100 代码行）"
          % ("FAIL" if over else "PASS", len(rows), len(over)))
    return over


def main() -> int:
    ap = argparse.ArgumentParser(description="检查 .gd 文件的行数预算")
    ap.add_argument("--top", type=int, default=0, help="打印最长的 N 个文件")
    ap.add_argument("--json", action="store_true", help="输出 JSON")
    args = ap.parse_args()
    rows = scan()
    if args.json:
        print(json.dumps({"files": rows}, ensure_ascii=False, indent=2))
        return 1 if any(r["over"] for r in rows) else 0
    return 1 if report(rows, args.top) else 0


if __name__ == "__main__":
    raise SystemExit(main())
