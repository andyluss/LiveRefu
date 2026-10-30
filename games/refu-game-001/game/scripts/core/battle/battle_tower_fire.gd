extends RefCounted
class_name BattleTowerFire
## BattleTowerFire —— 开火：普通弹道、直线穿透（beam）、溅射由弹道结算负责。
## 穿透最多命中 pierce 个目标，只认"差不多在一条线上"（垂直偏差 ≤26px）的敌人。

static func fire(bt: BattleState, tw: TowerUnit, target: EnemyUnit, cps: float) -> void:
	var damage := float(tw.stats.get("damage", 0.0))
	if damage <= 0.0:
		return
	var armor_ignore := 0.0
	if float(tw.stats.get("energy_damage", 0.0)) > 0.5:
		armor_ignore = float(GameData.balance.get("combat", {}).get("energy_damage_armor_ignore", 0.5))
	var pierce := int(tw.stats.get("pierce", 0.0))
	if pierce > 0:
		beam(bt, tw, target, damage, armor_ignore, pierce, cps)
		return
	var p := Projectile.new()
	p.setup(bt.intern.next_uid(), tw.uid, target.uid, tw.pos, BattleQueries.enemy_pos(bt, target),
		damage, float(tw.stats.get("projectile_speed", 900.0)), float(tw.stats.get("splash", 0.0)),
		armor_ignore, BattleFeedback.tower_color(tw))
	bt.projectiles.append(p)


## 直线穿透：朝目标方向打一条线，最多命中 pierce 个敌人（按到塔的距离排序）。
static func beam(bt: BattleState, tw: TowerUnit, target: EnemyUnit, damage: float,
		armor_ignore: float, pierce: int, cps: float) -> void:
	var origin := tw.pos
	var dir := (BattleQueries.enemy_pos(bt, target) - origin).normalized()
	var max_len := float(tw.stats.get("range", 5.0)) * bt.range_unit
	var candidates := beam_candidates(bt, tw, origin, dir, max_len)
	candidates.sort_custom(func(a, b): return a["along"] < b["along"])
	var hits := 0
	for c in candidates:
		if hits >= pierce:
			break
		hits += 1
		BattleDamage.apply_hit(bt, tw, c["e"], damage, armor_ignore, cps)
	var p := Projectile.new()
	p.setup(bt.intern.next_uid(), tw.uid, 0, origin, origin + dir * max_len, 0.0, 100000.0,
		0.0, 0.0, BattleFeedback.tower_color(tw))
	p.kind = "beam"
	bt.projectiles.append(p)


## 射线走廊内的敌人（垂直偏差 ≤26px）：穿透只认"差不多在一条线上"的目标。
static func beam_candidates(bt: BattleState, tw: TowerUnit, origin: Vector2, dir: Vector2,
		max_len: float) -> Array:
	var out: Array = []
	for e in bt.enemies:
		if not e.alive:
			continue
		if e.flying and float(tw.stats.get("targets_air", 0.0)) < 0.5:
			continue
		var rel := BattleQueries.enemy_pos(bt, e) - origin
		var along := rel.dot(dir)
		if along < 0.0 or along > max_len or absf(rel.cross(dir)) > 26.0:
			continue
		out.append({"e": e, "along": along})
	return out
