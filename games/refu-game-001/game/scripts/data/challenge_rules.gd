extends RefCounted
class_name ChallengeRules
## ChallengeRules —— 挑战卡的可用性规则（doc 19 第三节白名单 + doc 13 的数量/难度分上限）。

static func allowed(state: AppState, challenge_id: String, level_id: String) -> Dictionary:
	# 省略 level_id 表示"当前选中的关卡"
	var lid := level_id if level_id != "" else state.level_id
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
	for cid in state.challenge_ids:
		total += int(GameData.challenges.get(cid, {}).get("score", 0))
	total += int(card.get("score", 0))
	if state.challenge_ids.size() >= int(GameData.challenges_max()):
		return {"ok": false, "reason": "最多只能带 %d 张挑战卡" % GameData.challenges_max()}
	if total > int(GameData.challenge_score_cap()):
		return {"ok": false, "reason": "难度分合计上限 %d（当前选择会达到 %d）"
			% [GameData.challenge_score_cap(), total]}
	return {"ok": true, "reason": ""}

