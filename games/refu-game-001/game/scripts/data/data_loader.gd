extends RefCounted
class_name DataLoader
## DataLoader —— 读 game/data/*.json 并做引用完整性自检（纯静态，不依赖场景树）。
## 校验不过就把问题写进 g.load_errors，由 GameData 启动时 push_error，绝不把坏数据拖到运行期。

static func load_all(g: GameData, dir_path: String) -> void:
	g.cards = _index(_read_json(g, dir_path, "cards.json").get("cards", []))
	g.bonds = _read_json(g, dir_path, "cards.json").get("bonds", [])
	g.enemies = _index(_read_json(g, dir_path, "enemies.json").get("enemies", []))
	var maps_doc := _read_json(g, dir_path, "maps.json")
	g.maps = _index(maps_doc.get("maps", []))
	g.terrain_defs = maps_doc.get("terrain_defs", {})
	g.wave_sets = _index(_read_json(g, dir_path, "waves.json").get("wave_sets", []))
	var ch_doc := _read_json(g, dir_path, "challenges.json")
	g.challenges = _index(ch_doc.get("challenges", []))
	g.challenge_rules = ch_doc.get("rules", {})
	g.rules = _index(_read_json(g, dir_path, "rules.json").get("rules", []))
	var levels_doc := _read_json(g, dir_path, "levels.json")
	g.levels = levels_doc.get("levels", [])
	g.event_sets = _index(levels_doc.get("event_sets", []))
	g.balance = _read_json(g, dir_path, "balance.json")
	DataValidator.validate(g)


static func _index(items: Array) -> Dictionary:
	var out := {}
	for item in items:
		out[item["id"]] = item
	return out


static func _read_json(g: GameData, dir_path: String, name: String) -> Dictionary:
	var path := dir_path + name
	if not FileAccess.file_exists(path):
		g.load_errors.append("缺少数据文件：%s" % path)
		return {}
	var parsed = JSON.parse_string(FileAccess.get_file_as_string(path))
	if typeof(parsed) != TYPE_DICTIONARY:
		g.load_errors.append("数据文件不是 JSON 对象：%s" % path)
		return {}
	return parsed
