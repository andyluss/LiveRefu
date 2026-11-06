# LiveBay · 塔模块
# 负责塔实体、建造/升级/出售；索敌/开火仍由 Sim 编排。
class_name LiveBayTowerModule
extends RefCounted

var towers: Array = []
var defs: Dictionary = {}
var balance: Dictionary = {}
var profession: Dictionary = {}
var economy: Variant
var damage_mult := 1.0


func configure(tower_defs: Dictionary, balance_data: Dictionary, profession_data: Dictionary, economy_module: Variant, map_damage_mult := 1.0) -> void:
	defs = tower_defs
	balance = balance_data
	profession = profession_data
	economy = economy_module
	damage_mult = map_damage_mult


func reset() -> void:
	towers.clear()


func at(slot_index: int) -> Variant:
	for tower: Dictionary in towers:
		if int(tower.slot) == slot_index:
			return tower
	return null


func build(slot_index: int, tower_id: String) -> LiveBayResult:
	if not defs.has(tower_id):
		return LiveBayResult.failure(&"unknown_tower", "未知塔")
	if slot_index < 0 or at(slot_index) != null:
		return LiveBayResult.failure(&"slot_occupied", "塔位不可用")
	var def: Dictionary = defs[tower_id]
	var cost := int(round(float(def.cost) * float(profession.get("tower_cost_mult", 1.0))))
	if not economy.spend(float(cost)):
		return LiveBayResult.failure(&"insufficient_energy", "供能不足")
	towers.append({
		"slot": slot_index,
		"def": def,
		"level": 1,
		"cooldown": 0.0,
		"income_timer": 0.0,
		"invested": cost,
		"disabled_timer": 0.0,
		"degraded_timer": 0.0,
		"degraded_factor": 1.0,
	})
	return LiveBayResult.success("已建造", {"cost": cost})


func upgrade(slot_index: int) -> LiveBayResult:
	var tower: Variant = at(slot_index)
	if tower == null:
		return LiveBayResult.failure(&"no_tower", "该塔位没有塔")
	var max_level := int(balance.get("max_tower_level", 3))
	if int(tower.level) >= max_level:
		return LiveBayResult.failure(&"max_level", "已满级")
	var cost := int(round(float(tower.def.cost) * float(balance.get("upgrade_cost_factor", 0.8)) * float(tower.level)))
	if not economy.spend(float(cost)):
		return LiveBayResult.failure(&"insufficient_energy", "供能不足")
	tower.level += 1
	tower.invested += cost
	return LiveBayResult.success("已升级", {"cost": cost})


func sell(slot_index: int) -> LiveBayResult:
	var tower: Variant = at(slot_index)
	if tower == null:
		return LiveBayResult.failure(&"no_tower", "该塔位没有塔")
	var refund := int(floor(float(tower.invested) * float(balance.get("sell_refund", 0.7))))
	economy.earn(float(refund))
	towers.erase(tower)
	return LiveBayResult.success("已出售", {"refund": refund})


func tower_damage(tower: Dictionary, enemy: Variant = null) -> float:
	var value := float(tower.def.damage) * (1.0 + float(balance.get("upgrade_damage_factor", 0.25)) * (int(tower.level) - 1)) * damage_mult
	if enemy != null and float(enemy.get("mark_timer", 0.0)) > 0.0:
		value *= 1.0 + float(enemy.get("mark_bonus", 0.0))
	return value


func _apply_damage(enemy: Dictionary, amount: float) -> void:
	var taken := amount * float(enemy.def.get("damage_taken_mult", 1.0))
	enemy.hp -= taken
	if enemy.hp <= 0.0:
		enemy.dead = true


func tower_range(tower: Dictionary) -> float:
	return float(tower.def.range) * (1.0 + float(balance.get("upgrade_range_factor", 0.05)) * (int(tower.level) - 1))


func supply_income(tower: Dictionary) -> float:
	return float(tower.def.get("income", 0.0)) * (1.0 + float(balance.get("upgrade_income_factor", 0.5)) * (int(tower.level) - 1))


func supply_repair(tower: Dictionary) -> float:
	return float(tower.def.get("repair", 0.0)) * (1.0 + float(balance.get("upgrade_repair_factor", 0.5)) * (int(tower.level) - 1))


func update(dt: float, enemies: Array, slots: Array, map: Variant) -> Dictionary:
	var fired: Array = []
	var income := 0.0
	for tower: Dictionary in towers:
		var def: Dictionary = tower.def
		if float(tower.get("disabled_timer", 0.0)) > 0.0:
			tower.disabled_timer -= dt
			continue
		if float(tower.get("degraded_timer", 0.0)) > 0.0:
			tower.degraded_timer -= dt
			if tower.degraded_timer <= 0.0:
				tower.degraded_factor = 1.0
		var degrade := float(tower.get("degraded_factor", 1.0)) if float(tower.get("degraded_timer", 0.0)) > 0.0 else 1.0
		if def.kind == "supply":
			tower.income_timer -= dt
			if tower.income_timer <= 0.0:
				tower.income_timer += float(def.get("income_interval", 5.0))
				income += supply_income(tower) * degrade
			continue
		tower.cooldown -= dt
		if tower.cooldown > 0.0:
			continue
		var range_px := tower_range(tower)
		var tower_pos: Vector2 = slots[tower.slot]
		var candidates: Array = []
		for enemy: Dictionary in enemies:
			if enemy.dead:
				continue
			if tower_pos.distance_to(map.point_at(float(enemy.dist))) <= range_px:
				candidates.append(enemy)
		if candidates.is_empty():
			continue
		var cooldown := 1.0 / maxf(0.05, float(def.fire_rate) * degrade)
		if def.kind == "single":
			var target: Dictionary = candidates[0]
			for enemy: Dictionary in candidates:
				if float(enemy.dist) > float(target.dist):
					target = enemy
			_apply_damage(target, tower_damage(tower, target))
			if float(def.get("mark_duration", 0.0)) > 0.0:
				target.mark_timer = float(def.mark_duration)
				target.mark_bonus = float(def.get("mark_bonus", 0.0))
			fired.append({"from": tower_pos, "to": map.point_at(float(target.dist)), "kind": "single"})
		elif def.kind == "aoe":
			var first_pos: Vector2 = tower_pos
			for enemy: Dictionary in candidates:
				_apply_damage(enemy, tower_damage(tower, enemy))
				var slow := float(def.get("slow", 0.0))
				if slow > 0.0:
					enemy.slow_factor = maxf(float(enemy.slow_factor), slow)
					enemy.slow_timer = maxf(float(enemy.slow_timer), float(def.get("slow_duration", 1.5)))
				if first_pos == tower_pos:
					first_pos = map.point_at(float(enemy.dist))
			fired.append({"from": tower_pos, "to": first_pos, "kind": "aoe"})
		tower.cooldown = cooldown
	return {"fired": fired, "income": income}
