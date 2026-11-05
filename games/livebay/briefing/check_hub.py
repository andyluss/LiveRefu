#!/usr/bin/env python3
"""check_hub.py —— 核对 LiveBay HUB 里的数字与工程实际是否一致，并检查素材存在。

数字来源全部现读：data/*.json、run_sim.gd、test_expansions.gd、design01 HTML、CHANGELOG。
HUB 里要核对的数字写成 <span data-fact="towers">3</span>；同一 fact 可多次出现。
推导不出真实值时直接报错，绝不静默跳过。

用法：
    python3 briefing/check_hub.py
    python3 briefing/check_hub.py --self-test
"""
import json
import pathlib
import re
import sys

HERE = pathlib.Path(__file__).resolve().parent
FD = HERE.parent
DATA = FD / "game/data"
HUB = HERE / "HUB.html"


def parse_hub_facts(html: str) -> dict:
    out = {}
    for name, value in re.findall(r'data-fact="([a-z0-9_]+)"\s*>([^<]*)<', html):
        out.setdefault(name, []).append(value.strip())
    return out


def compare(facts: dict, hub: dict) -> list:
    problems = []
    for name, values in sorted(hub.items()):
        real = facts.get(name)
        if real is None:
            problems.append(f'data-fact="{name}" 在 HUB 里出现，但检查器不知道它的真实来源')
            continue
        for v in values:
            if v != str(real):
                problems.append(f'data-fact="{name}"：页面写 {v}，实际是 {real}')
    for name in sorted(facts):
        if name not in hub:
            problems.append(f'真实值 {name}={facts[name]} 未出现在 HUB 里')
    return problems


def check_assets(html: str, base: pathlib.Path) -> list:
    problems = []
    for ref in re.findall(r'(?:src|poster)="([^"]+)"', html):
        if ref.startswith(("http://", "https://", "data:")):
            continue
        if not (base / ref).exists():
            problems.append(f"素材缺失：{ref}")
    return problems


def _load(name):
    p = DATA / name
    if not p.exists():
        return None
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except Exception:
        return None


def _check_count(path: pathlib.Path):
    if not path.exists():
        return None
    src = path.read_text(encoding="utf-8")
    n = len(re.findall(r"\b_check\(", src))
    return n - 1 if "func _check(" in src else n


def derive_facts():
    facts, problems = {}, []
    towers = _load("towers.json")
    enemies = _load("enemies.json")
    waves = _load("waves.json")
    mapdata = _load("map_bay01.json")
    for key, value in (("towers", towers), ("enemies", enemies), ("waves", waves)):
        if isinstance(value, list):
            facts[key] = len(value)
        else:
            problems.append(f"无法从 data/{key}.json 推导 {key}")
    if isinstance(mapdata, dict) and isinstance(mapdata.get("slots"), list):
        facts["slots"] = len(mapdata["slots"])
    else:
        problems.append("无法从 map_bay01.json 推导 slots")
    maps = list(DATA.glob("map_*.json"))
    facts["maps"] = len(maps) if maps else 0
    professions = list(DATA.glob("profession_*.json"))
    facts["professions"] = len(professions) if professions else 0
    packs = list((FD / "game/expansions").glob("*/pack.json"))
    facts["l1_variants"] = len(packs) if packs else 0

    tests = _check_count(FD / "game/tests/run_sim.gd")
    if tests is not None:
        facts["tests"] = tests
    else:
        problems.append("找不到 game/tests/run_sim.gd")
    exp = _check_count(FD / "game/tests/test_expansions.gd")
    if exp is not None:
        facts["expansions"] = exp
    else:
        problems.append("找不到 game/tests/test_expansions.gd")

    html_pages = list((FD / "docs-ai/design01/html").rglob("*.html"))
    facts["doc_pages"] = len(html_pages)

    changelog = FD / "CHANGELOG.md"
    if changelog.exists():
        m = re.search(r"^## \[([0-9.]+)\]", changelog.read_text(encoding="utf-8"), re.M)
        if m:
            facts["version"] = m.group(1)
        else:
            problems.append("CHANGELOG 找不到版本头")
    else:
        problems.append("找不到 CHANGELOG.md")
    return facts, problems


def self_test() -> int:
    cases = [
        ("解析正常", lambda: parse_hub_facts('<i data-fact="towers">3</i>') == {"towers": ["3"]}, True),
        ("同 fact 多处", lambda: parse_hub_facts('<i data-fact="towers">3</i><i data-fact="towers">3</i>') == {"towers": ["3", "3"]}, True),
        ("比对一致", lambda: compare({"towers": 3}, {"towers": ["3"]}) == [], True),
        ("比对不符", lambda: compare({"towers": 3}, {"towers": ["4"]}) == [], False),
        ("同 fact 只改一处", lambda: compare({"towers": 3}, {"towers": ["3", "4"]}) == [], False),
        ("无来源 fact", lambda: compare({}, {"x": ["1"]}) == [], False),
        ("真实值缺失", lambda: compare({"towers": 3}, {}) == [], False),
        ("素材缺失", lambda: check_assets('<img src="nope.png">', pathlib.Path("/nope")) == [], False),
        ("外链跳过", lambda: check_assets('<img src="https://x/y.png">', pathlib.Path("/nope")) == [], True),
    ]
    passed = 0
    for name, fn, expect_ok in cases:
        try:
            got = fn()
        except Exception as exc:
            got = exc
        ok = (got is True) if expect_ok else (got is False)
        passed += 1 if ok else 0
        print(f"  {'✓' if ok else '✗'} {name}")
    print(f"[self-test] {'PASS' if passed == len(cases) else 'FAIL'}：{passed}/{len(cases)}")
    return 0 if passed == len(cases) else 1


def main() -> int:
    if "--self-test" in sys.argv:
        return self_test()
    if not HUB.exists():
        print(f"FAIL 找不到 {HUB}")
        return 1
    facts, problems = derive_facts()
    hub = parse_hub_facts(HUB.read_text(encoding="utf-8"))
    problems += compare(facts, hub)
    problems += check_assets(HUB.read_text(encoding="utf-8"), HUB.parent)
    if problems:
        print("HUB 检查失败：")
        for p in problems:
            print("  -", p)
        return 1
    print(f"HUB 检查通过：{len(hub)} 个 fact / {len(facts)} 个真实值")
    print("  " + " · ".join(f"{k}={facts[k]}" for k in sorted(facts)))
    return 0


if __name__ == "__main__":
    sys.exit(main())
