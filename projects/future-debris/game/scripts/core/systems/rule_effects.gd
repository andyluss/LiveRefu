extends RefCounted
class_name RuleEffects
## 规则卡的**效果执行**（会改状态）。与 [RuleConditions] 正交：
## 条件决定"生不生效"，效果决定"生效后改什么"。
##
## 设计约束：**效果必须只有少数几种、且都能被日志记录**。
## 规则卡一旦能执行任意逻辑，纪元差异就会变成一堆互不兼容的特例（拼贴，而不是风格卡）。

## 执行一条规则的效果；返回可记录的日志数组。
static func apply(rule: RuleData, battle, slot: int = -1) -> Array[String]:
	match rule.effect:
		"gain_power":
			battle.resources["power"] = int(battle.resources["power"]) + rule.amount
			return ["%s：电力 +%d" % [rule.name, rule.amount]]
		"reduce_residue":
			var removed := _reduce(battle, slot, rule.amount)
			return ["%s：残渣 -%d" % [rule.name, removed]] if removed > 0 else []
		"clean_on_turn":
			return _clean_dirtiest(battle, rule)
		_:
			# 直接改伤害/费用的效果由 [RuleEngine] 以"查询修正值"的方式取用（见那里的说明）
			return []

## 减少某格（或全场最脏一格）残渣。
static func _reduce(battle, slot: int, amount: int) -> int:
	var target := slot
	if target < 0:
		target = dirtiest_slot(battle)
	if target < 0:
		return 0
	return ResidueSystem.clean(battle.residue, target, amount)

## 回合开始的自动清理：清最脏的一格。
static func _clean_dirtiest(battle, rule: RuleData) -> Array[String]:
	var target := dirtiest_slot(battle)
	if target < 0:
		return []
	var removed := ResidueSystem.clean(battle.residue, target, rule.amount)
	return ["%s：清理塔位 %d 残渣 -%d" % [rule.name, target, removed]] if removed > 0 else []

## 最脏的塔位（无残渣时返回 -1）。并列时取更小下标，保证确定性。
static func dirtiest_slot(battle) -> int:
	var best := -1
	var best_amount := 0
	for slot in battle.residue["by_slot"]:
		var amount := ResidueSystem.at(battle.residue, int(slot))
		if amount > best_amount:
			best = int(slot)
			best_amount = amount
	return best
