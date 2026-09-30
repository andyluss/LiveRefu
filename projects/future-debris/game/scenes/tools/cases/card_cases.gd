extends RefCounted
class_name CardCases
## C/D 组：出牌的**原子性**与回收语义。这是最容易出现"扣了费没放上"这类跨表 bug 的地方。

static func play_atomic() -> Dictionary:
	var battle := CaseBase.new_battle()
	battle.resources["power"] = 10
	var card: CardData = battle.hand[0]
	var residue_before := ResidueSystem.total(battle.residue)
	var result := CardPlayer.play(battle, 0, 3)
	if not bool(result["ok"]):
		return CaseBase.bad("出牌失败：%s" % result["reason"])
	if ResourceSystem.power(battle.resources) != 10 - card.cost:
		return CaseBase.bad("费用未正确扣除：应 -%d" % card.cost)
	if not battle.board.has(3):
		return CaseBase.bad("卡未落在指定塔位 3")
	if ResidueSystem.total(battle.residue) != residue_before + card.residue:
		return CaseBase.bad("残渣未按卡面写入：应 +%d" % card.residue)
	if bool(CardPlayer.play(battle, 0, 3)["ok"]):
		return CaseBase.bad("塔位已被占用时不应允许放置")
	return CaseBase.ok()

## 失败必须**完全回退**：电力不足时不得留下任何痕迹。
static func play_rollback() -> Dictionary:
	var battle := CaseBase.new_battle()
	battle.resources["power"] = 0
	if bool(CardPlayer.play(battle, 0, 0)["ok"]):
		return CaseBase.bad("电力不足时不应允许放置")
	if not battle.board.is_empty() or ResidueSystem.total(battle.residue) != 0:
		return CaseBase.bad("失败后不应留下任何状态变化")
	if bool(CardPlayer.play(battle, 99, 0)["ok"]):
		return CaseBase.bad("手牌下标越界应被拒绝")
	return CaseBase.ok()

static func sell_keeps_residue() -> Dictionary:
	var battle := CaseBase.new_battle()
	battle.resources["power"] = 10
	var card: CardData = battle.hand[0]
	CardPlayer.play(battle, 0, 2)
	var residue_after_place := ResidueSystem.total(battle.residue)
	var sold := CardPlayer.sell(battle, 2)
	if not bool(sold["ok"]):
		return CaseBase.bad("回收失败")
	if int(sold["refund"]) != int(card.cost / 2):
		return CaseBase.bad("返还应为费用一半（向下取整）：%d" % sold["refund"])
	if battle.board.has(2):
		return CaseBase.bad("回收后塔位应空出")
	if ResidueSystem.total(battle.residue) != residue_after_place:
		return CaseBase.bad("回收不应清除残渣（否则『先污染后回收』会成为最优解）")
	if bool(CardPlayer.sell(battle, 5)["ok"]):
		return CaseBase.bad("空塔位回收应被拒绝")
	return CaseBase.ok()
