extends RefCounted
class_name BattleTargeting
## BattleTargeting —— 选靶与路径投影（静态纯函数）。

## 选靶：射程内、可打（空中需要 targets_air）、推进最靠前（最接近基地）的那只。
static func acquire(bt: BattleState, tw: TowerUnit) -> EnemyUnit:
	var rng_px := float(tw.stats.get("range", 3.0)) * bt.range_unit
	var best: EnemyUnit = null
	for e in bt.enemies:
		if not e.alive:
			continue
		if e.flying and float(tw.stats.get("targets_air", 0.0)) < 0.5:
			continue
		if tw.pos.distance_to(BattleQueries.enemy_pos(bt, e)) > rng_px:
			continue
		if best == null or e.distance > best.distance:
			best = e
	return best


## 离给定点最近的路径点（放路径单位卡用）；超出 70px 认为"不在路径上"。
static func nearest_path_point(bt: BattleState, pos: Vector2) -> Dictionary:
	var best := {}
	var best_d := INF
	for i in bt.paths.size():
		var pr: Dictionary = bt.paths[i].project(pos)
		if float(pr["distance"]) < best_d:
			best_d = float(pr["distance"])
			best = {"path_index": i, "along": float(pr["along"]),
					"pos": bt.paths[i].point_at(float(pr["along"]))}
	if best.is_empty() or best_d > 70.0:
		return {}
	return best
