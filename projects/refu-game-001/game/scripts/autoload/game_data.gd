extends Node
## GameData —— 数据表门面（autoload）：只持有数据 + 转发查询，实现见 data/ 下的两个静态类。
##
## 数据来源：game/data/*.json，由 tools/ 下的脚本从 doc/refu-game-001/ 的策划文档抽取并交叉
## 校验（tools/verify_data.py）。**游戏逻辑只通过本节点读数据**，卡片规则层字段不在代码里硬编码，
## 保证"改数据不改代码"。

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
	DataLoader.load_all(self, DATA_DIR)
	if load_errors.is_empty():
		print("[GameData] 数据装载完成：%d 卡 / %d 敌人 / %d 地图 / %d 波次卡组 / %d 挑战卡 / %d 关卡"
			% [cards.size(), enemies.size(), maps.size(), wave_sets.size(), challenges.size(), levels.size()])
		return
	for e in load_errors:
		push_error("[GameData] " + e)


# ------------------------------------------------------------------ 查询（转发）

func get_card(id: String) -> Dictionary:
	return DataQueries.get_card(self, id)


func get_enemy(id: String) -> Dictionary:
	return DataQueries.get_enemy(self, id)


func get_map(id: String) -> Dictionary:
	return DataQueries.get_map(self, id)


func get_rule(id: String) -> Dictionary:
	return DataQueries.get_rule(self, id)


func get_wave_set(id: String) -> Dictionary:
	return DataQueries.get_wave_set(self, id)


func get_level(id: String) -> Dictionary:
	return DataQueries.get_level(self, id)


func pool_for_level(level: Dictionary) -> Array:
	return DataQueries.pool_for_level(self, level)


func card_tags(card: Dictionary) -> Array:
	return card.get("tags", [])


func slot_at(map_data: Dictionary, pos: Vector2, tolerance: float = 46.0) -> Dictionary:
	return DataQueries.slot_at(map_data, pos, tolerance)


func terrain_def(id: String) -> Dictionary:
	return DataQueries.terrain_def(self, id)


func challenges_max() -> int:
	return DataQueries.challenges_max(self)


func challenge_score_cap() -> int:
	return DataQueries.challenge_score_cap(self)
