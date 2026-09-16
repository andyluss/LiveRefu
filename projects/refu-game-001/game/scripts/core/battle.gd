extends RefCounted
class_name Battle
## Battle —— 一局战斗的**纯逻辑**模拟（不含任何渲染 / 场景依赖）。
##
## 这样分层的原因（对应 doc 02 的"规则层 / 叙事层"分离）：
##   * 规则层可被 headless 脚本直接驱动，做回归验收（game/scripts/tools/headless_sim.gd）；
##   * 表现层只读 Battle 的状态来画，不参与结算，避免"画面好看但算错"。
##
## 时间：固定步长由外部按 balance.sim.tick_hz 驱动（默认 30Hz），保证可复现。
## 坐标：地图卡原始像素（980×660），1 格 = 90px；距离/射程一律以格再乘回像素。

const PHASE_BUILD := "build"        # 布防期
const PHASE_WAVE := "wave"          # 波次进行中
const PHASE_BREATH := "breath"      # 波间喘息
const PHASE_DRAW := "draw"          # 波间调度三选一（暂停等待玩家）
const PHASE_WON := "won"
const PHASE_LOST := "lost"

# ---------------------------------------------------------------- 配置 / 世界
var level: Dictionary = {}
var map_data: Dictionary = {}
var rule: Dictionary = {}
var wave_set: Dictionary = {}
var challenge_ids: Array[String] = []
var seed_value: int = 0

var paths: Array[PathGeom] = []
var geom: Dictionary = {}            # 平衡参数的快捷引用
var board_cell: float = 90.0
var range_unit: float = 90.0
var px_per_speed: float = 20.75
var fields: Array = []                # 地形/光环/残留产生的场

# ---------------------------------------------------------------- 状态
var phase: String = PHASE_BUILD
var t: float = 0.0
var phase_t: float = 0.0
var wave_index: int = 0              # 0-based；等于 waves.size() 表示全部波次已放完
var energy: float = 0.0
var base_hp: float = 20.0
var base_hp_max: float = 20.0
var population_used: int = 0

var enemies: Array[EnemyUnit] = []
var towers: Array[TowerUnit] = []
var blockers: Array[BlockerUnit] = []
var projectiles: Array[Projectile] = []

var deck: Deck = null
var rng := RandomNumberGenerator.new()
var pending_draw: Array[String] = []

var active_bonds: Array = []          # 当前已触发的羁绊
var played_cards: Dictionary = {}     # card_id -> true（本局上过场的卡，用于羁绊计数）
var global_buffs: Array = []          # [{stat, value, until, source}]
var heal_effects: Array = []          # [{targets:[uid], per_sec, until, source_uid}]
var floaters: Array = []              # 飘字（表现层用）
var log_lines: Array = []             # 文本日志

var stats: Dictionary = {}            # 统计（结算与评级用）
var challenge_score: int = 0
var challenge_drop: float = 1.0
var challenge_rating: float = 0.0

# ---------------------------------------------------------------- 内部
var _uid_counter: int = 1
var _spawn_queue: Array[String] = []
var _spawn_timer: float = 0.0
var _spawn_interval: float = 1.4
var _mods: Dictionary = {}
var _waves: Array = []


func _init(level_id: String, selected_challenges: Array, deck_card_ids: Array, seed_v: int = 0) -> void:
	level = GameData.get_level(level_id)
	map_data = GameData.get_map(level.get("map", ""))
	rule = GameData.get_rule(level.get("rule", "RUL-BASE"))
	wave_set = GameData.get_wave_set(level.get("wave_set", ""))
	challenge_ids = []
	for c in selected_challenges:
		challenge_ids.append(String(c))
	seed_value = seed_v
	rng.seed = seed_v

	var bal := GameData.balance
	board_cell = float(bal.get("board", {}).get("cell", 90.0))
	range_unit = float(bal.get("board", {}).get("range_unit", 90.0))
	px_per_speed = float(bal.get("movement", {}).get("px_per_speed_unit", 20.75))
	geom = bal

	_waves = wave_set.get("waves", [])
	_build_world()
	_apply_challenges()

	deck = Deck.new()
	deck.setup(deck_card_ids, seed_v,
		int(rule.get("hand_size", 5)), int(rule.get("draw_options", 3)))

	base_hp_max = float(rule.get("base_hp", 20))
	base_hp = base_hp_max
	energy = float(rule.get("start_energy", 10))

	stats = {
		"kills": 0, "leaks": 0, "energy_gained": float(energy), "energy_spent": 0.0,
		"energy_returned": 0.0, "hook_triggers": 0, "bonds_triggered": 0,
		"cards_played": 0, "damage_dealt": 0.0, "towers_built": 0,
		"wave_reached": 0, "duration": 0.0, "overkill": 0.0,
	}


func _build_world() -> void:
	paths.clear()
	var path_count: int = maxi(1, (map_data.get("paths", []) as Array).size())
	if path_count == 0:
		path_count = 1
	for i in path_count:
		paths.append(PathGeom.from_map_path(map_data, i))
	# 地形 → 场
	for tile in map_data.get("terrain", []):
		var def := GameData.terrain_def(String(tile.get("id", "")))
		if def.is_empty():
			continue
		var pos := Vector2(tile["x"], tile["y"])
		var radius_cells := float(def.get("radius", 1.5))
		var radius := radius_cells * range_unit
		if def.has("range_bonus"):
			fields.append(_field("range", pos, radius, def["range_bonus"], "terrain"))
		if def.has("enemy_speed"):
			fields.append(_field("slow", pos, radius, def["enemy_speed"], "terrain"))
		if def.has("enemy_dps"):
			fields.append(_field("enemy_damage", pos, radius, def["enemy_dps"], "terrain"))
		if def.has("enemy_damage_taken"):
			fields.append(_field("vulnerable", pos, radius, def["enemy_damage_taken"], "terrain"))
		if def.has("fort_hp_bonus"):
			fields.append(_field("fort_hp", pos, radius, def["fort_hp_bonus"], "terrain"))
		if def.has("unbuildable"):
			fields.append(_field("unbuildable", pos, radius, 0.0, "terrain"))


func _field(kind: String, pos: Vector2, radius: float, value: float, source: String,
		until: float = -1.0, source_uid: int = 0) -> Dictionary:
	return {"kind": kind, "pos": pos, "radius": radius, "value": value,
			"source": source, "until": until, "source_uid": source_uid}


## 挑战卡：只改"环境参数"，不改任何卡的数值块（06 号文档第三节 / 13 号卡表第四节）。
func _apply_challenges() -> void:
	_mods = {
		"enemy_hp_mul": 1.0, "enemy_speed_mul": 1.0, "energy_rate_mul": 1.0,
		"kill_energy_mul": 1.0, "ban_card_type": "", "extra_spawn": 0,
	}
	challenge_score = 0
	challenge_drop = 1.0
	challenge_rating = 0.0
	for cid in challenge_ids:
		var c: Dictionary = GameData.challenges.get(cid, {})
		if c.is_empty():
			continue
		challenge_score += int(c.get("score", 0))
		var m: Dictionary = c.get("modifier", {})
		for key in m.keys():
			match key:
				"enemy_hp_mul", "enemy_speed_mul", "energy_rate_mul", "kill_energy_mul":
					_mods[key] = float(_mods[key]) * float(m[key])
				"ban_card_type":
					_mods["ban_card_type"] = String(m[key])
				"extra_spawn":
					_mods["extra_spawn"] = int(_mods["extra_spawn"]) + int(m[key])
	# 结算口径来自 数值/05 第四节（取代 13 号卡表的按等级结算）
	challenge_drop = minf(2.0, 1.0 + 0.05 * challenge_score)
	challenge_rating = 0.05 * challenge_score


func start() -> void:
	var opening := deck.deal_opening_hand()
	phase = PHASE_BUILD
	phase_t = 0.0
	_log("关卡 %s 开始：卡组 %d 张，起手 %d 张，起始能量 %d"
		% [level.get("id", "?"), deck.cards.size(), opening.size(), int(energy)])
	_check_bonds()


# ==================================================================== 主循环

## 推进一帧（固定步长）。view 只调用它。
func tick(dt: float) -> void:
	stats["duration"] = t
	if phase == PHASE_WON or phase == PHASE_LOST or phase == PHASE_DRAW:
		return
	t += dt
	phase_t += dt
	_update_heal_effects(dt)

	match phase:
		PHASE_BUILD, PHASE_BREATH:
			_regen_energy(dt)
			var limit := float(rule.get("build_phase_sec", 15.0)) if phase == PHASE_BUILD \
				else float(rule.get("wave_gap_sec", 5.0))
			if phase_t >= limit:
				_start_wave()
		PHASE_WAVE:
			_regen_energy(dt)
			_update_spawning(dt)
			_update_fields(dt)
			_recompute_tower_stats()
			_update_towers(dt)
			_update_projectiles(dt)
			_update_enemies(dt)
			_cleanup()
			if _wave_finished():
				_end_wave()

	_cleanup_floaters()
	_check_bonds()


func _regen_energy(dt: float) -> void:
	var rate := float(rule.get("energy_rate", 1.0)) * float(_mods["energy_rate_mul"])
	_gain_energy(rate * dt)


func _gain_energy(amount: float) -> void:
	var cap := float(rule.get("energy_cap", 99))
	var before := energy
	energy = minf(cap, energy + amount)
	stats["energy_gained"] += energy - before


# ==================================================================== 波次

func _start_wave() -> void:
	if wave_index >= _waves.size():
		_win()
		return
	var wave: Dictionary = _waves[wave_index]
	_spawn_queue.clear()
	for comp in wave.get("composition", []):
		for i in int(comp.get("count", 0)):
			_spawn_queue.append(String(comp.get("enemy", "")))
	_spawn_interval = float(wave.get("spawn_interval", 1.4))
	_spawn_timer = 0.0
	phase = PHASE_WAVE
	phase_t = 0.0
	stats["wave_reached"] = wave_index + 1
	_log("第 %d 波开始：%s" % [wave_index + 1, _composition_text(wave)])
	_run_hooks_all("on_wave_start")


func _composition_text(wave: Dictionary) -> String:
	var parts: Array[String] = []
	for comp in wave.get("composition", []):
		var e := GameData.get_enemy(String(comp.get("enemy", "")))
		parts.append("%s×%d" % [e.get("name", "?"), int(comp.get("count", 0))])
	return " + ".join(parts)


func _update_spawning(dt: float) -> void:
	if _spawn_queue.is_empty():
		return
	_spawn_timer -= dt
	if _spawn_timer <= 0.0:
		_spawn_enemy(_spawn_queue.pop_front())
		_spawn_timer = _spawn_interval
		if _mods["extra_spawn"] > 0 and not _spawn_queue.is_empty():
			# 双流：同时开波（第二出生点；M1 单入口图会被关卡白名单拦下）
			_spawn_enemy(_spawn_queue.pop_front(), 1)
			_spawn_timer = _spawn_interval


func _spawn_enemy(enemy_id: String, path_index: int = 0) -> void:
	var def := GameData.get_enemy(enemy_id)
	if def.is_empty():
		return
	var e := EnemyUnit.new()
	e.uid = _next_uid()
	e.id = enemy_id
	e.name = def.get("name", enemy_id)
	e.art = def.get("art", "")
	e.path_index = clampi(path_index, 0, maxi(0, paths.size() - 1))
	e.distance = 0.0
	e.max_hp = float(def.get("hp", 10)) * float(_mods["enemy_hp_mul"])
	e.hp = e.max_hp
	e.armor = float(def.get("armor", 0))
	e.attack = float(def.get("attack", 0))
	e.attack_speed = float(def.get("attack_speed", 1.0))
	e.base_speed = float(def.get("speed", 1.0)) * px_per_speed * float(_mods["enemy_speed_mul"])
	e.kill_energy = int(def.get("kill_energy", 1))
	e.threat = int(def.get("threat", 0))
	e.spawn_time = t
	var traits: Array = def.get("traits", [])
	var tp: Dictionary = def.get("trait_params", {})
	e.flying = traits.has("flying")
	e.slow_resist = float(tp.get("slow_resist", 0.0))
	e.flat_reduction = float(tp.get("reduction", 0.0))
	e.dash_duration = float(tp.get("dash_duration", 0.0))
	e.dash_multiplier = float(tp.get("dash_multiplier", 1.0)) if traits.has("dash") else 1.0
	e.phase_threshold = float(tp.get("phase_threshold", 0.0))
	enemies.append(e)


func _wave_finished() -> bool:
	if not _spawn_queue.is_empty():
		return false
	for e in enemies:
		if e.alive:
			return false
	return true


func _end_wave() -> void:
	var clear_bonus := float(GameData.balance.get("energy", {}).get("wave_clear_bonus", 5))
	_gain_energy(clear_bonus)
	_run_hooks_all("on_wave_end")
	_log("第 %d 波清空：能量 +%d（波间奖励）" % [wave_index + 1, int(clear_bonus)])
	wave_index += 1
	if wave_index >= _waves.size():
		_win()
		return
	phase = PHASE_DRAW
	phase_t = 0.0
	pending_draw = deck.offer_draw()
	if pending_draw.is_empty():
		# 牌堆已空：没有可调度的牌，直接进入喘息期，避免流程卡在等待态
		phase = PHASE_BREATH
		_log("牌堆已空，跳过调度")


## 波间调度：选择一张牌进入手牌。
func pick_draw(card_id: String) -> bool:
	if phase != PHASE_DRAW:
		return false
	if not deck.pick_draw(card_id):
		return false
	pending_draw.clear()
	phase = PHASE_BREATH
	phase_t = 0.0
	_log("调度：获得「%s」" % GameData.get_card(card_id).get("name", card_id))
	return true


func _win() -> void:
	phase = PHASE_WON
	_cleanup()
	_log("通关：守住全部 %d 波" % _waves.size())


func _lose() -> void:
	phase = PHASE_LOST
	_log("失败：基地生命归零")


# ==================================================================== 场地效果

func _update_fields(dt: float) -> void:
	# 过期清理（残留减速等）
	for i in range(fields.size() - 1, -1, -1):
		var f: Dictionary = fields[i]
		var until: float = f["until"]
		if until >= 0.0 and t >= until:
			if fields[i]["source"] == "blocker_residual":
				fields.remove_at(i)
			continue
		if f["source"] == "tower" and not _tower_alive(int(f["source_uid"])):
			fields.remove_at(i)

	var corrosion_per_stack := float(GameData.balance.get("combat", {}).get("corrosion_per_stack", 0.03))
	for e in enemies:
		if not e.alive:
			continue
		var pos := _enemy_pos(e)
		var slow := 0.0
		var dps := 0.0
		var vulnerable := 0.0
		for f in fields:
			var until: float = f["until"]
			if until >= 0.0 and t >= until:
				continue
			if pos.distance_to(f["pos"]) > f["radius"]:
				continue
			match String(f["kind"]):
				"slow": slow += float(f["value"])
				"enemy_damage": dps += float(f["value"])
				"vulnerable": vulnerable += float(f["value"])
		e.damage_taken_bonus = vulnerable
		if dps > 0.0:
			var res := e.apply_damage(dps * dt, {"armor_ignore": 1.0}, t, corrosion_per_stack)
			if res["killed"]:
				_on_enemy_killed(e, null)
		# 记录本 tick 的场减速，供 current_speed 使用
		e.set_meta("field_slow", slow)


# ==================================================================== 塔

## 属性管线：基础值 → 修饰卡 → 钩子叠层 → 限时增益 → 羁绊 → 光环 → 地形 → 全局增益。
## 每 tick 全量重算，保证任何增益来源增删后结果都自洽（doc 02 五律之三：remove-safe）。
## 口径：final = base × (1 + Σ百分比修正)；穿透是唯一的"平坦值"字段。
func _recompute_tower_stats() -> void:
	for tw in towers:
		if not tw.alive:
			continue
		var pct: Dictionary = {}            # stat -> 累计百分比
		var pierce_flat := float(tw.base.get("pierce", 0.0))
		var _add := func(stat: String, value: float) -> void:
			pct[stat] = float(pct.get(stat, 0.0)) + value

		# 2) 修饰卡（挂在塔上；同名多张按 max_stacks 折算，只结算一次）
		var mod_counts: Dictionary = {}
		for m in tw.modifiers:
			mod_counts[m["card_id"]] = int(mod_counts.get(m["card_id"], 0)) + 1
		var seen_mod: Dictionary = {}
		for m in tw.modifiers:
			var cid := String(m["card_id"])
			if seen_mod.has(cid):
				continue
			seen_mod[cid] = true
			var n := int(mod_counts[cid])
			for eff in ((m["def"] as Dictionary).get("hooks", {}) as Dictionary).get("passive", []):
				if String(eff.get("op", "")) != "stat_buff":
					continue
				var max_stacks := int(eff.get("max_stacks", 0))
				if max_stacks > 0:
					n = mini(n, max_stacks)
				_add.call(String(eff["stat"]), float(eff["value"]) * n)

		# 3) 钩子永久叠层（on_hit / on_kill 累计；穿透为平坦值）
		for stat in tw.hook_stacks.keys():
			if stat == "pierce":
				pierce_flat += float(tw.hook_stacks[stat])
			else:
				_add.call(String(stat), float(tw.hook_stacks[stat]))

		# 4) 塔自身的限时 / 永久增益
		for b in tw.buffs:
			var until: float = b["until"]
			if until >= 0.0 and t > until:
				continue
			_add.call(String(b["stat"]), float(b["value"]))

		# 5) 羁绊
		for bond in active_bonds:
			for eff in bond.get("effect", []):
				if String(eff.get("op", "")) != "stat_buff":
					continue
				if _tower_matches_scope(tw, String(eff.get("scope", "")), {}):
					_add.call(String(eff["stat"]), float(eff["value"]))

		# 6) 光环（支援单位的 passive aura；tag_self 表示"与来源卡同标签"）
		for src in towers:
			if not src.alive or src == tw:
				continue
			for eff in ((src.card.get("hooks", {}) as Dictionary).get("passive", [])):
				if String(eff.get("op", "")) != "aura":
					continue
				var radius := float(eff.get("radius", 2.0)) * range_unit
				if src.pos.distance_to(tw.pos) > radius:
					continue
				if _tower_matches_scope(tw, String(eff.get("scope", "")), src.card):
					_add.call(String(eff["stat"]), float(eff["value"]))

		# 7) 地形（高台射程 +15%、工事平台工事卡生命 +20%）
		for f in fields:
			if tw.pos.distance_to(f["pos"]) > f["radius"]:
				continue
			match String(f["kind"]):
				"range": _add.call("range", float(f["value"]))
				"fort_hp":
					if tw.has_tag("工事"):
						_add.call("max_hp", float(f["value"]))

		# 8) 全局增益（技能卡）
		for b in global_buffs:
			var guntil: float = b["until"]
			if guntil >= 0.0 and t > guntil:
				continue
			if _tower_matches_scope(tw, String(b.get("scope", "all_towers")), b.get("card", {})):
				_add.call(String(b["stat"]), float(b["value"]))

		var before_max := tw.max_hp
		var new_stats: Dictionary = tw.base.duplicate(true)
		for stat in pct.keys():
			var base_v := float(tw.base.get(stat, 0.0))
			new_stats[stat] = base_v * (1.0 + float(pct[stat]))
		new_stats["pierce"] = pierce_flat
		tw.stats = new_stats
		# max_hp 变化时同步当前生命（羁绊生效不该凭空回血，也不该凭空扣血）
		var new_max := float(new_stats.get("max_hp", before_max))
		if absf(new_max - before_max) > 0.001:
			tw.hp = clampf(tw.hp + (new_max - before_max), 0.0, new_max)
		tw.max_hp = new_max
		# 清理过期增益
		var kept: Array = []
		for b in tw.buffs:
			var buntil: float = b["until"]
			if buntil < 0.0 or t <= buntil:
				kept.append(b)
		tw.buffs = kept


func _update_towers(dt: float) -> void:
	var combat: Dictionary = GameData.balance.get("combat", {})
	var corrosion_per_stack := float(combat.get("corrosion_per_stack", 0.03))
	for tw in towers:
		if not tw.alive:
			continue
		# 到期（限时支援单位）
		if tw.expires_at >= 0.0 and t >= tw.expires_at:
			tw.alive = false
			_log("「%s」离场" % tw.name)
			continue
		if tw.shield_until >= 0.0 and t > tw.shield_until:
			tw.shield = 0.0
		# on_wave_end 等钩子挂上的持续修复由 heal_effects 处理
		if not tw.is_attacker():
			continue
		tw.cd -= dt
		if tw.cd > 0.0:
			continue
		var target := _acquire_target(tw)
		if target == null:
			continue
		_fire(tw, target, corrosion_per_stack)
		tw.cd = tw.attack_interval()


## 选目标：射程内、可打（空中需要 targets_air）、推进最靠前（最接近基地）的那只。
func _acquire_target(tw: TowerUnit) -> EnemyUnit:
	var rng_px := float(tw.stats.get("range", 3.0)) * range_unit
	var best: EnemyUnit = null
	for e in enemies:
		if not e.alive:
			continue
		if e.flying and float(tw.stats.get("targets_air", 0.0)) < 0.5:
			continue
		var d := tw.pos.distance_to(_enemy_pos(e))
		if d > rng_px:
			continue
		if best == null or e.distance > best.distance:
			best = e
	return best


func _fire(tw: TowerUnit, target: EnemyUnit, corrosion_per_stack: float) -> void:
	var damage := float(tw.stats.get("damage", 0.0))
	if damage <= 0.0:
		return
	var armor_ignore := 0.0
	if float(tw.stats.get("energy_damage", 0.0)) > 0.5:
		armor_ignore = float(GameData.balance.get("combat", {}).get("energy_damage_armor_ignore", 0.5))
	var pierce := int(tw.stats.get("pierce", 0.0))
	var splash := float(tw.stats.get("splash", 0.0))
	if pierce > 0:
		_beam_hit(tw, target, damage, armor_ignore, pierce, corrosion_per_stack)
		return
	var p := Projectile.new()
	p.setup(_next_uid(), tw.uid, target.uid, tw.pos, _enemy_pos(target), damage,
		float(tw.stats.get("projectile_speed", 900.0)), splash, armor_ignore, _tower_color(tw))
	projectiles.append(p)


## 直线穿透：朝目标方向打一条线，最多命中 pierce 个敌人。
func _beam_hit(tw: TowerUnit, target: EnemyUnit, damage: float, armor_ignore: float,
		pierce: int, corrosion_per_stack: float) -> void:
	var origin := tw.pos
	var dir := (_enemy_pos(target) - origin).normalized()
	var max_len := float(tw.stats.get("range", 5.0)) * range_unit
	var candidates: Array = []
	for e in enemies:
		if not e.alive:
			continue
		if e.flying and float(tw.stats.get("targets_air", 0.0)) < 0.5:
			continue
		var rel := _enemy_pos(e) - origin
		var along := rel.dot(dir)
		if along < 0.0 or along > max_len:
			continue
		var perp := absf(rel.cross(dir))
		if perp > 26.0:
			continue
		candidates.append({"e": e, "along": along})
	candidates.sort_custom(func(a, b): return a["along"] < b["along"])
	var hits := 0
	for c in candidates:
		if hits >= pierce:
			break
		hits += 1
		_apply_hit(tw, c["e"], damage, armor_ignore, corrosion_per_stack)
	var p := Projectile.new()
	p.setup(_next_uid(), tw.uid, 0, origin, origin + dir * max_len, 0.0, 100000.0, 0.0, 0.0, _tower_color(tw))
	p.kind = "beam"
	projectiles.append(p)
	stats["hook_triggers"] += 0


func _update_projectiles(dt: float) -> void:
	var corrosion_per_stack := float(GameData.balance.get("combat", {}).get("corrosion_per_stack", 0.03))
	for p in projectiles:
		if not p.alive:
			continue
		var target := _enemy_by_uid(p.target_uid)
		if target != null and target.alive:
			p.target_pos = _enemy_pos(target)
		p.trail.append(p.pos)
		if p.trail.size() > 6:
			p.trail.pop_front()
		var to := p.target_pos - p.pos
		var step := p.speed * dt
		if to.length() <= step:
			p.pos = p.target_pos
			p.alive = false
			var src := _tower_by_uid(p.source_uid)
			if src != null and src.alive:
				_resolve_impact(src, p, corrosion_per_stack)
		else:
			p.pos += to.normalized() * step


func _resolve_impact(src: TowerUnit, p: Projectile, corrosion_per_stack: float) -> void:
	var primary := _enemy_by_uid(p.target_uid)
	if primary != null and primary.alive:
		_apply_hit(src, primary, p.damage, p.armor_ignore, corrosion_per_stack)
	if p.splash > 0.0:
		var radius := p.splash * range_unit
		for e in enemies:
			if not e.alive or e == primary:
				continue
			if _enemy_pos(e).distance_to(p.pos) <= radius:
				_apply_hit(src, e, p.damage, p.armor_ignore, corrosion_per_stack)


## 单次命中的完整结算：伤害 → on_hit 钩子 → 击杀 → on_kill 钩子与能量返还。
func _apply_hit(tw: TowerUnit, e: EnemyUnit, damage: float, armor_ignore: float,
		corrosion_per_stack: float) -> void:
	var res := e.apply_damage(damage, {"armor_ignore": armor_ignore}, t, corrosion_per_stack)
	var dealt := float(res["hp_damage"]) + float(res["shield_absorbed"])
	tw.damage_dealt += dealt
	stats["damage_dealt"] += dealt
	_run_hooks(tw, "on_hit", {"enemy": e})
	if res["killed"]:
		_on_enemy_killed(e, tw)


func _on_enemy_killed(e: EnemyUnit, killer) -> void:
	if not e.alive and e.get_meta("counted", false):
		return
	e.set_meta("counted", true)
	stats["kills"] += 1
	var refund := float(e.kill_energy) * float(_mods["kill_energy_mul"])
	_gain_energy(refund)
	if killer is TowerUnit:
		killer.kills += 1
		_run_hooks(killer, "on_kill", {"enemy": e})
	_add_floater(_enemy_pos(e), "+%d" % int(refund), Color(0.45, 0.95, 0.85))
	_run_hooks_all("on_kill_any", {"enemy": e})


# ==================================================================== 敌人

func _update_enemies(dt: float) -> void:
	var combat: Dictionary = GameData.balance.get("combat", {})
	var slow_floor := float(combat.get("slow_floor", -0.80))
	var reach := float(combat.get("block_reach", 0.5)) * range_unit
	var attack_range := float(combat.get("enemy_attack_range", 0.6)) * range_unit
	var corruption := float(combat.get("corrosion_per_stack", 0.03))

	# 阻挡单位到期（ANV-M03：存在 15s，on_expire 留下 3s 残留减速）
	for b in blockers:
		if b.alive and b.expires_at >= 0.0 and t >= b.expires_at:
			b.alive = false
			_on_blocker_expired(b)

	for b in blockers:
		b.blocked_uids.clear()

	for e in enemies:
		if not e.alive:
			continue
		var pos := _enemy_pos(e)
		# 1) 找阻挡单位：同路径、距离在拦截范围内、还有阻挡额度
		var blocker: BlockerUnit = null
		for b in blockers:
			if not b.alive or b.path_index != e.path_index:
				continue
			if absf(b.along - e.distance) > reach + 20.0:
				continue
			if b.blocked_uids.has(e.uid):
				blocker = b
				break
			if not b.is_full():
				blocker = b
				break
		if blocker != null:
			if not blocker.blocked_uids.has(e.uid):
				blocker.blocked_uids.append(e.uid)
			e.attacking_uid = blocker.uid
			e.attack_cd -= dt
			if e.attack_cd <= 0.0:
				e.attack_cd = 1.0 / maxf(e.attack_speed, 0.01)
				var res := blocker.apply_damage(e.attack, t)
				e.damage_dealt_total += e.attack
				_add_floater(blocker.pos, "-%d" % int(e.attack), Color(1.0, 0.45, 0.35))
				if res["killed"]:
					_on_blocker_destroyed(blocker)
			continue
		# 2) 未被拦住：边走边打紧邻的工事塔（有生命的塔）
		e.attacking_uid = 0
		var fort := _adjacent_fort(e, attack_range)
		if fort != null:
			e.attack_cd -= dt
			if e.attack_cd <= 0.0:
				e.attack_cd = 1.0 / maxf(e.attack_speed, 0.01)
				var r := fort.apply_damage(e.attack, t)
				e.damage_dealt_total += e.attack
				_add_floater(fort.pos, "-%d" % int(e.attack), Color(1.0, 0.45, 0.35))
				if r["killed"]:
					_on_tower_destroyed(fort)
		# 3) 前进
		var field_slow := float(e.get_meta("field_slow", 0.0))
		var spd := e.current_speed(t, slow_floor, e.is_dashing(t), field_slow)
		e.distance += spd * dt
		var path := paths[e.path_index]
		if e.distance >= path.total_length:
			e.reached_end = true
			e.alive = false
			_on_leak(e)


func _adjacent_fort(e: EnemyUnit, attack_range: float) -> TowerUnit:
	var pos := _enemy_pos(e)
	var best: TowerUnit = null
	var best_d := INF
	for tw in towers:
		if not tw.alive or tw.max_hp <= 0.0:
			continue
		var d := tw.pos.distance_to(pos)
		if d <= attack_range + 22.0 and d < best_d:
			best = tw
			best_d = d
	return best


func _on_leak(e: EnemyUnit) -> void:
	stats["leaks"] += 1
	base_hp -= float(GameData.balance.get("base", {}).get("leak_damage", 1))
	_add_floater(_enemy_pos(e), "漏怪", Color(1.0, 0.35, 0.3))
	_log("漏怪：%s 抵达基地（基地生命 %d）" % [e.name, int(base_hp)])
	if base_hp <= 0.0:
		base_hp = 0.0
		_lose()


func _on_tower_destroyed(tw: TowerUnit) -> void:
	tw.alive = false
	_log("「%s」被摧毁" % tw.name)
	_run_hooks(tw, "on_destroy", {})
	_add_floater(tw.pos, "摧毁", Color(1.0, 0.4, 0.35))


func _on_blocker_destroyed(b: BlockerUnit) -> void:
	b.alive = false
	_log("「%s」被摧毁" % b.name)
	_run_blocker_hooks(b, "on_destroy")
	_add_floater(b.pos, "摧毁", Color(1.0, 0.4, 0.35))


func _on_blocker_expired(b: BlockerUnit) -> void:
	_log("「%s」到期退场" % b.name)
	_run_blocker_hooks(b, "on_expire")
	if b.has_residual:
		fields.append(_field("slow", b.pos, b.residual_radius, b.residual_slow,
			"blocker_residual", t + b.residual_until, 0))
		_add_floater(b.pos, "残留减速", Color(0.5, 0.8, 1.0))


func _run_blocker_hooks(b: BlockerUnit, event: String) -> void:
	var hooks: Dictionary = b.card.get("hooks", {})
	for eff in hooks.get(event, []):
		_run_effect(eff, {"card": b.card, "pos": b.pos})


func _cleanup() -> void:
	var alive_enemies: Array[EnemyUnit] = []
	for e in enemies:
		if e.alive:
			alive_enemies.append(e)
		else:
			if e.reached_end:
				pass
	enemies = alive_enemies

	var alive_towers: Array[TowerUnit] = []
	for tw in towers:
		if tw.alive:
			alive_towers.append(tw)
	towers = alive_towers

	var alive_blockers: Array[BlockerUnit] = []
	for b in blockers:
		if b.alive:
			alive_blockers.append(b)
	blockers = alive_blockers

	var alive_proj: Array[Projectile] = []
	for p in projectiles:
		if p.alive:
			alive_proj.append(p)
	projectiles = alive_proj

	population_used = 0
	for tw in towers:
		if tw.slot_type == "support":
			population_used += int(tw.base.get("population", 0))


# ==================================================================== 放置 / 施放

## 放置一张卡。返回 {ok, reason, uid}
func place_card(card_id: String, pos: Vector2, extra: Dictionary = {}) -> Dictionary:
	var card := GameData.get_card(card_id)
	if card.is_empty():
		return {"ok": false, "reason": "未知卡牌"}
	if phase == PHASE_DRAW or phase == PHASE_WON or phase == PHASE_LOST:
		return {"ok": false, "reason": "当前阶段不能操作"}
	var ctype := String(card.get("type", ""))
	if _mods["ban_card_type"] == ctype:
		return {"ok": false, "reason": "本局禁用了「%s」" % ctype}
	var cost := float(card.get("cost", 0))
	if energy < cost:
		return {"ok": false, "reason": "能量不足（需要 %d）" % int(cost)}

	match ctype:
		"tower":
			return _place_tower(card, pos)
		"unit":
			var slot := String(card.get("slot", ""))
			if slot == "path":
				return _place_blocker(card, pos)
			return _place_support(card, pos)
		"modifier":
			return _place_modifier(card, pos, extra)
		"skill":
			return {"ok": false, "reason": "技能卡请指定目标后施放"}
	return {"ok": false, "reason": "该卡不能直接放置"}


func _slot_of(pos: Vector2) -> Dictionary:
	return GameData.slot_at(map_data, pos, 52.0)


func _slot_free(pos: Vector2) -> bool:
	for tw in towers:
		if tw.alive and tw.pos.distance_to(pos) < 40.0:
			return false
	return true


func _place_tower(card: Dictionary, pos: Vector2) -> Dictionary:
	var slot := _slot_of(pos)
	if slot.is_empty() or String(slot["type"]) != "standard":
		return {"ok": false, "reason": "塔卡只能放在标准塔位"}
	var spot: Vector2 = slot["pos"]
	if not _slot_free(spot):
		return {"ok": false, "reason": "该塔位已有卡"}
	if _is_unbuildable(spot):
		return {"ok": false, "reason": "虚空地形不可放置"}
	var tw := TowerUnit.new()
	tw.setup(_next_uid(), card, "standard", spot)
	towers.append(tw)
	_pay(card)
	_register_played(card, tw)
	_run_hooks(tw, "on_deploy", {})
	_add_floater(spot, "-%d" % int(card.get("cost", 0)), Color(0.6, 0.85, 1.0))
	stats["towers_built"] += 1
	_log("放置「%s」" % card.get("name", ""))
	return {"ok": true, "uid": tw.uid}


func _place_support(card: Dictionary, pos: Vector2) -> Dictionary:
	var slot := _slot_of(pos)
	if slot.is_empty() or String(slot["type"]) != "support":
		return {"ok": false, "reason": "支援卡只能放在支援位"}
	var spot: Vector2 = slot["pos"]
	if not _slot_free(spot):
		return {"ok": false, "reason": "该支援位已有卡"}
	var pop := int(card.get("stats", {}).get("population", 0))
	if population_used + pop > int(rule.get("population_cap", 5)):
		return {"ok": false, "reason": "人口已满（%d/%d）" % [population_used, int(rule.get("population_cap", 5))]}
	var tw := TowerUnit.new()
	tw.setup(_next_uid(), card, "support", spot)
	# 在场时长用独立的 lifetime 字段：duration 在支援卡上表示"修理/光环的持续窗口"
	# （如 ANV-M01「修复 8/s、持续 6s」），不是单位寿命。见 docs/01_实现裁决记录.md A7。
	var lifetime := float(card.get("stats", {}).get("lifetime", 0.0))
	if lifetime > 0.0:
		tw.expires_at = t + lifetime
	towers.append(tw)
	_pay(card)
	_register_played(card, tw)
	_run_hooks(tw, "on_deploy", {})
	_add_floater(spot, "-%d" % int(card.get("cost", 0)), Color(0.6, 0.85, 1.0))
	_log("部署「%s」" % card.get("name", ""))
	return {"ok": true, "uid": tw.uid}


func _place_blocker(card: Dictionary, pos: Vector2) -> Dictionary:
	var nearest := _nearest_path_point(pos)
	if nearest.is_empty():
		return {"ok": false, "reason": "路径单位只能放在敌人行进路径上"}
	var b := BlockerUnit.new()
	b.setup(_next_uid(), card, int(nearest["path_index"]), float(nearest["along"]), nearest["pos"])
	b.block_reach = float(GameData.balance.get("combat", {}).get("block_reach", 0.5)) * range_unit + 25.0
	var duration := float(card.get("stats", {}).get("duration", 0.0))
	if duration > 0.0:
		b.expires_at = t + duration
	# 到期残留减速（on_expire）
	for eff in (card.get("hooks", {}) as Dictionary).get("on_expire", []):
		if String(eff.get("op", "")) == "slow_field":
			b.has_residual = true
			b.residual_slow = float(eff.get("value", -0.2))
			b.residual_until = float(eff.get("duration", 3.0))
			b.residual_radius = float(eff.get("radius", 1.5)) * range_unit
	blockers.append(b)
	_pay(card)
	_register_played(card, {})
	_add_floater(b.pos, "-%d" % int(card.get("cost", 0)), Color(0.6, 0.85, 1.0))
	_log("放置「%s」于路径" % card.get("name", ""))
	return {"ok": true, "uid": b.uid}


## 修饰卡：拖到已放置的塔上＝挂在塔上；拖到地图的"修饰位"上＝全域修饰。
func _place_modifier(card: Dictionary, pos: Vector2, extra: Dictionary) -> Dictionary:
	var slot := _slot_of(pos)
	var choice := String(extra.get("tag_choice", ""))
	var target_uid := int(extra.get("target_uid", 0))
	var tw: TowerUnit = null
	if target_uid > 0:
		tw = _tower_by_uid(target_uid)
	elif not slot.is_empty() and String(slot["type"]) == "modifier":
		# 修饰位：作用对象＝射程内最合适的同标签塔；没有塔则拒绝（避免空挂）
		tw = _best_modifier_host(card, slot["pos"])
		if tw == null:
			return {"ok": false, "reason": "修饰位附近没有可挂载的塔"}
	else:
		tw = _tower_at(pos, 60.0)
	if tw == null or not tw.alive:
		return {"ok": false, "reason": "修饰卡需要拖到一座已放置的塔（或地图修饰位）上"}
	var max_stacks := int(card.get("stats", {}).get("max_stacks", 0))
	if max_stacks > 0:
		var cnt := 0
		for m in tw.modifiers:
			if m["card_id"] == card.get("id", ""):
				cnt += 1
		if cnt >= max_stacks:
			return {"ok": false, "reason": "「%s」最多叠 %d 层" % [card.get("name", ""), max_stacks]}
	tw.modifiers.append({"card_id": card.get("id", ""), "def": card, "choice": choice})
	_pay(card)
	_register_played(card, tw)
	_run_hooks(tw, "on_attach", {"choice": choice})
	_add_floater(tw.pos, "修饰", Color(1.0, 0.82, 0.45))
	_log("为「%s」挂载「%s」" % [tw.name, card.get("name", "")])
	return {"ok": true, "uid": tw.uid}


func _best_modifier_host(card: Dictionary, pos: Vector2) -> TowerUnit:
	var tags: Array = card.get("tags", [])
	var best: TowerUnit = null
	var best_score := -1
	for tw in towers:
		if not tw.alive:
			continue
		var score := 0
		for tag in tags:
			if tw.has_tag(String(tag)):
				score += 1
		if score > best_score and (score > 0 or tags.is_empty()):
			best = tw
			best_score = score
	return best


## 施放技能卡。S01 全场增益无需目标；S02 需要指定一座塔。
func cast_card(card_id: String, target_uid: int = 0) -> Dictionary:
	var card := GameData.get_card(card_id)
	if card.is_empty():
		return {"ok": false, "reason": "未知卡牌"}
	if _mods["ban_card_type"] == "skill":
		return {"ok": false, "reason": "本局禁用了「skill」"}
	if energy < float(card.get("cost", 0)):
		return {"ok": false, "reason": "能量不足"}
	var tw: TowerUnit = _tower_by_uid(target_uid) if target_uid > 0 else null
	var need_target := false
	for eff in (card.get("hooks", {}) as Dictionary).get("on_cast", []):
		if String(eff.get("target", "")) == "selected_tower":
			need_target = true
	if need_target and tw == null:
		return {"ok": false, "reason": "请先选择一座塔"}
	_pay(card)
	_register_played(card, tw)
	var ctx := {"card": card, "tower": tw, "target_tower": tw, "pos": tw.pos if tw != null else Vector2.ZERO}
	for eff in (card.get("hooks", {}) as Dictionary).get("on_cast", []):
		_run_effect(eff, ctx)
	_log("施放「%s」" % card.get("name", ""))
	return {"ok": true}


## 回收（上滑）：返还部分能量（doc 04：拆除返还部分能量；M1 取 50%）。
func sell_tower(uid: int) -> Dictionary:
	var tw := _tower_by_uid(uid)
	if tw == null or not tw.alive:
		return {"ok": false, "reason": "没有可回收的卡"}
	var refund := int(floor(float(tw.card.get("cost", 0)) * 0.5))
	tw.alive = false
	_gain_energy(refund)
	stats["energy_returned"] += refund
	_add_floater(tw.pos, "+%d" % refund, Color(0.6, 0.9, 1.0))
	_log("回收「%s」，返还 %d 能量" % [tw.name, refund])
	return {"ok": true, "refund": refund}


## 付费并**从手牌打出**（打出即消耗；这是"手牌"而非"无限卡池"的关键规则）。
func _pay(card: Dictionary) -> void:
	var cost := float(card.get("cost", 0))
	energy = maxf(0.0, energy - cost)
	stats["energy_spent"] += cost
	if deck != null:
		deck.consume(String(card.get("id", "")))


func _register_played(card: Dictionary, tw) -> void:
	played_cards[card.get("id", "")] = true
	stats["cards_played"] += 1


func _is_unbuildable(pos: Vector2) -> bool:
	for f in fields:
		if String(f["kind"]) == "unbuildable" and pos.distance_to(f["pos"]) <= f["radius"]:
			return true
	return false


func _nearest_path_point(pos: Vector2) -> Dictionary:
	var best := {}
	var best_d := INF
	for i in paths.size():
		var pr := paths[i].project(pos)
		if float(pr["distance"]) < best_d:
			best_d = float(pr["distance"])
			best = {"path_index": i, "along": float(pr["along"]), "pos": paths[i].point_at(float(pr["along"]))}
	if best.is_empty() or best_d > 70.0:
		return {}
	return best


# ==================================================================== 效果 DSL
##
## 卡片的"事件钩子"是数据（cards.json 的 hooks），这里统一解释执行。
## 支持 op：energy / stat_buff / pierce_bonus / heal / shield / aura / slow_field /
##          global_buff / add_tag / trigger / resonance

func _run_hooks(tw: TowerUnit, event: String, ctx: Dictionary) -> void:
	if tw == null or not tw.alive:
		return
	var hooks: Dictionary = tw.card.get("hooks", {})
	var list: Array = hooks.get(event, [])
	# 修饰卡带来的钩子也算在本塔上（组合法则三：链式调用）
	for m in tw.modifiers:
		var mh: Dictionary = (m["def"] as Dictionary).get("hooks", {})
		list = list + (mh.get(event, []) as Array)
	if list.is_empty():
		return
	var c := ctx.duplicate()
	c["tower"] = tw
	c["card"] = tw.card
	c["pos"] = tw.pos
	for eff in list:
		_run_effect(eff, c)
	stats["hook_triggers"] += list.size()


func _run_hooks_all(event: String, ctx: Dictionary = {}) -> void:
	for tw in towers:
		if tw.alive:
			_run_hooks(tw, event, ctx)


func _run_effect(eff: Dictionary, ctx: Dictionary) -> void:
	var op := String(eff.get("op", ""))
	var card: Dictionary = ctx.get("card", {})
	var tw: TowerUnit = ctx.get("tower", null)
	var target_tw: TowerUnit = ctx.get("target_tower", tw)
	var enemy: EnemyUnit = ctx.get("enemy", null)
	match op:
		"energy":
			var amount := float(eff.get("value", 0))
			if String(eff.get("target", "")) == "adjacent_towers" and tw != null:
				# 为相邻塔返还能量（ANV-M02）
				for other in towers:
					if other.alive and other.pos.distance_to(tw.pos) <= 1.5 * range_unit:
						_gain_energy(amount)
			else:
				_gain_energy(amount)
			if tw != null:
				_add_floater(tw.pos, "+%d" % int(amount), Color(0.45, 0.95, 0.85))
		"stat_buff":
			_apply_stat_buff(eff, ctx)
		"pierce_bonus":
			if tw != null:
				var cap := float(eff.get("cap", 99))
				tw.hook_stacks["pierce"] = minf(cap, float(tw.hook_stacks.get("pierce", 0.0)) + float(eff.get("value", 1)))
		"heal":
			_apply_heal(eff, ctx, tw, target_tw)
		"shield":
			var targets := _resolve_tower_targets(eff, ctx, tw, target_tw)
			for tgt in targets:
				tgt.shield = maxf(tgt.shield, float(eff.get("value", 0)))
				tgt.shield_until = t + float(eff.get("duration", 10.0))
				_add_floater(tgt.pos, "护盾 %d" % int(eff.get("value", 0)), Color(0.37, 0.89, 0.84))
		"global_buff":
			global_buffs.append({
				"stat": String(eff.get("stat", "")), "value": float(eff.get("value", 0.0)),
				"until": t + float(eff.get("duration", 0.0)), "source": card.get("id", ""),
				"scope": String(eff.get("scope", "all_towers")), "card": card,
			})
		"slow_field":
			var src_uid := tw.uid if tw != null else 0
			var pos: Vector2 = ctx.get("pos", tw.pos if tw != null else Vector2.ZERO)
			var until := -1.0
			if eff.has("duration"):
				until = t + float(eff["duration"])
			fields.append(_field("slow", pos, float(eff.get("radius", 1.5)) * range_unit,
				float(eff.get("value", -0.2)), "tower" if src_uid > 0 else "blocker_residual", until, src_uid))
		"add_tag":
			if tw != null:
				var tag := String(eff.get("tag", ""))
				var choices: Array = eff.get("choose_from", [])
				var chosen := String(ctx.get("choice", ""))
				if not choices.is_empty():
					tag = chosen if choices.has(chosen) else String(choices[0])
				if not tw.tags.has(tag):
					tw.tags.append(tag)
					_add_floater(tw.pos, "+标签 %s" % tag, Color(1.0, 0.82, 0.45))
		"trigger":
			if tw != null:
				_run_hooks(tw, String(eff.get("event", "")), ctx)
		"resonance":
			if tw != null:
				tw.resonance_count += int(eff.get("value", 1))
		"summon":
			pass  # M2（涌潮虫群）：召唤幼虫
		"damage_field":
			var dpos: Vector2 = ctx.get("pos", tw.pos if tw != null else Vector2.ZERO)
			fields.append(_field("enemy_damage", dpos, float(eff.get("radius", 1.5)) * range_unit,
				float(eff.get("dps", 0.0)), "tower", -1.0, tw.uid if tw != null else 0))
		_:
			pass


func _apply_stat_buff(eff: Dictionary, ctx: Dictionary) -> void:
	var stat := String(eff.get("stat", ""))
	var value := float(eff.get("value", 0.0))
	var duration := float(eff.get("duration", 0.0))
	var until := -1.0 if duration <= 0.0 else t + duration
	var tw: TowerUnit = ctx.get("tower", null)
	var targets := _resolve_tower_targets(eff, ctx, tw, ctx.get("target_tower", tw))
	var max_stacks := int(eff.get("max_stacks", 0))
	var cap := float(eff.get("cap", 0.0))
	for tgt in targets:
		if max_stacks > 0 or cap > 0.0:
			# 叠层型（如 ANV-T02 on_hit：每次命中 +2% 攻速，上限 +10%）
			var limit := cap if cap > 0.0 else value * float(max_stacks)
			var cur := float(tgt.hook_stacks.get(stat, 0.0))
			var next := minf(limit, cur + value)
			if next > cur:
				tgt.hook_stacks[stat] = next
		else:
			tgt.add_buff(stat, value, until, ctx.get("card", {}).get("id", ""))


func _apply_heal(eff: Dictionary, ctx: Dictionary, tw: TowerUnit, target_tw: TowerUnit) -> void:
	var value := float(eff.get("value", 0.0))
	var multiplier := float(eff.get("multiplier", 1.0))
	var targets := _resolve_tower_targets(eff, ctx, tw, target_tw)
	if bool(eff.get("per_sec", false)):
		var uids: Array = []
		for tgt in targets:
			uids.append(tgt.uid)
		heal_effects.append({
			"uids": uids, "per_sec": value * multiplier,
			"until": t + float(eff.get("duration", 6.0)), "source": ctx.get("card", {}).get("id", ""),
		})
	else:
		var amount := value * multiplier
		for tgt in targets:
			if bool(eff.get("percent_of_max_hp", false)):
				amount = float(tgt.max_hp) * value
			var healed: float = tgt.heal(amount)
			if healed > 0.0:
				_add_floater(tgt.pos, "+%d" % int(healed), Color(0.5, 1.0, 0.6))


func _resolve_tower_targets(eff: Dictionary, ctx: Dictionary, tw: TowerUnit, target_tw: TowerUnit) -> Array:
	var target := String(eff.get("target", "self"))
	var out: Array = []
	match target:
		"self":
			out = [tw] if tw != null else []
		"host_tower":
			out = [tw] if tw != null else []
		"selected_tower":
			out = [target_tw] if target_tw != null else []
		"lowest_tower":
			var best: TowerUnit = null
			for t2 in towers:
				if not t2.alive or t2.max_hp <= 0.0:
					continue
				if best == null or t2.hp_ratio() < best.hp_ratio():
					best = t2
			out = [best] if best != null else []
		"all_towers":
			for t2 in towers:
				if t2.alive:
					out.append(t2)
		"towers_in_range":
			var radius := float(eff.get("radius", 2.0)) * range_unit
			for t2 in towers:
				if t2.alive and tw != null and tw.pos.distance_to(t2.pos) <= radius:
					out.append(t2)
		_:
			# tag_self / towers_with_tag:X 等范围选择
			for t2 in towers:
				if t2.alive and _tower_matches_scope(t2, target, ctx.get("card", {})):
					out.append(t2)
	return out


## scope 判定：tag_self 表示"与来源卡同标签"；towers_with_tag:X 表示"含标签 X"。
func _tower_matches_scope(tw: TowerUnit, scope: String, source_card: Dictionary) -> bool:
	if scope == "" or scope == "all_towers":
		return true
	if scope.begins_with("towers_with_tag:"):
		return tw.has_tag(scope.substr("towers_with_tag:".length()))
	if scope.begins_with("tag:"):
		return tw.has_tag(scope.substr(4))
	if scope == "tag_self":
		for tag in source_card.get("tags", []):
			if tw.has_tag(String(tag)):
				return true
		return false
	if scope == "adjacent_towers":
		return true
	return true


func _update_heal_effects(dt: float) -> void:
	for i in range(heal_effects.size() - 1, -1, -1):
		var h: Dictionary = heal_effects[i]
		if t > float(h["until"]):
			heal_effects.remove_at(i)
			continue
		for uid in h["uids"]:
			var tw := _tower_by_uid(int(uid))
			if tw != null and tw.alive:
				tw.heal(float(h["per_sec"]) * dt)


# ==================================================================== 羁绊

## 羁绊条件：**本局已上过场的卡**里，含某标签的**不同卡号**数量达到阈值。
## 为什么不是"场上存活"：后勤链要求 2 张「维修」＝ ANV-M01 + ANV-S02，其中 S02 是一次性技能卡，
## 施放后消失；若按存活计，该羁绊永远不可达。裁决记录见 docs/01_实现裁决记录.md A3。
func _check_bonds() -> void:
	var tag_to_cards: Dictionary = {}
	for cid in played_cards.keys():
		var card := GameData.get_card(String(cid))
		for tag in card.get("tags", []):
			if not tag_to_cards.has(tag):
				tag_to_cards[tag] = {}
			tag_to_cards[tag][cid] = true
	var now: Array = []
	for bond in GameData.bonds:
		var cond: Dictionary = bond.get("condition", {})
		var tag := String(cond.get("tag", ""))
		var need := int(cond.get("count", 3))
		var have: int = (tag_to_cards.get(tag, {}) as Dictionary).size()
		if have >= need:
			now.append(bond)
	for bond in now:
		if not active_bonds.any(func(b): return b.get("id", "") == bond.get("id", "")):
			active_bonds.append(bond)
			stats["bonds_triggered"] += 1
			_log("羁绊触发：%s" % bond.get("name", ""))
			_add_floater(_board_center(), String(bond.get("name", "")), Color(1.0, 0.85, 0.4))
			for eff in bond.get("effect", []):
				if String(eff.get("op", "")) == "heal":
					_run_bond_heal(eff)
	# 羁绊失效（remove-safe：卡离场/从未触发则效果消失）
	var still: Array = []
	for bond in active_bonds:
		if now.any(func(b): return b.get("id", "") == bond.get("id", "")):
			still.append(bond)
	active_bonds = still


func _run_bond_heal(eff: Dictionary) -> void:
	for tw in towers:
		if not tw.alive or tw.max_hp <= 0.0:
			continue
		var healed: float = tw.heal(tw.max_hp * float(eff.get("value", 0.0)))
		if healed > 0.0:
			_add_floater(tw.pos, "+%d" % int(healed), Color(0.5, 1.0, 0.6))


# ==================================================================== 查询 / 工具

func affordable(card_id: String) -> bool:
	var card := GameData.get_card(card_id)
	return energy >= float(card.get("cost", 0)) and _mods["ban_card_type"] != String(card.get("type", ""))


func hand_cards() -> Array:
	var out: Array = []
	for cid in deck.hand:
		out.append(GameData.get_card(cid))
	return out


func current_wave_number() -> int:
	return mini(wave_index + 1, maxi(1, _waves.size()))


func total_waves() -> int:
	return _waves.size()


func wave_preview(index: int) -> Array:
	if index < 0 or index >= _waves.size():
		return []
	var out: Array = []
	for comp in (_waves[index] as Dictionary).get("composition", []):
		var e := GameData.get_enemy(String(comp.get("enemy", "")))
		out.append({"enemy": e, "count": int(comp.get("count", 0))})
	return out


func build_time_left() -> float:
	if phase == PHASE_BUILD:
		return maxf(0.0, float(rule.get("build_phase_sec", 15.0)) - phase_t)
	if phase == PHASE_BREATH:
		return maxf(0.0, float(rule.get("wave_gap_sec", 5.0)) - phase_t)
	return 0.0


func enemy_pos(e: EnemyUnit) -> Vector2:
	return _enemy_pos(e)


func _enemy_pos(e: EnemyUnit) -> Vector2:
	if e.reached_end:
		return paths[e.path_index].point_at(paths[e.path_index].total_length)
	return paths[e.path_index].point_at(e.distance)


func tower_at(pos: Vector2, tolerance: float = 55.0) -> TowerUnit:
	return _tower_at(pos, tolerance)


func _tower_at(pos: Vector2, tolerance: float) -> TowerUnit:
	var best: TowerUnit = null
	var best_d := tolerance
	for tw in towers:
		if not tw.alive:
			continue
		var d := tw.pos.distance_to(pos)
		if d <= best_d:
			best = tw
			best_d = d
	return best


func _tower_by_uid(uid: int) -> TowerUnit:
	for tw in towers:
		if tw.uid == uid:
			return tw
	return null


func _tower_alive(uid: int) -> bool:
	var tw := _tower_by_uid(uid)
	return tw != null and tw.alive


func _enemy_by_uid(uid: int) -> EnemyUnit:
	for e in enemies:
		if e.uid == uid:
			return e
	return null


func _next_uid() -> int:
	_uid_counter += 1
	return _uid_counter


func _tower_color(tw: TowerUnit) -> Color:
	match tw.faction:
		"ANV": return Color(0.31, 0.66, 0.85)
		"TID": return Color(0.36, 0.94, 0.75)
		"AST": return Color(0.37, 0.89, 0.84)
	return Color.WHITE


func _board_center() -> Vector2:
	return Vector2(map_data.get("canvas", {}).get("width", 980) * 0.5,
		map_data.get("canvas", {}).get("height", 660) * 0.4)


func _add_floater(pos: Vector2, text: String, color: Color) -> void:
	floaters.append({"pos": pos, "text": text, "color": color, "born": t, "ttl": 1.1})


func _cleanup_floaters() -> void:
	var kept: Array = []
	for f in floaters:
		if t - float(f["born"]) < float(f["ttl"]):
			kept.append(f)
	floaters = kept


func _log(line: String) -> void:
	log_lines.append({"t": t, "text": line})
	if log_lines.size() > 200:
		log_lines.pop_front()


# ==================================================================== 结算

## 评级三维（doc 04 第五节）：基地剩余生命 / 能量使用效率 / 组合触发次数。
func rating() -> Dictionary:
	var w: Dictionary = GameData.balance.get("rating", {}).get("weights", {})
	var hp_score := base_hp / maxf(1.0, base_hp_max)
	var gained := maxf(1.0, float(stats["energy_gained"]))
	var spent := float(stats["energy_spent"])
	var eff_score := clampf(spent / gained, 0.0, 1.0)
	var combo_raw := float(stats["bonds_triggered"]) * 2.0 + float(stats["hook_triggers"]) / 40.0
	var combo_score := clampf(combo_raw / 3.0, 0.0, 1.0)
	var total := hp_score * float(w.get("base_hp", 0.4)) \
		+ eff_score * float(w.get("energy_efficiency", 0.3)) \
		+ combo_score * float(w.get("combo", 0.3))
	var grade := "C"
	for g in GameData.balance.get("rating", {}).get("grades", []):
		if total >= float(g.get("min", 0.0)):
			grade = String(g.get("grade", "C"))
			break
	var drop := challenge_drop
	return {
		"grade": grade, "score": total, "hp_score": hp_score, "energy_score": eff_score,
		"combo_score": combo_score, "bonds": active_bonds.size(),
		"hook_triggers": int(stats["hook_triggers"]), "kills": int(stats["kills"]),
		"leaks": int(stats["leaks"]), "base_hp": int(base_hp), "base_hp_max": int(base_hp_max),
		"challenge_score": challenge_score, "drop_multiplier": drop,
		"rating_bonus": challenge_rating, "duration": t,
		"win": phase == PHASE_WON,
	}
