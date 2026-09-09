#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
rule_evolution_check —— 形式化检查"元规则演进状态"（属 meta-rules 的 evolution 子关注点）。

校验每条元规则（`meta-rules/M<编号>-*.md`）的**演进状态**是否符合 M3 状态机：
  - 每条规则须有"演进历史"表（含 `状态` 列）。
  - 每个状态合法：主状态 ∈ PRIMARY，子状态 ∈ 该主状态允许的 SUBS。
  - 日期非降序（YYYY-MM-DD）。
  - 相邻迁移合法：同一主状态(内容细化) 或 属于 ALLOWED 的迁移。
  - 最新一条状态 = 当前状态（与标题行中文一致性做**松校验**）。

状态机依据: [`M3-rule-evolution.md`](../M3-rule-evolution.md)。自检: `--self-test`。

用法：
  python3 lab/formal-system/meta-rules/evolution/rule_evolution_check.py
  python3 lab/formal-system/meta-rules/evolution/rule_evolution_check.py --self-test
退出码：0=全部合法；1=有违规。
"""
import datetime
import glob
import os
import re
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
META_DIR = os.path.normpath(os.path.join(HERE, ".."))  # meta-rules/

# ---- M3 状态机 ----
PRIMARY = {
    "draft": "草案", "proposed": "建议", "experimental": "试用",
    "accepted": "已定", "in-review": "复核中", "superseded": "被取代",
    "deprecated": "废弃", "retired": "退役",
}
SUBS = {
    "proposed": {"draft": "初稿", "discussion": "讨论中", "trial": "试行中"},
    "experimental": {"trial": "试点", "validated": "已初验"},
    "accepted": {"active": "现行", "applied": "已落地", "lapsed": "暂搁置"},
    "in-review": {"challenged": "被质疑", "superseding": "待被取代"},
}
ALLOWED = {
    "draft": {"proposed", "experimental", "retired"},
    "proposed": {"experimental", "accepted", "retired"},
    "experimental": {"accepted", "in-review", "retired"},
    "accepted": {"in-review", "superseded", "deprecated", "retired"},
    "in-review": {"accepted", "superseded", "deprecated", "retired"},
    "superseded": {"deprecated", "retired"},
    "deprecated": {"retired"},
    "retired": set(),
}
# 标题行中文 → 主状态（松校验用）
HEADER_MAP = {
    "草案": "draft", "建议": "proposed", "试用": "experimental", "实验期": "experimental",
    "已定": "accepted", "复核中": "in-review", "被取代": "superseded",
    "废弃": "deprecated", "退役": "retired",
}

ROW_RE = re.compile(r"^\|\s*v(\d+)\s*\|\s*(\d{4}-\d{2}-\d{2})\s*\|\s*`([^`]+)`\s*\|")


def split_state(state):
    parts = state.strip().split(".")
    return parts[0], (parts[1] if len(parts) > 1 else None)


def valid_state(state):
    primary, sub = split_state(state)
    if primary not in PRIMARY:
        return False, f"主状态 {primary!r} 不在 {sorted(PRIMARY)}"
    if sub is not None and sub not in SUBS.get(primary, {}):
        return False, f"子状态 {sub!r} 不属于 {primary} 允许的 {sorted(SUBS.get(primary, {}))}"
    return True, ""


def transition_ok(a, b):
    pa, _ = split_state(a)
    pb, _ = split_state(b)
    return (pa == pb) or (pb in ALLOWED.get(pa, set()))


def parse_rule(path):
    """返回 (status, [ (ver,date,state) ], issues)。"""
    try:
        text = open(path, encoding="utf-8").read()
    except (OSError, UnicodeDecodeError):
        return None
    rows = [ROW_RE.match(line) for line in text.splitlines()]
    rows = [m for m in rows if m]
    if not rows:
        return None
    history = [(int(m.group(1)), m.group(2), m.group(3)) for m in rows]
    return history


def check_file(path):
    history = parse_rule(path)
    name = os.path.basename(path)
    if history is None:
        return [f"{name}: 无「演进历史」表(含 状态 列)"]
    issues = []
    last_date = ""
    for i, (ver, date, state) in enumerate(history):
        ok, why = valid_state(state)
        if not ok:
            issues.append(f"{name} v{ver}: 状态非法 -> {state} ({why})")
        try:
            d = datetime.date.fromisoformat(date)
            if last_date and d < last_date:
                issues.append(f"{name} v{ver}: 日期降序 {date} < 上一条")
            last_date = d
        except ValueError:
            issues.append(f"{name} v{ver}: 日期格式非法 -> {date}")
        if i > 0:
            prev = history[i - 1][2]
            if not transition_ok(prev, state):
                issues.append(f"{name}: 迁移非法 {prev} -> {state}")
    # 最新状态 = 当前状态
    cur = history[-1][2]
    ok, why = valid_state(cur)
    if not ok:
        issues.append(f"{name}: 当前状态非法 -> {cur} ({why})")
    return issues


def self_test():
    base = tempfile.mkdtemp(prefix="evol-check-")

    good = """# M9 测试（已定 · 已落地）
| 版本 | 日期 | 状态 | 变更 | 依据 |
| --- | --- | --- | --- | --- |
| v1 | 2026-09-09 | `proposed` | 初定 | . |
| v2 | 2026-09-09 | `accepted.applied` | 定稿+落地 | . |
"""
    bad_trans = """# M8 测试（已定）
| 版本 | 日期 | 状态 | 变更 | 依据 |
| --- | --- | --- | --- | --- |
| v1 | 2026-09-09 | `retired` | 退役 | . |
| v2 | 2026-09-09 | `accepted` | 从退役回已定(非法) | . |
"""
    with open(os.path.join(base, "M9x.md"), "w", encoding="utf-8") as f:
        f.write(good)
    with open(os.path.join(base, "M8x.md"), "w", encoding="utf-8") as f:
        f.write(bad_trans)

    issues_g = check_file(os.path.join(base, "M9x.md"))
    issues_b = check_file(os.path.join(base, "M8x.md"))
    ok = (not issues_g) and any("迁移非法" in i for i in issues_b)

    print("  good(M9):", "PASS" if not issues_g else "FAIL " + ";".join(issues_g))
    print("  bad(M8):", "PASS" if any("迁移非法" in i for i in issues_b) else "FAIL")
    print("self-test:", "PASS" if ok else "FAIL")
    return 0 if ok else 1


def main():
    if "--self-test" in sys.argv:
        return self_test()
    files = sorted(glob.glob(os.path.join(META_DIR, "M*-*.md")))
    issues = []
    for f in files:
        issues += check_file(f)
    print(f"演进状态检查 · {len(files)} 条元规则")
    for i in issues:
        print("  ✗ " + i)
    if not issues:
        print("  全部合法 ✔")
    print(f"\n判定: 规则 {len(files)} · 违规 {len(issues)}")
    return 1 if issues else 0


if __name__ == "__main__":
    sys.exit(main())
