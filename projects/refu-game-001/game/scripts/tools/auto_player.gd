extends RefCounted
class_name AutoPlayer
## AutoPlayer —— 自动玩家：无头验收与自动截图共用的一只"合格玩家"。
##
## 存在的意义：验收要能无人值守地跑完一整关，所以需要一个**稳定、确定**的操盘手。
## 它不是 AI，只是几条朴素启发式：
##   1. 先铺攻击型塔（对空塔优先，保证第 4 波纯空中有解）；
##   2. 塔位按"射程内能覆盖多长路径"排序；
##   3. 攻击塔 ≥2 座后才放工事塔/修饰卡，≥3 座后才补支援单位；
##   4. 波间调度固定取第一个选项（配合固定种子 → 结果可复现）。


static func deploy(battle: Battle) -> void:
	# 注意：**波次进行中也可以布防**（塔防的基本玩法：边打边补），
	# 早期版本这里 return 掉了，导致"自动玩家只在布防期建塔"，
	# 与真人玩法不符，也把难度标定带偏（见 docs/03_调参与实测发现.md）。
	if battle.phase == Battle.PHASE_WON or battle.phase == Battle.PHASE_LOST \
			or battle.phase == Battle.PHASE_DRAW:
		return
	var map_data := GameData.get_map(battle.level.get("map", ""))
	var std_slots: Array = coverage_sorted_slots(battle, map_data, "standard", 270.0)
	var sup_slots: Array = coverage_sorted_slots(battle, map_data, "support", 180.0)

	var hand: Array = battle.hand_cards()
	hand.sort_custom(func(a, b): return float(a.get("cost", 0)) < float(b.get("cost", 0)))

	# 1) 攻击型塔（先对空，后地面）
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
			for s in std_slots:
				var pos := Vector2(s[0], s[1])
				if battle.tower_at(pos, 40.0) == null:
					battle.place_card(String(card["id"]), pos)
					break
	var attackers := battle.towers.filter(func(t): return t.alive and t.is_attacker()).size()
	# 2) 工事塔（不输出，只减速/吸收伤害）
	if attackers >= 2:
		for card in hand:
			if String(card.get("type", "")) != "tower":
				continue
			if float((card.get("stats", {}) as Dictionary).get("damage", 0.0)) > 0.0:
				continue
			if battle.energy < float(card.get("cost", 0)):
				continue
			for s in std_slots:
				var pos := Vector2(s[0], s[1])
				if battle.tower_at(pos, 40.0) == null:
					battle.place_card(String(card["id"]), pos)
					break
	# 3) 路径阻挡单位（放到路径中段，替塔争取输出时间）
	for card in hand:
		if String(card.get("type", "")) != "unit" or String(card.get("slot", "")) != "path":
			continue
		if battle.energy < float(card.get("cost", 0)):
			continue
		var path: PathGeom = battle.paths[0]
		battle.place_card(String(card["id"]), path.point_at(path.total_length * 0.55))
	if attackers < 2:
		return
	# 4) 修饰卡（挂在还没有该修饰的攻击塔上）
	for card in hand:
		if String(card.get("type", "")) != "modifier":
			continue
		if battle.energy < float(card.get("cost", 0)):
			continue
		for tw in battle.towers:
			if not tw.alive or not tw.is_attacker():
				continue
			var already := false
			for m in tw.modifiers:
				if m["card_id"] == card["id"]:
					already = true
					break
			if already:
				continue
			var r := battle.place_card(String(card["id"]), tw.pos, {"target_uid": tw.uid})
			if bool(r["ok"]):
				break
	if attackers < 3:
		return
	# 5) 支援单位
	for card in hand:
		if String(card.get("type", "")) != "unit" or String(card.get("slot", "")) != "support":
			continue
		if battle.energy < float(card.get("cost", 0)):
			continue
		for s in sup_slots:
			var pos := Vector2(s[0], s[1])
			if battle.tower_at(pos, 40.0) == null:
				battle.place_card(String(card["id"]), pos)
				break


static func use_skills(battle: Battle) -> void:
	if battle.phase != Battle.PHASE_WAVE or battle.enemies.is_empty():
		return
	for card in battle.hand_cards():
		if String(card.get("type", "")) != "skill":
			continue
		if battle.energy < float(card.get("cost", 0)):
			continue
		var target := 0
		if String(card.get("id", "")) == "ANV-S02":
			var best: TowerUnit = null
			for tw in battle.towers:
				if tw.alive and tw.max_hp > 0.0 and (best == null or tw.hp_ratio() < best.hp_ratio()):
					best = tw
			if best == null:
				continue
			target = best.uid
		battle.cast_card(String(card["id"]), target)


static func take_draw(battle: Battle) -> void:
	if battle.phase == Battle.PHASE_DRAW and not battle.pending_draw.is_empty():
		battle.pick_draw(battle.pending_draw[0])


## 排序结果缓存：塔位是静态的，没必要每 tick 重算（每帧 200 次采样 × 8 塔位很快就拖慢模拟）
static var _slot_cache: Dictionary = {}


## 塔位排序：按"射程内覆盖的路径长度"降序（覆盖越长越先占）。
static func coverage_sorted_slots(battle: Battle, map_data: Dictionary, slot_type: String,
		nominal_range: float) -> Array:
	var cache_key := "%s|%s|%.0f" % [map_data.get("id", ""), slot_type, nominal_range]
	if _slot_cache.has(cache_key):
		return _slot_cache[cache_key]
	var slots: Array = ((map_data.get("slots", {}) as Dictionary).get(slot_type, []) as Array).duplicate()
	var path: PathGeom = battle.paths[0]
	var scored: Array = []
	for s in slots:
		scored.append({"slot": s, "cover": coverage(path, Vector2(s[0], s[1]), nominal_range)})
	scored.sort_custom(func(a, b): return float(a["cover"]) > float(b["cover"]))
	var out: Array = []
	for item in scored:
		out.append(item["slot"])
	_slot_cache[cache_key] = out
	return out


## 塔位排序（沿路径里程升序）：需要"从入口铺到基地"的确定性顺序时用。
static func along_sorted_slots(battle: Battle, map_data: Dictionary, slot_type: String) -> Array:
	var cache_key := "along|%s|%s" % [map_data.get("id", ""), slot_type]
	if _slot_cache.has(cache_key):
		return _slot_cache[cache_key]
	var slots: Array = ((map_data.get("slots", {}) as Dictionary).get(slot_type, []) as Array).duplicate()
	var path: PathGeom = battle.paths[0]
	slots.sort_custom(func(a, b):
		var pa: float = path.project(Vector2(a[0], a[1]))["along"]
		var pb: float = path.project(Vector2(b[0], b[1]))["along"]
		return pa < pb)
	_slot_cache[cache_key] = slots
	return slots


static func coverage(path: PathGeom, center: Vector2, radius: float) -> float:
	var covered := 0.0
	var steps := 200
	var step_len := path.total_length / float(steps)
	for i in steps:
		if path.point_at(step_len * (float(i) + 0.5)).distance_to(center) <= radius:
			covered += step_len
	return covered
