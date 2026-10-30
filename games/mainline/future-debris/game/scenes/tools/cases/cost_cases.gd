extends RefCounted
class_name CostCases
## J6 组：规则卡对**费用**的修正。

static func cost_modifier_consistent() -> Dictionary:
	var battle := CaseBase.new_battle_with(PackedStringArray([]))
	battle.resources["power"] = 20
	var card: CardData = battle.hand[0]
	battle.rules = [RuleData.from_row({"id": "RULE-TEST-001", "name": "测试减费", "trigger": "before_placement",
		"condition": "always", "condition_value": 0, "effect": "reduce_cost", "amount": 1, "text": "t"})]
	var quoted := CardCost.of(battle, card, 0)
	if quoted != maxi(0, card.cost - 1):
		return CaseBase.bad("费用修正未生效：报价 %d，卡面 %d" % [quoted, card.cost])
	var before := ResourceSystem.power(battle.resources)
	if not bool(CardPlayer.play(battle, 0, 0)["ok"]):
		return CaseBase.bad("减费后应能出牌")
	if before - ResourceSystem.power(battle.resources) != quoted:
		return CaseBase.bad("实际扣费 %d 与报价 %d 不一致" % [before - ResourceSystem.power(battle.resources), quoted])
	return CaseBase.ok()
