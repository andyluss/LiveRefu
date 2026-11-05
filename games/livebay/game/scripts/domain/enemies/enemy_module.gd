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
		"dead": false,
	})
	return true


func pos(enemy: Dictionary) -> Vector2:
	if map == null:
		return Vector2.ZERO
	return map.point_at(float(enemy.dist))
