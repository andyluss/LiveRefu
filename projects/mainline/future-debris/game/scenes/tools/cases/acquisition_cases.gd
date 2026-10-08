extends RefCounted
class_name AcquisitionCases
## M 组：**规则卡的获取方式**（era_default / level_grant / unlock，三者累加）。
##
## 为什么这些断言重要：获取途径一旦写错，表现是"某条规则有时生效有时不生效"——
## 玩家与策划都会归因成"随机"或"数值问题"，而实际是装载逻辑错了。

static func three_sources_accumulate() -> Dictionary:
	var probe := CaseBase.new_battle()
	var catalog: CardCatalog = probe.catalog
	var level: LevelData = catalog.levels["LV-ATOMIC-03"]
	var no_unlock := RuleLoadout.resolve(catalog, level, PackedStringArray())
	var with_unlock := RuleLoadout.resolve(catalog, level, PackedStringArray(["RULE-ATOMIC-002"]))
	if with_unlock.size() != no_unlock.size() + 1:
		return CaseBase.bad("解锁一条规则后生效数应 +1：%d → %d" % [no_unlock.size(), with_unlock.size()])
	var ids := PackedStringArray()
	for rule in no_unlock:
		ids.append(rule.id)
	if not ids.has("RULE-ATOMIC-003"):
		return CaseBase.bad("era_default 规则 003 应始终生效")
	if ids.has("RULE-ATOMIC-002"):
		return CaseBase.bad("未解锁的 unlock 规则不应生效")
	return CaseBase.ok()

static func unknown_source_inactive() -> Dictionary:
	var probe := CaseBase.new_battle()
	var fake := RuleData.from_row({"id": "RULE-X-001", "name": "未知来源", "trigger": "turn_start",
		"condition": "always", "condition_value": 0, "effect": "gain_power", "amount": 99,
		"text": "t", "acquisition": "made_up"})
	if RuleLoadout.is_active(fake, probe.level, PackedStringArray()):
		return CaseBase.bad("未知获取途径必须不生效（不静默兜底）")
	return CaseBase.ok()

static func battle_uses_loadout() -> Dictionary:
	var battle := CaseBase.new_battle()
	if battle.rules.size() != battle.catalog.rules_for(battle.level_id).size():
		return CaseBase.bad("战斗的规则集应与 RuleLoadout 一致")
	battle.unlocked_rules = PackedStringArray(["RULE-ATOMIC-002"])
	if not battle.setup(CaseBase.DECK.split(","), 20, 40):
		return CaseBase.bad("重新初始化失败")
	if not battle.unlocked_rules.has("RULE-ATOMIC-002"):
		return CaseBase.bad("解锁集合不应在重新初始化时被清空")
	return CaseBase.ok()
