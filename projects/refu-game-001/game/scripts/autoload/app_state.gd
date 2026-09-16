extends Node
## AppState —— 跨场景的全局状态（autoload）：玩家选了什么 + 打到哪了。
##
## 只保存"选择"与"进度"，不保存 Battle 的运行状态——一局战斗的真相在 Battle 实例里。
## 实现分散在 data/ 下的三个静态类：DeckRecipes（组卡）、ChallengeRules（挑战卡规则）、
## Progress（战绩与解锁）、SaveIo（落盘）；本节点只做持有与转发。

const CHAPTER_TITLES := {1: "第 1 章 · 峡谷哨站"}

# ---- 本局选择 ----
var level_id: String = "L1-1"
var challenge_ids: Array[String] = []
var deck_ids: Array[String] = []
var seed_value: int = 0
var speed_multiplier: float = 1.0

# ---- 进度 ----
var unlocked_levels: Array[String] = ["L1-1"]
var results: Dictionary = {}          # level_id -> 最佳结果


func _ready() -> void:
	seed_value = 20260914
	SaveIo.load_into(self)
	if deck_ids.is_empty():
		deck_ids = default_deck(level_id)


func default_deck(for_level_id: String) -> Array[String]:
	return DeckRecipes.default_deck(for_level_id)


func validate_deck(card_ids: Array) -> Dictionary:
	return DeckRules.validate(level_id, card_ids)


func challenge_allowed(challenge_id: String, for_level_id: String = "") -> Dictionary:
	return ChallengeRules.allowed(self, challenge_id, for_level_id)


func record_result(result: Dictionary) -> void:
	Progress.record(self, result)


func start_battle() -> void:
	get_tree().change_scene_to_file("res://scenes/battle/battle.tscn")


func goto(path: String) -> void:
	get_tree().change_scene_to_file(path)


func is_unlocked(level_id_value: String) -> bool:
	return unlocked_levels.has(level_id_value)


func best_result(level_id_value: String) -> Dictionary:
	return results.get(level_id_value, {})
