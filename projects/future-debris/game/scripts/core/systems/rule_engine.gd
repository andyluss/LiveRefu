extends RefCounted
class_name RuleEngine
## 规则引擎：**在钩子点问"当前有哪些规则生效、合计修正多少"**，并把发生的事记进日志。
##
## 两类用法（分开很重要）：
##   1. **动作型**（`fire`）：在钩子点直接改状态（加电力、清残渣），并产出日志；
##   2. **查询型**（`damage_delta` / `cost_delta`）：**不改状态**，只回答"这一步该加/减多少"，
##      由调用方统一套用。理由：伤害与费用被多处读取（UI、自动玩家、结算），
##      若各处各自调用"动作型"效果，同一回合会被结算多次。

const TRIGGERS := ["run_start", "turn_start", "before_placement", "before_combat", "wave_cleared"]

## 在某个钩子点触发所有满足条件的**动作型**规则；返回日志。
static func fire(battle, trigger: String) -> Array[String]:
	var log: Array[String] = []
	for rule in battle.rules:
		if rule.trigger != trigger:
			continue
		if not RuleConditions.holds(rule, battle):
			continue
		log.append_array(RuleEffects.apply(rule, battle))
	if not log.is_empty():
		battle.events.append_array(log)
	return log

## 交战输出修正（add_damage / sub_damage）。**只查询、不改状态。**
## `residue_override` 用于固定口径：交战按"场地维护前"的残渣判定（见 TurnLoop 的说明）。
static func damage_delta(battle, residue_override: int = -1) -> int:
	var delta := 0
	for rule in battle.rules:
		if rule.trigger != "before_combat" or not RuleConditions.holds(rule, battle, -1, residue_override):
			continue
		if rule.effect == "add_damage":
			delta += rule.amount
		elif rule.effect == "sub_damage":
			delta -= rule.amount
	return delta

## 出牌费用修正（reduce_cost）；成本不得为负。
static func cost_delta(battle, slot: int) -> int:
	var delta := 0
	for rule in battle.rules:
		if not RuleConditions.holds(rule, battle, slot):
			continue
		if rule.effect == "reduce_cost":
			delta -= rule.amount
	return delta

## 出牌时的入场残渣修正（reduce_residue 在 before_placement 时结算）。
static func placement_residue(battle, card: CardData, slot: int) -> int:
	var residue := card.residue
	for rule in battle.rules:
		if rule.trigger != "before_placement" or not RuleConditions.holds(rule, battle, slot):
			continue
		if rule.effect == "reduce_residue":
			residue = maxi(0, residue - rule.amount)
	return residue
