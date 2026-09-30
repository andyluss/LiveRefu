#!/usr/bin/env python3
"""文件预算闸门：把"一个文件只做一件事"变成会让构建失败的门槛。

为什么需要（来自既有教训）：AI 高产时最容易发生的是**单文件膨胀**，
而膨胀的文件在评审时看不出问题、在一年后无法维护。规则来自
projects/refu-game-001（核心 ≤50 代码行 / 界面 ≤100 代码行），本项目沿用并略作收紧。

口径: 只统计**代码行**（去掉空行与以 # 开头的注释行），同时保留物理行上限兜底，
      避免用注释把文件撑大却不触发预算。

分级预算:
    scripts/core/**  ≤ 50 代码行（纯逻辑：必须能被无头驱动与断言）
    scripts/app/**   ≤ 100 代码行（界面与装配）
    scripts/view/**  ≤ 100 代码行（只画不改状态）
    scripts/autoload/** ≤ 60 代码行
    scenes/tools/**.gd  ≤ 50 代码行（无头探针与用例）
    其它 .py/.gd 无预算（工具与一次性脚本）

用法:
    python3 tools/check_file_size.py            # 校验
    python3 tools/check_file_size.py --self-test  # 先自检（负向用例）
退出码: 0 = 通过; 1 = 有超预算文件
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
PROJECT = HERE.parent
GAME = PROJECT / "game"

# (相对 game/ 的前缀, 代码行上限, 说明)
BUDGETS: list[tuple[str, int, str]] = [
    ("scripts/core/", 50, "纯逻辑"),
    ("scripts/app/", 100, "界面与装配"),
    ("scripts/view/", 100, "表现层"),
    ("scripts/autoload/", 60, "全局数据"),
    ("scenes/tools/", 50, "无头探针与用例"),
]
PHYSICAL_MULTIPLIER = 3  # 物理行兜底＝代码行上限 × 3


def code_lines(path: Path) -> tuple[int, int]:
    """返回 (代码行数, 物理行数)。"""
    physical = 0
    code = 0
    for raw in path.read_text(encoding="utf-8", errors="replace").splitlines():
        physical += 1
        stripped = raw.strip()
        if not stripped or stripped.startswith("#"):
            continue
        code += 1
    return code, physical


def budget_for(rel: str) -> tuple[int, str] | None:
    for prefix, limit, note in BUDGETS:
        if rel.startswith(prefix):
            return limit, note
    return None


def scan() -> tuple[list[str], int]:
    violations: list[str] = []
    checked = 0
    for path in sorted(GAME.rglob("*.gd")):
        rel = path.relative_to(GAME).as_posix()
        budget = budget_for(rel)
        if budget is None:
            continue
        limit, note = budget
        code, physical = code_lines(path)
        checked += 1
        if code > limit:
            violations.append(f"{rel}: {code} 代码行 > 上限 {limit}（{note}）")
        elif physical > limit * PHYSICAL_MULTIPLIER:
            violations.append(
                f"{rel}: {physical} 物理行 > 兜底 {limit * PHYSICAL_MULTIPLIER}（{note}；代码行 {code} 未超）"
            )
    return violations, checked


def run_self_test() -> int:
    """用临时文件断言"超预算会被抓到、合规不会误报"。"""
    print("[self-test] 断言预算检查器能抓超限、且不误报合规文件")
    import tempfile

    cases = [
        ("合规：40 代码行", 40, 50, False),
        ("超限：51 代码行", 51, 50, True),
        ("兜底：注释撑到 200 物理行但代码 10 行", 10, 50, True),
    ]
    failures = 0
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        for label, n_code, limit, expect_violation in cases:
            path = root / "sample.gd"
            body = "\n".join(f"var v{i} = {i}" for i in range(n_code))
            if "注释撑到" in label:
                body = body + "\n" + "\n".join("# 注释" for _ in range(190))
            path.write_text(body, encoding="utf-8")
            code, physical = code_lines(path)
            violated = code > limit or physical > limit * PHYSICAL_MULTIPLIER
            ok = violated == expect_violation
            failures += 0 if ok else 1
            print(
                f"  [{'OK  ' if ok else 'MISS'}] {label} → 代码 {code} / 物理 {physical} / 期望违规={expect_violation} / 判定={violated}"
            )
    if failures:
        print(f"[self-test] FAIL：{failures}/{len(cases)} 个用例不符预期")
        return 1
    print(f"[self-test] PASS：{len(cases)}/{len(cases)} 个用例符合预期")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="校验 future-debris 文件预算")
    parser.add_argument("--self-test", action="store_true", help="先跑检查器自检")
    args = parser.parse_args()

    if args.self_test:
        code = run_self_test()
        if code != 0:
            return code

    violations, checked = scan()
    print(f"[文件预算] 检查 {checked} 个 .gd 文件")
    for line in BUDGETS:
        print(f"  - {line[0]}** ≤ {line[1]} 代码行（{line[2]}）")
    if violations:
        for v in violations:
            print(f"  [ERR ] {v}")
        print(f"文件预算：FAIL（{len(violations)} 个文件超预算）")
        return 1
    print(f"文件预算：PASS（{checked} 个文件全部在预算内）")
    return 0


if __name__ == "__main__":
    sys.exit(main())
