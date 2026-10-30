extends RefCounted
class_name BattleWorld
## BattleWorld —— 战场的静态几何：路径与"场"（地形效果、残留减速、伤害场）。

## 建路径（单入口 1 条、双入口 2 条；环形图由 PathGeom 采样成折线）。
static func build_paths(bt: BattleState) -> void:
	bt.paths.clear()
	var path_count: int = maxi(1, (bt.map_data.get("paths", []) as Array).size())
	for i in path_count:
		bt.paths.append(PathGeom.from_map_path(bt.map_data, i))


static func field(kind: String, pos: Vector2, radius: float, value: float, source: String,
		until: float = -1.0, source_uid: int = 0) -> Dictionary:
	return {"kind": kind, "pos": pos, "radius": radius, "value": value,
			"source": source, "until": until, "source_uid": source_uid}


## 地形卡 → 场：高台给射程、沼泽给减速、腐蚀地给持续伤害、合流点给易伤……
## 一张地形可产出多个场，全部由 maps.json 的 terrain_defs 声明驱动，代码不认具体地形。
static func build_terrain_fields(bt: BattleState) -> void:
	for tile in bt.map_data.get("terrain", []):
		var def := GameData.terrain_def(String(tile.get("id", "")))
		if def.is_empty():
			continue
		var pos := Vector2(tile["x"], tile["y"])
		var radius := float(def.get("radius", 1.5)) * bt.range_unit
		if def.has("range_bonus"):
			bt.fields.append(field("range", pos, radius, def["range_bonus"], "terrain"))
		if def.has("enemy_speed"):
			bt.fields.append(field("slow", pos, radius, def["enemy_speed"], "terrain"))
		if def.has("enemy_dps"):
			bt.fields.append(field("enemy_damage", pos, radius, def["enemy_dps"], "terrain"))
		if def.has("enemy_damage_taken"):
			bt.fields.append(field("vulnerable", pos, radius, def["enemy_damage_taken"], "terrain"))
		if def.has("fort_hp_bonus"):
			bt.fields.append(field("fort_hp", pos, radius, def["fort_hp_bonus"], "terrain"))
		if def.has("unbuildable"):
			bt.fields.append(field("unbuildable", pos, radius, 0.0, "terrain"))
