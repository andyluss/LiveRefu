# LiveBay · 数据读取与校验
# 职责：读取 data/*.json，做最小完整性校验，返回 Sim 可直接使用的字典。
# 所有内容都是【工程占位】，改设定优先改 JSON，不要改这里。
# 规则：TECH-A1（单一数据源）、DES-C1（数值与场景引用）
class_name DataLoader
extends RefCounted

const DATA_DIR := "res://data"
const MissionPackScript = preload("res://scripts/content/mission_pack.gd")

const REQUIRED_TOWER_FIELDS := ["id", "name", "cost", "range", "damage", "fire_rate", "kind"]
const REQUIRED_ENEMY_FIELDS := ["id", "name", "hp", "speed", "reward", "leak_damage", "radius", "shape"]
const REQUIRED_BALANCE_FIELDS := [
	"starting_energy",
	"starting_integrity",
	"sell_refund",
	"max_tower_level",
	"upgrade_cost_factor",
	"upgrade_damage_factor",
	"upgrade_range_factor",
	"prepare_time",
	"between_wave_time",
	"upgrade_income_factor",
	"upgrade_repair_factor",
	"grade_s_ratio",
	"grade_a_ratio",
	"grade_b_ratio",
]


static func load_json(path: String) -> Variant:
	if not FileAccess.file_exists(path):
		push_error("DataLoader: 文件不存在 %s" % path)
		return null
	var file := FileAccess.open(path, FileAccess.READ)
	if file == null:
		push_error("DataLoader: 无法打开 %s" % path)
		return null
	var text := file.get_as_text()
	var parsed: Variant = JSON.parse_string(text)
	if parsed == null:
		push_error("DataLoader: JSON 解析失败 %s" % path)
	return parsed


static func load_mission_pack(base_dir: String = DATA_DIR) -> Dictionary:
	var data := load_game_data(base_dir)
	if data.is_empty():
		return {}
	var pack: LiveBayMissionPack = MissionPackScript.build(data)
	var manifest_path := base_dir.path_join("mission_pack.json")
	if FileAccess.file_exists(manifest_path):
		var parsed: Variant = load_json(manifest_path)
		if parsed is Dictionary and int(parsed.get("schema_version", 0)) == 1 and str(parsed.get("hash", "")).begins_with("sha256:"):
			pack.manifest = parsed
			pack.data["pack_manifest"] = parsed
	var result: LiveBayResult = pack.validate()
	if not result.ok:
		push_error("DataLoader: MissionPack 校验失败：%s" % result.message)
		return {}
	return pack.data


static func load_game_data(base_dir: String = DATA_DIR) -> Dictionary:
	var profession: Variant = load_json(base_dir.path_join("profession_guard.json"))
	var towers: Variant = load_json(base_dir.path_join("towers.json"))
	var enemies: Variant = load_json(base_dir.path_join("enemies.json"))
	var waves: Variant = load_json(base_dir.path_join("waves.json"))
	var map_data: Variant = load_json(base_dir.path_join("map_bay01.json"))
	var balance: Variant = load_json(base_dir.path_join("balance.json"))

	if not _is_dict(profession) or not _is_array(towers) or not _is_array(enemies):
		return {}
	if not _is_array(waves) or not _is_dict(map_data) or not _is_dict(balance):
		return {}

	var towers_by_id := {}
	for tower: Variant in towers:
		if not _is_dict(tower):
			push_error("DataLoader: towers.json 条目不是对象")
			return {}
		for field: String in REQUIRED_TOWER_FIELDS:
			if not tower.has(field):
				push_error("DataLoader: 塔缺少字段 %s（%s）" % [field, tower.get("id", "?")])
				return {}
		if towers_by_id.has(tower["id"]):
			push_error("DataLoader: 塔 id 重复 %s" % tower["id"])
			return {}
		towers_by_id[tower["id"]] = tower

	var enemies_by_id := {}
	for enemy: Variant in enemies:
		if not _is_dict(enemy):
			push_error("DataLoader: enemies.json 条目不是对象")
			return {}
		for field: String in REQUIRED_ENEMY_FIELDS:
			if not enemy.has(field):
				push_error("DataLoader: 敌人缺少字段 %s（%s）" % [field, enemy.get("id", "?")])
				return {}
		if enemies_by_id.has(enemy["id"]):
			push_error("DataLoader: 敌人 id 重复 %s" % enemy["id"])
			return {}
		enemies_by_id[enemy["id"]] = enemy

	for field: String in REQUIRED_BALANCE_FIELDS:
		if not balance.has(field):
			push_error("DataLoader: balance.json 缺少字段 %s" % field)
			return {}

	if not map_data.has("path") or not map_data.has("slots") or not map_data.has("base"):
		push_error("DataLoader: 地图缺少 path/slots/base")
		return {}
	if not _is_array(map_data["path"]) or map_data["path"].size() < 2:
		push_error("DataLoader: 地图路径至少需要 2 个点")
		return {}
	if not _is_array(map_data["slots"]) or map_data["slots"].is_empty():
		push_error("DataLoader: 地图至少需要 1 个塔位")
		return {}

	for wave: Variant in waves:
		if not _is_dict(wave) or not wave.has("groups"):
			push_error("DataLoader: waves.json 条目不合法")
			return {}
		for group: Variant in wave["groups"]:
			if not _is_dict(group) or not group.has("enemy"):
				push_error("DataLoader: 波次组不合法")
				return {}
			if not enemies_by_id.has(group["enemy"]):
				push_error("DataLoader: 波次引用了不存在的敌人 %s" % group["enemy"])
				return {}

	return {
		"profession": profession,
		"towers": towers,
		"towers_by_id": towers_by_id,
		"enemies": enemies,
		"enemies_by_id": enemies_by_id,
		"waves": waves,
		"map": map_data,
		"balance": balance,
	}


static func _is_dict(value: Variant) -> bool:
	return typeof(value) == TYPE_DICTIONARY


static func _is_array(value: Variant) -> bool:
	return typeof(value) == TYPE_ARRAY
