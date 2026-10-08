extends RefCounted
class_name RuleConditions
## 规则卡的**生效条件**判定（只读，不改状态）。
##
## 为什么单独成文件：条件与效果是正交的两件事——
## "什么时候生效"与"生效后做什么"分开，才能用一张小表组合出很多条规则。
## 新增条件种类只需改这里，效果不必动（反之亦然）。

## 全部可用条件；`always` 表示无条件生效。
const KINDS := ["always", "residue_total_at_least", "residue_total_at_most", "slot_residue_at_least"]

## 条件是否成立。slot 仅在 `slot_residue_at_least` 时有意义。
static func holds(rule: RuleData, battle, slot: int = -1, residue_override: int = -1) -> bool:
	var total := residue_override if residue_override >= 0 else ResidueSystem.total(battle.residue)
	match rule.condition:
		"always":
			return true
		"residue_total_at_least":
			return total >= rule.condition_value
		"residue_total_at_most":
			return total <= rule.condition_value
		"slot_residue_at_least":
			return slot >= 0 and ResidueSystem.at(battle.residue, slot) >= rule.condition_value
		_:
			# 未实现的条件**不得静默视为成立**：宁可整条规则不生效，
			# 也不能让打错的字段名变成一个"总是触发"的规则（这类 bug 只会让数值悄悄失真）。
			return false

## 条件描述（用于日志与 UI，避免两处各写一份文案）。
static func describe(rule: RuleData) -> String:
	match rule.condition:
		"always":
			return "无条件"
		"residue_total_at_least":
			return "残渣总量 ≥ %d" % rule.condition_value
		"residue_total_at_most":
			return "残渣总量 ≤ %d" % rule.condition_value
		"slot_residue_at_least":
			return "该格残渣 ≥ %d" % rule.condition_value
		_:
			return "未知条件 %s" % rule.condition
