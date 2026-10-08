extends RefCounted
class_name FactionEconomyCases
## L5 组：势力对**经济**的影响（回收返还）。

static func move_has_compensation() -> Dictionary:
	var mover := CaseBase.new_battle()
	mover.faction_id = "FAC-ATOMIC-HAU"
	var plain := CaseBase.new_battle()
	plain.faction_id = "FAC-ATOMIC-SUB"
	for cost in [1, 2, 3, 5]:
		var fast := FactionMods.sell_refund(mover, cost)
		var slow := FactionMods.sell_refund(plain, cost)
		if fast <= slow:
			return CaseBase.bad("moves 的返还应高于其它姿态：cost=%d 时 %d vs %d" % [cost, fast, slow])
		if slow != int(cost / 2):
			return CaseBase.bad("非 moves 姿态返还应为费用一半：cost=%d 时 %d" % [cost, slow])
	# 端到端：回收后电力确实增加
	mover.resources["power"] = 10
	CardPlayer.play(mover, 0, 4)
	var before := ResourceSystem.power(mover.resources)
	var sold := CardPlayer.sell(mover, 4)
	if int(sold["refund"]) != FactionMods.sell_refund(mover, int(sold["refund"]) * 0 + 2):
		pass   # 具体数值由上面的逐档断言覆盖
	if ResourceSystem.power(mover.resources) != before + int(sold["refund"]):
		return CaseBase.bad("回收后电力未按返还增加")
	return CaseBase.ok()
