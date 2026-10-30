extends RefCounted
class_name RatingCases
## I 组：评级由**已发生的事实**推导，不引入额外随机——
## 否则玩家无法通过复盘改进，评级就失去教学意义。

static func rating_facts_only() -> Dictionary:
	var perfect := RatingSystem.evaluate(
		{"resources": {"base_hp": 20, "base_hp_max": 20}, "residue": ResidueSystem.init_residue(), "turn": 1}, 30
	)
	if perfect["grade"] != "S":
		return CaseBase.bad("满血零残渣一回合应评 S，实际 %s(%.3f)" % [perfect["grade"], perfect["score"]])
	var wrecked := ResidueSystem.init_residue()
	ResidueSystem.add(wrecked, 0, 400)
	var bad_run := RatingSystem.evaluate(
		{"resources": {"base_hp": 1, "base_hp_max": 20}, "residue": wrecked, "turn": 30}, 30
	)
	if bad_run["grade"] != "C":
		return CaseBase.bad("濒死高残渣应评 C，实际 %s(%.3f)" % [bad_run["grade"], bad_run["score"]])
	return CaseBase.ok()

## 单调性：**同样的局面，残渣更多，分数不得更高**。
## 这条比"某个分数等于多少"更有价值——它守的是设计意图，而不是一个会随调参漂移的数字。
static func rating_monotonic() -> Dictionary:
	var base := {"base_hp": 20, "base_hp_max": 20}
	var clean := ResidueSystem.init_residue()
	ResidueSystem.add(clean, 0, 10)
	var dirty := ResidueSystem.init_residue()
	ResidueSystem.add(dirty, 0, 200)
	var a := RatingSystem.evaluate({"resources": base, "residue": clean, "turn": 10}, 30)
	var b := RatingSystem.evaluate({"resources": base, "residue": dirty, "turn": 10}, 30)
	if float(b["score"]) > float(a["score"]):
		return CaseBase.bad("残渣更多时分数不应更高：%0.3f vs %0.3f" % [b["score"], a["score"]])
	var grades := ["C", "B", "A", "S"]
	if grades.find(b["grade"]) > grades.find(a["grade"]):
		return CaseBase.bad("残渣更多时评级不应更高：%s vs %s" % [b["grade"], a["grade"]])
	return CaseBase.ok()
