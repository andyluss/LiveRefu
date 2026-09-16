extends RefCounted
class_name BattleProjectiles
## BattleProjectiles —— 弹道飞行与命中：追踪目标点、到位后结算（含溅射）。

static func update(bt: BattleState, dt: float) -> void:
	var cps := float(GameData.balance.get("combat", {}).get("corrosion_per_stack", 0.03))
	for p in bt.projectiles:
		if not p.alive:
			continue
		var target := BattleQueries.enemy_by_uid(bt, p.target_uid)
		if target != null and target.alive:
			p.target_pos = BattleQueries.enemy_pos(bt, target)
		_trail(p)
		var to := p.target_pos - p.pos
		var step := p.speed * dt
		if to.length() > step:
			p.pos += to.normalized() * step
			continue
		p.pos = p.target_pos
		p.alive = false
		var src := BattleQueries.tower_by_uid(bt, p.source_uid)
		if src != null and src.alive:
			resolve(bt, src, p, cps)


static func _trail(p: Projectile) -> void:
	p.trail.append(p.pos)
	if p.trail.size() > 6:
		p.trail.pop_front()


## 命中结算：主目标 +（若有溅射半径）范围内其他敌人。
static func resolve(bt: BattleState, src: TowerUnit, p: Projectile, cps: float) -> void:
	var primary := BattleQueries.enemy_by_uid(bt, p.target_uid)
	if primary != null and primary.alive:
		BattleDamage.apply_hit(bt, src, primary, p.damage, p.armor_ignore, cps)
	if p.splash <= 0.0:
		return
	var radius := p.splash * bt.range_unit
	for e in bt.enemies:
		if not e.alive or e == primary:
			continue
		if BattleQueries.enemy_pos(bt, e).distance_to(p.pos) <= radius:
			BattleDamage.apply_hit(bt, src, e, p.damage, p.armor_ignore, cps)
