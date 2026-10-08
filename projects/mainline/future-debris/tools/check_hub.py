#!/usr/bin/env python3
"""check_hub —— 核对「给人看的 HUB 页面」里的数字与工程实际是否一致，并检查素材是否存在。

为什么需要它：
    HUB 里的数字（120 卡 / 16 关 / 43 用例…）**一定会过期**。而"页面写着 120 卡、实际已经 150 卡"
    这种偏差**没有任何东西会发现**——这正是本项目反复栽过的同一类坑（文档与实现脱钩）。
    所以让 HUB 要么是准的，要么报错。

核对来源（都从工程里现读，不手写）：
    cards/levels/rules/factions/relics/modes ← game/data/tables/*.json 的 entries
    chapters                                 ← levels.json 里 chapter 的去重数
    gates                                    ← run.sh 里的 "── N/8" 步数标记
    cases                                    ← case_list.gd 的 CaseList.ALL 元素数

约定：HUB 里要核对的数字写成 <span data-fact="cards">120</span> 的形式；
      **同一个 fact 可以出现多次，每一次都会被核对**（防止改了一处漏了另一处）。
      推导不出真实值时**报错而不是跳过**——"查不到"不能等于"没问题"（本项目的静默失效教训）。

用法：
    python3 tools/check_hub.py              # 检查
    python3 tools/check_hub.py --self-test  # 自检（喂已知坏数据，确认它会失败）
"""

import json
import pathlib
import re
import sys

HERE = pathlib.Path(__file__).resolve().parent
FD = HERE.parent                 # future-debris/
MAINLINE = FD.parent             # mainline/
HUB = MAINLINE / "HUB.html"
TABLES = FD / "game/data/tables"
RUN_SH = FD / "run.sh"
CASE_LIST = FD / "game/scenes/tools/cases/case_list.gd"

# ── 纯函数（自检直接喂它们坏数据）────────────────────────────────────────


def parse_hub_facts(html: str) -> dict:
    """从 HUB 里取出 {fact: [值, ...]}；同一 fact 的多次出现全部保留。"""
    out = {}
    for name, value in re.findall(r'data-fact="([a-z]+)"\s*>([^<]*)<', html):
        out.setdefault(name, []).append(value.strip())
    return out


def compare(facts: dict, hub: dict) -> list:
    """返回问题列表。facts=真实值(str)，hub={fact:[页面值,...]}"""
    problems = []
    for name, values in sorted(hub.items()):
        real = facts.get(name)
        if real is None:
            problems.append(f'data-fact="{name}" 在 HUB 里出现，但检查器不知道它的真实来源（别写没来源的数字）')
            continue
        for v in values:
            if v != str(real):
                problems.append(f'data-fact="{name}"：页面写 {v}，实际是 {real}')
    for name in sorted(facts):
        if name not in hub:
            problems.append(f'真实值 {name}={facts[name]} 未出现在 HUB 里（可能被删漏了）')
    return problems


def check_assets(html: str, base: pathlib.Path) -> list:
    """HUB 引用的本地素材必须存在。"""
    problems = []
    for ref in re.findall(r'(?:src|poster)="([^"]+)"', html):
        if ref.startswith(("http://", "https://", "data:")):
            continue
        if not (base / ref).exists():
            problems.append(f"素材缺失：{ref}")
    return problems


# ── 真实值推导 ────────────────────────────────────────────────────────────


def _entries(path: pathlib.Path):
    if not path.exists():
        return None
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None
    e = data.get("entries")
    return e if isinstance(e, list) else None


def derive_facts():
    """返回 (facts, problems)。推导不出的一律记入 problems，绝不静默跳过。"""
    facts, problems = {}, []

    for key in ("cards", "levels", "rules", "factions", "relics", "modes"):
        e = _entries(TABLES / f"{key}.json")
        if e is None:
            problems.append(f"无法从 tables/{key}.json 推导 {key}（文件缺失或结构不符）")
        else:
            facts[key] = len(e)

    e = _entries(TABLES / "levels.json")
    if e is None:
        problems.append("无法从 tables/levels.json 推导 chapters")
    else:
        facts["chapters"] = len({x.get("chapter") for x in e if isinstance(x, dict)})

    if RUN_SH.exists():
        facts["gates"] = len(re.findall(r"── \d+/\d+", RUN_SH.read_text(encoding="utf-8")))
    else:
        problems.append("找不到 run.sh，无法推导 gates")

    if CASE_LIST.exists():
        src = CASE_LIST.read_text(encoding="utf-8")
        body = src.split("const ALL := [", 1)[-1].rsplit("]", 1)[0]
        facts["cases"] = len(re.findall(r'^\s*\["', body, re.M))
    else:
        problems.append("找不到 case_list.gd，无法推导 cases")

    return facts, problems


# ── 自检 ──────────────────────────────────────────────────────────────────


def self_test() -> int:
    print("负向自检：给判定逻辑喂已知坏数据，确认它们会失败\n")
    cases = [
        ("解析（正常）", lambda: parse_hub_facts('<i data-fact="cards">120</i>') == {"cards": ["120"]}, True),
        ("解析（同一 fact 多次）",
         lambda: parse_hub_facts('<i data-fact="cards">120</i><i data-fact="cards">120</i>') == {"cards": ["120", "120"]}, True),
        ("比对（一致）", lambda: compare({"cards": 120}, {"cards": ["120"]}) == [], True),
        ("比对（数字不符）", lambda: compare({"cards": 120}, {"cards": ["150"]}) == [], False),
        ("比对（同 fact 多处、只改一处）",
         lambda: compare({"cards": 120}, {"cards": ["120", "150"]}) == [], False),
        ("比对（页面写了无来源的 fact）", lambda: compare({}, {"whatever": ["1"]}) == [], False),
        ("比对（真实值未出现在页面）", lambda: compare({"cards": 120}, {}) == [], False),
        ("素材（不存在）", lambda: check_assets('<img src="nope.png">', pathlib.Path("/definitely/not/here")) == [], False),
        ("素材（外部链接不检查）", lambda: check_assets('<img src="https://x/y.png">', pathlib.Path("/nope")) == [], True),
    ]
    passed = 0
    for name, fn, expect_ok in cases:
        try:
            got = fn()
        except Exception as exc:  # noqa: BLE001
            got = f"异常 {exc}"
            print(f"  ✗ {name}  {got}")
            continue
        ok = (got is True) if expect_ok else (got is False)
        if ok:
            passed += 1
        print(f"  {'✓' if ok else '✗'} {'对照' if expect_ok else '可捕获'}  {name}")
    print(f"\n[self-test] {'PASS' if passed == len(cases) else 'FAIL'}：{passed}/{len(cases)} 个用例符合预期")
    return 0 if passed == len(cases) else 1


# ── 主流程 ────────────────────────────────────────────────────────────────


def main() -> int:
    if "--self-test" in sys.argv:
        return self_test()

    if not HUB.exists():
        print(f"找不到 HUB 页面：{HUB}")
        return 1
    html = HUB.read_text(encoding="utf-8")

    facts, problems = derive_facts()
    problems += compare(facts, parse_hub_facts(html))
    problems += check_assets(html, HUB.parent)

    marked = sum(len(v) for v in parse_hub_facts(html).values())
    print(f"HUB 与工程对账：核对 {len(facts)} 个数字（页面共 {marked} 处标记）+ 素材存在性")
    if problems:
        print(f"\n[check_hub] FAIL：{len(problems)} 项不一致")
        for p in problems:
            print(f"  · {p}")
        print("\n  修法：改 HUB.html 里的数字，或改数据表；**不要让两者并存**。")
        return 1
    print(f"[check_hub] PASS：{len(facts)} 个数字与工程一致，素材齐全")
    return 0


if __name__ == "__main__":
    sys.exit(main())
