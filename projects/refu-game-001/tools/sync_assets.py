#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""sync_assets.py —— 把 doc/refu-game-001/美术/ 的出图同步进 Godot 工程 game/assets/。

为什么需要它：美术源（SVG + PNG 预览）属于策划卷 doc/refu-game-001/美术/，
是"唯一数值与版式来源"；Godot 的 res:// 只能加载工程内文件，所以在游戏工程里
保留一份**派生副本**，并由本脚本负责同步。改美术 = 重跑本脚本，不手改 assets。

用法：
    python3 tools/sync_assets.py            # 同步（幂等，内容不同才覆盖）
    python3 tools/sync_assets.py --check    # 只校验：工程内副本与美术源是否一致
    python3 tools/sync_assets.py --all      # 连同尚未进入 M1 的卡面一起同步

约定：只同步 PNG（Godot 的 SVG 导入不支持 feTurbulence/feGaussianBlur 等滤镜，
SVG 里的质感层会丢失），因此运行资源统一用 PNG 预览。
"""

from __future__ import annotations

import argparse
import hashlib
import shutil
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = PROJECT_ROOT.parents[1]
ART_ROOT = REPO_ROOT / "doc" / "refu-game-001" / "美术" / "全量出图"
ASSET_ROOT = PROJECT_ROOT / "game" / "assets"

# M1 垂直切片：铁砧联邦 12 卡（含齿轮帮支援 3 张）。
M1_CARDS = [
    "ANV-T01_模块炮塔", "ANV-T02_交叉火力网", "ANV-T03_磁轨钉枪", "ANV-T04_路障工事",
    "ANV-M01_齿轮帮·维修工", "ANV-M02_齿轮帮·搬运工", "ANV-M03_齿轮帮·路障小队",
    "ANV-S01_过载射击", "ANV-S02_应急修复",
    "ANV-X01_交叉火力", "ANV-X02_贫铀弹芯", "ANV-X03_模块化基座",
]

# 六张地图与十张单位设定图：体积小，一次性备齐，供关卡选择与图鉴使用。
MAPS = [
    "MAP-ANV-01_峡谷哨站", "MAP-ANV-02_双闸峡谷", "MAP-TID-01_腐殖洼地",
    "MAP-AST-01_棱镜回廊", "MAP-AST-02_棱镜双子回廊", "MAP-MULTI-01_双岔要塞",
]

UNITS = [
    "ENM_小兵_Grunt", "ENM_快速_Runner", "ENM_装甲_Armored",
    "ENM_空中_Air", "ENM_精英_Elite", "ENM_BOSS_Boss",
    "MIN_铆钉_齿轮帮·维修工", "MIN_秤_齿轮帮·搬运工",
    "MIN_芽_孢子侍从", "MIN_棱_光尘侍从·记录员",
]


def all_card_names() -> list[str]:
    """美术源里全部 36 张卡面的文件名（不含扩展名）。"""
    return sorted(p.stem for p in (ART_ROOT / "卡面" / "PNG预览").glob("*.png"))


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as fp:
        for chunk in iter(lambda: fp.read(1 << 16), b""):
            h.update(chunk)
    return h.hexdigest()


def plan(include_all_cards: bool) -> list[tuple[Path, Path]]:
    """返回 (源文件, 目标文件) 列表。"""
    cards = all_card_names() if include_all_cards else M1_CARDS
    items: list[tuple[Path, Path]] = []
    for name in cards:
        items.append((ART_ROOT / "卡面" / "PNG预览" / f"{name}.png", ASSET_ROOT / "cards" / f"{name}.png"))
    for name in MAPS:
        items.append((ART_ROOT / "地图" / "PNG预览" / f"{name}.png", ASSET_ROOT / "maps" / f"{name}.png"))
    for name in UNITS:
        items.append((ART_ROOT / "单位" / "PNG预览" / f"{name}.png", ASSET_ROOT / "units" / f"{name}.png"))
    return items


def main() -> int:
    ap = argparse.ArgumentParser(description="同步美术出图到 Godot 工程")
    ap.add_argument("--check", action="store_true", help="只校验一致性，不写入")
    ap.add_argument("--all", action="store_true", help="同步全部 36 张卡面（默认只同步 M1 的 12 张）")
    args = ap.parse_args()

    if not ART_ROOT.is_dir():
        print(f"[fail] 找不到美术源目录：{ART_ROOT}", file=sys.stderr)
        return 2

    items = plan(args.all)
    missing_src, copied, same, stale = [], [], [], []
    for src, dst in items:
        if not src.is_file():
            missing_src.append(src)
            continue
        if args.check:
            if not dst.is_file():
                stale.append(dst)
            elif sha256(src) != sha256(dst):
                stale.append(dst)
            else:
                same.append(dst)
            continue
        dst.parent.mkdir(parents=True, exist_ok=True)
        if dst.is_file() and sha256(src) == sha256(dst):
            same.append(dst)
            continue
        shutil.copy2(src, dst)
        copied.append(dst)

    if missing_src:
        for p in missing_src:
            print(f"[fail] 美术源缺失：{p}", file=sys.stderr)
        return 2

    if args.check:
        print(f"一致性校验：{len(same)} 个一致，{len(stale)} 个缺失/不一致")
        for p in stale:
            print(f"  [stale] {p.relative_to(PROJECT_ROOT)}")
        return 1 if stale else 0

    print(f"同步完成：新写入 {len(copied)} 个，已最新 {len(same)} 个")
    for p in copied:
        print(f"  [copy] {p.relative_to(PROJECT_ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
