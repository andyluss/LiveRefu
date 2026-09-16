#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""extract_map_data.py —— 从地图卡出图（SVG）抽取战场布局数据。

为什么要抽：地图卡 SVG 是"塔位/路径/地形"的可视化真相（由策划 19 号卡表生成），
逐字段手抄易错且难维护。本脚本把 SVG 里的几何解析成 **引擎坐标**，写进
`game/data/maps.json`，并提供 `--check` 让 CI 能发现"美术改了但数据没跟上"。

坐标系：SVG 画布 980×660。玩法区为 (22,26)–(958,598)，网格 10 列 × 8 行，
单元格 90×72。路径与塔位一律保留 **SVG 原始像素坐标**，
由引擎按 `balance.json` 的 `board` 段换算成格坐标（1 格 = 1 单位）。

用法：
    python3 tools/extract_map_data.py            # 打印解析结果（dry-run）
    python3 tools/extract_map_data.py --write    # 写入 game/data/maps.json
    python3 tools/extract_map_data.py --check    # 校验 maps.json 与 SVG 是否一致
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = PROJECT_ROOT.parents[1]
MAP_ART_DIR = REPO_ROOT / "doc" / "refu-game-001" / "美术" / "全量出图" / "地图" / "PNG预览"
MAP_SVG_DIR = REPO_ROOT / "doc" / "refu-game-001" / "美术" / "全量出图" / "地图"
OUT_PATH = PROJECT_ROOT / "game" / "data" / "maps.json"

# 美术源里的图中文名 → 数据表 id
MAP_IDS = {
    "MAP-ANV-01_峡谷哨站": ("MAP-ANV-01", "峡谷哨站", "ANV"),
    "MAP-ANV-02_双闸峡谷": ("MAP-ANV-02", "双闸峡谷", "ANV"),
    "MAP-TID-01_腐殖洼地": ("MAP-TID-01", "腐殖洼地", "TID"),
    "MAP-AST-01_棱镜回廊": ("MAP-AST-01", "棱镜回廊", "AST"),
    "MAP-AST-02_棱镜双子回廊": ("MAP-AST-02", "棱镜双子回廊", "AST"),
    "MAP-MULTI-01_双岔要塞": ("MAP-MULTI-01", "双岔要塞", "MULTI"),
}

# 出图里的短标签 → 地形 id（受 30px 圆限制，部分标签被出图截断）
TERRAIN_LABELS = {
    "高台": "high_ground",
    "沼泽": "swamp",
    "腐蚀地": "corrosive",
    "共鸣石": "resonance_stone",
    "虚空": "void",
    "合流点": "confluence",
    "可破坏": "destructible",
    "工事平": "fort_platform",
    "铁闸": "iron_gate",
    "棱镜厅": "prism_hall",
}

# 地形效果（策划 19 号卡表 + 06 号文档第二节）；引擎按此实现，数据在此集中声明
TERRAIN_EFFECTS = {
    "high_ground": {"label": "高台", "desc": "相邻塔位射程 +15%", "range_bonus": 0.15, "radius": 2.0},
    "swamp": {"label": "沼泽", "desc": "范围内敌方移速 −20%", "enemy_speed": -0.20, "radius": 2.0},
    "corrosive": {"label": "腐蚀地", "desc": "范围内敌方 2 伤害/s；虫群卡腐蚀伤害 +10%",
                  "enemy_dps": 2.0, "faction_corrosion_bonus": 0.10, "radius": 2.0},
    "resonance_stone": {"label": "共鸣石", "desc": "相邻共鸣计数 +1", "resonance_count": 1, "radius": 2.0},
    "void": {"label": "虚空", "desc": "不可放置", "unbuildable": True, "radius": 1.2},
    "confluence": {"label": "合流点", "desc": "范围内敌人 +10% 受伤", "enemy_damage_taken": 0.10, "radius": 2.0},
    "destructible": {"label": "可破坏地形", "desc": "可被破坏的桥/闸（M2 实现）", "radius": 1.2},
    "fort_platform": {"label": "工事平台", "desc": "其上工事卡生命 +20%", "fort_hp_bonus": 0.20, "radius": 1.2},
    "iron_gate": {"label": "可破坏铁闸", "desc": "中段铁闸，双路在此合流（M2 实现）", "radius": 1.2},
    "prism_hall": {"label": "棱镜厅", "desc": "合流点使共鸣范围 +1", "resonance_radius": 1, "radius": 2.0},
}


def strip_decorations(svg: str) -> str:
    """去掉 defs 与右下角图例，只留战场几何。"""
    svg = re.sub(r"<defs>.*?</defs>", "", svg, flags=re.S)
    svg = re.sub(r'<g transform="translate\(650,568\)">.*?</g>', "", svg, flags=re.S)
    return svg


def parse_paths(svg: str) -> list[list[list[float]]]:
    """抽取路径折线（去重：出图里每条路径画了两遍——宽底 + 虚线）。"""
    seen: list[str] = []
    result: list[list[list[float]]] = []
    for d in re.findall(r'<path d="([^"]+)"', svg):
        pts = [[float(x), float(y)] for x, y in re.findall(r"[ML]\s*([\d.]+)\s+([\d.]+)", d)]
        if len(pts) < 2:
            continue
        key = json.dumps(pts)
        if key in seen:
            continue
        seen.append(key)
        result.append(pts)
    return result


def parse_ring(svg: str) -> dict | None:
    """环形地图（MAP-AST-01）用 ellipse 表示闭合回路。"""
    m = re.search(r'<ellipse cx="([\d.]+)" cy="([\d.]+)" rx="([\d.]+)" ry="([\d.]+)"', svg)
    if not m:
        return None
    cx, cy, rx, ry = (float(v) for v in m.groups())
    return {"cx": cx, "cy": cy, "rx": rx, "ry": ry}


def parse_slots(svg: str, fill: str, rotate: bool) -> list[list[float]]:
    out = []
    pat = re.compile(
        r'<rect x="([\d.]+)" y="([\d.]+)" width="18" height="18" rx="4" fill="' + fill + r'"'
    )
    for x, y in pat.findall(svg):
        out.append([float(x) + 9.0, float(y) + 9.0])  # 18×18 的中心
    return out


def parse_modifier_slots(svg: str) -> list[list[float]]:
    # 修饰位＝半径 7 的琥珀色圆点（图例已剔除，不会有误命中）
    return [[float(x), float(y)] for x, y in re.findall(r'<circle cx="([\d.]+)" cy="([\d.]+)" r="7"', svg)]


def parse_terrain(svg: str) -> list[dict]:
    out = []
    pat = re.compile(
        r'<circle cx="([\d.]+)" cy="([\d.]+)" r="15" fill="#5FE3D6"[^>]*/>\s*'
        r'<text[^>]*>([^<]*)</text>',
        re.S,
    )
    for x, y, label in pat.findall(svg):
        label = label.strip()
        tid = TERRAIN_LABELS.get(label)
        if tid is None:
            raise SystemExit(f"[fail] 未知地形标签：{label!r}（请补进 TERRAIN_LABELS）")
        out.append({"id": tid, "x": float(x), "y": float(y)})
    return out


def parse_entrances(svg: str) -> list[dict]:
    out = []
    for points in re.findall(r'<polygon points="([^"]+)" fill="#E4533C"', svg):
        pts = [[float(a), float(b)] for a, b in re.findall(r"([\d.]+),([\d.]+)", points)]
        if len(pts) != 3:
            continue
        # 三角形：第一个点是尖端（在左），后两点是箭头尾
        tip = pts[0]
        out.append({"x": tip[0], "y": tip[1]})
    return out


def parse_base(svg: str) -> dict | None:
    m = re.search(r'<rect x="([\d.]+)" y="([\d.]+)" width="28" height="28" rx="5"', svg)
    if not m:
        return None
    x, y = (float(v) for v in m.groups())
    return {"x": x + 14.0, "y": y + 14.0}


def parse_meta(svg: str) -> dict:
    m = re.search(r'塔位 标准 (\d+) / 支援 (\d+) / 修饰 (\d+).*?事件槽 (\d+)', svg)
    meta = {}
    if m:
        meta = {
            "slots_standard": int(m.group(1)),
            "slots_support": int(m.group(2)),
            "slots_modifier": int(m.group(3)),
            "event_slots": int(m.group(4)),
        }
    m2 = re.search(r"单入口|双入口", svg)
    if m2:
        meta["dual_entry"] = m2.group(0) == "双入口"
    return meta


def build_map(name: str) -> dict:
    svg = strip_decorations((MAP_SVG_DIR / f"{name}.svg").read_text(encoding="utf-8"))
    map_id, cn_name, faction = MAP_IDS[name]
    paths = parse_paths(svg)
    ring = parse_ring(svg)
    entry = {
        "id": map_id,
        "name": cn_name,
        "faction": faction,
        "image": f"res://assets/maps/{name}.png",
        "svg": f"doc/refu-game-001/美术/全量出图/地图/{name}.svg",
        "canvas": {"width": 980, "height": 660},
        "grid": {"x0": 22, "y0": 26, "cols": 10, "rows": 8, "cell_w": 90, "cell_h": 72},
        "entrances": parse_entrances(svg),
        "base": parse_base(svg),
        "paths": paths,
        "ring": ring,
        "slots": {
            "standard": parse_slots(svg, "#2F4A63", False),
            "support": parse_slots(svg, "#7C3AED", True),
            "modifier": parse_modifier_slots(svg),
        },
        "terrain": parse_terrain(svg),
    }
    entry.update(parse_meta(svg))
    return entry


def main() -> int:
    ap = argparse.ArgumentParser(description="从地图卡出图抽取战场布局")
    ap.add_argument("--write", action="store_true", help="写入 game/data/maps.json")
    ap.add_argument("--check", action="store_true", help="校验 maps.json 与 SVG 一致")
    args = ap.parse_args()

    svg_files = sorted(MAP_SVG_DIR.glob("*.svg"))
    names = [p.stem for p in svg_files]
    unknown = [n for n in names if n not in MAP_IDS]
    if unknown:
        print(f"[fail] 有地图未登记 id：{unknown}", file=sys.stderr)
        return 2

    maps = [build_map(n) for n in names]
    payload = {
        "_note": "本文件由 tools/extract_map_data.py 从地图卡出图抽取；坐标为 SVG 原始像素，引擎按 grid 换算。",
        "terrain_defs": TERRAIN_EFFECTS,
        "maps": maps,
    }
    text = json.dumps(payload, ensure_ascii=False, indent=2) + "\n"

    if args.check:
        if not OUT_PATH.is_file():
            print(f"[fail] 缺少 {OUT_PATH}", file=sys.stderr)
            return 2
        if OUT_PATH.read_text(encoding="utf-8") != text:
            print("[fail] maps.json 与地图出图不一致，请重跑 --write", file=sys.stderr)
            return 1
        print(f"地图数据校验：PASS（{len(maps)} 张地图与出图一致）")
        return 0

    if args.write:
        OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
        OUT_PATH.write_text(text, encoding="utf-8")
        print(f"已写入 {OUT_PATH.relative_to(PROJECT_ROOT)}：{len(maps)} 张地图")
        for m in maps:
            print(f"  {m['id']} {m['name']}：路径 {len(m['paths'])} 条"
                  f"，标准 {len(m['slots']['standard'])}/支援 {len(m['slots']['support'])}"
                  f"/修饰 {len(m['slots']['modifier'])}，地形 {len(m['terrain'])}")
        return 0

    print(text)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
