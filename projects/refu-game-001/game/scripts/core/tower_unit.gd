extends TowerState
class_name TowerUnit
## TowerUnit —— 塔的行为：落位初始化、标签、攻击间隔、受伤与修复。
## 属性口径：base 是卡的原始数值，stats 是每 tick 由 BattleStats 重算出的最终值。

func setup(uid_value: int, card_def: Dictionary, slot: String, position: Vector2) -> void:
	uid = uid_value
	card = card_def
	card_id = card_def.get("id", "")
	name = card_def.get("name", "")
	slot_type = slot
	pos = position
	faction = String(card_def.get("faction", "ANV"))
	# JSON 里的 null 取出来是 Nil，不能用带默认值的 get 兜住
	var sf = card_def.get("sub_faction")
	sub_faction = "" if sf == null else String(sf)
	base = (card_def.get("stats", {}) as Dictionary).duplicate(true)
	tags = []
	for t in card_def.get("tags", []):
		tags.append(String(t))
	max_hp = float(base.get("max_hp", 0.0))
	hp = max_hp


func has_tag(tag: String) -> bool:
	return tags.has(tag)


func is_attacker() -> bool:
	return float(base.get("damage", 0.0)) > 0.0 and float(base.get("attack_speed", 0.0)) > 0.0


func attack_interval() -> float:
	var aps := float(stats.get("attack_speed", 0.0))
	return INF if aps <= 0.0 else 1.0 / aps


func hp_ratio() -> float:
	return 0.0 if max_hp <= 0.0 else clampf(hp / max_hp, 0.0, 1.0)


func add_buff(stat: String, value: float, until: float, source: String, buff_id: String = "") -> void:
	buffs.append({"stat": stat, "value": value, "until": until, "source": source, "id": buff_id})


## 施加伤害；返回 {killed, shield_broken}
func apply_damage(amount: float, now: float) -> Dictionary:
	var shield_broken := false
	var remaining := amount
	if shield > 0.0 and (shield_until < 0.0 or shield_until >= now):
		var absorbed := minf(shield, remaining)
		shield -= absorbed
		remaining -= absorbed
		if shield <= 0.0:
			shield_broken = true
	hp -= remaining
	hit_flash_until = now + 0.12
	if hp <= 0.0:
		hp = 0.0
		alive = false
	return {"killed": not alive, "shield_broken": shield_broken}


func heal(amount: float) -> float:
	if max_hp <= 0.0:
		return 0.0
	var before := hp
	hp = minf(max_hp, hp + amount)
	return hp - before
