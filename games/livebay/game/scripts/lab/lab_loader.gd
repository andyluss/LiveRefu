# LiveBay · 自由模式实验加载器
# 只读 game/data/lab/scenarios；白名单覆盖，不写主线数据。
class_name LiveBayLabLoader
extends RefCounted

const DataLoaderScript = preload("res://scripts/core/data_loader.gd")
const DIR := "res://data/lab/scenarios"
const ALLOWED_CAPS := ["towers", "waves", "economy", "fault", "procedures", "survival"]


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
	var caps: Variant = scenario.get("capabilities", ["towers", "waves", "economy"])
	if not (caps is Array):
		return {}
	for c: Variant in caps:
		if str(c) not in ALLOWED_CAPS:
			return {}
	data = data.duplicate(true)
	var overrides: Dictionary = scenario.get("overrides", {})
	var disabled_towers: Array = overrides.get("towers", {}).get("disabled", [])
	for t: Variant in disabled_towers:
		if not data.towers_by_id.has(str(t)):
			return {}
	data["tower_disabled"] = disabled_towers
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
		"mode": str(scenario.get("mode", "tower_defense")),
		"tags": scenario.get("tags", {}),
		"capabilities": caps,
		"fault_bonus": float(overrides.get("fault_bonus", 0.0)),
		"survival": scenario.get("survival", {}),
	}
	return data


static func diff(scenario: Dictionary) -> Dictionary:
	var base: Dictionary = DataLoaderScript.load_mission_pack("res://data", str(scenario.get("base", {}).get("map", "bay01")))
	var applied: Dictionary = apply(scenario)
	if base.is_empty() or applied.is_empty():
		return {}
	var overrides: Dictionary = scenario.get("overrides", {})
	var out := {
		"base_map": str(base.get("map_id", "")),
		"starting_energy": {"base": float(base.get("profession", {}).get("start_energy", 0.0)), "lab": float(applied.get("profession", {}).get("start_energy", 0.0))},
		"starting_integrity": {"base": float(base.get("balance", {}).get("starting_integrity", 0.0)), "lab": float(applied.get("balance", {}).get("starting_integrity", 0.0))},
		"enemy_hp_scale": float(overrides.get("waves", {}).get("hp_scale", 1.0)),
		"enemy_speed_scale": float(overrides.get("waves", {}).get("speed_scale", 1.0)),
		"wave_count_scale": float(overrides.get("waves", {}).get("count_scale", 1.0)),
		"fault_bonus": float(overrides.get("fault_bonus", 0.0)),
	}
	return out


static func export_candidate(scenario: Dictionary) -> String:
	var diff_data := diff(scenario)
	if diff_data.is_empty():
		return ""
	var dir := "user://lab/candidates"
	DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path(dir))
	var path := dir.path_join(str(scenario.get("id", "candidate")).replace(".", "_") + ".json")
	var payload := {
		"schema_version": 1,
		"generated_at": Time.get_datetime_string_from_system(),
		"scenario": scenario,
		"diff": diff_data,
		"note": "候选方案，不自动进入主线；需人类评审。",
	}
	var file := FileAccess.open(path, FileAccess.WRITE)
	if file == null:
		return ""
	file.store_string(JSON.stringify(payload, "\t"))
	file.close()
	return path


static func export_scenario(scenario: Dictionary) -> String:
	var dir := "user://lab/exports"
	DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path(dir))
	var path := dir.path_join(str(scenario.get("id", "scenario")).replace(".", "_") + ".json")
	var file := FileAccess.open(path, FileAccess.WRITE)
	if file == null:
		return ""
	file.store_string(JSON.stringify(scenario, "\t"))
	file.close()
	return path


static func import_scenario(path: String) -> Dictionary:
	if not FileAccess.file_exists(path):
		return {}
	var parsed: Variant = JSON.parse_string(FileAccess.get_file_as_string(path))
	if not (parsed is Dictionary) or int(parsed.get("schema_version", 0)) != 1:
		return {}
	if str(parsed.get("id", "")).is_empty() or not parsed.has("base") or not parsed.has("overrides"):
		return {}
	var base: Dictionary = parsed.get("base", {})
	if str(base.get("map", "")).is_empty():
		return {}
	return parsed
