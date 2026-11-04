#!/usr/bin/env python3
"""LiveBay Tools · 编辑器与 numbers/ 之间的数据桥。

用法（由 Godot 插件调用，也可手动）：
    python3 bridge.py read  --json /tmp/map.json
    python3 bridge.py write --json /tmp/map.json
    python3 bridge.py check

read  : numbers/05 地图表 -> JSON（含 map 与 towers）
write : JSON -> numbers/05 地图表 -> export_numbers.py -> game/data
check : python3 tools/export_numbers.py --check

规则：TECH-A1（单一数据源）、DES-C1（数值与场景引用）。
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

PROJECT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(PROJECT / "tools"))
import export_numbers as numbers  # noqa: E402

MAP_MD = PROJECT / "docs-ai" / "design01" / "numbers" / "05_地图与塔位.md"


def fail(message: str) -> None:
    print(json.dumps({"ok": False, "error": message}, ensure_ascii=False))
    raise SystemExit(1)


def load_tables() -> dict:
    return numbers.collect()


def read_map() -> dict:
    tables = load_tables()
    for key in ("map_meta", "map_path", "map_slots", "map_base", "towers"):
        if key not in tables:
            fail(f"缺少 export:{key}")
    return {"ok": True, "map": numbers.build_map(tables), "towers": numbers.build_towers(tables["towers"])}


def table_rows(key: str, data: dict) -> list[str]:
    if key == "map_meta":
        return [f"| {data['id']} | {data['name']} | {data['description']} |"]
    if key == "map_path":
        return [f"| {i + 1} | {int(p[0])} | {int(p[1])} |" for i, p in enumerate(data["path"])]
    if key == "map_slots":
        return [f"| {i + 1} | {int(p[0])} | {int(p[1])} |" for i, p in enumerate(data["slots"])]
    if key == "map_base":
        pos = data["base"]["pos"]
        return [f"| {int(pos[0])} | {int(pos[1])} | {int(data['base']['radius'])} |"]
    fail(f"未知表 {key}")
    return []


def replace_table(text: str, key: str, rows: list[str]) -> str:
    pattern = re.compile(
        r"(<!--\s*export:\s*" + re.escape(key) + r"\s*-->\s*\n"
        r"\|[^\n]*\|\s*\n"
        r"\|[^\n]*\|[^\n]*\n)"
        r"((?:\|[^\n]*\|[^\n]*\n)+)"
    )
    match = pattern.search(text)
    if not match:
        fail(f"找不到表格 export:{key}")
    return text[:match.start()] + match.group(1) + "\n".join(rows) + "\n" + text[match.end():]


def write_map(data: dict) -> dict:
    map_data = data.get("map") or data
    for key in ("id", "name", "description", "path", "slots", "base"):
        if key not in map_data:
            fail(f"map 缺少 {key}")
    text = MAP_MD.read_text(encoding="utf-8")
    for key in ("map_meta", "map_path", "map_slots", "map_base"):
        text = replace_table(text, key, table_rows(key, map_data))
    MAP_MD.write_text(text, encoding="utf-8")

    result = subprocess.run(
        [sys.executable, str(PROJECT / "tools" / "export_numbers.py")],
        cwd=PROJECT, capture_output=True, text=True,
    )
    if result.returncode != 0:
        fail("导出失败：" + (result.stderr or result.stdout).strip())
    check = subprocess.run(
        [sys.executable, str(PROJECT / "tools" / "export_numbers.py"), "--check"],
        cwd=PROJECT, capture_output=True, text=True,
    )
    if check.returncode != 0:
        fail("导出后校验失败：" + (check.stderr or check.stdout).strip())
    return {"ok": True, "message": "已写回 numbers/05 并导出 game/data", "map": numbers.build_map(load_tables())}


def check() -> dict:
    result = subprocess.run(
        [sys.executable, str(PROJECT / "tools" / "export_numbers.py"), "--check"],
        cwd=PROJECT, capture_output=True, text=True,
    )
    if result.returncode != 0:
        fail((result.stderr or result.stdout).strip())
    return {"ok": True, "message": "numbers 与 game/data 一致"}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("action", choices=["read", "write", "check"])
    parser.add_argument("--json", default="")
    args = parser.parse_args()
    if args.action == "read":
        data = read_map()
        if args.json:
            Path(args.json).write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
        print(json.dumps(data, ensure_ascii=False))
    elif args.action == "write":
        if not args.json:
            fail("write 需要 --json")
        data = json.loads(Path(args.json).read_text(encoding="utf-8"))
        print(json.dumps(write_map(data), ensure_ascii=False))
    else:
        print(json.dumps(check(), ensure_ascii=False))


if __name__ == "__main__":
    main()
