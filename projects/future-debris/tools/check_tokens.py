#!/usr/bin/env python3
"""token 单一来源对账闸门：**文档（docs/04）与机器可读副本（game/data/tokens.json）必须完全一致**。

为什么需要它：色值与字号一旦有两份定义（一份给文档、一份给引擎），
它们迟早会分叉——而分叉的表现是"文档说 4.5:1 达标、实际界面颜色不同"，
这类问题**在代码里看不出来，只看文档也看不出来**。
因此立场：**文档是权威，JSON 是它的机器可读投影；两者不等即失败。**

对账范围：
  1. 颜色 token 的**名字与值**双向一致（文档有而 JSON 无 → 报错；反之亦然）；
  2. 字号阶梯的 token 名与 px 值一致，且**恰好 5 级**（防止有人悄悄加第六级）；
  3. JSON 里的颜色值格式合法（#RRGGBB）。

用法:
    python3 tools/check_tokens.py              # 对账
    python3 tools/check_tokens.py --self-test  # 先跑检查器自检（负向用例）
退出码: 0 = 一致; 1 = 不一致; 2 = 用法错误
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
PROJECT = HERE.parent
DOC = PROJECT / "docs" / "04_视觉语言与设计token.md"
JSON_PATH = PROJECT / "game" / "data" / "tokens.json"

COLOR_ROW = re.compile(r"^\|\s*`(--[a-z0-9-]+)`\s*\|\s*`(#[0-9A-Fa-f]{6})`")
TYPE_ROW = re.compile(r"^\|\s*`(title-1|title-2|body|caption|number-lg)`\s*\|\s*(\d+)px")
HEX = re.compile(r"^#[0-9A-F]{6}$")

EXPECTED_TYPE_LEVELS = ["title-1", "title-2", "body", "caption", "number-lg"]


class Report:
    def __init__(self) -> None:
        self.errors: list[str] = []
        self.warnings: list[str] = []

    def error(self, message: str) -> None:
        self.errors.append(message)


def parse_doc(doc: Path, report: Report) -> tuple[dict[str, str], dict[str, int]]:
    """从权威文档解析颜色 token 与字号阶梯。"""
    colors: dict[str, str] = {}
    sizes: dict[str, int] = {}
    for line in doc.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        color = COLOR_ROW.match(stripped)
        if color:
            colors[color.group(1)] = color.group(2).upper()
            continue
        type_row = TYPE_ROW.match(stripped)
        if type_row:
            sizes[type_row.group(1)] = int(type_row.group(2))
    if not colors:
        report.error(f"从 {doc.name} 里解析不到任何颜色 token——文档结构变了？")
    if not sizes:
        report.error(f"从 {doc.name} 里解析不到字号阶梯——文档结构变了？")
    return colors, sizes


def load_json(path: Path, report: Report) -> dict:
    if not path.is_file():
        report.error(f"缺少机器可读副本：{path.relative_to(PROJECT)}")
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        report.error(f"tokens.json 解析失败：{exc}")
        return {}


def compare(doc_colors: dict, doc_sizes: dict, data: dict, report: Report) -> None:
    json_colors: dict = data.get("colors", {})
    for name, value in sorted(doc_colors.items()):
        if name not in json_colors:
            report.error(f"{name} 在文档里是 {value}，但 tokens.json 里没有这个 token")
        elif str(json_colors[name]).upper() != value:
            report.error(f"{name} 值不一致：文档 {value} vs tokens.json {json_colors[name]}")
    for name in sorted(set(json_colors) - set(doc_colors)):
        report.error(f"{name} 只存在于 tokens.json，文档里没有——请先写进契约再落地到引擎")
    for name, value in json_colors.items():
        if not HEX.match(str(value).upper()):
            report.error(f"{name} 的值 {value!r} 不是 #RRGGBB 格式")

    scale = data.get("typeScale", [])
    json_sizes = {row.get("token"): row.get("size") for row in scale}
    if [row.get("token") for row in scale] != EXPECTED_TYPE_LEVELS:
        report.error(f"字号阶梯必须恰好是 {EXPECTED_TYPE_LEVELS}，实际 {[r.get('token') for r in scale]}")
    for token, size in sorted(doc_sizes.items()):
        if token not in json_sizes:
            report.error(f"字号 {token} 在文档里是 {size}px，但 tokens.json 里没有")
        elif int(json_sizes[token]) != size:
            report.error(f"字号 {token} 不一致：文档 {size}px vs tokens.json {json_sizes[token]}px")


FULL_SCALE = [{"token": tok, "size": size} for tok, size in
              [("title-1", 28), ("title-2", 20), ("body", 15), ("caption", 13), ("number-lg", 32)]]
SHORT_SCALE = [{"token": tok, "size": size} for tok, size in
               [("title-1", 28), ("title-2", 20), ("body", 15)]]
# 文档 fixture 固定为 --a / --b 两个颜色（见 run_self_test），用例只改变 JSON 侧
SELF_TEST_CASES = [
    ("完全一致", {"--a": "#10161C", "--b": "#FFFFFF"}, FULL_SCALE, None),
    ("JSON 少一个 token", {"--a": "#10161C"}, FULL_SCALE, "但 tokens.json 里没有这个 token"),
    ("JSON 多一个 token", {"--a": "#10161C", "--b": "#FFFFFF", "--c": "#000000"}, FULL_SCALE, "只存在于 tokens.json"),
    ("值不一致", {"--a": "#10161C", "--b": "#EEEEEE"}, FULL_SCALE, "值不一致"),
    ("字号阶梯少一级", {"--a": "#10161C", "--b": "#FFFFFF"}, SHORT_SCALE, "字号阶梯必须恰好是"),
]


def run_self_test() -> int:
    print("[self-test] 用故意不一致的两份数据断言对账会失败（并断言错误类型）")
    failures = 0
    for label, colors, scale, expect in SELF_TEST_CASES:
        doc_colors = {"--a": "#10161C", "--b": "#FFFFFF"}
        doc_sizes = {"title-1": 28, "title-2": 20, "body": 15, "caption": 13, "number-lg": 32}
        report = Report()
        compare(doc_colors, doc_sizes, {"colors": colors, "typeScale": scale}, report)
        if expect is None:
            hit = not report.errors
            detail = "无报错（期望）" if hit else report.errors[0]
        else:
            # 必须命中**指定类别**的报错：只断言"有错"会让用例因无关错误而假通过（本项目踩过两次）
            matched = [e for e in report.errors if expect in e]
            hit = bool(matched)
            detail = matched[0] if matched else f"未命中「{expect}」；实际：{report.errors or '无'}"
        ok = hit if expect is not None else hit   # 两种情形都要求 hit 为真（一致用例的 hit 即"无报错"）
        failures += 0 if ok else 1
        print(f"  [{'OK  ' if ok else 'MISS'}] {label} → {'期望一致' if expect is None else '期望失败'}；实际：{detail}")
    if failures:
        print(f"[self-test] FAIL：{failures}/{len(SELF_TEST_CASES)} 个用例不符预期")
        return 1
    print(f"[self-test] PASS：{len(SELF_TEST_CASES)}/{len(SELF_TEST_CASES)} 个用例符合预期")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="对账 docs/04 与 game/data/tokens.json")
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()

    if not DOC.is_file():
        print(f"用法错误：找不到权威文档 {DOC}", file=sys.stderr)
        return 2
    if args.self_test:
        code = run_self_test()
        if code != 0:
            return code

    report = Report()
    doc_colors, doc_sizes = parse_doc(DOC, report)
    data = load_json(JSON_PATH, report)
    if data:
        compare(doc_colors, doc_sizes, data, report)

    print(f"[token 对账] 权威：{DOC.relative_to(PROJECT)} ｜ 投影：{JSON_PATH.relative_to(PROJECT)}")
    print(f"  颜色 token {len(doc_colors)} 个 ｜ 字号 {len(doc_sizes)} 级")
    for warning in report.warnings:
        print(f"  [WARN] {warning}")
    if report.errors:
        for error in report.errors:
            print(f"  [ERR ] {error}")
        print(f"token 对账：FAIL（{len(report.errors)} 项）")
        return 1
    print("token 对账：PASS（文档与引擎取值完全一致）")
    return 0


if __name__ == "__main__":
    sys.exit(main())
