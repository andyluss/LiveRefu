extends RefCounted
class_name Progress
## Progress —— 战绩记账：保留每关最佳成绩，通关即解锁下一关，随后落盘。

static func record(state: AppState, result: Dictionary) -> void:
	var lid := state.level_id
	var prev: Dictionary = state.results.get(lid, {})
	if prev.is_empty() or float(result.get("score", 0.0)) > float(prev.get("score", 0.0)):
		state.results[lid] = {
			"score": result.get("score", 0.0), "grade": result.get("grade", "C"),
			"win": result.get("win", false), "challenge_score": result.get("challenge_score", 0),
		}
	# 通关即解锁下一关
	if bool(result.get("win", false)):
		var level := GameData.get_level(lid)
		var idx := GameData.levels.find(level)
		if idx >= 0 and idx + 1 < GameData.levels.size():
			var nid: String = GameData.levels[idx + 1].get("id", "")
			if nid != "" and not state.unlocked_levels.has(nid):
				state.unlocked_levels.append(nid)
	SaveIo.save(state)

