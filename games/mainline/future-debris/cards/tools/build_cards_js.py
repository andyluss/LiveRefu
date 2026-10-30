#!/usr/bin/env python3
"""build_cards_js —— 从工程的真实卡表里抽出展示用卡，生成 cards.js。

为什么不在 index.html 里手写卡数据：
  手抄必然与 cards.json 分叉（本项目反复栽过）。这里**只声明"展示哪几张"**（ID 列表），
  其余字段一律从工程现读，重跑即同步。

用法：python3 tools/build_cards_js.py
"""
import json
import pathlib

HERE = pathlib.Path(__file__).resolve().parent
CARDS_DIR = HERE.parent
TABLES = CARDS_DIR.parent / "game/data/tables/cards.json"
FLAVOR = CARDS_DIR / "flavor.json"
OUT = CARDS_DIR / "cards.js"

# 展示集：覆盖 4 势力 × 6 种类 × 3 稀有度
SHOWCASE = [
    "RC-ATOMIC-001",  # AEC 标准 塔
    "RC-ATOMIC-002",  # AEC 标准 塔
    "RC-ATOMIC-004",  # AEC 罕见 技能
    "RC-ATOMIC-006",  # SUB 标准 支援
    "RC-ATOMIC-007",  # SUB 罕见 单位
    "RC-ATOMIC-009",  # HAU 史诗 塔
    "RC-ATOMIC-010",  # HAU 罕见 改装
    "RC-ATOMIC-011",  # ROA 罕见 单位
    "RC-ATOMIC-012",  # ROA 史诗 残片
]

FIELDS = ("id", "name", "faction", "kind", "rarity", "cost", "power", "might", "compute", "residue",
          "keywords", "text")


def main() -> int:
    data = json.loads(TABLES.read_text(encoding="utf-8"))
    by_id = {e["id"]: e for e in data["entries"]}
    flavor = {}
    if FLAVOR.exists():
        raw = json.loads(FLAVOR.read_text(encoding="utf-8"))
        flavor = {k: v for k, v in raw.items() if not k.startswith("_")}

    picked = []
    for cid in SHOWCASE:
        e = by_id.get(cid)
        if e is None:
            print(f"缺卡：{cid}")
            return 1
        row = {k: e[k] for k in FIELDS if k in e}
        if cid in flavor:
            row["flavor"] = flavor[cid]
        else:
            print(f"提示：{cid} 没有风味文字（flavor.json）")
        picked.append(row)

    body = json.dumps(picked, ensure_ascii=False, indent=2)
    OUT.write_text(
        "// 由 tools/build_cards_js.py 生成，请勿手改（改展示集请改脚本里的 SHOWCASE）。\n"
        f"// 数据源：{TABLES.relative_to(CARDS_DIR.parent.parent)}（共 {len(data['entries'])} 张，此处展示 {len(picked)} 张）\n"
        f"window.CARDS = {body};\n",
        encoding="utf-8",
    )
    print(f"已生成 {OUT.relative_to(CARDS_DIR.parent.parent)}：{len(picked)} 张")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
