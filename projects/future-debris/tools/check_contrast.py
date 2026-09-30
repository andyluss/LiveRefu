#!/usr/bin/env python3
"""对比度闸门：把"颜色能不能看清"从肉眼判断变成可计算的断言。

为什么是这道闸门：对比度是**唯一可以纯计算判定**的无障碍维度（WCAG 2.1 公式确定），
因此它应该由机器守住，而不是靠"看起来还行"。

它断言两类东西：
  1. **对比度**：文字 token × 三种背景 ≥ 4.5:1；交互控件边框与语义色 × 三种背景 ≥ 3:1。
  2. **层级亮度顺序**：bg-base < bg-elev-1 < bg-elev-2、text-faint < text-dim < text、
     line < line-strong。
     为什么需要第 2 类：**只查对比度会漏掉"颜色达标但与相邻层级挤在一起、用户分不出主次"
     这种退化**——那是"通过了审计但变得难用"的典型形态。

设计 token 的**权威在 docs/04_视觉语言与设计token.md**；本脚本只执行它。
`--self-test` 会故意造出不达标与层级压平的组合，断言检查器真的会报错
（一个永远返回"通过"的检查器比没有检查器更糟）。

用法:
    python3 tools/check_contrast.py              # 校验
    python3 tools/check_contrast.py --self-test  # 先自检（负向用例），再校验
退出码: 0 = 通过; 1 = 有违规; 2 = 用法错误
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
PROJECT = HERE.parent
TOKEN_DOC = PROJECT / "docs" / "04_视觉语言与设计token.md"

BG_TOKENS = ["--bg-base", "--bg-elev-1", "--bg-elev-2"]
# 必须达到 4.5:1 的文字 token（--text-faint 是文字可访问性下限，刻意保留较弱但仍达标的取值）
TEXT_TOKENS = ["--text", "--text-dim", "--text-faint"]
# 必须达到 3:1 的非文字元素（WCAG 1.4.11：交互控件边界与图形对象）
UI_TOKENS = ["--line-strong", "--power", "--residue", "--accent", "--warn", "--ok"]

TEXT_MIN = 4.5
UI_MIN = 3.0

# 层级顺序：列表内必须严格递增（亮度）
HIERARCHIES = [
    ("背景层级", ["--bg-base", "--bg-elev-1", "--bg-elev-2"]),
    ("文字层级", ["--text-faint", "--text-dim", "--text"]),
    ("描边层级", ["--line", "--line-strong"]),
]
# 刻意的例外：--line 是**装饰**分隔线，不受 3:1 约束。
# 把它调亮能让审计更好看，却会让界面又脏又吵——那是"为了通过审计而破坏设计"。
DECORATIVE = {"--line"}


def parse_tokens(doc: Path) -> dict[str, str]:
    """从 token 契约文档的表格里读出 `token | 值` 对。"""
    tokens: dict[str, str] = {}
    pattern = re.compile(r"^\|\s*(`(--[a-z0-9-]+)`)\s*\|\s*`(#[0-9A-Fa-f]{6})`")
    for line in doc.read_text(encoding="utf-8").splitlines():
        match = pattern.match(line.strip())
        if match:
            tokens[match.group(2)] = match.group(3).upper()
    return tokens


def srgb_to_linear(channel: float) -> float:
    return channel / 12.92 if channel <= 0.04045 else ((channel + 0.055) / 1.055) ** 2.4


def relative_luminance(hex_color: str) -> float:
    value = hex_color.lstrip("#")
    r, g, b = (int(value[i : i + 2], 16) / 255.0 for i in (0, 2, 4))
    return 0.2126 * srgb_to_linear(r) + 0.7152 * srgb_to_linear(g) + 0.0722 * srgb_to_linear(b)


def contrast_ratio(fg: str, bg: str) -> float:
    l1, l2 = relative_luminance(fg), relative_luminance(bg)
    lighter, darker = max(l1, l2), min(l1, l2)
    return (lighter + 0.05) / (darker + 0.05)


class Report:
    def __init__(self) -> None:
        self.errors: list[str] = []
        self.rows: list[tuple[str, str, float, float]] = []

    def check(self, fg: str, bg: str, minimum: float, fg_value: str, bg_value: str) -> None:
        ratio = contrast_ratio(fg_value, bg_value)
        self.rows.append((fg, bg, ratio, minimum))
        if ratio < minimum:
            self.errors.append(f"{fg} on {bg}: {ratio:.2f}:1 < {minimum}:1（{fg_value} on {bg_value}）")


def run_checks(tokens: dict[str, str], report: Report) -> None:
    for fg in TEXT_TOKENS:
        for bg in BG_TOKENS:
            report.check(fg, bg, TEXT_MIN, tokens[fg], tokens[bg])
    for fg in UI_TOKENS:
        for bg in BG_TOKENS:
            report.check(fg, bg, UI_MIN, tokens[fg], tokens[bg])
    for label, chain in HIERARCHIES:
        values = [(name, relative_luminance(tokens[name])) for name in chain]
        for (name_a, lum_a), (name_b, lum_b) in zip(values, values[1:]):
            if lum_a >= lum_b:
                report.errors.append(
                    f"{label}被压平：{name_a}({lum_a:.4f}) 应暗于 {name_b}({lum_b:.4f})"
                )


SELF_TEST_CASES = [
    ("文字对比度不足", {"--text": "#2A3742"}, "1.49:1", True, "--text on --bg-base = 1.49:1"),
    ("背景层级被压平", {"--bg-elev-2": "#10161C"}, "背景层级被压平", True, "背景层级被压平"),
    ("文字层级被压平", {"--text-dim": "#F3EDE1"}, "文字层级被压平", True, "文字层级被压平"),
    ("合规取值不应误报", {}, None, False, "无任何报错"),
]


def run_self_test(tokens: dict[str, str]) -> int:
    print("[self-test] 用故意不合格的 token 与合规 token 断言检查器行为")
    failures = 0
    for label, overrides, expect, should_fail, expected_hit in SELF_TEST_CASES:
        mutated = dict(tokens)
        mutated.update(overrides)
        report = Report()
        run_checks(mutated, report)
        if expect is None:
            # 合规用例：命中条件是"没有任何报错"
            hit = not report.errors
        else:
            # 必须命中**指定类别**的报错，而不是"随便有个错就算过"——
            # 否则用例会因为另一条无关的报错而假通过（本脚本第一版就踩了这个坑）。
            hit = any(expect in e for e in report.errors)
        ok = hit == (not should_fail if expect is None else should_fail)
        failures += 0 if ok else 1
        if expect is None:
            detail = "无报错（期望）" if hit else (report.errors[0] if report.errors else "无报错")
        else:
            matched = [e for e in report.errors if expect in e]
            detail = matched[0] if matched else f"未命中「{expected_hit}」；实际报错：{report.errors or '无'}"
        print(f"  [{'OK  ' if ok else 'MISS'}] {label} → 期望{'失败' if should_fail else '通过'}；实际：{detail}")
    if failures:
        print(f"[self-test] FAIL：{failures}/{len(SELF_TEST_CASES)} 个用例不符预期")
        return 1
    print(f"[self-test] PASS：{len(SELF_TEST_CASES)}/{len(SELF_TEST_CASES)} 个用例符合预期")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="校验 future-debris 的视觉 token 契约")
    parser.add_argument("--self-test", action="store_true", help="先跑检查器自检")
    args = parser.parse_args()

    if not TOKEN_DOC.is_file():
        print(f"用法错误：找不到 token 契约文档 {TOKEN_DOC}", file=sys.stderr)
        return 2
    tokens = parse_tokens(TOKEN_DOC)
    required = set(BG_TOKENS) | set(TEXT_TOKENS) | set(UI_TOKENS) | set(DECORATIVE) | {"--line"}
    missing = sorted(required - set(tokens))
    if missing:
        print(f"用法错误：契约文档里读不到这些 token：{missing}", file=sys.stderr)
        return 2

    if args.self_test:
        code = run_self_test(tokens)
        if code != 0:
            return code

    report = Report()
    run_checks(tokens, report)
    print(f"[对比度] 源：{TOKEN_DOC.relative_to(PROJECT)}（{len(tokens)} 个 token）")
    for fg, bg, ratio, minimum in report.rows:
        mark = "ok " if ratio >= minimum else "BAD"
        print(f"  [{mark}] {fg:14s} on {bg:11s} {ratio:6.2f}:1  (需 ≥ {minimum}:1)")
    print(f"  装饰性分隔线不受 3:1 约束（刻意）：{', '.join(sorted(DECORATIVE))}")
    if report.errors:
        for error in report.errors:
            print(f"  [ERR ] {error}")
        print(f"对比度闸门：FAIL（{len(report.errors)} 项）")
        return 1
    print(f"对比度闸门：PASS（{len(report.rows)} 个组合全部达标，层级顺序正确）")
    return 0


if __name__ == "__main__":
    sys.exit(main())
