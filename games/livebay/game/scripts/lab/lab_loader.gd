# LiveBay · 自由模式实验加载器
# 只读 game/data/lab/scenarios；白名单覆盖，不写主线数据。
class_name LiveBayLabLoader
extends RefCounted

const DataLoaderScript = preload("res://scripts/core/data_loader.gd")
const DIR := "res://data/lab/scenarios"


static func load_all() -> Array:
	var out: Array = []
	var path := ProjectSettings.globalize_path(DIR)
	if not DirAccess.dir_exists_absolute(path):
		return out
	for file: String in DirAccess.get_files_at(DIR):
		if not file.ends_with(".json"):
			continue
		var parsed: Variant = JSON.parse_string(FileAccess.get_file_as_string(DIR.path_join(file)))
		if parsed is Dictionary and int(parsed.get("schema_version", 0)) == 1:
			out.append(parsed)
	out.sort_custom(func(a: Dictionary, b: Dictionary) -> bool: return str(a.get("id", "")) < str(b.get("id", "")))
	return out


static func apply(scenario: Dictionary) -> Dictionary:
	var base: Dictionary = scenario.get("base", {})
	var map_id := str(base.get("map", "bay01"))
	var data: Dictionary = DataLoaderScript.load_mission_pack("res://data", map_id)
	if data.is_empty():
		return {}
	var overrides: Dictionary = scenario.get("overrides", {})
	var balance: Dictionary = overrides.get("balance", {})
	if balance.has("starting_energy"):
		var delta := float(balance.starting_energy)
		data.profession["start_energy"] = float(data.profession.get("start_energy", 90.0)) + delta
		data.balance["starting_energy"] = float(data.balance.get("starting_energy", 90.0)) + delta
	if balance.has("starting_integrity"):
		data.balance["starting_integrity"] = float(data.balance.get("starting_integrity", 100.0)) + float(balance.starting_integrity)
	var waves: Dictionary = overrides.get("waves", {})
	var hp_scale := float(waves.get("hp_scale", 1.0))
	var speed_scale := float(waves.get("speed_scale", 1.0))
	var count_scale := float(waves.get("count_scale", 1.0))
	if not is_equal_approx(hp_scale, 1.0) or not is_equal_approx(speed_scale, 1.0):
		for e: Variant in data.enemies:
			e.hp = float(e.hp) * hp_scale
			e.speed = float(e.speed) * speed_scale
	if not is_equal_approx(count_scale, 1.0):
		for w: Dictionary in data.waves:
			for g: Dictionary in w.get("groups", []):
				g.count = maxi(1, int(round(float(g.count) * count_scale)))
	data["lab_meta"] = {
		"id": str(scenario.get("id", "")),
		"name": str(scenario.get("name", "")),
		"tags": scenario.get("tags", {}),
		"fault_bonus": float(overrides.get("fault_bonus", 0.0)),
	}
	return data
