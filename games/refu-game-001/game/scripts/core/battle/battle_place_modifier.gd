extends RefCounted
class_name BattlePlaceModifier
## BattlePlaceModifier —— 修饰卡挂载（拖到塔上＝挂该塔；拖到修饰位＝全域修饰）。
## 裁决 A6：X02/X03 的文本明确指向"某座塔"，X01 指向"同标签塔"，两种挂载都支持。

## 修饰卡：拖到已放置的塔上＝挂在塔上；拖到地图的"修饰位"上＝全域修饰（裁决 A6）。
static func modifier(bt: BattleState, card: Dictionary, pos: Vector2, extra: Dictionary) -> Dictionary:
	var slot := BattlePlacement.slot_of(bt, pos)
	var choice := String(extra.get("tag_choice", ""))
	var target_uid := int(extra.get("target_uid", 0))
	var tw: TowerUnit = null
	if target_uid > 0:
		tw = BattleQueries.tower_by_uid(bt, target_uid)
	elif not slot.is_empty() and String(slot["type"]) == "modifier":
		tw = best_modifier_host(bt, card, slot["pos"])
		if tw == null:
			return {"ok": false, "reason": "修饰位附近没有可挂载的塔"}
	else:
		tw = BattleQueries.tower_at(bt, pos, 60.0)
	if tw == null or not tw.alive:
		return {"ok": false, "reason": "修饰卡需要拖到一座已放置的塔（或地图修饰位）上"}
	var max_stacks := int((card.get("stats", {}) as Dictionary).get("max_stacks", 0))
	if max_stacks > 0 and _stack_count(tw, String(card.get("id", ""))) >= max_stacks:
		return {"ok": false, "reason": "「%s」最多叠 %d 层" % [card.get("name", ""), max_stacks]}
	tw.modifiers.append({"card_id": card.get("id", ""), "def": card, "choice": choice})
	BattleSkills.pay(bt, card)
	BattleSkills.register_played(bt, card, tw)
	BattleEffects.run_hooks(bt, tw, "on_attach", {"choice": choice})
	BattleFeedback.floater(bt, tw.pos, "修饰", Color(1.0, 0.82, 0.45))
	BattleFeedback.log(bt, "为「%s」挂载「%s」" % [tw.name, card.get("name", "")])
	return {"ok": true, "uid": tw.uid}


static func _stack_count(tw: TowerUnit, card_id: String) -> int:
	var cnt := 0
	for m in tw.modifiers:
		if m["card_id"] == card_id:
			cnt += 1
	return cnt


## 修饰位上的"全域修饰"：选一座标签最匹配的塔作为作用对象。
static func best_modifier_host(bt: BattleState, card: Dictionary, _pos: Vector2) -> TowerUnit:
	var tags: Array = card.get("tags", [])
	var best: TowerUnit = null
	var best_score := -1
	for tw in bt.towers:
		if not tw.alive:
			continue
		var score := 0
		for tag in tags:
			if tw.has_tag(String(tag)):
				score += 1
		if score > best_score and (score > 0 or tags.is_empty()):
			best = tw
			best_score = score
	return best

