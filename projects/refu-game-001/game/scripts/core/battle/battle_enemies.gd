extends RefCounted
class_name BattleEnemies
## BattleEnemies —— 敌人的每 tick 行为：被阻挡就交战，否则边走边打紧邻工事塔，走到头就漏。
##
## 裁决 A5（docs/01_实现裁决记录.md）：只有路径阻挡单位会拦住敌人；工事塔不拦路但会被
## 路过时攻击，于是 T04 的生命、M01 的维修、S02 的护盾都有意义。

static func update(bt: BattleState, dt: float) -> void:
	var combat: Dictionary = GameData.balance.get("combat", {})
	var reach := float(combat.get("block_reach", 0.5)) * bt.range_unit
	var attack_range := float(combat.get("enemy_attack_range", 0.6)) * bt.range_unit
	var slow_floor := float(combat.get("slow_floor", -0.80))

	BattleBlocking.expire_blockers(bt)
	for b in bt.blockers:
		b.blocked_uids.clear()
	for e in bt.enemies:
		if not e.alive:
			continue
		var blocker := BattleBlocking.find_blocker(bt, e, reach)
		if blocker != null:
			BattleBlocking.engage_blocker(bt, e, blocker, dt)
			continue
		e.attacking_uid = 0
		var fort := BattleFortAttack.adjacent_fort(bt, e, attack_range)
		if fort != null:
			BattleFortAttack.attack_fort(bt, e, fort, dt)
		_advance(bt, e, dt, slow_floor)







static func _advance(bt: BattleState, e: EnemyUnit, dt: float, slow_floor: float) -> void:
	var field_slow := float(e.get_meta("field_slow", 0.0))
	e.distance += e.current_speed(bt.t, slow_floor, e.is_dashing(bt.t), field_slow) * dt
	if e.distance >= bt.paths[e.path_index].total_length:
		e.reached_end = true
		e.alive = false
		BattleDamage.on_leak(bt, e)
