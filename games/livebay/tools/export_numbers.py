#!/usr/bin/env python3
"""从 numbers/ 的 Markdown 表格导出 game/data/*.json。

用法（在 games/livebay/ 下）：
    python3 tools/export_numbers.py          # 写入
    python3 tools/export_numbers.py --check  # 只校验，不写入

表格约定：每张要导出的表前面有一行
    <!-- export: key -->
脚本只读取带标记的表格；表格内容不要用半角 | 作为正文分隔。

规则：TECH-A1（单一数据源）、DES-C1（数值与场景引用）。
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

PROJECT = Path(__file__).resolve().parents[1]
NUMBERS = PROJECT / "docs-ai" / "design01" / "numbers"
DATA = PROJECT / "game" / "data"

MARKER = re.compile(r"<!--\s*export:\s*([a-z0-9_]+)\s*-->\s*\n")

BALANCE_REQUIRED = [
    "starting_energy",
    "starting_integrity",
    "sell_refund",
    "max_tower_level",
    "upgrade_cost_factor",
    "upgrade_damage_factor",
    "upgrade_range_factor",
    "prepare_time",
    "between_wave_time",
    "upgrade_income_factor",
    "upgrade_repair_factor",
    "grade_s_ratio",
    "grade_a_ratio",
    "grade_b_ratio",
]

TOWER_FIELDS = [
    "id", "name", "cost", "range", "damage", "fire_rate", "kind",
    "slow", "slow_duration", "income", "income_interval", "repair",
    "mark_bonus", "mark_duration", "color", "description",
]
ENEMY_FIELDS = [
    "id", "name", "hp", "speed", "reward", "leak_damage", "radius",
    "shape", "color", "behavior", "disable_duration", "disable_radius",
    "disable_targets", "damage_taken_mult", "split_into", "split_count", "description",
]
WAVE_GROUP_FIELDS = ["enemy", "count", "interval", "delay"]


def fail(message: str) -> None:
    print(f"export_numbers: {message}", file=sys.stderr)
    raise SystemExit(1)


def cells(line: str) -> list[str]:
    line = line.strip()
    if line.startswith("|"):
        line = line[1:]
    if line.endswith("|"):
        line = line[:-1]
    return [c.strip() for c in line.split("|")]


def parse_table(lines: list[str], where: str) -> list[dict[str, str]]:
    if len(lines) < 2:
        fail(f"{where}: 表格至少需要表头与分隔行")
    header = cells(lines[0])
    if not header or any(not h for h in header):
        fail(f"{where}: 表头有空列")
    rows: list[dict[str, str]] = []
    for line in lines[2:]:
        values = cells(line)
        if not values or all(not v for v in values):
            continue
        if len(values) < len(header):
            values += [""] * (len(header) - len(values))
        if len(values) > len(header):
            fail(f"{where}: 行比表头多列：{line}")
        rows.append(dict(zip(header, values)))
    return rows


def collect() -> dict[str, list[dict[str, str]]]:
    tables: dict[str, list[dict[str, str]]] = {}
    for path in sorted(NUMBERS.glob("*.md")):
        text = path.read_text(encoding="utf-8")
        for match in MARKER.finditer(text):
            key = match.group(1)
            rest = text[match.end():].splitlines()
            i = 0
            while i < len(rest) and not rest[i].strip():
                i += 1
            if i >= len(rest) or not rest[i].strip().startswith("|"):
                fail(f"{path.name}: export:{key} 后面没有表格")
            lines: list[str] = []
            while i < len(rest) and rest[i].strip().startswith("|"):
                lines.append(rest[i])
                i += 1
            if key in tables:
                fail(f"export:{key} 出现了两次")
            tables[key] = parse_table(lines, f"{path.name}:{key}")
    return tables


def is_number(text: str) -> bool:
    return bool(re.fullmatch(r"-?\d+(?:\.\d+)?", text.strip()))


def number(text: str) -> int | float:
    text = text.strip()
    if not text:
        fail("空数值")
    if re.fullmatch(r"-?\d+", text):
        return int(text)
    return float(text)


def typed(text: str, kind: str) -> object:
    if kind == "int":
        return int(float(text))
    if kind == "float":
        return float(text)
    if kind == "bool":
        return text.strip().lower() == "true"
    return text.strip()


def build_balance(rows: list[dict[str, str]]) -> dict:
    out: dict = {}
    for row in rows:
        if not row.get("key"):
            fail("balance: 缺少 key")
        out[row["key"]] = typed(row["value"], row.get("type", "string"))
    missing = [k for k in BALANCE_REQUIRED if k not in out]
    if missing:
        fail(f"balance: 缺少字段 {', '.join(missing)}")
    if out["max_tower_level"] < 1:
        fail("balance: max_tower_level 必须 >= 1")
    return out


def build_profession(rows: list[dict[str, str]]) -> dict:
    if len(rows) != 1:
        fail("profession: 当前只支持一行")
    row = rows[0]
    return {
        "id": row["id"],
        "name": row["name"],
        "ring": row["ring"],
        "description": row["description"],
        "start_energy": number(row["start_energy"]),
        "start_integrity": number(row["start_integrity"]),
        "tower_cost_mult": number(row["tower_cost_mult"]),
    }


def build_towers(rows: list[dict[str, str]]) -> list[dict]:
    out: list[dict] = []
    seen: set[str] = set()
    numeric = {"cost", "range", "damage", "fire_rate", "slow", "slow_duration", "income", "income_interval", "repair", "mark_bonus", "mark_duration", "damage_taken_mult", "split_count"}
    for row in rows:
        tower: dict = {}
        for field in TOWER_FIELDS:
            value = row.get(field, "")
            if value == "":
                continue
            if field in numeric:
                tower[field] = number(value)
            else:
                tower[field] = value
        for required in ("id", "name", "cost", "range", "damage", "fire_rate", "kind"):
            if required not in tower:
                fail(f"tower: {tower.get('id', '?')} 缺少 {required}")
        if tower["id"] in seen:
            fail(f"tower: id 重复 {tower['id']}")
        seen.add(tower["id"])
        if tower["cost"] <= 0:
            fail(f"tower: {tower['id']} cost 必须 > 0")
        out.append(tower)
    return out


def build_enemies(rows: list[dict[str, str]]) -> list[dict]:
    out: list[dict] = []
    seen: set[str] = set()
    numeric = {"hp", "speed", "reward", "leak_damage", "radius", "disable_duration", "disable_radius", "disable_targets", "damage_taken_mult", "split_count"}
    for row in rows:
        enemy: dict = {}
        for field in ENEMY_FIELDS:
            value = row.get(field, "")
            if value == "":
                continue
            if field in numeric:
                enemy[field] = number(value)
            else:
                enemy[field] = value
        for required in ("id", "name", "hp", "speed", "reward", "leak_damage", "radius", "shape"):
            if required not in enemy:
                fail(f"enemy: {enemy.get('id', '?')} 缺少 {required}")
        if enemy["id"] in seen:
            fail(f"enemy: id 重复 {enemy['id']}")
        seen.add(enemy["id"])
        if enemy["hp"] <= 0:
            fail(f"enemy: {enemy['id']} hp 必须 > 0")
        out.append(enemy)
    return out


def build_waves(rows: list[dict[str, str]], enemy_ids: set[str]) -> list[dict]:
    grouped: dict[int, dict] = {}
    for row in rows:
        index = int(float(row["wave"]))
        wave = grouped.setdefault(index, {"index": index, "prep": float(row["prep"]), "groups": []})
        if float(row["prep"]) != wave["prep"]:
            fail(f"wave {index}: 同一波 prep 不一致")
        group = {
            "enemy": row["enemy"],
            "count": int(float(row["count"])),
            "interval": float(row["interval"]),
            "delay": float(row["delay"]),
        }
        if group["enemy"] not in enemy_ids:
            fail(f"wave {index}: 未知敌人 {group['enemy']}")
        if group["count"] <= 0:
            fail(f"wave {index}: count 必须 > 0")
        wave["groups"].append(group)
    return [grouped[k] for k in sorted(grouped)]


def build_map(tables: dict[str, list[dict[str, str]]], prefix: str = "map") -> dict:
    meta_rows = tables.get(f"{prefix}_meta", [])
    if len(meta_rows) != 1:
        fail(f"{prefix}_meta: 需要一行")
    meta = meta_rows[0]

    def points(key: str) -> list[list[int]]:
        rows = sorted(tables.get(key, []), key=lambda r: int(float(r["order"])))
        if not rows:
            fail(f"{key}: 没有数据")
        return [[int(float(r["x"])), int(float(r["y"]))] for r in rows]

    path = points(f"{prefix}_path")
    slots = points(f"{prefix}_slots")
    if len(path) < 2:
        fail(f"{prefix}_path: 至少需要 2 个点")
    if not slots:
        fail(f"{prefix}_slots: 至少需要 1 个塔位")
    base_rows = tables.get(f"{prefix}_base", [])
    if len(base_rows) != 1:
        fail(f"{prefix}_base: 需要一行")
    base = base_rows[0]
    modifiers = {}
    for key in ("energy_delta", "integrity_delta"):
        raw = meta.get(key, "").strip()
        if raw:
            modifiers[key] = int(float(raw))
    for key in ("speed_mult", "damage_mult"):
        raw = meta.get(key, "").strip()
        if raw:
            modifiers[key] = float(raw)
    return {
        "id": meta["id"],
        "name": meta["name"],
        "description": meta["description"],
        "modifiers": modifiers,
        "path": path,
        "slots": slots,
        "base": {
            "pos": [int(float(base["x"])), int(float(base["y"]))],
            "radius": int(float(base["radius"])),
        },
    }


def render(value: object, compact_pairs: bool = False) -> str:
    text = json.dumps(value, ensure_ascii=False, indent=2) + "\n"
    if compact_pairs:
        text = re.sub(r"\[\s*(-?\d+),\s*(-?\d+)\s*\]", r"[\1, \2]", text)
    return text


def main() -> None:
    check = "--check" in sys.argv
    tables = collect()
    for required in ("balance", "profession", "towers", "enemies", "waves", "map_meta", "map_path", "map_slots", "map_base", "map2_meta", "map2_path", "map2_slots", "map2_base", "map3_meta", "map3_path", "map3_slots", "map3_base", "waves2", "waves3"):
        if required not in tables:
            fail(f"缺少 export:{required}")

    balance = build_balance(tables["balance"])
    profession = build_profession(tables["profession"])
    towers = build_towers(tables["towers"])
    enemies = build_enemies(tables["enemies"])
    enemy_ids = {e["id"] for e in enemies}
    waves = build_waves(tables["waves"], enemy_ids)
    waves2 = build_waves(tables["waves2"], enemy_ids)
    waves3 = build_waves(tables["waves3"], enemy_ids)
    map_data = build_map(tables)
    map2_data = build_map(tables, "map2")
    map3_data = build_map(tables, "map3")

    targets = {
        "balance.json": balance,
        "profession_guard.json": profession,
        "towers.json": towers,
        "enemies.json": enemies,
        "waves.json": waves,
        "waves_bay02.json": waves2,
        "waves_bay03.json": waves3,
        "map_bay01.json": map_data,
        "map_bay02.json": map2_data,
        "map_bay03.json": map3_data,
    }

    mismatched: list[str] = []
    for name, value in targets.items():
        path = DATA / name
        text = render(value, compact_pairs=name.startswith("map_"))
        old = path.read_text(encoding="utf-8") if path.exists() else ""
        if check:
            if old != text:
                mismatched.append(name)
        else:
            path.write_text(text, encoding="utf-8")
            print(f"wrote {path.relative_to(PROJECT)}")
    if check:
        if mismatched:
            print("export_numbers: 以下文件与表格不一致：" + ", ".join(mismatched), file=sys.stderr)
            raise SystemExit(1)
        print("export_numbers: 全部一致")


if __name__ == "__main__":
    main()
