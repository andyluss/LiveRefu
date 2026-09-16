extends RefCounted
class_name BattlePlacement
## BattlePlacement —— 放置一张卡的入口与校验（槽位、能量、禁用卡类、虚空地形）。

## 放置一张卡。返回 {ok, reason, uid}
static func place(bt: BattleState, card_id: String, pos: Vector2, extra: Dictionary = {}) -> Dictionary:
	var card := GameData.get_card(card_id)
	if card.is_empty():
		return {"ok": false, "reason": "未知卡牌"}
	if bt.phase in [BattleState.PHASE_DRAW, BattleState.PHASE_WON, BattleState.PHASE_LOST]:
		return {"ok": false, "reason": "当前阶段不能操作"}
	var ctype := String(card.get("type", ""))
	if String(bt.intern.mods["ban_card_type"]) == ctype:
		return {"ok": false, "reason": "本局禁用了「%s」" % ctype}
	if bt.energy < float(card.get("cost", 0)):
		return {"ok": false, "reason": "能量不足（需要 %d）" % int(card.get("cost", 0))}
	match ctype:
		"tower":
			return BattlePlaceTower.tower(bt, card, pos)
		"unit":
			if String(card.get("slot", "")) == "path":
				return BattlePlaceUnit.blocker(bt, card, pos)
			return BattlePlaceTower.support(bt, card, pos)
		"modifier":
			return BattlePlaceModifier.modifier(bt, card, pos, extra)
		"skill":
			return {"ok": false, "reason": "技能卡请指定目标后施放"}
	return {"ok": false, "reason": "该卡不能直接放置"}


static func slot_of(bt: BattleState, pos: Vector2) -> Dictionary:
	return GameData.slot_at(bt.map_data, pos, 52.0)


static func slot_free(bt: BattleState, pos: Vector2) -> bool:
	for tw in bt.towers:
		if tw.alive and tw.pos.distance_to(pos) < 40.0:
			return false
	return true


static func is_unbuildable(bt: BattleState, pos: Vector2) -> bool:
	for f in bt.fields:
		if String(f["kind"]) == "unbuildable" and pos.distance_to(f["pos"]) <= f["radius"]:
			return true
	return false
