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


def load_all_entries(report: Report) -> dict[str, list]:
    """读出所有表的 entries，供跨表引用校验使用。"""
    out: dict[str, list] = {}
    for path in sorted(TABLES.glob("*.json")):
        table = load_json(path, report)
        if table is None:
            continue
        entries = table.get("entries")
        out[path.name] = entries if isinstance(entries, list) else []
    return out


def validate_references(
    rel_name: str, spec: dict, entries: list, all_entries: dict[str, list], report: Report
) -> None:
    """跨表引用完整性：卡表里引用的阵营必须真实存在。

    为什么必须机器守：这类错误**不会让任何一张表自身违规**——
    卡表字段齐全、势力表格式正确，但两者之间断了一根线。它只在运行期表现为
    "某个阵营的卡永远不出现"或读表报错，是最容易漏到最后才炸的一类缺陷。
    """
    for ref in spec.get("references", []):
        field = ref.get("field")
        target_table = ref.get("table")
        label = ref.get("label", f"{field} → {target_table}")
        target_ids = {
            str(row.get("id")) for row in all_entries.get(target_table, []) if isinstance(row, dict)
        }
        if not target_ids:
            report.error(f"tables/{rel_name}", f"引用目标 {target_table} 为空或不存在，无法校验（{label}）")
            continue
        key_of = bool(ref.get("keyOf"))
        for index, entry in enumerate(entries):
            if not isinstance(entry, dict) or entry.get(field) is None:
                continue
            value = entry[field]
            # 支持**对象字段的键**（如 quotas_by_faction 的势力 id）：
            # 这类字段的值是"字典"，真正需要校验的是它的**键**是不是有效引用。
            # 曾经只处理标量与数组，于是"对象里写了一个不存在的势力"完全不会被发现——
            # 后果是该势力静默用不到专属曲线（难度看起来"没生效"，却不报错）。
            if key_of and isinstance(value, dict):
                for key in value:
                    if str(key) not in target_ids:
                        report.error(
                            f"tables/{rel_name}[{index}]",
                            f"字段 {field} 的键 {key!r} 在 {target_table} 中不存在（{label}）",
                        )
                continue
            # 支持**数组字段**（如关卡的 rule_set）：逐元素校验。
            # 曾经只处理标量，于是"数组里塞一个不存在的 id"不会被发现——
            # 是关卡表引入 rule_set 时暴露的（单元素数组恰好通过，多元素才报错）。
            if isinstance(value, list):
                for element in value:
                    if isinstance(element, str) and element not in target_ids:
                        report.error(
                            f"tables/{rel_name}[{index}]",
                            f"字段 {field} 的元素 {element!r} 在 {target_table} 中不存在（{label}）",
                        )
                continue
            if str(value) not in target_ids:
                report.error(
                    f"tables/{rel_name}[{index}]",
                    f"字段 {field}={value!r} 在 {target_table} 中不存在（{label}）",
                )


def validate_table(
    rel_name: str, spec: dict, report: Report, all_entries: dict[str, list] | None = None
) -> int:
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

    if all_entries is not None and spec.get("references"):
        validate_references(rel_name, spec, entries, all_entries, report)
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
    all_entries = load_all_entries(report)
    for rel_name, spec in sorted(tables.items()):
        if only and rel_name != only:
            continue
        counts[rel_name] = validate_table(rel_name, spec, report, all_entries)

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


def run_reference_self_test() -> int:
    """断言跨表引用校验：悬空引用会被抓到，合法引用不误报。

    这个用例必须**独立于单表用例**：悬空引用不会让任何一张表自身违规，
    所以它只能被专门构造的跨表场景抓住。
    """
    print("[self-test] 断言跨表引用校验（悬空引用必须被抓到）")
    spec = {
        "minEntries": 1,
        "entryFields": {"id": {"type": "string", "pattern": "^RC-X-[0-9]{3}$"}, "faction": {"type": "string"}},
        "references": [{"field": "faction", "table": "factions.json", "label": "卡牌阵营必须存在于势力表"}],
    }
    good_factions = [{"id": "FAC-ATOMIC-AEC"}]
    cases = [
        ("合法引用", [{"id": "RC-X-001", "faction": "FAC-ATOMIC-AEC"}], good_factions, False),
        ("悬空引用", [{"id": "RC-X-001", "faction": "FAC-ATOMIC-GHOST"}], good_factions, True),
        ("引用目标为空表", [{"id": "RC-X-001", "faction": "FAC-ATOMIC-AEC"}], [], True),
    ]
    array_spec = {
        "minEntries": 1,
        "entryFields": {"id": {"type": "string"}, "rule_set": {"type": "array", "items": "string"}},
        "references": [{"field": "rule_set", "table": "rules.json", "label": "关卡引用的规则卡必须存在"}],
    }
    array_cases = [
        ("数组引用全部合法", [{"id": "LV-1", "rule_set": ["R-1", "R-2"]}], False),
        ("数组引用部分悬空", [{"id": "LV-1", "rule_set": ["R-1", "R-9"]}], True),
    ]
    failures = 0
    for label, entries, expect_error in array_cases:
        report = Report()
        validate_references(
            "levels.json", array_spec, entries,
            {"rules.json": [{"id": "R-1"}, {"id": "R-2"}]}, report,
        )
        hit = bool(report.errors)
        ok = hit == expect_error
        failures += 0 if ok else 1
        detail = report.errors[0] if report.errors else "无报错"
        print(f"  [{'OK  ' if ok else 'MISS'}] {label} → 期望报错={expect_error}；实际：{detail}")
    # 对象键引用（quotas_by_faction）的负例：键写错必须被抓到
    key_cases = [
        ("对象键引用有效", [{"id": "L-1", "quotas_by_faction": {"F-1": [1, 2]}}], [{"id": "F-1"}], False),
        ("对象键引用不存在", [{"id": "L-1", "quotas_by_faction": {"F-9": [1, 2]}}], [{"id": "F-1"}], True),
    ]
    for label, entries, factions, expect_error in key_cases:
        report = Report()
        validate_references(
            "levels.json", {"references": [{"field": "quotas_by_faction", "table": "factions.json",
                                            "label": "按势力配额的键必须是存在的势力", "keyOf": True}]},
            entries, {"factions.json": factions}, report,
        )
        hit = bool(report.errors)
        ok = hit == expect_error
        failures += 0 if ok else 1
        detail = report.errors[0] if report.errors else "无报错"
        print(f"  [{'OK  ' if ok else 'MISS'}] {label} → 期望报错={expect_error}；实际：{detail}")
    for label, entries, factions, expect_error in cases:
        report = Report()
        validate_references("cards.json", spec, entries, {"factions.json": factions}, report)
        hit = bool(report.errors)
        ok = hit == expect_error
        failures += 0 if ok else 1
        detail = report.errors[0] if report.errors else "无报错"
        print(f"  [{'OK  ' if ok else 'MISS'}] {label} → 期望报错={expect_error}；实际：{detail}")
    # 分母必须**数实际跑过的用例**，不能只数 `cases`：
    # 我在同一段里又加了两条"对象键引用"用例，于是报告写成 5 个用例里的 3 个
    # （失败时更糟：会打印"4/3 个用例不符预期"）。计数是验收报告的可信度本身。
    total = len(key_cases) + len(cases)
    if failures:
        print(f"[self-test] FAIL：{failures}/{total} 个用例不符预期")
        return 1
    print(f"[self-test] PASS：{total}/{total} 个用例符合预期")
    return 0


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
        code = run_reference_self_test()
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
