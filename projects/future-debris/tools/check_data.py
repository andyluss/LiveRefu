#!/usr/bin/env python3
"""数据表校验闸门（S1 建立，S2 起成为卡表量产管线的守门人）。

设计立场（继承 projects/refu-game-001 的做法）：
  1. **契约是数据，不是代码里的注释**——规则写在 game/data/schema.json，本脚本只执行它；
  2. **校验器自己也要被校验**——`--self-test` 会故意造出坏数据，断言校验器能抓到；
     一个永远返回"通过"的检查器比没有检查器更糟。
  3. **校验的是契约，不是设计**——它能保证"字段齐、类型对、ID 不重、数量不缩水"，
     但不能保证"数值平衡"，后者属于 S2/S3 的模拟任务。

用法:
    python3 tools/check_data.py                 # 校验全部表
    python3 tools/check_data.py --self-test     # 先自检（负向用例），再校验全部表
    python3 tools/check_data.py --file cards.json
退出码: 0 = 通过; 1 = 有违规; 2 = 用法/环境错误
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
PROJECT = HERE.parent
DATA = PROJECT / "game" / "data"
TABLES = DATA / "tables"
SCHEMA = DATA / "schema.json"

TYPES = {
    "string": str,
    "int": int,
    "array": list,
    "object": dict,
}
# bool 是 int 的子类，必须排除，否则 True 会被当成合法整数
def _type_ok(value: object, kind: str) -> bool:
    if kind == "int":
        return isinstance(value, int) and not isinstance(value, bool)
    expected = TYPES.get(kind)
    return expected is not None and isinstance(value, expected)


class Report:
    def __init__(self) -> None:
        self.errors: list[str] = []
        self.warnings: list[str] = []

    def error(self, where: str, message: str) -> None:
        self.errors.append(f"{where}: {message}")

    def warn(self, where: str, message: str) -> None:
        self.warnings.append(f"{where}: {message}")

    def ok(self) -> bool:
        return not self.errors


def load_json(path: Path, report: Report) -> dict | None:
    if not path.is_file():
        report.error(str(path.relative_to(PROJECT)), "文件不存在")
        return None
    try:
        parsed = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        report.error(str(path.relative_to(PROJECT)), f"JSON 解析失败：{exc}")
        return None
    if not isinstance(parsed, dict):
        report.error(str(path.relative_to(PROJECT)), "顶层必须是对象")
        return None
    return parsed


def validate_field(where: str, field: str, spec: dict, value: object, report: Report) -> None:
    kind = spec.get("type")
    if kind and not _type_ok(value, kind):
        report.error(where, f"字段 {field} 类型应为 {kind}，实际 {type(value).__name__}")
        return
    if kind == "string":
        if "minLength" in spec and len(str(value)) < spec["minLength"]:
            report.error(where, f"字段 {field} 长度应 ≥ {spec['minLength']}")
        if "pattern" in spec and not re.match(spec["pattern"], str(value)):
            report.error(where, f"字段 {field} 不符命名规范 {spec['pattern']}：{value!r}")
        if "enum" in spec and value not in spec["enum"]:
            report.error(where, f"字段 {field} 必须是 {spec['enum']} 之一，实际 {value!r}")
    if kind == "int":
        if "min" in spec and int(value) < spec["min"]:
            report.error(where, f"字段 {field} 应 ≥ {spec['min']}，实际 {value}")
        if "max" in spec and int(value) > spec["max"]:
            report.error(where, f"字段 {field} 应 ≤ {spec['max']}，实际 {value}")
    if kind == "array":
        item_kind = spec.get("items")
        if item_kind:
            for index, item in enumerate(value):
                if not _type_ok(item, item_kind):
                    report.error(where, f"字段 {field}[{index}] 元素类型应为 {item_kind}")


def validate_table(rel_name: str, spec: dict, report: Report) -> int:
    path = TABLES / rel_name
    table = load_json(path, report)
    if table is None:
        return 0
    where_file = f"tables/{rel_name}"
    if table.get("schemaVersion") != 1:
        report.error(where_file, f"schemaVersion 应为 1，实际 {table.get('schemaVersion')!r}")
    for meta in ("name", "note"):
        if not isinstance(table.get(meta), str) or not table[meta]:
            report.error(where_file, f"缺少顶层字段 {meta}")

    entries = table.get("entries")
    if not isinstance(entries, list):
        report.error(where_file, "缺少 entries 数组")
        return 0

    min_entries = spec.get("minEntries")
    if min_entries is not None and len(entries) < min_entries:
        report.error(where_file, f"条目数 {len(entries)} 少于契约下限 {min_entries}")

    fields: dict = spec.get("entryFields", {})
    seen_ids: dict[str, int] = {}
    for index, entry in enumerate(entries):
        where = f"{where_file}[{index}]"
        if not isinstance(entry, dict):
            report.error(where, "条目必须是对象")
            continue
        for field, field_spec in fields.items():
            if field not in entry:
                report.error(where, f"缺少字段 {field}")
                continue
            validate_field(where, field, field_spec, entry[field], report)
        for field in entry:
            if field not in fields:
                report.warn(where, f"出现契约外的字段 {field}（未拒绝，但请确认是否需要写进 schema.json）")
        entry_id = entry.get("id")
        if isinstance(entry_id, str):
            if entry_id in seen_ids:
                report.error(where, f"id 重复：{entry_id}（首次出现在 [{seen_ids[entry_id]}]）")
            else:
                seen_ids[entry_id] = index
    return len(entries)


def validate_all(report: Report, only: str | None = None) -> dict[str, int]:
    schema = load_json(SCHEMA, report)
    if schema is None:
        return {}
    if schema.get("schemaVersion") != 1:
        report.error("schema.json", f"schemaVersion 应为 1，实际 {schema.get('schemaVersion')!r}")
    tables: dict = schema.get("tables", {})
    if not tables:
        report.error("schema.json", "tables 为空：契约里没有任何表")
        return {}

    counts: dict[str, int] = {}
    for rel_name, spec in sorted(tables.items()):
        if only and rel_name != only:
            continue
        counts[rel_name] = validate_table(rel_name, spec, report)

    # 契约里声明的表必须在磁盘上存在，反之磁盘上的表也必须在契约里——双向检查，
    # 否则"新加了一张表但忘了写契约"会静默通过。
    on_disk = {p.name for p in TABLES.glob("*.json")}
    for rel_name in sorted(set(tables) - on_disk):
        report.error(f"tables/{rel_name}", "契约声明了该表，但文件不存在")
    for rel_name in sorted(on_disk - set(tables)):
        report.error(f"tables/{rel_name}", "存在数据表但未写入 schema.json 契约")
    return counts


# --------------------------------------------------------------------------- #
# 自检：用"故意坏掉"的数据断言校验器真的会报错
# --------------------------------------------------------------------------- #

BAD_CASES: list[tuple[str, dict, dict, str]] = [
    (
        "缺字段",
        {"schemaVersion": 1, "name": "t", "note": "n", "entries": [{"id": "RC-X-001"}]},
        {"minEntries": 1, "entryFields": {"id": {"type": "string", "pattern": "^RC-X-[0-9]{3}$"}, "name": {"type": "string"}}},
        "缺少字段 name",
    ),
    (
        "ID 不符规范",
        {"schemaVersion": 1, "name": "t", "note": "n", "entries": [{"id": "bad-id", "name": "x"}]},
        {"minEntries": 1, "entryFields": {"id": {"type": "string", "pattern": "^RC-X-[0-9]{3}$"}, "name": {"type": "string"}}},
        "不符命名规范",
    ),
    (
        "ID 重复",
        {"schemaVersion": 1, "name": "t", "note": "n", "entries": [{"id": "RC-X-001", "name": "a"}, {"id": "RC-X-001", "name": "b"}]},
        {"minEntries": 1, "entryFields": {"id": {"type": "string", "pattern": "^RC-X-[0-9]{3}$"}, "name": {"type": "string"}}},
        "id 重复",
    ),
    (
        "类型错误（bool 冒充 int）",
        {"schemaVersion": 1, "name": "t", "note": "n", "entries": [{"id": "RC-X-001", "cost": True}]},
        {"minEntries": 1, "entryFields": {"id": {"type": "string", "pattern": "^RC-X-[0-9]{3}$"}, "cost": {"type": "int", "min": 0}}},
        "类型应为 int",
    ),
    (
        "越界",
        {"schemaVersion": 1, "name": "t", "note": "n", "entries": [{"id": "RC-X-001", "cost": 99}]},
        {"minEntries": 1, "entryFields": {"id": {"type": "string", "pattern": "^RC-X-[0-9]{3}$"}, "cost": {"type": "int", "max": 9}}},
        "应 ≤ 9",
    ),
    (
        "枚举外取值",
        {"schemaVersion": 1, "name": "t", "note": "n", "entries": [{"id": "RC-X-001", "kind": "spaceship"}]},
        {"minEntries": 1, "entryFields": {"id": {"type": "string", "pattern": "^RC-X-[0-9]{3}$"}, "kind": {"type": "string", "enum": ["unit", "tower"]}}},
        "必须是",
    ),
    (
        "条目数少于下限",
        {"schemaVersion": 1, "name": "t", "note": "n", "entries": [{"id": "RC-X-001", "name": "a"}]},
        {"minEntries": 5, "entryFields": {"id": {"type": "string", "pattern": "^RC-X-[0-9]{3}$"}, "name": {"type": "string"}}},
        "少于契约下限",
    ),
    (
        "数组元素类型错误",
        {"schemaVersion": 1, "name": "t", "note": "n", "entries": [{"id": "RC-X-001", "keywords": ["a", 2]}]},
        {"minEntries": 1, "entryFields": {"id": {"type": "string", "pattern": "^RC-X-[0-9]{3}$"}, "keywords": {"type": "array", "items": "string"}}},
        "元素类型应为 string",
    ),
]


def run_self_test() -> int:
    print("[self-test] 用故意坏掉的数据断言校验器会报错（负向用例）")
    failures = 0
    for label, table, spec, expect in BAD_CASES:
        report = Report()
        # 直接复用单表校验逻辑：把坏表写到契约里的临时位置不需要落盘——
        # 这里替换 TABLES 目录查找，改为内存校验（见 validate_table_in_memory）。
        validate_table_in_memory(label, table, spec, report)
        hit = any(expect in e for e in report.errors)
        status = "OK  " if hit else "MISS"
        if not hit:
            failures += 1
        print(f"  [{status}] {label}（期望命中：{expect}）实际：{report.errors or '无报错 ← 这是 bug'}")
    if failures:
        print(f"[self-test] FAIL：{failures}/{len(BAD_CASES)} 个坏用例没被抓住")
        return 1
    print(f"[self-test] PASS：{len(BAD_CASES)}/{len(BAD_CASES)} 个坏用例都被抓住")
    return 0


def validate_table_in_memory(label: str, table: dict, spec: dict, report: Report) -> None:
    """与 validate_table 同一套规则，但数据来自内存（供自检使用，避免往磁盘写坏文件）。"""
    where_file = f"<self-test:{label}>"
    entries = table.get("entries") if isinstance(table.get("entries"), list) else []
    fields: dict = spec.get("entryFields", {})
    min_entries = spec.get("minEntries")
    if min_entries is not None and len(entries) < min_entries:
        report.error(where_file, f"条目数 {len(entries)} 少于契约下限 {min_entries}")
    seen_ids: dict[str, int] = {}
    for index, entry in enumerate(entries):
        where = f"{where_file}[{index}]"
        for field, field_spec in fields.items():
            if field not in entry:
                report.error(where, f"缺少字段 {field}")
                continue
            validate_field(where, field, field_spec, entry[field], report)
        entry_id = entry.get("id")
        if isinstance(entry_id, str):
            if entry_id in seen_ids:
                report.error(where, f"id 重复：{entry_id}（首次出现在 [{seen_ids[entry_id]}]）")
            else:
                seen_ids[entry_id] = index


def main() -> int:
    parser = argparse.ArgumentParser(description="校验 future-debris 数据表契约")
    parser.add_argument("--self-test", action="store_true", help="先跑校验器自检（负向用例）")
    parser.add_argument("--file", help="只校验某一张表（例：cards.json）")
    args = parser.parse_args()

    if not SCHEMA.is_file():
        print(f"环境错误：找不到契约文件 {SCHEMA}", file=sys.stderr)
        return 2

    if args.self_test:
        code = run_self_test()
        if code != 0:
            return code

    report = Report()
    counts = validate_all(report, only=args.file)
    label = "校验器自检 + 数据校验" if args.self_test else "数据校验"
    print(f"[{label}] 契约 {SCHEMA.relative_to(PROJECT)}")
    for rel_name, count in sorted(counts.items()):
        print(f"  - tables/{rel_name}: {count} 条")
    for warning in report.warnings:
        print(f"  [WARN] {warning}")
    if report.ok():
        print(f"数据校验：PASS（{len(counts)} 张表，0 违规，{len(report.warnings)} 条警告）")
        return 0
    for error in report.errors:
        print(f"  [ERR ] {error}")
    print(f"数据校验：FAIL（{len(report.errors)} 项违规）")
    return 1


if __name__ == "__main__":
    sys.exit(main())
