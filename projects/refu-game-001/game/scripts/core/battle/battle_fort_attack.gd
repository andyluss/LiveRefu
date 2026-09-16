extends RefCounted
class_name BattleFortAttack
## BattleFortAttack —— 敌人"边走边打"紧邻的工事塔（有生命的塔）。
## 支援位距路径 ≥1.4 格，敌人打不到，所以支援单位安全。

## 有生命的塔（工事）且紧邻路径 → 路过时顺手打它；支援位距离 ≥1.4 格，打不到。
static func adjacent_fort(bt: BattleState, e: EnemyUnit, attack_range: float) -> TowerUnit:
	var pos := BattleQueries.enemy_pos(bt, e)
	var best: TowerUnit = null
	var best_d := INF
	for tw in bt.towers:
		if not tw.alive or tw.max_hp <= 0.0:
			continue
		var d := tw.pos.distance_to(pos)
		if d <= attack_range + 22.0 and d < best_d:
			best = tw
			best_d = d
	return best


static func attack_fort(bt: BattleState, e: EnemyUnit, tw: TowerUnit, dt: float) -> void:
	e.attack_cd -= dt
	if e.attack_cd > 0.0:
		return
	e.attack_cd = 1.0 / maxf(e.attack_speed, 0.01)
	e.damage_dealt_total += e.attack
	BattleFeedback.floater(bt, tw.pos, "-%d" % int(e.attack), Color(1.0, 0.45, 0.35))
	if tw.apply_damage(e.attack, bt.t)["killed"]:
		BattleDestroy.tower(bt, tw)
