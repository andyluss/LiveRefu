extends RefCounted
class_name ResidueCases
## E/F 组：残渣 → 降级区 → 战力惩罚。**本作的核心张力链**，必须逐环断言。

static func zone_derivation() -> Dictionary:
	var residue := ResidueSystem.init_residue()
	ResidueSystem.add(residue, 0, ResidueSystem.ZONE_PER_RESIDUE * 3)
	if ResidueSystem.zone(residue) != 3:
		return CaseBase.bad("每 %d 点残渣应扩张 1 个降级区：实际 %d" % [
			ResidueSystem.ZONE_PER_RESIDUE, ResidueSystem.zone(residue),
		])
	ResidueSystem.add(residue, 1, ResidueSystem.ZONE_PER_RESIDUE - 1)
	if ResidueSystem.zone(residue) != 3:
		return CaseBase.bad("不足一跳时不应扩张降级区")
	if ResidueSystem.add(residue, 2, -5) != ResidueSystem.total(residue):
		return CaseBase.bad("负残渣不应被记入")
	return CaseBase.ok()

static func residue_penalty() -> Dictionary:
	var battle := CaseBase.new_battle()
	battle.resources["power"] = 10
	CardPlayer.play(battle, 0, 0)
	var instance: CardInstance = battle.board[0]
	var clean := StatQuery.effective_might(instance, battle.residue)
	ResidueSystem.add(battle.residue, 0, StatQuery.RESIDUE_PER_MIGHT_LOSS * 2)
	if StatQuery.effective_might(instance, battle.residue) != clean - 2:
		return CaseBase.bad("同格每 %d 点残渣应减 1 战力" % StatQuery.RESIDUE_PER_MIGHT_LOSS)
	ResidueSystem.add(battle.residue, 0, 999)
	if StatQuery.effective_might(instance, battle.residue) != 0:
		return CaseBase.bad("战力不应被减成负数")
	return CaseBase.ok()

## 场地维护：已放置单位**每回合持续排污**（"供电即排污"不是设定，是每回合结算的规则）。
static func upkeep_emits() -> Dictionary:
	var battle := CaseBase.new_battle()
	battle.resources["power"] = 10
	var card: CardData = battle.hand[0]
	CardPlayer.play(battle, 0, 1)
	var before := ResidueSystem.total(battle.residue)
	var added := BoardUpkeep.accrue(battle.board, battle.residue)
	if added != card.residue:
		return CaseBase.bad("本回合应新增 %d 点残渣，实际 %d" % [card.residue, added])
	if ResidueSystem.total(battle.residue) != before + added:
		return CaseBase.bad("残渣总量与新增量不一致")
	if (battle.board[1] as CardInstance).accumulated_residue != card.residue:
		return CaseBase.bad("实例累积残渣应被记录")
	return CaseBase.ok()
