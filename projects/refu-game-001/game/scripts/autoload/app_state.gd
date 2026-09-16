extends Node
## AppState —— 跨场景的全局选择与进度（关卡 / 挑战卡 / 卡组 / 存档）。
##
## 只保存"玩家选了什么"与"打到哪了"，不保存 Battle 的运行状态——
## 一局战斗的真相在 Battle 实例里（core/battle.gd），存档只记结果。

const SAVE_PATH := "user://refu_game_001_save.json"

## 关卡 → 章节标题
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
	_load_save()
	if deck_ids.is_empty():
		deck_ids = default_deck(level_id)


## 推荐卡组：12 卡池里凑满 20 张（同名 ≤2）。玩家可在卡组界面改。
func default_deck(for_level_id: String) -> Array[String]:
	var level := GameData.get_level(for_level_id)
	var pool := GameData.pool_for_level(level)
	var recipe := {
		"ANV-T01": 2, "ANV-T02": 2, "ANV-T03": 2, "ANV-T04": 2,
		"ANV-M01": 2, "ANV-M02": 2, "ANV-M03": 1,
		"ANV-S01": 1, "ANV-S02": 1,
		"ANV-X01": 2, "ANV-X02": 2, "ANV-X03": 1,
	}
	var out: Array[String] = []
	var available := {}
	for card in pool:
		available[card["id"]] = true
	for cid in recipe.keys():
		if available.has(cid):
			for i in int(recipe[cid]):
				out.append(cid)
	# 不足 20 张时用池内前几张补足（防数据变动导致卡组不合法）
	var ids: Array = available.keys()
	ids.sort()
	var i := 0
	while out.size() < 20 and not ids.is_empty():
		var cid: String = ids[i % ids.size()]
		var count := 0
		for c in out:
			if c == cid:
				count += 1
		if count < 2:
			out.append(cid)
		i += 1
		if i > 200:
			break
	out.resize(mini(out.size(), 20))
	return out


## 卡组是否合法（doc 05 组卡规则：20 张、同名 ≤2、至少 2 个不同标签）。
func validate_deck(card_ids: Array) -> Dictionary:
	var level := GameData.get_level(level_id)
	var size := int(GameData.get_rule(level.get("rule", "RUL-BASE")).get("deck", {}).get("size", 20))
	var max_copies := int(GameData.get_rule(level.get("rule", "RUL-BASE")).get("deck", {}).get("max_copies", 2))
	if card_ids.size() != size:
		return {"ok": false, "reason": "卡组需要 %d 张，当前 %d 张" % [size, card_ids.size()]}
	var counts := {}
	var tags := {}
	for cid in card_ids:
		counts[cid] = int(counts.get(cid, 0)) + 1
		var card := GameData.get_card(String(cid))
		if card.is_empty():
			return {"ok": false, "reason": "卡组里有未知卡牌 %s" % cid}
		for tag in card.get("tags", []):
			tags[tag] = true
	for cid in counts.keys():
		if int(counts[cid]) > max_copies:
			return {"ok": false, "reason": "「%s」超过 %d 张上限"
				% [GameData.get_card(String(cid)).get("name", cid), max_copies]}
	if tags.size() < 2:
		return {"ok": false, "reason": "卡组至少需要 2 个不同标签才能触发羁绊"}
	return {"ok": true, "reason": ""}


## 关卡是否允许挂某张挑战卡（19 号地图卡表第三节的白名单规则）。
func challenge_allowed(challenge_id: String, for_level_id: String = "") -> Dictionary:
	var lid := for_level_id if for_level_id != "" else level_id
	var level := GameData.get_level(lid)
	if not bool(level.get("challenges_allowed", false)):
		return {"ok": false, "reason": "教学关不开放挑战卡（06 号文档：可读性是第一难度参数）"}
	var card: Dictionary = GameData.challenges.get(challenge_id, {})
	if card.is_empty():
		return {"ok": false, "reason": "未知挑战卡"}
	var requires: Dictionary = card.get("requires", {})
	if bool(requires.get("map_dual_entry", false)):
		var map_data := GameData.get_map(level.get("map", ""))
		if not bool(map_data.get("dual_entry", false)):
			return {"ok": false, "reason": String(card.get("blocked_hint", "该地图不支持此挑战卡"))}
	# 与已选挑战卡的互斥/上限
	var total := 0
	for cid in challenge_ids:
		total += int(GameData.challenges.get(cid, {}).get("score", 0))
	total += int(card.get("score", 0))
	if challenge_ids.size() >= int(GameData.challenges_max()):
		return {"ok": false, "reason": "最多只能带 %d 张挑战卡" % GameData.challenges_max()}
	if total > int(GameData.challenge_score_cap()):
		return {"ok": false, "reason": "难度分合计上限 %d（当前选择会达到 %d）"
			% [GameData.challenge_score_cap(), total]}
	return {"ok": true, "reason": ""}


func start_battle() -> void:
	get_tree().change_scene_to_file("res://scenes/battle/battle.tscn")


func goto(path: String) -> void:
	get_tree().change_scene_to_file(path)


func record_result(result: Dictionary) -> void:
	var lid := level_id
	var prev: Dictionary = results.get(lid, {})
	if prev.is_empty() or float(result.get("score", 0.0)) > float(prev.get("score", 0.0)):
		results[lid] = {
			"score": result.get("score", 0.0), "grade": result.get("grade", "C"),
			"win": result.get("win", false), "challenge_score": result.get("challenge_score", 0),
		}
	# 通关即解锁下一关
	if bool(result.get("win", false)):
		var level := GameData.get_level(lid)
		var idx := GameData.levels.find(level)
		if idx >= 0 and idx + 1 < GameData.levels.size():
			var nid: String = GameData.levels[idx + 1].get("id", "")
			if nid != "" and not unlocked_levels.has(nid):
				unlocked_levels.append(nid)
	_save()


func is_unlocked(level_id_value: String) -> bool:
	return unlocked_levels.has(level_id_value)


func best_result(level_id_value: String) -> Dictionary:
	return results.get(level_id_value, {})


func _save() -> void:
	var payload := {"unlocked": unlocked_levels, "results": results}
	var f := FileAccess.open(SAVE_PATH, FileAccess.WRITE)
	if f != null:
		f.store_string(JSON.stringify(payload))


func _load_save() -> void:
	if not FileAccess.file_exists(SAVE_PATH):
		return
	var parsed = JSON.parse_string(FileAccess.get_file_as_string(SAVE_PATH))
	if typeof(parsed) != TYPE_DICTIONARY:
		return
	unlocked_levels = []
	for l in parsed.get("unlocked", ["L1-1"]):
		unlocked_levels.append(String(l))
	results = parsed.get("results", {})
