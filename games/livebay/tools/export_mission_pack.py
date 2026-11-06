#!/usr/bin/env python3
"""从 numbers/ 编译 LiveBay MissionPack 目录。

用法（在 games/livebay/ 下）：
    python3 tools/export_mission_pack.py          # 写入 game/data/mission_pack.json
    python3 tools/export_mission_pack.py --check  # 校验清单是否最新

schema 2 起，mission_pack.json 是【目录】而不是单个 bay01 包：
  - default_map 明确默认地图；
  - packs 下每张地图各有 pack_id / map_id / version / hash；
  - DataLoader 按 map_id 选择对应条目，不再把 bay01 清单套到 bay02/03。
具体数据仍在 game/data/*.json。
规则：TECH-A1（单一数据源）、TECH-B2（验收与不回归）。
"""

from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

PROJECT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT / "tools"))
import export_numbers as numbers  # noqa: E402

OUT = PROJECT / "game" / "data" / "mission_pack.json"
SCHEMA_VERSION = 2
CATALOG_VERSION = "0.2.0"
DEFAULT_MAP = "bay01"


def _pack_entry(map_id: str, map_data: dict, waves: list, common: dict) -> dict:
    payload = {
        "map": map_data,
        "waves": waves,
        "profession": common["profession"],
        "towers": common["towers"],
        "enemies": common["enemies"],
        "balance": common["balance"],
        "procedures": common["procedures"],
        "contracts": common["contracts"],
        "residents": common["residents"],
    }
    canonical = json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return {
        "schema_version": SCHEMA_VERSION,
        "pack_id": f"livebay.{map_id}",
        "map_id": map_id,
        "version": CATALOG_VERSION,
        "hash": "sha256:" + hashlib.sha256(canonical.encode("utf-8")).hexdigest(),
    }


def build_manifest() -> dict:
    tables = numbers.collect()
    enemies = numbers.build_enemies(tables["enemies"])
    enemy_ids = {e["id"] for e in enemies}
    common = {
        "profession": numbers.build_profession(tables["profession"]),
        "towers": numbers.build_towers(tables["towers"]),
        "enemies": enemies,
        "balance": numbers.build_balance(tables["balance"]),
        "procedures": json.loads((PROJECT / "game" / "data" / "procedures.json").read_text(encoding="utf-8")),
        "contracts": json.loads((PROJECT / "game" / "data" / "contracts.json").read_text(encoding="utf-8")),
        "residents": json.loads((PROJECT / "game" / "data" / "residents.json").read_text(encoding="utf-8")),
    }
    maps = {
        "bay01": (numbers.build_map(tables), numbers.build_waves(tables["waves"], enemy_ids)),
        "bay02": (numbers.build_map(tables, "map2"), numbers.build_waves(tables["waves2"], enemy_ids)),
        "bay03": (numbers.build_map(tables, "map3"), numbers.build_waves(tables["waves3"], enemy_ids)),
    }
    return {
        "schema_version": SCHEMA_VERSION,
        "catalog_id": "livebay.maps",
        "version": CATALOG_VERSION,
        "default_map": DEFAULT_MAP,
        "packs": {map_id: _pack_entry(map_id, map_data, waves, common) for map_id, (map_data, waves) in maps.items()},
    }


def main() -> None:
    manifest = build_manifest()
    if "--check" in sys.argv:
        if not OUT.exists():
            print("mission_pack: 缺少 game/data/mission_pack.json", file=sys.stderr)
            raise SystemExit(1)
        current = json.loads(OUT.read_text(encoding="utf-8"))
        if current != manifest:
            print("mission_pack: 清单过期，请运行 python3 tools/export_mission_pack.py", file=sys.stderr)
            raise SystemExit(1)
        print("mission_pack: 目录一致（bay01/bay02/bay03）")
        return
    OUT.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"mission_pack: 写入 {OUT.relative_to(PROJECT)}")


if __name__ == "__main__":
    main()
