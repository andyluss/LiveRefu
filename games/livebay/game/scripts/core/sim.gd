# LiveBay · 核心模拟
# 纯逻辑，不依赖渲染；可被无头测试直接驱动。
# 规则：TECH-A2（模拟与视图分离）、DES-B1（班次循环）、DES-B3（故障与低报）
# 固定步长 1/60，所有随机性暂不引入（便于复现）。
class_name LiveBaySim
extends RefCounted

signal wave_started(index: int)
signal wave_cleared(index: int)
signal enemy_killed(enemy: Dictionary)
signal enemy_leaked(enemy: Dictionary)
signal fault_escaped(enemy: Dictionary)
signal tower_disabled(slot: int, duration: float)
signal tower_fired(from: Vector2, to: Vector2, kind: String)
signal energy_changed(value: float)
signal integrity_changed(value: float)
signal game_won(result: Dictionary)
signal game_lost(result: Dictionary)

enum State { PREP, WAVE, BETWEEN, WON, LOST }

const TICK := 1.0 / 60.0
const MAX_FRAME_DELTA := 0.5

var data: Dictionary
var balance: Dictionary
var profession: Dictionary
var towers_by_id: Dictionary
var enemies_by_id: Dictionary
var waves: Array

var map := LiveBayMapModule.new()
var economy := LiveBayEconomyModule.new()

var path: PackedVector2Array:
	get: return map.path
var path_cum: PackedFloat32Array:
	get: return map.path_cum
var path_total: float:
	get: return map.path_total
var slots: Array:
	get: return map.slots
var base_pos: Vector2:
	get: return map.base_pos
var base_radius: float:
	get: return map.base_radius

var state: int = State.PREP
var energy: float:
	get: return economy.energy
	set(value): economy.energy = value
var integrity: float = 0.0
var max_integrity: float = 100.0
var wave_index: int = -1
var wave_time: float = 0.0
var timer: float = 0.0
var enemies: Array = []
var towers: Array = []
var spawn_queue: Array = []
var stats: Dictionary = {}
var result: Dictionary = {}


func _init(game_data: Dictionary) -> void:
	data = game_data
	balance = data.get("balance", {})
	profession = data.get("profession", {})
	towers_by_id = data.get("towers_by_id", {})
	enemies_by_id = data.get("enemies_by_id", {})
	waves = data.get("waves", [])
	_parse_map(data.get("map", {}))
	reset()


func _parse_map(map_data: Dictionary) -> void:
	map.load_map(map_data)


func reset() -> void:
	state = State.PREP
	max_integrity = float(profession.get("start_integrity", balance.get("starting_integrity", 100.0)))
	integrity = max_integrity
	economy.reset(float(profession.get("start_energy", balance.get("starting_energy", 90.0))))
	wave_index = -1
	wave_time = 0.0
	timer = float(waves[0].get("prep", balance.get("prepare_time", 30.0))) if not waves.is_empty() else 30.0
	enemies.clear()
	towers.clear()
	spawn_queue.clear()
	stats = {
		"kills": 0,
		"leaked": 0,
		"built": 0,
		"spent": 0,
		"waves_cleared": 0,
	}
	result = {}


func state_name() -> String:
	match state:
		State.PREP:
			return "准备"
		State.WAVE:
			return "交战中"
		State.BETWEEN:
			return "波间整备"
		State.WON:
			return "本班结束"
		State.LOST:
			return "事故"
	return "?"


func step(delta: float) -> void:
	if state == State.WON or state == State.LOST:
		return
	var remaining: float = min(delta, MAX_FRAME_DELTA)
	while remaining > 0.0:
		var dt: float = min(remaining, TICK)
		_tick(dt)
		remaining -= dt
		if state == State.WON or state == State.LOST:
			break


func _tick(dt: float) -> void:
	if state == State.PREP or state == State.BETWEEN:
		timer -= dt
		if timer <= 0.0:
			start_wave()
	if state != State.WAVE:
		return

	wave_time += dt
	_spawn_due()

	for i: int in range(enemies.size() - 1, -1, -1):
		var enemy: Dictionary = enemies[i]
		if enemy.slow_timer > 0.0:
			enemy.slow_timer -= dt
		var speed: float = float(enemy.def.speed)
		if enemy.slow_timer > 0.0:
			speed *= 1.0 - float(enemy.slow_factor)
		var direction: int = int(enemy.get("direction", 1))
		enemy.dist += speed * dt * direction
		if direction > 0 and enemy.dist >= path_total:
			_leak_enemy(i)
			if state == State.LOST:
				return
		elif direction < 0 and enemy.dist <= 0.0:
			_escape_fault(i)
		else:
			_apply_fault_effect(enemy)

	_update_towers(dt)
	_cleanup_dead()

	if spawn_queue.is_empty() and enemies.is_empty():
		_on_wave_cleared()


func start_wave() -> bool:
	if state != State.PREP and state != State.BETWEEN:
		return false
	if wave_index + 1 >= waves.size():
		return false
	wave_index += 1
	var wave: Dictionary = waves[wave_index]
	state = State.WAVE
	wave_time = 0.0
	timer = 0.0
	spawn_queue.clear()
	for group: Variant in wave.get("groups", []):
		var enemy_id: String = group.get("enemy", "")
		var count: int = int(group.get("count", 0))
		var interval: float = float(group.get("interval", 1.0))
		var delay: float = float(group.get("delay", 0.0))
		for i: int in range(count):
			spawn_queue.append({"time": delay + i * interval, "enemy_id": enemy_id})
	spawn_queue.sort_custom(func(a: Dictionary, b: Dictionary) -> bool: return float(a.time) < float(b.time))
	wave_started.emit(wave_index + 1)
	return true


func _spawn_due() -> void:
	while not spawn_queue.is_empty() and float(spawn_queue[0].time) <= wave_time:
		var entry: Dictionary = spawn_queue.pop_front()
		var enemy_id: String = entry.enemy_id
		if not enemies_by_id.has(enemy_id):
			continue
		var def: Dictionary = enemies_by_id[enemy_id]
		var reverse: bool = String(def.get("behavior", "forward")) == "reverse"
		enemies.append({
			"def": def,
			"hp": float(def.hp),
			"max_hp": float(def.hp),
			"dist": path_total if reverse else 0.0,
			"direction": -1 if reverse else 1,
			"hit_towers": {},
			"slow_factor": 0.0,
			"slow_timer": 0.0,
			"dead": false,
		})


func _update_towers(dt: float) -> void:
	for tower: Dictionary in towers:
		var def: Dictionary = tower.def
		if float(tower.get("disabled_timer", 0.0)) > 0.0:
			tower.disabled_timer -= dt
			continue
		if def.kind == "supply":
			tower.income_timer -= dt
			if tower.income_timer <= 0.0:
				tower.income_timer += float(def.get("income_interval", 5.0))
				economy.earn(_supply_income(tower))
				energy_changed.emit(energy)
			continue

		tower.cooldown -= dt
		if tower.cooldown > 0.0:
			continue
		var range_px: float = _tower_range(tower)
		var tower_pos: Vector2 = slots[tower.slot]
		var candidates: Array = []
		for enemy: Dictionary in enemies:
			if enemy.dead:
				continue
			if tower_pos.distance_to(_enemy_pos(enemy)) <= range_px:
				candidates.append(enemy)
		if candidates.is_empty():
			continue

		var damage: float = _tower_damage(tower)
		var cooldown: float = 1.0 / max(0.05, float(def.fire_rate))
		if def.kind == "single":
			var target: Dictionary = candidates[0]
			for enemy: Dictionary in candidates:
				if float(enemy.dist) > float(target.dist):
					target = enemy
			target.hp -= damage
			if target.hp <= 0.0:
				target.dead = true
			tower_fired.emit(tower_pos, _enemy_pos(target), "single")
		elif def.kind == "aoe":
			var first_pos: Vector2 = tower_pos
			for enemy: Dictionary in candidates:
				enemy.hp -= damage
				var slow: float = float(def.get("slow", 0.0))
				if slow > 0.0:
					enemy.slow_factor = max(float(enemy.slow_factor), slow)
					enemy.slow_timer = max(float(enemy.slow_timer), float(def.get("slow_duration", 1.5)))
				if enemy.hp <= 0.0:
					enemy.dead = true
				if first_pos == tower_pos:
					first_pos = _enemy_pos(enemy)
			tower_fired.emit(tower_pos, first_pos, "aoe")
		tower.cooldown = cooldown


func _cleanup_dead() -> void:
	for i: int in range(enemies.size() - 1, -1, -1):
		var enemy: Dictionary = enemies[i]
		if enemy.dead:
			var def: Dictionary = enemy.def
			economy.earn(float(def.reward))
			stats.kills += 1
			enemies.remove_at(i)
			enemy_killed.emit(enemy)
			energy_changed.emit(energy)


func _apply_fault_effect(enemy: Dictionary) -> void:
	var duration: float = float(enemy.def.get("disable_duration", 0.0))
	var radius: float = float(enemy.def.get("disable_radius", 0.0))
	var max_targets: int = int(enemy.def.get("disable_targets", 99))
	if duration <= 0.0 or radius <= 0.0:
		return
	if enemy.hit_towers.size() >= max_targets:
		return
	var pos: Vector2 = _enemy_pos(enemy)
	for tower: Dictionary in towers:
		var slot: int = int(tower.slot)
		if enemy.hit_towers.has(slot):
			continue
		if pos.distance_to(slots[slot]) <= radius:
			enemy.hit_towers[slot] = true
			tower.disabled_timer = max(float(tower.get("disabled_timer", 0.0)), duration)
			tower_disabled.emit(slot, duration)


func _escape_fault(index: int) -> void:
	var enemy: Dictionary = enemies[index]
	enemies.remove_at(index)
	fault_escaped.emit(enemy)


func _leak_enemy(index: int) -> void:
	var enemy: Dictionary = enemies[index]
	var def: Dictionary = enemy.def
	enemies.remove_at(index)
	integrity = max(0.0, integrity - float(def.leak_damage))
	stats.leaked += 1
	enemy_leaked.emit(enemy)
	integrity_changed.emit(integrity)
	if integrity <= 0.0:
		_finish(false)


func _on_wave_cleared() -> void:
	stats.waves_cleared += 1
	var repair: float = 0.0
	for tower: Dictionary in towers:
		if tower.def.kind == "supply":
			repair += _supply_repair(tower)
	if repair > 0.0:
		integrity = min(max_integrity, integrity + repair)
		integrity_changed.emit(integrity)
	wave_cleared.emit(wave_index + 1)
	if wave_index + 1 >= waves.size():
		_finish(true)
	else:
		state = State.BETWEEN
		timer = float(waves[wave_index + 1].get("prep", balance.get("between_wave_time", 20.0)))


func _finish(won: bool) -> void:
	state = State.WON if won else State.LOST
	var grade := _grade(won)
	result = {
		"won": won,
		"grade": grade,
		"integrity": integrity,
		"max_integrity": max_integrity,
		"kills": stats.kills,
		"leaked": stats.leaked,
		"built": stats.built,
		"spent": stats.spent,
		"waves_cleared": stats.waves_cleared,
		"total_waves": waves.size(),
	}
	if won:
		game_won.emit(result)
	else:
		game_lost.emit(result)


func _grade(won: bool) -> String:
	if not won:
		return "F"
	if integrity >= max_integrity * float(balance.get("grade_s_ratio", 0.9)):
		return "S"
	if integrity >= max_integrity * float(balance.get("grade_a_ratio", 0.7)):
		return "A"
	if integrity >= max_integrity * float(balance.get("grade_b_ratio", 0.4)):
		return "B"
	return "C"


func build(slot_index: int, tower_id: String) -> bool:
	if state == State.WON or state == State.LOST:
		return false
	if slot_index < 0 or slot_index >= slots.size():
		return false
	if _tower_at(slot_index) != null:
		return false
	if not towers_by_id.has(tower_id):
		return false
	var def: Dictionary = towers_by_id[tower_id]
	var cost: int = _build_cost(def)
	if not economy.spend(float(cost)):
		return false
	towers.append({
		"slot": slot_index,
		"def": def,
		"level": 1,
		"cooldown": 0.0,
		"income_timer": 0.0,
		"invested": cost,
		"disabled_timer": 0.0,
	})
	stats.built += 1
	stats.spent += cost
	energy_changed.emit(energy)
	return true


func upgrade(slot_index: int) -> bool:
	var tower: Variant = _tower_at(slot_index)
	if tower == null:
		return false
	var max_level: int = int(balance.get("max_tower_level", 3))
	if int(tower.level) >= max_level:
		return false
	var cost: int = int(round(float(tower.def.cost) * float(balance.get("upgrade_cost_factor", 0.8)) * float(tower.level)))
	if not economy.spend(float(cost)):
		return false
	tower.level += 1
	tower.invested += cost
	stats.spent += cost
	energy_changed.emit(energy)
	return true


func sell(slot_index: int) -> bool:
	var tower: Variant = _tower_at(slot_index)
	if tower == null:
		return false
	var refund: int = int(floor(float(tower.invested) * float(balance.get("sell_refund", 0.7))))
	economy.earn(float(refund))
	towers.erase(tower)
	energy_changed.emit(energy)
	return true


func _tower_at(slot_index: int) -> Variant:
	for tower: Dictionary in towers:
		if int(tower.slot) == slot_index:
			return tower
	return null


func _build_cost(def: Dictionary) -> int:
	return int(round(float(def.cost) * float(profession.get("tower_cost_mult", 1.0))))


func _tower_damage(tower: Dictionary) -> float:
	return float(tower.def.damage) * (1.0 + float(balance.get("upgrade_damage_factor", 0.25)) * (int(tower.level) - 1))


func _tower_range(tower: Dictionary) -> float:
	return float(tower.def.range) * (1.0 + float(balance.get("upgrade_range_factor", 0.05)) * (int(tower.level) - 1))


func _supply_income(tower: Dictionary) -> float:
	return float(tower.def.get("income", 0.0)) * (1.0 + float(balance.get("upgrade_income_factor", 0.5)) * (int(tower.level) - 1))


func _supply_repair(tower: Dictionary) -> float:
	return float(tower.def.get("repair", 0.0)) * (1.0 + float(balance.get("upgrade_repair_factor", 0.5)) * (int(tower.level) - 1))


func _enemy_pos(enemy: Dictionary) -> Vector2:
	return point_at(float(enemy.dist))


func point_at(distance: float) -> Vector2:
	return map.point_at(distance)

func get_result() -> Dictionary:
	return result.duplicate(true)


func get_tower_at(slot_index: int) -> Variant:
	return _tower_at(slot_index)
