extends RefCounted
class_name BattleFields
## BattleFields —— 场（地形效果 / 残留减速 / 伤害场）每 tick 的结算。
##
## 一张"场"= {kind, pos, radius, value, until, source, source_uid}；
## 敌人进圈就吃效果：减速、每秒伤害、易伤。塔进圈则吃射程/生命加成（在 BattleStats 里读）。

static func update(bt: BattleState, dt: float) -> void:
	_expire(bt)
	var cps := float(GameData.balance.get("combat", {}).get("corrosion_per_stack", 0.03))
	for e in bt.enemies:
		if not e.alive:
			continue
		var pos := BattleQueries.enemy_pos(bt, e)
		var slow := 0.0
		var dps := 0.0
		var vulnerable := 0.0
		for f in bt.fields:
			if _expired(bt, f) or pos.distance_to(f["pos"]) > f["radius"]:
				continue
			match String(f["kind"]):
				"slow": slow += float(f["value"])
				"enemy_damage": dps += float(f["value"])
				"vulnerable": vulnerable += float(f["value"])
		e.damage_taken_bonus = vulnerable
		if dps > 0.0:
			var res := e.apply_damage(dps * dt, {"armor_ignore": 1.0}, bt.t, cps)
			if res["killed"]:
				BattleDamage.on_enemy_killed(bt, e, null)
		# 记录本 tick 的场减速，供 EnemyUnit.current_speed 使用
		e.set_meta("field_slow", slow)


static func _expired(bt: BattleState, f: Dictionary) -> bool:
	var until: float = f["until"]
	return until >= 0.0 and bt.t >= until


## 清理：到期的残留场、以及"来源塔已死"的场。
static func _expire(bt: BattleState) -> void:
	for i in range(bt.fields.size() - 1, -1, -1):
		var f: Dictionary = bt.fields[i]
		if _expired(bt, f):
			if String(f["source"]) == "blocker_residual":
				bt.fields.remove_at(i)
			continue
		if String(f["source"]) == "tower" and not BattleQueries.tower_alive(bt, int(f["source_uid"])):
			bt.fields.remove_at(i)
