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

var map := LiveBayMapModule.new()
var economy := LiveBayEconomyModule.new()
var wave := LiveBayWaveModule.new()
var mission := LiveBayMissionModule.new()
var fault := LiveBayFaultModule.new()
var enemies_module := LiveBayEnemyModule.new()
var towers_module := LiveBayTowerModule.new()

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

var state: int:
	get: return mission.state
	set(value): mission.state = value
var energy: float:
	get: return economy.energy
	set(value): economy.energy = value
var integrity: float:
	get: return mission.integrity
	set(value): mission.integrity = value
var max_integrity: float:
	get: return mission.max_integrity
var wave_index: int:
	get: return wave.index
var wave_time: float:
	get: return wave.time
	set(value): wave.time = value
var timer: float:
	get: return wave.timer
	set(value): wave.timer = value
var waves: Array:
	get: return wave.waves
var spawn_queue: Array:
	get: return wave.queue
var enemies: Array:
	get: return enemies_module.enemies
var towers: Array:
	get: return towers_module.towers
var stats: Dictionary = {}
var result: Dictionary:
	get: return mission.result


func _init(game_data: Dictionary) -> void:
	data = game_data
	balance = data.get("balance", {})
	profession = data.get("profession", {})
	towers_by_id = data.get("towers_by_id", {})
	enemies_by_id = data.get("enemies_by_id", {})
	wave.waves = data.get("waves", [])
	_parse_map(data.get("map", {}))
	enemies_module.configure(enemies_by_id, map)
	towers_module.configure(towers_by_id, balance, profession, economy)
	reset()


func _parse_map(map_data: Dictionary) -> void:
	map.load_map(map_data)


func reset() -> void:
	mission.reset(profession, balance)
	economy.reset(float(profession.get("start_energy", balance.get("starting_energy", 90.0))))
	wave.reset(waves, balance)
	enemies_module.reset()
	towers_module.reset()
	stats = {
		"kills": 0,
		"leaked": 0,
		"built": 0,
		"spent": 0,
		"waves_cleared": 0,
	}
func state_name() -> String:
	return mission.state_name()


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
		if wave.tick_timer(dt):
			start_wave()
	if state != State.WAVE:
		return

	wave.advance_time(dt)
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
	if not wave.start():
		return false
	state = State.WAVE
	wave_started.emit(wave.index + 1)
	return true


func _spawn_due() -> void:
	for entry in wave.due():
		enemies_module.spawn(str(entry.enemy_id))


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
	for hit in fault.apply(enemy, towers, slots, _enemy_pos(enemy)):
		tower_disabled.emit(int(hit.slot), float(hit.duration))


func _escape_fault(index: int) -> void:
	var enemy: Dictionary = enemies[index]
	enemies.remove_at(index)
	fault_escaped.emit(enemy)


func _leak_enemy(index: int) -> void:
	var enemy: Dictionary = enemies[index]
	var def: Dictionary = enemy.def
	enemies.remove_at(index)
	mission.damage(float(def.leak_damage))
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
		mission.repair(repair)
		integrity_changed.emit(integrity)
	wave_cleared.emit(wave.index + 1)
	if wave.index + 1 >= waves.size():
		_finish(true)
	else:
		state = State.BETWEEN
		timer = wave.next_prep(balance)


func _finish(won: bool) -> void:
	var final := mission.finish(won, stats, waves.size(), balance)
	if won:
		game_won.emit(final)
	else:
		game_lost.emit(final)


func build(slot_index: int, tower_id: String) -> bool:
	if state == State.WON or state == State.LOST:
		return false
	var result := towers_module.build(slot_index, tower_id)
	if not result.ok:
		return false
	stats.built += 1
	stats.spent += int(result.data.get("cost", 0))
	energy_changed.emit(energy)
	return true


func upgrade(slot_index: int) -> bool:
	var result := towers_module.upgrade(slot_index)
	if not result.ok:
		return false
	stats.spent += int(result.data.get("cost", 0))
	energy_changed.emit(energy)
	return true


func sell(slot_index: int) -> bool:
	var result := towers_module.sell(slot_index)
	if not result.ok:
		return false
	energy_changed.emit(energy)
	return true

func _tower_at(slot_index: int) -> Variant:
	return towers_module.at(slot_index)


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
	return enemies_module.pos(enemy)


func point_at(distance: float) -> Vector2:
	return map.point_at(distance)

func get_result() -> Dictionary:
	return result.duplicate(true)


func get_tower_at(slot_index: int) -> Variant:
	return _tower_at(slot_index)
