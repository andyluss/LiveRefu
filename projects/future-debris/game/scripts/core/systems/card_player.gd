extends RefCounted
class_name CardPlayer
## 出牌：把 "费用 + 塔位 + 残渣" 三件事在同一次操作里原子地结算。
##
## 为什么集中在一个系统：这三件事任一失败都必须**完全回退**。
## "扣了费用但没放上""放上了但忘记录残渣"是最典型也最难查的跨表 bug。

## 放置手牌；返回 {ok: bool, reason: String}。失败时不改变任何状态。
static func play(battle, hand_index: int, slot: int) -> Dictionary:
	if hand_index < 0 or hand_index >= battle.hand.size():
		return _fail("手牌下标越界")
	if not BoardSystem.is_free(battle.board, slot):
		return _fail("塔位 %d 已被占用或越界" % slot)
	var card: CardData = battle.hand[hand_index]
	var cost := CardCost.of(battle, card, slot)
	if not ResourceSystem.spend(battle.resources, cost):
		return _fail("电力不足（需 %d，有 %d）" % [cost, ResourceSystem.power(battle.resources)])
	var instance := CardInstance.new(card, slot, battle.turn)
	BoardSystem.place(battle.board, instance)
	# 入场残渣 = 卡面 → 规则卡修正 → 势力修正 → （move 姿态）改记到最脏格
	var entry := card.residue
	if not battle.rules.is_empty():
		RuleEngine.fire(battle, "before_placement")
		entry = RuleEngine.placement_residue(battle, card, slot)
	entry = FactionMods.placement_residue(battle, entry, slot)
	ResidueSystem.placement(battle.residue, slot, entry, MoveRouting.target(battle, slot))
	battle.hand.remove_at(hand_index)
	battle.cards_played += 1
	return {"ok": true, "reason": ""}

## 回收：返还一半费用（向下取整），并把该格残渣留在原地——
## 这一条很关键：**卖塔不能洗白污染**，否则"先污染后回收"会成为最优解。
static func sell(battle, slot: int) -> Dictionary:
	var instance: CardInstance = BoardSystem.remove(battle.board, slot)
	if instance == null:
		return _fail("塔位 %d 没有单位" % slot)
	var refund := FactionMods.sell_refund(battle, instance.data.cost)
	battle.resources["power"] = int(battle.resources["power"]) + refund
	return {"ok": true, "reason": "", "refund": refund}

static func _fail(reason: String) -> Dictionary:
	return {"ok": false, "reason": reason}

## 清理某一格的残渣：**花电力买回洁净**。这是"排污"这条张力的解除手段——
## 没有它，理性玩家的最优解就是"什么都不做"，玩法会坍缩成摆设。
## 原子性同出牌：电力不足或该格无残渣时不做任何改变。
static func clean(battle, slot: int, amount: int) -> Dictionary:
	var present := ResidueSystem.at(battle.residue, slot)
	if present <= 0:
		return _fail("塔位 %d 没有残渣可清理" % slot)
	var actual := mini(maxi(0, amount), present)
	var cost := actual * ResidueSystem.CLEAN_COST
	if not ResourceSystem.spend(battle.resources, cost):
		return _fail("电力不足（清理 %d 点需 %d，有 %d）" % [
			actual, cost, ResourceSystem.power(battle.resources),
		])
	var removed := ResidueSystem.clean(battle.residue, slot, actual)
	return {"ok": true, "reason": "", "removed": removed, "cost": cost}
