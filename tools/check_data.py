#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
校验《明日频道》数据表是否符合其 JSON Schema（结构/必填/类型/枚举/数值范围）。
此校验把"数据契约"变成机器可检查的声明：数值策划 A 改 data/tables 下的表时，
pre-commit 钩子与 CI 能在提交前/合入前拦截非法数据（缺字段、type 错、enum 越界、数值越界）。

用法：
    python3 tools/check_data.py                 # 校验 data/ 全表
    python3 tools/check_data.py -v              # 连同通过的表一起打印
    python3 tools/check_data.py --tables PROJ/data/tables  # 自定义表目录(用于 game/ 副本)

说明：
    - 纯标准库，无外部依赖（不依赖 jsonschema），与 check_links.py 一致、稳定。
    - 支持：数组包裹(array)、顶层/嵌套 properties、required、type(integer/string/number/boolean/object/array)、
      enum、min/max(数值)。
    - 跨表 token 引用(如 channel 的 LUT token 是否真实存在) 为可选增强，暂以"字段存在 + 枚举合法"为主，
      保证编译期可可靠验证。
    - 用法与 check_links.py 一致，便于接入 pre-commit 与 CI。
"""

import json
import os
import sys
import glob

# 工作区根：本脚本位于 <root>/tools/
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
if not os.path.isdir(os.path.join(ROOT, ".git")):
    ROOT = HERE

SCHEMA_DIR = "projects/tomorrows-channel/data/schema"
TABLES_DIR = "projects/tomorrows-channel/data/tables"


def load(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def _type_ok(schema_type, value):
    """简化的类型判定支持。"""
    if schema_type == "integer":
        return isinstance(value, int) and not isinstance(value, bool)
    if schema_type == "string":
        return isinstance(value, str)
    if schema_type == "number":
        return isinstance(value, (int, float)) and not isinstance(value, bool)
    if schema_type == "boolean":
        return isinstance(value, bool)
    if schema_type == "object":
        return isinstance(value, dict)
    if schema_type == "array":
        return isinstance(value, list)
    return True  # 未知 type 不阻


def validate_value(value, schema, path, errors):
    """递归校验单个值(支持嵌套 properties / required / type / enum / min / max)。"""
    if "type" in schema:
        st = schema["type"]
        if st == "array":
            if not isinstance(value, list):
                errors.append(f"{path}: 应为数组, 实为 {type(value).__name__}")
                return
            items_schema = schema.get("items", {})
            for i, item in enumerate(value):
                validate_value(item, items_schema, f"{path}[{i}]", errors)
            return
        if not _type_ok(st, value):
            errors.append(f"{path}: type 应为 {st}, 实为 {type(value).__name__}")
            return

    # 枚举
    if "enum" in schema and value not in schema["enum"]:
        errors.append(f"{path}: {value!r} 不在枚举 {schema['enum']}")
        return

    # 数值范围
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        if "minimum" in schema and value < schema["minimum"]:
            errors.append(f"{path}: {value} < minimum {schema['minimum']}")
            return
        if "maximum" in schema and value > schema["maximum"]:
            errors.append(f"{path}: {value} > maximum {schema['maximum']}")
            return

    # 对象子字段
    if isinstance(value, dict) and "properties" in schema:
        props = schema["properties"]
        # 必填
        for req in schema.get("required", []):
            if req not in value:
                errors.append(f"{path}: 缺必填字段 '{req}'")
        # 逐字段校验
        for key, sub in props.items():
            if key in value:
                validate_value(value[key], sub, f"{path}.{key}", errors)


def check_table(schema_path, table_path):
    """校验一张表: 载入 schema + 数据, 递归校验, 返回错误列表。"""
    schema = load(schema_path)
    table = load(table_path)
    errors = []
    validate_value(table, schema, os.path.basename(table_path), errors)
    return errors


def main():
    argv = sys.argv[1:]
    verbose = "-v" in argv or "--verbose" in argv
    # 自定义目录(可选)
    tables_dir = TABLES_DIR
    for i, a in enumerate(argv):
        if a == "--tables" and i + 1 < len(argv):
            tables_dir = argv[i + 1]
            break
    schema_dir = SCHEMA_DIR

    schema_abs = os.path.join(ROOT, schema_dir)
    tables_abs = os.path.join(ROOT, tables_dir)

    # schema: 文件名去掉 .schema.json
    schema_files = {}
    for s in glob.glob(os.path.join(schema_abs, "*.schema.json")):
        name = os.path.basename(s).replace(".schema.json", "")
        schema_files[name] = s

    total_errors = 0
    checked = 0
    for t in sorted(glob.glob(os.path.join(tables_abs, "*.json"))):
        base = os.path.basename(t).replace(".json", "")
        if base not in schema_files:
            # 无对应 schema 的表(如运行时副本), 跳过(或提示)
            if verbose:
                print(f"[skip] {t} (无对应 schema)")
            continue
        errors = check_table(schema_files[base], t)
        checked += 1
        if errors:
            print(f"❌ {base}")
            for e in errors:
                print(f"   - {e}")
            total_errors += len(errors)
        elif verbose:
            print(f"✅ {base}")

    print(f"校验数据表: {checked} 张, 错误 {total_errors} 个")
    return 1 if total_errors else 0


if __name__ == "__main__":
    sys.exit(main())
