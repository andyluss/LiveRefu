extends RefCounted
class_name FactionOutputCases
## L7 组：势力机制的**输出路径**（把"干净"换算成战力）。
##
## 为什么单独一组：本轮的设计修正是"每个势力的机制都必须能转化为输出"。
## 若这两条不生效，缓解类势力就退回"只缓解、不输出"的老问题——
## 而那个问题在实测里的表现是"自由输出更高、实战却更早崩"。

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
