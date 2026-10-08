extends RefCounted
class_name RatingSystem
## 局末评级（三维度）。S2 只做"可计算"的部分，不做"好看"的部分。
##
## 设计立场：评级必须由**已经发生过的事实**推导，不得引入额外随机——
## 否则玩家无法通过复盘改进，评级就失去教学意义。

## 返回 {score: 0..1, grade: "S"/"A"/"B"/"C"}。
## 三维度：防守（基地生命）、产能（是否被残渣拖垮）、效率（用时）。
static func evaluate(state: Dictionary, max_turns: int) -> Dictionary:
	var defense := ResourceSystem.hp_ratio(state["resources"])
	var residue_total := ResidueSystem.total(state["residue"])
	# 清洁度：残渣越少越好；以"每回合 2 点"为可接受基准
	var turns := maxi(1, int(state["turn"]))
	var clean := clampf(1.0 - float(residue_total) / float(turns * 4), 0.0, 1.0)
	var efficiency := clampf(1.0 - float(turns) / float(maxi(1, max_turns)), 0.0, 1.0)
	var score := (defense * 0.5) + (clean * 0.25) + (efficiency * 0.25)
	return {"score": score, "grade": grade_of(score), "defense": defense, "clean": clean, "efficiency": efficiency}

static func grade_of(score: float) -> String:
	if score >= 0.85:
		return "S"
	if score >= 0.7:
		return "A"
	if score >= 0.5:
		return "B"
	return "C"
