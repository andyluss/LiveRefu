extends Node
## GameData —— 数据表装载器（卡表 / 敌人数值 / 地图布局 / 波次 / 挑战卡 / 规则卡 / 平衡参数）。
##
## 数据来源：game/data/*.json，由 tools/ 下的脚本从 doc/refu-game-001/ 的策划文档
## 抽取与交叉校验（见 tools/verify_data.py）。**游戏逻辑只通过本节点读数据**，
## 卡片规则层字段不在代码里硬编码，保证"改数据不改代码"。

const DATA_DIR := "res://data/"

var balance: Dictionary = {}
var cards: Dictionary = {}            # card_id -> 卡定义
var bonds: Array = []
var enemies: Dictionary = {}          # enemy_id -> 原型
var maps: Dictionary = {}             # map_id -> 地图定义
var terrain_defs: Dictionary = {}
var wave_sets: Dictionary = {}        # wave_set_id -> 波次卡组
var challenges: Dictionary = {}       # challenge_id -> 挑战卡
var challenge_rules: Dictionary = {}
var rules: Dictionary = {}            # rule_id -> 规则卡
var levels: Array = []
var event_sets: Dictionary = {}
var load_errors: Array[String] = []


func _ready() -> void:
	_load_all()


func _load_all() -> void:
	var cards_doc := _read_json("cards.json")
	cards = {}
	for c in cards_doc.get("cards", []):
		cards[c["id"]] = c
	bonds = cards_doc.get("bonds", [])

	var enemies_doc := _read_json("enemies.json")
	enemies = {}
	for e in enemies_doc.get("enemies", []):
		enemies[e["id"]] = e

	var maps_doc := _read_json("maps.json")
	maps = {}
	for m in maps_doc.get("maps", []):
		maps[m["id"]] = m
	terrain_defs = maps_doc.get("terrain_defs", {})

	var waves_doc := _read_json("waves.json")
	wave_sets = {}
	for w in waves_doc.get("wave_sets", []):
		wave_sets[w["id"]] = w

	var ch_doc := _read_json("challenges.json")
	challenges = {}
	for c in ch_doc.get("challenges", []):
		challenges[c["id"]] = c
	challenge_rules = ch_doc.get("rules", {})

	var rules_doc := _read_json("rules.json")
	rules = {}
	for r in rules_doc.get("rules", []):
		rules[r["id"]] = r

	var levels_doc := _read_json("levels.json")
	levels = levels_doc.get("levels", [])
	event_sets = {}
	for e in levels_doc.get("event_sets", []):
		event_sets[e["id"]] = e

	balance = _read_json("balance.json")

	_validate()
	if load_errors.is_empty():
		print("[GameData] 数据装载完成：%d 卡 / %d 敌人 / %d 地图 / %d 波次卡组 / %d 挑战卡 / %d 关卡"
			% [cards.size(), enemies.size(), maps.size(), wave_sets.size(), challenges.size(), levels.size()])
	else:
		for e in load_errors:
			push_error("[GameData] " + e)


func _read_json(name: String) -> Dictionary:
	var path := DATA_DIR + name
	if not FileAccess.file_exists(path):
		load_errors.append("缺少数据文件：%s" % path)
		return {}
	var text := FileAccess.get_file_as_string(path)
	var parsed = JSON.parse_string(text)
	if typeof(parsed) != TYPE_DICTIONARY:
		load_errors.append("数据文件不是 JSON 对象：%s" % path)
		return {}
	return parsed


## 引用完整性自检：任何一张卡/一个敌人/一张地图对不上，启动即报错，不留到运行期。
func _validate() -> void:
	for level in levels:
		for key in ["map", "wave_set", "rule", "event_set"]:
			var value: String = level.get(key, "")
			var found := false
			match key:
				"map": found = maps.has(value)
				"wave_set": found = wave_sets.has(value)
				"rule": found = rules.has(value)
				"event_set": found = event_sets.has(value)
			if not found:
				load_errors.append("关卡 %s 引用了不存在的 %s：%s" % [level.get("id", "?"), key, value])
	for wave_set in wave_sets.values():
		if not maps.has(wave_set.get("map", "")):
			load_errors.append("波次卡组 %s 引用了不存在的地图 %s" % [wave_set.get("id", "?"), wave_set.get("map", "")])
		for wave in wave_set.get("waves", []):
			for comp in wave.get("composition", []):
				if not enemies.has(comp.get("enemy", "")):
					load_errors.append("波次 %s W%d 引用了不存在的敌人 %s"
						% [wave_set.get("id", "?"), wave.get("index", -1), comp.get("enemy", "")])
	for card in cards.values():
		for tag in card.get("tags", []):
			pass  # 标签是自由文本，不校验集合


# ------------------------------------------------------------------ 查询帮助

func get_card(id: String) -> Dictionary:
	return cards.get(id, {})


func get_enemy(id: String) -> Dictionary:
	return enemies.get(id, {})


func get_map(id: String) -> Dictionary:
	return maps.get(id, {})


func get_rule(id: String) -> Dictionary:
	return rules.get(id, {})


func get_level(id: String) -> Dictionary:
	for l in levels:
		if l.get("id", "") == id:
			return l
	return {}


func get_wave_set(id: String) -> Dictionary:
	return wave_sets.get(id, {})


## 某关可用卡池：M1 = 该关 `faction` 的全部卡（含从族支援卡）。
func pool_for_level(level: Dictionary) -> Array:
	var faction: String = level.get("faction", "ANV")
	var out: Array = []
	for card in cards.values():
		if card.get("faction", "") == faction:
			out.append(card)
	out.sort_custom(func(a, b): return a["id"] < b["id"])
	return out


## 单张卡的"规则层"标签（羁绊/光环按它匹配）。
func card_tags(card: Dictionary) -> Array:
	return card.get("tags", [])


## 地图上某点是否落在可建造槽位内（返回槽位信息，未命中返回空字典）。
func slot_at(map_data: Dictionary, pos: Vector2, tolerance: float = 46.0) -> Dictionary:
	for slot_type in ["standard", "support", "modifier"]:
		for p in map_data.get("slots", {}).get(slot_type, []):
			var center := Vector2(p[0], p[1])
			if center.distance_to(pos) <= tolerance:
				return {"type": slot_type, "pos": center}
	return {}


## 地图地形定义（含效果参数）。
func terrain_def(id: String) -> Dictionary:
	return terrain_defs.get(id, {})


## 单局最多可带挑战卡张数（13 号卡表第一节：最多 3 张）。
func challenges_max() -> int:
	return int(challenge_rules.get("max_cards", 3))


## 难度分合计上限（数值 05 第四节：上限 15）。
func challenge_score_cap() -> int:
	return int(challenge_rules.get("score_cap", 15))
