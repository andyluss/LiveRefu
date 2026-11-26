#!/usr/bin/env python3
"""生成 5000 个静态 prop 的最小内容包，用于 Godot 渲染/视图同步基准。"""
import json
import sys
from pathlib import Path

out = Path(sys.argv[1] if len(sys.argv) > 1 else "dist/5k-src")
out.mkdir(parents=True, exist_ok=True)
(out / "world/zones").mkdir(parents=True, exist_ok=True)
(out / "world/props").mkdir(parents=True, exist_ok=True)

(out / "pack.json").write_text(json.dumps({
    "schema": 1, "id": "demo.5k", "version": "0.1.0",
    "core_api": ">=0.1 <0.2", "kits": ["core"],
    "entry": {"world": "world/5k.world.json", "start_zone": "zone.5k"},
    "sim_profile": "arcade", "tick_hz": 60,
    "requires": [], "optional": [], "conflicts": [],
}, ensure_ascii=False, indent=2) + "\n")
(out / "world/5k.world.json").write_text(json.dumps({
    "id": "world.5k", "start_zone": "zone.5k", "start_time": "08:00",
    "seed": 20261126, "player": {"at": [0, 0, 0], "inventory": []},
}, ensure_ascii=False, indent=2) + "\n")
(out / "world/props/crate.prop.json").write_text(json.dumps({
    "id": "demo.crate", "name": "crate", "tags": ["bench"],
    "body": {"shape": "aabb", "size": [0.5, 0.5, 0.5]},
    "interactable": {"verbs": ["inspect"]},
}, ensure_ascii=False, indent=2) + "\n")
placements = []
for i in range(5000):
    x = (i % 100) * 1.5 - 75.0
    z = (i // 100) * 1.5 - 37.5
    placements.append({"prop": "demo.crate", "at": [x, 0, z], "yaw": 0, "persistent_id": f"crate-{i}"})
(out / "world/zones/5k.zone.json").write_text(json.dumps({
    "id": "zone.5k", "name": "5k",
    "bounds": {"min": [-90, 0, -60], "max": [90, 8, 60]},
    "placements": placements,
}, ensure_ascii=False, indent=2) + "\n")
print(out)
