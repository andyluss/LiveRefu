extends RefCounted
class_name AutoDeploy
## AutoDeploy —— 自动玩家的布防（一）：攻击塔优先（对空在前），塔 ≥2 座后放工事塔。

static func deploy(battle: Battle) -> void:
	if battle.phase in [Battle.PHASE_WON, Battle.PHASE_LOST, Battle.PHASE_DRAW]:
		return
	var map_data := GameData.get_map(battle.level.get("map", ""))
	var std_slots: Array = AutoSlots.coverage_sorted(battle, map_data, "standard", 270.0)
	var hand: Array = battle.hand_cards()
	hand.sort_custom(func(a, b): return float(a.get("cost", 0)) < float(b.get("cost", 0)))
	_attackers(battle, hand, std_slots)
	# 注意：attackers 在放工事塔/阻挡单位**之前**统计——与原实现保持一致，
	# 否则自动玩家的建塔节奏会变（验收里的用时/伤害数字会跟着漂）。
	var attackers := _attacker_count(battle)
	if attackers >= 2:
		_forts(battle, hand, std_slots)
	AutoSupport.deploy(battle, hand, map_data, attackers)


static func _attackers(battle: Battle, hand: Array, std_slots: Array) -> void:
	for want_air in [true, false]:
		for card in hand:
			if String(card.get("type", "")) != "tower":
				continue
			var st: Dictionary = card.get("stats", {})
			if float(st.get("damage", 0.0)) <= 0.0:
				continue
			if bool(st.get("targets_air", false)) != want_air:
				continue
			if battle.energy < float(card.get("cost", 0)):
				continue
			_place_at_free_slot(battle, String(card["id"]), std_slots)


static func _forts(battle: Battle, hand: Array, std_slots: Array) -> void:
	for card in hand:
		if String(card.get("type", "")) != "tower":
			continue
		if float((card.get("stats", {}) as Dictionary).get("damage", 0.0)) > 0.0:
			continue
		if battle.energy < float(card.get("cost", 0)):
			continue
		_place_at_free_slot(battle, String(card["id"]), std_slots)


static func _place_at_free_slot(battle: Battle, card_id: String, slots: Array) -> void:
	for s in slots:
		var pos := Vector2(s[0], s[1])
		if battle.tower_at(pos, 40.0) == null:
			battle.place_card(card_id, pos)
			return


static func _attacker_count(battle: Battle) -> int:
	return battle.towers.filter(func(t): return t.alive and t.is_attacker()).size()
