# LiveBay · 故障模块
# 只负责「故障经过塔位时命中谁、停多久 / 降级多久」。
class_name LiveBayFaultModule
extends RefCounted

# 只返回候选塔位，不写状态；用于 W5 暂停后由玩家选择。
func candidates(enemy: Dictionary, towers: Array, slots: Array, enemy_pos: Vector2) -> Array:
	var radius := float(enemy.def.get("disable_radius", 0.0))
	var max_targets := int(enemy.def.get("disable_targets", 99))
	if radius <= 0.0:
		return []
	if enemy.hit_towers.size() >= max_targets:
		return []
	var out: Array = []
	for tower: Dictionary in towers:
		var slot := int(tower.slot)
		if enemy.hit_towers.has(slot):
			continue
		if enemy_pos.distance_to(slots[slot]) <= radius:
			out.append(slot)
			if out.size() >= max_targets:
				break
	return out


# 把选择结果写到塔上；返回 [{slot,duration,mode}]。
func apply_slots(enemy: Dictionary, towers: Array, slots: Array, slot_indices: Array, bypass := false, duration_bonus := 0.0) -> Array:
	var duration := maxf(0.0, float(enemy.def.get("disable_duration", 0.0)) + duration_bonus)
	var hits: Array = []
	for slot in slot_indices:
		var tower: Variant = null
		for t: Dictionary in towers:
			if int(t.slot) == int(slot):
				tower = t
				break
		if tower == null:
			continue
		enemy.hit_towers[int(slot)] = true
		if bypass:
			tower.degraded_timer = maxf(float(tower.get("degraded_timer", 0.0)), 8.0)
			tower.degraded_factor = 0.5
			hits.append({"slot": int(slot), "duration": 8.0, "mode": "bypass"})
		else:
			tower.disabled_timer = maxf(float(tower.get("disabled_timer", 0.0)), duration)
			hits.append({"slot": int(slot), "duration": duration, "mode": "isolate"})
	return hits


# 兼容旧调用：立即按候选处理。
func apply(enemy: Dictionary, towers: Array, slots: Array, enemy_pos: Vector2, duration_bonus := 0.0, bypass := false) -> Array:
	return apply_slots(enemy, towers, slots, candidates(enemy, towers, slots, enemy_pos), bypass, duration_bonus)
