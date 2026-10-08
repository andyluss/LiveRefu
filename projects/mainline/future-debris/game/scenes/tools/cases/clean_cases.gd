extends RefCounted
class_name CleanCases
## E3 组：清理残渣——**"排污"这条张力的解除手段**。
## 没有解除手段，理性玩家的最优解就是"什么都不做"，玩法会坍缩成摆设。

static func clean_removes() -> Dictionary:
	var battle := CaseBase.new_battle()
	battle.resources["power"] = 10
	CardPlayer.play(battle, 0, 4)
	var polluted := ResidueSystem.at(battle.residue, 4)
	if polluted <= 0:
		return CaseBase.bad("该格本应有残渣，实际 %d" % polluted)
	var power_before := ResourceSystem.power(battle.resources)
	var want := mini(2, polluted)   # 不能要求清掉比该格更多的残渣
	var result := CardPlayer.clean(battle, 4, 2)
	if not bool(result["ok"]):
		return CaseBase.bad("清理失败：%s" % result["reason"])
	if int(result["removed"]) != want or ResidueSystem.at(battle.residue, 4) != polluted - want:
		return CaseBase.bad("应清掉 %d 点残渣：%d → %d" % [want, polluted, ResidueSystem.at(battle.residue, 4)])
	if ResourceSystem.power(battle.resources) != power_before - want * ResidueSystem.CLEAN_COST:
		return CaseBase.bad("清理费用未正确扣除")
	if bool(CardPlayer.clean(battle, 7, 1)["ok"]):
		return CaseBase.bad("无残渣的塔位不应允许清理")
	var poor := CaseBase.new_battle()
	poor.resources["power"] = 0
	poor.residue["by_slot"] = {0: 5}
	poor.residue["total"] = 5
	if bool(CardPlayer.clean(poor, 0, 5)["ok"]) or ResidueSystem.at(poor.residue, 0) != 5:
		return CaseBase.bad("电力不足时清理必须完全回退")
	return CaseBase.ok()
