#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""verify_data.py —— 游戏数据表 ↔ 策划文档 的交叉校验。

动机：本项目的数据表要求"严格照文档数值"（见 docs/01_实现裁决记录.md A1）。
手抄会漂移，所以校验不是抽查而是逐字段比对——把 doc/refu-game-001/ 的
Markdown 表格当唯一真相，反向读出数字，再和 game/data/*.json 对齐。

检查项：
  1. 铁砧 12 卡：类型/槽位/费用 + 核心数值（伤害、攻速、射程、生命、溅射、穿透…）
  2. 敌方 6 原型：生命/攻击/攻速/移速/护甲/威胁值
  3. WAV-ANV-A：六波构成 + 每波威胁值 + 合计 B=158（= B_ref）
  4. 挑战卡 5 张：等级/难度分/掉落/评级（以 05 号文档取代口径为准）
  5. 地图卡：塔位数量、入口数、双入口标志（AST-01 的出图与卡表不一致，列为已知偏差 WARN）
  6. 规则卡 RUL-BASE：基地生命 20、起始能量 10

用法：
    python3 tools/verify_data.py            # 全量校验，输出 PASS/FAIL/WARN
    python3 tools/verify_data.py --quiet     # 只输出结论行
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = PROJECT_ROOT.parents[1]
DOC = REPO_ROOT / "doc" / "refu-game-001"
DATA = PROJECT_ROOT / "game" / "data"

# 已知偏差：出图与卡表不一致时在此登记（脚本输出 WARN，不 FAIL，但必须显式登记）
KNOWN_ART_DEVIATIONS = {
    ("MAP-AST-01", "slots_standard"): "出图画了 8 个标准位，19 号卡表写 10 个；M1 未使用该图，已记录待美术/策划对齐",
}

results: list[tuple[str, str, str]] = []  # (level, item, message)


def ok(item: str, msg: str = "") -> None:
    results.append(("PASS", item, msg))


def fail(item: str, msg: str) -> None:
    results.append(("FAIL", item, msg))


def warn(item: str, msg: str) -> None:
    results.append(("WARN", item, msg))


def load(name: str) -> dict:
    with (DATA / name).open(encoding="utf-8") as fp:
        return json.load(fp)


def doc(name: str) -> str:
    return (DOC / name).read_text(encoding="utf-8")


def nums(text: str) -> list[float]:
    return [float(x) for x in re.findall(r"-?\d+(?:\.\d+)?", text)]


def has_num(text: str, value: float | int) -> bool:
    return any(abs(n - float(value)) < 1e-6 for n in nums(text))


# ---------------------------------------------------------------- 1. 卡表
def check_cards() -> None:
    text = doc("数值/01_铁砧联邦_12卡.md")
    # 按 "### <id> <name>" 切块
    blocks = re.split(r"\n###\s+", text)[1:]
    doc_cards: dict[str, str] = {}
    for b in blocks:
        cid = b.split()[0]
        doc_cards[cid] = b

    cards = {c["id"]: c for c in load("cards.json")["cards"]}
    if set(cards) != set(doc_cards):
        fail("卡表.集合", f"JSON 与文档卡号不一致：JSON多{set(cards)-set(doc_cards)} 文档多{set(doc_cards)-set(cards)}")
        return

    for cid in sorted(doc_cards):
        b = doc_cards[cid]
        c = cards[cid]
        # 费用："类型 / 槽位 / 费用 | 塔卡 / 标准槽 / 20"
        m = re.search(r"\|\s*([^|]+)/\s*([^|]+)/\s*(\d+)\s*\|", b)
        if m:
            slot_cn, cost = m.group(2).strip(), int(m.group(3))
            slot_map = {"标准槽": "standard", "支援槽": "support", "路径": "path",
                        "修饰槽": "modifier", "—": "none"}
            if slot_map.get(slot_cn) != c["slot"]:
                fail(f"{cid}.槽位", f"文档 {slot_cn} → JSON {c['slot']}")
            if cost != c["cost"]:
                fail(f"{cid}.费用", f"文档 {cost} → JSON {c['cost']}")

        stats_line = re.search(r"\|\s*核心数值\s*\|\s*([^|]+)\|", b)
        if not stats_line:
            fail(f"{cid}.核心数值", "文档里找不到核心数值行")
            continue
        line = stats_line.group(1)
        st = c["stats"]
        checks: list[tuple[str, str, float | int | None]] = []
        for label, key in [("伤害", "damage"), ("攻速", "attack_speed"), ("生命", "max_hp")]:
            mm = re.search(label + r"\s*([\d.]+)", line)
            if mm:
                checks.append((label, key, float(mm.group(1))))
        if "溅射" in line:
            mm = re.search(r"溅射(?:半径)?\s*([\d.]+)", line)
            if mm:
                checks.append(("溅射", "splash", float(mm.group(1))))
        if "穿透" in line:
            mm = re.search(r"穿透\s*([\d.]+)", line)
            if mm:
                checks.append(("穿透", "pierce", float(mm.group(1))))
        if "射程" in line:
            mm = re.search(r"射程\s*([\d.]+)", line)
            if mm:
                checks.append(("射程", "range", float(mm.group(1))))
        for label, key, expect in checks:
            actual = st.get(key)
            if actual is None or abs(float(actual) - expect) > 1e-6:
                fail(f"{cid}.{label}", f"文档 {expect} → JSON {actual}")
        # 标签
        tag_line = re.search(r"\|\s*标签\s*\|\s*([^|]+)\|", b)
        if tag_line:
            doc_tags = [t.strip() for t in re.split(r"[/、]", tag_line.group(1).strip()) if t.strip()]
            if sorted(doc_tags) != sorted(c["tags"]):
                fail(f"{cid}.标签", f"文档 {doc_tags} → JSON {c['tags']}")
    ok("卡表.铁砧 12 卡", f"{len(cards)} 张逐字段比对")

    # 羁绊（14 号卡表第五节）
    t14 = doc("14_卡表_铁砧联邦核心12卡.md")
    bonds = {b["name"]: b for b in load("cards.json")["bonds"]}
    for name, tag, cnt in [("火力网", "弹药", 3), ("加固阵列", "工事", 2), ("后勤链", "维修", 2)]:
        if name not in bonds:
            fail(f"羁绊.{name}", "JSON 缺失")
            continue
        cond = bonds[name]["condition"]
        if cond["tag"] != tag or cond["count"] != cnt:
            fail(f"羁绊.{name}", f"文档 {tag}×{cnt} → JSON {cond}")
        elif name not in t14:
            fail(f"羁绊.{name}", "14 号卡表里找不到该羁绊名")
    ok("羁绊.三条", "火力网 / 加固阵列 / 后勤链")


# ---------------------------------------------------------------- 2. 敌人
def check_enemies() -> None:
    text = doc("数值/04_敌人数值与波次威胁值.md")
    rows = re.findall(r"^\|\s*(小兵|快速|装甲|空中|精英|BOSS)\s*\|(.+)\|\s*$", text, re.M)
    if len(rows) != 6:
        fail("敌人.表格", f"文档里解析到 {len(rows)} 行，期望 6 行")
        return
    enemies = {e["name"]: e for e in load("enemies.json")["enemies"]}
    # 表格列：生命 | 攻击 | 攻速 | 移速 | 护甲 | 特性 | 威胁值
    fields = ["hp", "attack", "attack_speed", "speed", "armor", "threat"]
    for name, rest in rows:
        cells = [c.strip() for c in rest.split("|")]
        while cells and cells[-1] == "":
            cells.pop()
        picked = [cells[0], cells[1], cells[2], cells[3], cells[4], cells[6]]
        vals = [float(re.match(r"-?[\d.]+", c).group(0)) for c in picked]
        e = enemies.get(name)
        if e is None:
            fail(f"敌人.{name}", "JSON 缺失")
            continue
        for key, v in zip(fields, vals):
            if abs(float(e[key]) - v) > 1e-6:
                fail(f"敌人.{name}.{key}", f"文档 {v} → JSON {e[key]}")
    ok("敌人.6 原型", "生命/攻击/攻速/移速/护甲/威胁值 逐字段比对")


# ---------------------------------------------------------------- 3. 波次
def check_waves() -> None:
    text = doc("18_样例_关卡组装示例.md")
    # W1 小兵 ×8 → 16
    rows = re.findall(r"\|\s*W(\d)\s*\|\s*([^|]+?)\s*\|\s*(\d+)\s*\|", text)
    if len(rows) != 6:
        fail("波次.表格", f"18 号样例解析到 {len(rows)} 波，期望 6 波")
        return
    ws = load("waves.json")["wave_sets"]
    wave_set = next((w for w in ws if w["id"] == "WAV-ANV-A"), None)
    if wave_set is None:
        fail("波次.WAV-ANV-A", "JSON 缺失")
        return
    name_to_id = {"小兵": "grunt", "快速": "runner", "装甲": "armored",
                  "空中": "air", "精英": "elite", "BOSS": "boss"}
    total = 0
    for idx_s, comp_s, threat_s in rows:
        wave = wave_set["waves"][int(idx_s) - 1]
        expect: dict[str, int] = {}
        for part in comp_s.split("+"):
            mm = re.match(r"\s*([^\s×]+)\s*×\s*(\d+)\s*", part)
            if mm:
                expect[name_to_id[mm.group(1)]] = int(mm.group(2))
        actual = {c["enemy"]: c["count"] for c in wave["composition"]}
        if expect != actual:
            fail(f"波次.W{idx_s}", f"文档 {expect} → JSON {actual}")
        if int(threat_s) != wave["threat"]:
            fail(f"波次.W{idx_s}.威胁值", f"文档 {threat_s} → JSON {wave['threat']}")
        total += int(threat_s)
    if total != 158:
        fail("波次.合计", f"文档合计 {total} ≠ B_ref 158")
    if wave_set["total_threat"] != total:
        fail("波次.total_threat", f"JSON {wave_set['total_threat']} ≠ 逐波合计 {total}")
    ok("波次.WAV-ANV-A", f"6 波构成 + 威胁值，合计 B={total}（= B_ref）")


# ---------------------------------------------------------------- 4. 挑战卡
def check_challenges() -> None:
    c13 = doc("13_卡表_挑战卡样例.md")
    c05 = doc("数值/05_能量与关卡预算曲线.md")
    rows13 = re.findall(r"\|\s*(CHL-\d+)\s*\|\s*([^\s|]+)\s*\|\s*(\d+)\s*\|", c13)
    doc_ch = {cid: (name, int(lv)) for cid, name, lv in rows13}
    # 05 号文档：| 加压 | 1 | 3 | +15% | +15% |
    rows05 = re.findall(r"\|\s*(加压|断供|封锁|双流|疾行)\s*\|\s*(\d+)\s*\|\s*\*?\*?(\d+)\*?\*?\s*\|\s*\+(\d+)%\s*\|\s*\+(\d+)%\s*\|", c05)
    doc_score = {name: (int(lv), int(score), int(drop), int(rating)) for name, lv, score, drop, rating in rows05}

    chs = {c["id"]: c for c in load("challenges.json")["challenges"]}
    if len(chs) != 5:
        fail("挑战卡.数量", f"JSON 有 {len(chs)} 张，期望 5 张")
    for cid, (name, lv) in doc_ch.items():
        c = chs.get(cid)
        if c is None:
            fail(f"挑战卡.{cid}", "JSON 缺失")
            continue
        if c["name"] != name or c["level"] != lv:
            fail(f"挑战卡.{cid}", f"文档 {name}/L{lv} → JSON {c['name']}/L{c['level']}")
    for name, (lv, score, drop, rating) in doc_score.items():
        c = next((x for x in chs.values() if x["name"] == name), None)
        if c is None:
            fail(f"挑战卡.{name}", "JSON 缺失")
            continue
        if (c["level"], c["score"], round(c["reward"]["drop"] * 100), round(c["reward"]["rating"] * 100)) != (lv, score, drop, rating):
            fail(f"挑战卡.{name}", f"05 号文档 {lv}/{score}/{drop}%/{rating}% → JSON "
                                  f"{c['level']}/{c['score']}/{c['reward']['drop']*100:.0f}%/{c['reward']['rating']*100:.0f}%")
    # 双流白名单（19 号第三节）
    whitelist = {"MAP-ANV-02", "MAP-TID-01", "MAP-AST-02", "MAP-MULTI-01"}
    maps = {m["id"]: m for m in load("maps.json")["maps"]}
    for mid, m in maps.items():
        is_dual = bool(m.get("dual_entry"))
        if is_dual != (mid in whitelist):
            fail(f"地图.双入口.{mid}", f"JSON dual_entry={is_dual}，19 号白名单成员={mid in whitelist}")
    ok("挑战卡.5 张 + 双流白名单", "等级/难度分/掉落/评级 逐字段比对；6 图双入口标志与白名单一致")


# ---------------------------------------------------------------- 5. 地图卡
def check_maps() -> None:
    text = doc("19_地图卡表.md")
    blocks = re.split(r"\n###\s+", text)[1:]
    doc_maps: dict[str, dict] = {}
    for b in blocks:
        mid = b.split()[0]
        if not mid.startswith("MAP-"):
            continue
        std = re.search(r"塔位\s*\|\s*标准\s*(\d+)\s*/\s*支援\s*(\d+)\s*/\s*修饰\s*(\d+)", b)
        ent = re.search(r"入口\s*\|\s*(\d+)", b)
        dual = re.search(r"双入口\s*\|\s*\*{0,2}(是|否)", b)
        doc_maps[mid] = {
            "standard": int(std.group(1)), "support": int(std.group(2)), "modifier": int(std.group(3)),
            "entrances": int(ent.group(1)), "dual": dual.group(1) == "是",
        }
    maps = {m["id"]: m for m in load("maps.json")["maps"]}
    if set(maps) != set(doc_maps):
        fail("地图.集合", f"JSON {sorted(maps)} vs 文档 {sorted(doc_maps)}")
        return
    for mid, d in sorted(doc_maps.items()):
        m = maps[mid]
        for key, field in [("standard", "standard"), ("support", "support"), ("modifier", "modifier")]:
            art_count = len(m["slots"][field])
            if art_count != d[key]:
                dev = KNOWN_ART_DEVIATIONS.get((mid, f"slots_{key}"))
                (warn if dev else fail)(f"地图.{mid}.{field}",
                                        dev or f"19 号卡表 {d[key]} → 出图解析 {art_count}")
        if bool(m.get("dual_entry")) != d["dual"]:
            fail(f"地图.{mid}.双入口", f"文档 {d['dual']} → JSON {m.get('dual_entry')}")
        ent_art = len(m["entrances"])
        if ent_art != d["entrances"]:
            fail(f"地图.{mid}.入口", f"19 号卡表 {d['entrances']} → 出图解析 {ent_art}")
    ok("地图.6 张", "塔位数量 / 入口数 / 双入口标志 逐字段比对")


# ---------------------------------------------------------------- 6. 规则卡
def check_rules() -> None:
    text = doc("18_样例_关卡组装示例.md")
    m = re.search(r"基地生命\s*(\d+)；起始能量\s*(\d+)", text)
    if not m:
        fail("规则卡.RUL-BASE", "18 号样例里找不到「基地生命 N；起始能量 M」")
        return
    base_hp, start_energy = int(m.group(1)), int(m.group(2))
    rules = {r["id"]: r for r in load("rules.json")["rules"]}
    r = rules.get("RUL-BASE")
    if r is None:
        fail("规则卡.RUL-BASE", "JSON 缺失")
        return
    if r["base_hp"] != base_hp or r["start_energy"] != start_energy:
        fail("规则卡.RUL-BASE", f"文档 base_hp={base_hp}/start_energy={start_energy} → "
                                f"JSON {r['base_hp']}/{r['start_energy']}")
    # 能量曲线（数值 05 第一节）
    b = load("balance.json")
    t05 = doc("数值/05_能量与关卡预算曲线.md")
    for label, key, path in [("波间奖励", "wave_clear_bonus", ("energy", "wave_clear_bonus"))]:
        mm = re.search(label + r"\s*\|\s*\+(\d+)", t05)
        if mm and int(mm.group(1)) != b[path[0]][path[1]]:
            fail(f"平衡.{label}", f"05 号文档 {mm.group(1)} → JSON {b[path[0]][path[1]]}")
    if r["energy_rate"] != 1.0:
        fail("规则卡.energy_rate", f"05 号文档自然增长 +1/s → JSON {r['energy_rate']}")
    if r["energy_cap"] != 99:
        fail("规则卡.energy_cap", f"05 号文档上限 99 → JSON {r['energy_cap']}")
    ok("规则卡.RUL-BASE + 能量曲线", f"基地生命 {base_hp} / 起始能量 {start_energy} / +1·s⁻¹ / 上限 99 / 波间 +5")


def main() -> int:
    ap = argparse.ArgumentParser(description="游戏数据表 ↔ 策划文档 交叉校验")
    ap.add_argument("--quiet", action="store_true")
    args = ap.parse_args()

    check_cards()
    check_enemies()
    check_waves()
    check_challenges()
    check_maps()
    check_rules()

    fails = [r for r in results if r[0] == "FAIL"]
    warns = [r for r in results if r[0] == "WARN"]
    if not args.quiet:
        for level, item, msg in results:
            mark = {"PASS": "✅", "FAIL": "❌", "WARN": "⚠️ "}[level]
            print(f"{mark} {item}" + (f"：{msg}" if msg else ""))
    print(f"\n数据校验：{'FAIL' if fails else 'PASS'}"
          f"（通过 {len([r for r in results if r[0]=='PASS'])} 项，"
          f"失败 {len(fails)} 项，已知偏差 {len(warns)} 项）")
    return 1 if fails else 0


if __name__ == "__main__":
    raise SystemExit(main())
