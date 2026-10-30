extends RefCounted
class_name BattleBonds
## BattleBonds —— 羁绊（组合法则四：同标签达阈值触发套装效果）。
##
## 计数口径（裁决 A3）：按"**本局已上过场的卡**里的不同卡号"计数，而不是按场上存活。
## 理由：铁砧的「后勤链」要求 2 张「维修」＝ ANV-M01(支援) + ANV-S02(技能)，
## 而技能卡是一次性的；按存活计则该羁绊永远不可达。

static func check(bt: BattleState) -> void:
	var tag_cards := _tag_cards(bt)
	var now: Array = []
	for bond in GameData.bonds:
		var cond: Dictionary = bond.get("condition", {})
		var have: int = (tag_cards.get(String(cond.get("tag", "")), {}) as Dictionary).size()
		if have >= int(cond.get("count", 3)):
			now.append(bond)
	for bond in now:
		if not _has(bt.active_bonds, bond):
			bt.active_bonds.append(bond)
			bt.stats["bonds_triggered"] += 1
			BattleFeedback.log(bt, "羁绊触发：%s" % bond.get("name", ""))
			BattleFeedback.floater(bt, BattleUiQueries.board_center(bt),
				String(bond.get("name", "")), Color(1.0, 0.85, 0.4))
			for eff in bond.get("effect", []):
				if String(eff.get("op", "")) == "heal":
					run_heal(bt, eff)
	# 羁绊失效（remove-safe：条件不再满足则效果消失）
	bt.active_bonds = now.duplicate()


static func run_heal(bt: BattleState, eff: Dictionary) -> void:
	for tw in bt.towers:
		if not tw.alive or tw.max_hp <= 0.0:
			continue
		var healed: float = tw.heal(tw.max_hp * float(eff.get("value", 0.0)))
		if healed > 0.0:
			BattleFeedback.floater(bt, tw.pos, "+%d" % int(healed), Color(0.5, 1.0, 0.6))


static func _tag_cards(bt: BattleState) -> Dictionary:
	var out: Dictionary = {}
	for cid in bt.played_cards.keys():
		var card := GameData.get_card(String(cid))
		for tag in card.get("tags", []):
			if not out.has(tag):
				out[tag] = {}
			out[tag][cid] = true
	return out


static func _has(list: Array, bond: Dictionary) -> bool:
	for b in list:
		if b.get("id", "") == bond.get("id", ""):
			return true
	return false
