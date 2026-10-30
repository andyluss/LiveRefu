extends BlockerState
class_name BlockerUnit
## BlockerUnit —— 路径阻挡单位的行为：落位、血量比例、受伤。

func setup(uid_value: int, card_def: Dictionary, path_index_value: int, along_value: float, position: Vector2) -> void:
	uid = uid_value
	card = card_def
	card_id = card_def.get("id", "")
	name = card_def.get("name", "")
	path_index = path_index_value
	along = along_value
	pos = position
	var st: Dictionary = card_def.get("stats", {})
	max_hp = float(st.get("max_hp", 100.0))
	hp = max_hp
	block = int(st.get("block", 1))
	var duration := float(st.get("duration", 0.0))
	expires_at = -1.0  # 由 Battle 按 now + duration 覆盖


func hp_ratio() -> float:
	return 0.0 if max_hp <= 0.0 else clampf(hp / max_hp, 0.0, 1.0)


func is_full() -> bool:
	return blocked_uids.size() >= block


func apply_damage(amount: float, now: float) -> Dictionary:
	hp -= amount
	damage_taken += amount
	hit_flash_until = now + 0.12
	if hp <= 0.0:
		hp = 0.0
		alive = false
	return {"killed": not alive}
