extends RefCounted
class_name RuleTableCases
## J0 组：**规则表本身的合法性**（行为断言在 [RuleCases]）。
##
## 为什么单独一组：未知的触发点/条件/效果/获取途径会被引擎当作"不生效"，
## 这是一种**静默失效**——规则表看起来装着十几条，实际有几条从未生效。
## 它守的是"种类合法"，而不是"条数"（条数只是数据规模的快照，不守任何不变量）。

## 规则表装载与字段合法性。
##
## **不再断言条数**（原为"应有 4 条（T1）"）：条数是**数据规模的快照**，
## 每次扩卡量都会让它失效，而它并不守任何不变量。真正要守的是：
## **每条规则的触发点/条件/效果/获取途径都必须是引擎认识的种类**——
## 未知取值会被引擎当作"不生效"（[RuleEngine] 的有意立场），
## 那是一种**静默失效**：表面看规则表装着十几条，实际有几条从未生效。
static func rules_load() -> Dictionary:
	var battle := CaseBase.new_battle_all_rules()
	if battle.rules.is_empty():
		return CaseBase.bad("规则表为空（关卡将没有任何规则差异）")
	for rule in battle.rules:
		if not RuleEngine.TRIGGERS.has(rule.trigger):
			return CaseBase.bad("规则 %s 的触发点 %s 不在已知集合内（引擎会忽略它）" % [rule.id, rule.trigger])
		if not RuleConditions.KINDS.has(rule.condition):
			return CaseBase.bad("规则 %s 的条件 %s 不在已知集合内" % [rule.id, rule.condition])
		if not RuleEffects.KINDS.has(rule.effect):
			return CaseBase.bad("规则 %s 的效果 %s 不在已知集合内" % [rule.id, rule.effect])
		if not RuleData.ACQUISITIONS.has(rule.acquisition):
			return CaseBase.bad("规则 %s 的获取途径 %s 不在已知集合内" % [rule.id, rule.acquisition])
	return CaseBase.ok()

