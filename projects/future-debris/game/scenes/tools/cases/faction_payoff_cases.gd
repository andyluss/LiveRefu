extends RefCounted
class_name FactionPayoffCases
## L6 组：势力机制的**正面收益**（清理返还 / 未污染格利息）。
##
## 为什么单独一组：这一组守的是"遵守机制的势力不吃亏"。
## 实测背景：`cleans` 与 `avoids` 的自由输出高于 `moves`，实战却更早崩——
## 因为清理要花电力而它们奖励清理，**实力被自己的机制吃掉**。

## `cleans` 清理后必须拿回一部分电力（否则清理是纯支出）。
static func clean_has_rebate() -> Dictionary:
	var battle := CaseBase.new_battle()
	battle.faction_id = "FAC-ATOMIC-AEC"      # residuePosture = cleans
	ResourceSystem.gain(battle.resources, 20)
	ResidueSystem.add(battle.residue, 0, 6)
	var before := ResourceSystem.power(battle.resources)
	var result := CardPlayer.clean(battle, 0, 3)
	if not bool(result["ok"]):
		return CaseBase.bad("清理应成功：%s" % str(result["reason"]))
	var spent := int(result["cost"])
	var rebate := FactionPayoff.clean_rebate(battle, spent)
	if rebate <= 0:
		return CaseBase.bad("cleans 清理应返还电力，实际 %d" % rebate)
	var after := ResourceSystem.power(battle.resources)
	if after != before - spent + rebate:
		return CaseBase.bad("电力应 = 原值 - 花费 + 返还（%d ≠ %d）" % [after, before - spent + rebate])
	return CaseBase.ok()

## 其它姿态不该拿到清理返还（机制必须只对所属势力生效）。
static func rebate_is_faction_specific() -> Dictionary:
	var battle := CaseBase.new_battle()
	battle.faction_id = "FAC-ATOMIC-ROA"      # feeds
	if FactionPayoff.clean_rebate(battle, 9) != 0:
		return CaseBase.bad("非 cleans 势力不应有清理返还")
	return CaseBase.ok()

## `avoids` 的回合利息必须随"未污染格数"变化，且只对 avoids 生效。
static func avoid_interest_scales() -> Dictionary:
	var battle := CaseBase.new_battle()
	battle.faction_id = "FAC-ATOMIC-ROA"
	if FactionPayoff.turn_interest(battle) != 0:
		return CaseBase.bad("非 avoids 势力不应有回合利息")
	battle.faction_id = "FAC-ATOMIC-SUB"      # residuePosture = avoids
	var empty := FactionPayoff.turn_interest(battle)
	if empty != 0:
		return CaseBase.bad("没有在用塔位时利息应为 0，实际 %d" % empty)
	# 放两张卡：一张干净、一张脏——利息应只算干净的那张
	var catalog := battle.catalog
	var ids := catalog.cards_of_faction("FAC-ATOMIC-SUB")
	BoardSystem.place(battle.board, CardInstance.new(catalog.cards[ids[0]], 0, 1))
	BoardSystem.place(battle.board, CardInstance.new(catalog.cards[ids[1 % ids.size()]], 1, 1))
	# 两张塔位此刻都干净（刚放下、没有残渣）→ 利息 = 2 × 每格利息
	var both_clean := FactionPayoff.turn_interest(battle)
	var per_slot := FactionPayoff.AVOID_INTEREST_PER_CLEAN_SLOT
	if both_clean != per_slot * 2:
		return CaseBase.bad("两张干净塔位的利息应为 %d，实际 %d" % [per_slot * 2, both_clean])
	# 把第二格弄脏，利息必须**减少**（只有干净格计入）
	ResidueSystem.add(battle.residue, 1, 4)
	var one_clean := FactionPayoff.turn_interest(battle)
	if one_clean != per_slot:
		return CaseBase.bad("弄脏一格后利息应为 %d，实际 %d" % [per_slot, one_clean])
	return CaseBase.ok()

## `avoids` 的**输出路径**：干净的塔位必须真的多打输出（而不只是省电力）。
## 为什么单独断言：把"保持干净"换成战力是本轮的设计修正；
## 若这条不生效，`avoids` 就退回"只缓解、不输出"的老问题。
static func clean_slot_adds_might() -> Dictionary:
	var battle := CaseBase.new_battle()
	battle.faction_id = "FAC-ATOMIC-SUB"      # avoids
	var catalog := battle.catalog
	var ids := catalog.cards_of_faction("FAC-ATOMIC-SUB")
	var instance := CardInstance.new(catalog.cards[ids[0]], 0, 1)
	BoardSystem.place(battle.board, instance)
	var clean_might := StatQuery.effective_might(instance, battle.residue, battle)
	# 把这一格弄脏：干净加成必须消失（且还要吃残渣惩罚）
	ResidueSystem.add(battle.residue, 0, 4)
	var dirty_might := StatQuery.effective_might(instance, battle.residue, battle)
	if clean_might <= dirty_might:
		return CaseBase.bad("干净格的战力应高于脏格（%d 应 > %d）" % [clean_might, dirty_might])
	if clean_might != instance.data.might + FactionPayoff.CLEAN_SLOT_MIGHT:
		return CaseBase.bad("干净格战力应 = 基础 %d + 加成 %d，实际 %d" % [
			instance.data.might, FactionPayoff.CLEAN_SLOT_MIGHT, clean_might])
	return CaseBase.ok()

## `cleans` 的**输出路径**：清理必须带来本回合的战力爆发，且**回合末清零**（不能越清越强）。
static func purge_burst_is_temporary() -> Dictionary:
	var battle := CaseBase.new_battle()
	battle.faction_id = "FAC-ATOMIC-AEC"      # cleans
	ResourceSystem.gain(battle.resources, 30)
	ResidueSystem.add(battle.residue, 0, 3)
	var before := StatQuery.turn_damage(battle.board, battle.residue, battle)
	var result := CardPlayer.clean(battle, 0, 3)
	if not bool(result["ok"]):
		return CaseBase.bad("清理应成功：%s" % str(result["reason"]))
	var during := StatQuery.turn_damage(battle.board, battle.residue, battle)
	if during <= before:
		return CaseBase.bad("清理后本回合输出应提高（%d 应 > %d）" % [during, before])
	# 回合开始必须清零：否则清理一次永久变强
	FactionPayoff.begin_turn(battle)
	var after := StatQuery.turn_damage(battle.board, battle.residue, battle)
	if after != before:
		return CaseBase.bad("爆发应在回合开始清零（%d ≠ %d）" % [after, before])
	return CaseBase.ok()
