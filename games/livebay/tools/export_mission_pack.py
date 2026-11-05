#!/usr/bin/env python3
"""从 numbers/ 编译 LiveBay MissionPack 清单。

用法（在 games/livebay/ 下）：
    python3 tools/export_mission_pack.py          # 写入 game/data/mission_pack.json
    python3 tools/export_mission_pack.py --check  # 校验清单是否最新

清单只包含 pack 元数据与内容 hash；具体数据仍在 game/data/*.json。
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
SCHEMA_VERSION = 1


def build_manifest() -> dict:
    tables = numbers.collect()
    enemies = numbers.build_enemies(tables["enemies"])
    enemy_ids = {e["id"] for e in enemies}
    payload = {
        "map": numbers.build_map(tables),
        "waves": numbers.build_waves(tables["waves"], enemy_ids),
        "profession": numbers.build_profession(tables["profession"]),
        "towers": numbers.build_towers(tables["towers"]),
        "enemies": enemies,
        "balance": numbers.build_balance(tables["balance"]),
    }
    canonical = json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return {
        "schema_version": SCHEMA_VERSION,
        "pack_id": "livebay.bay01",
        "version": "0.1.0",
        "hash": "sha256:" + hashlib.sha256(canonical.encode("utf-8")).hexdigest(),
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
        print("mission_pack: 清单一致")
        return
    OUT.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"mission_pack: 写入 {OUT.relative_to(PROJECT)}")


if __name__ == "__main__":
    main()
