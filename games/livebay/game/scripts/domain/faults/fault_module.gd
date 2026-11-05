# LiveBay · 故障模块
# 只负责「故障经过塔位时命中谁、停多久」；位移、伤害、结算不在这里。
class_name LiveBayFaultModule
extends RefCounted

# 返回 [{slot, duration}]；命中记录写入 enemy.hit_towers，避免同一故障重复命中。
func apply(enemy: Dictionary, towers: Array, slots: Array, enemy_pos: Vector2) -> Array:
	var duration := float(enemy.def.get("disable_duration", 0.0))
	var radius := float(enemy.def.get("disable_radius", 0.0))
	var max_targets := int(enemy.def.get("disable_targets", 99))
	if duration <= 0.0 or radius <= 0.0:
		return []
	if enemy.hit_towers.size() >= max_targets:
		return []
	var hits: Array = []
	for tower: Dictionary in towers:
		var slot := int(tower.slot)
		if enemy.hit_towers.has(slot):
			continue
		if enemy_pos.distance_to(slots[slot]) <= radius:
			enemy.hit_towers[slot] = true
			tower.disabled_timer = maxf(float(tower.get("disabled_timer", 0.0)), duration)
			hits.append({"slot": slot, "duration": duration})
			if enemy.hit_towers.size() >= max_targets:
				break
	return hits
