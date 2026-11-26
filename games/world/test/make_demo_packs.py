#!/usr/bin/env python3
"""生成 2D 场景 Demo 包的最小内容模板；已有内容不会被覆盖，除非显式 --force。"""
import json, sys
from pathlib import Path

DEMOS = [
    ("dock", "夜班货运", "货运码头", "调度员", "货舱门", "通行证", "20:10"),
    ("kitchen", "午夜食堂", "夜班食堂", "厨师", "后厨门", "餐券", "23:20"),
    ("clinic", "诊所值班", "港湾诊所", "值班护士", "药房门", "处方卡", "07:40"),
    ("tram", "末班电车", "环线电车", "司机", "驾驶室门", "车票", "22:50"),
    ("library", "闭馆之后", "旧档案馆", "档案员", "密库门", "借阅证", "18:30"),
    ("rooftop", "屋顶气象站", "气象站", "观测员", "设备门", "风速记录", "16:10"),
    ("archive", "档案室", "地下档案室", "管理员", "影像库门", "索引卡", "21:00"),
    ("blackout", "停电夜", "配电间", "电工", "总闸门", "保险丝", "01:20"),
    ("farm", "温室补给", "补给温室", "园丁", "种子库门", "补给单", "09:15"),
    ("station", "信号站", "山顶信号站", "值守员", "机房", "频率卡", "19:40"),
]

def write(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")

def make(slug, title, zone_name, actor_name, door_name, item_name, start):
    pid = f"demo.{slug}"
    root = Path("data") / pid
    if root.exists() and "--force" not in sys.argv:
        print(f"skip {pid} (exists)")
        return
    write(root / "pack.json", {
        "schema": 1, "id": pid, "version": "0.1.0", "core_api": ">=0.1 <0.2",
        "kits": ["core", "interaction", "inventory", "quest", "dialogue", "director", "save_profile"],
        "entry": {"world": f"world/{slug}.world.json", "start_zone": f"zone.{slug}"},
        "sim_profile": "arcade", "tick_hz": 60, "loc": ["loc/zh-CN.json"],
        "requires": [], "optional": [], "conflicts": [],
    })
    write(root / f"world/{slug}.world.json", {
        "id": f"world.{slug}", "start_zone": f"zone.{slug}", "start_time": start,
        "seed": 20261200 + len(DEMOS), "player": {"at": [0, 0, 0], "inventory": []},
    })
    write(root / f"world/zones/{slug}.zone.json", {
        "id": f"zone.{slug}", "name": f"loc:zone.{slug}.name",
        "bounds": {"min": [-12, 0, -12], "max": [12, 8, 12]},
        "placements": [
            {"actor": f"demo.{slug}.guide", "at": [3, 0, -2], "yaw": 180, "persistent_id": "guide"},
            {"prop": f"demo.{slug}.door", "at": [0, 0, 6], "yaw": 0, "persistent_id": "door"},
            {"item": f"item.{slug}.key", "at": [2, 0, 2], "yaw": 0, "persistent_id": "key"},
        ],
    })
    write(root / f"world/actors/{slug}.guide.actor.json", {
        "id": f"demo.{slug}.guide", "name": f"loc:actor.{slug}.name",
        "tags": ["npc", "human", slug], "body": {"shape": "capsule", "radius": 0.35, "height": 1.7},
        "stats": {"health": 100, "speed": 3.0},
        "brain": {"profile": "schedule", "schedule": f"schedule.{slug}"},
        "inventory": {"items": []}, "dialogue": f"dlg.{slug}.intro",
    })
    write(root / f"world/props/{slug}.door.prop.json", {
        "id": f"demo.{slug}.door", "name": f"loc:prop.{slug}.door.name",
        "tags": ["prop", "door", slug], "body": {"shape": "aabb", "size": [1.2, 2.2, 0.4]},
        "interactable": {"verbs": ["interact"]}, "locked_by": f"item.{slug}.key",
    })
    write(root / f"world/items/{slug}.key.item.json", {
        "id": f"item.{slug}.key", "name": f"loc:item.{slug}.key.name",
        "stack": 1, "tags": ["key", slug],
    })
    write(root / f"schedules/{slug}.schedule.json", {
        "id": f"schedule.{slug}", "entries": [
            {"from": "06:00", "to": "18:00", "behavior": "work", "at": f"zone.{slug}"},
            {"from": "18:00", "to": "06:00", "behavior": "wander", "at": f"zone.{slug}"},
        ],
    })
    write(root / f"dialogue/{slug}.dlg.json", {
        "id": f"dlg.{slug}.intro", "start": "greet", "nodes": {
            "greet": {"speaker": f"demo.{slug}.guide", "text": f"loc:dlg.{slug}.greet", "choices": [
                {"text": f"loc:dlg.{slug}.ask", "next": "task"}, {"text": f"loc:dlg.{slug}.bye", "next": "end"}]},
            "task": {"speaker": f"demo.{slug}.guide", "text": f"loc:dlg.{slug}.task", "next": "end"},
            "end": {"end": True},
        },
    })
    write(root / f"quests/{slug}.quest.json", {
        "id": f"quest.{slug}", "title": f"loc:quest.{slug}.title", "auto_start": True,
        "objectives": [
            {"kind": "talk", "target": f"demo.{slug}.guide"},
            {"kind": "flag", "flag": f"flag.{slug}.open", "value": True},
        ],
        "rewards": [{"kind": "flag", "flag": f"flag.quest.{slug}.done", "value": True}],
    })
    write(root / f"rules/{slug}.rule.json", {
        "id": f"rule.{slug}", "on": "interact", "target": f"demo.{slug}.door",
        "when": [{"kind": "has_item", "item": f"item.{slug}.key"}],
        "then": [
            {"kind": "open_door"}, {"kind": "set_flag", "flag": f"flag.{slug}.open", "value": True},
            {"kind": "emit", "event": f"{slug}.opened"},
        ],
        "else": [{"kind": "toast", "text": f"loc:{slug}.locked"}],
    })
    write(root / "loc/zh-CN.json", {
        f"zone.{slug}.name": zone_name, f"actor.{slug}.name": actor_name,
        f"prop.{slug}.door.name": door_name, f"item.{slug}.key.name": item_name,
        f"quest.{slug}.title": title, f"dlg.{slug}.greet": f"{actor_name}抬头看了你一眼。",
        f"dlg.{slug}.ask": "这里需要我做什么？", f"dlg.{slug}.task": f"拿上{item_name}，去开{door_name}。",
        f"dlg.{slug}.bye": "回头见。", f"{slug}.locked": f"{door_name}锁着。",
    })
    write(root / f"tests/{slug}.test.json", {
        "name": slug, "ticks": 60, "steps": [
            {"tick": 10, "command": {"op": "talk", "actor": "player", "target": f"demo.{slug}.guide"}},
            {"tick": 20, "command": {"op": "pickup", "actor": "player", "target": f"item.{slug}.key"}},
            {"tick": 30, "command": {"op": "interact", "actor": "player", "target": f"demo.{slug}.door"}},
        ],
        "expect": {
            "flags": {f"flag.{slug}.open": True, f"flag.quest.{slug}.done": True},
            "quests": {f"quest.{slug}": "completed"},
            "inventory": {f"item.{slug}.key": 1},
            "events": ["door_opened", "quest_completed", "item_acquired", "dialogue_started"],
        },
    })
    print(f"made {pid}")

for args in DEMOS:
    make(*args)
