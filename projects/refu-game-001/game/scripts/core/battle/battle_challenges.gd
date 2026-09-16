extends RefCounted
class_name BattleChallenges
## BattleChallenges —— 挑战卡：只改"环境参数"，不改任何卡的数值块
## （doc 06 第三节 / doc 13 第四节）。难度分与奖励口径来自 doc 数值/05 第四节。

static func apply(bt: BattleState) -> void:
	bt.intern.mods = {
		"enemy_hp_mul": 1.0, "enemy_speed_mul": 1.0, "energy_rate_mul": 1.0,
		"kill_energy_mul": 1.0, "ban_card_type": "", "extra_spawn": 0,
	}
	bt.challenge_score = 0
	for cid in bt.challenge_ids:
		var c: Dictionary = GameData.challenges.get(cid, {})
		if c.is_empty():
			continue
		bt.challenge_score += int(c.get("score", 0))
		_merge_modifier(bt, c.get("modifier", {}))
	bt.challenge_drop = minf(2.0, 1.0 + 0.05 * bt.challenge_score)
	bt.challenge_rating = 0.05 * bt.challenge_score


static func _merge_modifier(bt: BattleState, m: Dictionary) -> void:
	for key in m.keys():
		match key:
			"enemy_hp_mul", "enemy_speed_mul", "energy_rate_mul", "kill_energy_mul":
				bt.intern.mods[key] = float(bt.intern.mods[key]) * float(m[key])
			"ban_card_type":
				bt.intern.mods["ban_card_type"] = String(m[key])
			"extra_spawn":
				bt.intern.mods["extra_spawn"] = int(bt.intern.mods["extra_spawn"]) + int(m[key])
