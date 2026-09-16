extends RefCounted
class_name BattleRating
## BattleRating —— 结算与评级（doc 04 第五节：评级三维 = 基地生命 / 能量效率 / 组合触发）。

static func compute(bt: BattleState) -> Dictionary:
	var w: Dictionary = GameData.balance.get("rating", {}).get("weights", {})
	var hp_score := bt.base_hp / maxf(1.0, bt.base_hp_max)
	var gained := maxf(1.0, float(bt.stats["energy_gained"]))
	var eff_score := clampf(float(bt.stats["energy_spent"]) / gained, 0.0, 1.0)
	var combo_score := _combo(bt)
	var total := hp_score * float(w.get("base_hp", 0.4)) \
		+ eff_score * float(w.get("energy_efficiency", 0.3)) \
		+ combo_score * float(w.get("combo", 0.3))
	return {
		"grade": grade_for(total), "score": total, "hp_score": hp_score,
		"energy_score": eff_score, "combo_score": combo_score,
		"bonds": bt.active_bonds.size(), "hook_triggers": int(bt.stats["hook_triggers"]),
		"kills": int(bt.stats["kills"]), "leaks": int(bt.stats["leaks"]),
		"base_hp": int(bt.base_hp), "base_hp_max": int(bt.base_hp_max),
		"challenge_score": bt.challenge_score, "drop_multiplier": bt.challenge_drop,
		"rating_bonus": bt.challenge_rating, "duration": bt.t,
		"win": bt.phase == BattleState.PHASE_WON,
	}


## 组合触发次数：羁绊 2 分/条 + 钩子 1 分/40 次，归一到 0–1。
static func _combo(bt: BattleState) -> float:
	var raw := float(bt.stats["bonds_triggered"]) * 2.0 + float(bt.stats["hook_triggers"]) / 40.0
	return clampf(raw / 3.0, 0.0, 1.0)


static func grade_for(score: float) -> String:
	for g in GameData.balance.get("rating", {}).get("grades", []):
		if score >= float(g.get("min", 0.0)):
			return String(g.get("grade", "C"))
	return "C"
