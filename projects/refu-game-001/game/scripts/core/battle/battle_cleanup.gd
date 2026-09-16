extends RefCounted
class_name BattleCleanup
## BattleCleanup —— 每 tick 收尾：移除死亡对象、重算人口占用。

static func run(bt: BattleState) -> void:
	# 用 assign()：这些数组是 typed array（Array[EnemyUnit] 等），
	# 直接赋一个未类型化的 Array 会在运行期报类型错。
	bt.enemies.assign(_alive(bt.enemies))
	bt.towers.assign(_alive(bt.towers))
	bt.blockers.assign(_alive(bt.blockers))
	bt.projectiles.assign(_alive(bt.projectiles))
	bt.population_used = 0
	for tw in bt.towers:
		if tw.slot_type == "support":
			bt.population_used += int(tw.base.get("population", 0))


static func _alive(list: Array) -> Array:
	var kept: Array = []
	for item in list:
		if item.alive:
			kept.append(item)
	return kept
