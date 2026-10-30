extends RefCounted
class_name AutoSupport
## AutoSupport —— 自动玩家的布防（二）：路径阻挡、修饰卡挂载、支援单位。

## attackers 由调用方在放工事塔"之前"统计并传入（保持与原实现一致的节奏）。
static func deploy(battle: Battle, hand: Array, map_data: Dictionary, attackers: int) -> void:
	_blocker(battle, hand)
	if attackers < 2:
		return
	_modifiers(battle, hand)
	if attackers >= 3:
		_supports(battle, hand, map_data)


## 路径阻挡单位放在路径中段，替塔争取输出时间。
static func _blocker(battle: Battle, hand: Array) -> void:
	for card in hand:
		if String(card.get("type", "")) != "unit" or String(card.get("slot", "")) != "path":
			continue
		if battle.energy < float(card.get("cost", 0)):
			continue
		var path: PathGeom = battle.paths[0]
		battle.place_card(String(card["id"]), path.point_at(path.total_length * 0.55))
		return


## 修饰卡挂到还没有该修饰的攻击塔上。
static func _modifiers(battle: Battle, hand: Array) -> void:
	for card in hand:
		if String(card.get("type", "")) != "modifier":
			continue
		if battle.energy < float(card.get("cost", 0)):
			continue
		for tw in battle.towers:
			if not tw.alive or not tw.is_attacker():
				continue
			if _has_modifier(tw, String(card["id"])):
				continue
			if bool(battle.place_card(String(card["id"]), tw.pos, {"target_uid": tw.uid})["ok"]):
				break


static func _has_modifier(tw: TowerUnit, card_id: String) -> bool:
	for m in tw.modifiers:
		if m["card_id"] == card_id:
			return true
	return false


static func _supports(battle: Battle, hand: Array, map_data: Dictionary) -> void:
	var slots: Array = AutoSlots.coverage_sorted(battle, map_data, "support", 180.0)
	for card in hand:
		if String(card.get("type", "")) != "unit" or String(card.get("slot", "")) != "support":
			continue
		if battle.energy < float(card.get("cost", 0)):
			continue
		for s in slots:
			var pos := Vector2(s[0], s[1])
			if battle.tower_at(pos, 40.0) == null:
				battle.place_card(String(card["id"]), pos)
				break


static func _attacker_count(battle: Battle) -> int:
	return battle.towers.filter(func(t): return t.alive and t.is_attacker()).size()
