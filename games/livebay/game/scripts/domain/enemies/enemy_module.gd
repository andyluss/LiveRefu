# LiveBay · 敌人模块
# 负责敌人生成、实体列表与位置查询；移动/受伤/清理仍由 Sim 编排。
class_name LiveBayEnemyModule
extends RefCounted

var enemies: Array = []
var defs: Dictionary = {}
var map: Variant


func configure(enemy_defs: Dictionary, map_module: Variant) -> void:
	defs = enemy_defs
	map = map_module


func reset() -> void:
	enemies.clear()


func spawn(enemy_id: String) -> bool:
	if not defs.has(enemy_id):
		return false
	var def: Dictionary = defs[enemy_id]
	var reverse := str(def.get("behavior", "forward")) == "reverse"
	enemies.append({
		"def": def,
		"hp": float(def.hp),
		"max_hp": float(def.hp),
		"dist": map.path_total if reverse else 0.0,
		"direction": -1 if reverse else 1,
		"hit_towers": {},
		"slow_factor": 0.0,
		"slow_timer": 0.0,
		"mark_timer": 0.0,
		"mark_bonus": 0.0,
		"dead": false,
	})
	return true


func pos(enemy: Dictionary) -> Vector2:
	if map == null:
		return Vector2.ZERO
	return map.point_at(float(enemy.dist))


func update(delta: float, path_total: float, speed_mult := 1.0) -> Dictionary:
	var leaked: Array = []
	var escaped: Array = []
	var active: Array = []
	for i in range(enemies.size() - 1, -1, -1):
		var enemy: Dictionary = enemies[i]
		if enemy.slow_timer > 0.0:
			enemy.slow_timer -= delta
		if float(enemy.get("mark_timer", 0.0)) > 0.0:
			enemy.mark_timer = maxf(0.0, float(enemy.mark_timer) - delta)
		var speed := float(enemy.def.speed) * maxf(0.0, speed_mult)
		if enemy.slow_timer > 0.0:
			speed *= 1.0 - float(enemy.slow_factor)
		var direction := int(enemy.get("direction", 1))
		enemy.dist += speed * delta * direction
		if direction > 0 and enemy.dist >= path_total:
			enemies.remove_at(i)
			leaked.append(enemy)
		elif direction < 0 and enemy.dist <= 0.0:
			enemies.remove_at(i)
			escaped.append(enemy)
		else:
			active.append(enemy)
	return {"leaked": leaked, "escaped": escaped, "active": active}


func cleanup() -> Array:
	var killed: Array = []
	for i in range(enemies.size() - 1, -1, -1):
		var enemy: Dictionary = enemies[i]
		if enemy.dead:
			enemies.remove_at(i)
			killed.append(enemy)
	return killed
