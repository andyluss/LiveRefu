extends RefCounted
class_name RuleCases
## J 组：规则卡系统。**它是纪元差异的载体**——若它不成立，纪元 2 只能换皮。
##
## 每条用例只隔离一条规则（见 CaseBase.new_battle_with），否则多条规则互相影响，
## 失败时无法判断是哪一条错了。

static func chain_reaction() -> Dictionary:
	var battle := CaseBase.new_battle_with(PackedStringArray(["RULE-ATOMIC-001"]))
	if RuleEngine.damage_delta(battle) != 0:
		return CaseBase.bad("残渣未达阈值时不应加伤害，实际 %+d" % RuleEngine.damage_delta(battle))
	ResidueSystem.add(battle.residue, 0, 12)
	if RuleEngine.damage_delta(battle) != 6:
		return CaseBase.bad("残渣 ≥12 时应 +6 伤害，实际 %+d" % RuleEngine.damage_delta(battle))
	return CaseBase.ok()

static func public_hearing() -> Dictionary:
	var battle := CaseBase.new_battle_with(PackedStringArray(["RULE-ATOMIC-002"]))
	ResidueSystem.add(battle.residue, 0, 30)
	if RuleEngine.damage_delta(battle) != -4:
		return CaseBase.bad("残渣 ≥30 时应 -4 伤害，实际 %+d" % RuleEngine.damage_delta(battle))
	return CaseBase.ok()

static func coolant_once() -> Dictionary:
	var battle := CaseBase.new_battle_with(PackedStringArray(["RULE-ATOMIC-003"]))
	battle.resources["power"] = 10
	CardPlayer.play(battle, 0, 3)
	var polluted := ResidueSystem.at(battle.residue, 3)
	if polluted <= 0:
		return CaseBase.bad("该格本应有残渣")
	RuleEngine.fire(battle, "turn_start")
	if ResidueSystem.at(battle.residue, 3) != polluted - 1:
		return CaseBase.bad("回合开始应清掉最脏格 1 点：%d → %d" % [polluted, ResidueSystem.at(battle.residue, 3)])
	return CaseBase.ok()

static func suburb_model() -> Dictionary:
	var battle := CaseBase.new_battle_with(PackedStringArray(["RULE-ATOMIC-004"]))
	var before := ResourceSystem.power(battle.resources)
	RuleEngine.fire(battle, "wave_cleared")
	if ResourceSystem.power(battle.resources) != before + 5:
		return CaseBase.bad("残渣 ≤6 时清波应 +5 电力，实际 %+d" % (ResourceSystem.power(battle.resources) - before))
	ResidueSystem.add(battle.residue, 0, 20)
	var rich := ResourceSystem.power(battle.resources)
	RuleEngine.fire(battle, "wave_cleared")
	if ResourceSystem.power(battle.resources) != rich:
		return CaseBase.bad("残渣 >6 时不应奖励电力")
	return CaseBase.ok()
