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
signal tower_degraded(slot: int, duration: float)
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
var fault_duration_bonus := 0.0
var fault_bypass := false
var fault_choice_enabled := false
var fault_bypass_locked := false
var fault_choice_pending := false
var fault_choice_made := false
var fault_pending: Dictionary = {}
var pending_adjacent: Array = []
var low_report := 0
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
	fault_duration_bonus = 0.0
	fault_bypass = false
	fault_choice_pending = false
	fault_choice_made = false
	fault_pending = {}
	pending_adjacent.clear()
	low_report = 0
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

	var moved: Dictionary = enemies_module.update(dt, path_total)
	for enemy: Dictionary in moved.leaked:
		_on_enemy_leaked(enemy)
		if state == State.LOST:
			return
	for enemy: Dictionary in moved.escaped:
		fault_escaped.emit(enemy)
	for enemy: Dictionary in moved.active:
		_apply_fault_effect(enemy)
	_update_adjacent_degradation(dt)
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
	var result: Dictionary = towers_module.update(dt, enemies, slots, map)
	if float(result.get("income", 0.0)) > 0.0:
		economy.earn(float(result.income))
		energy_changed.emit(energy)
	for shot in result.get("fired", []):
		tower_fired.emit(shot.from, shot.to, str(shot.kind))

func _cleanup_dead() -> void:
	for enemy: Dictionary in enemies_module.cleanup():
		economy.earn(float(enemy.def.reward))
		stats.kills += 1
		enemy_killed.emit(enemy)
		energy_changed.emit(energy)


func _apply_fault_effect(enemy: Dictionary) -> void:
	if fault_choice_enabled and wave_index == 4 and not fault_choice_made:
		if fault_choice_pending:
			return
		var candidates := fault.candidates(enemy, towers, slots, _enemy_pos(enemy))
		if not candidates.is_empty():
			fault_pending = {"enemy": enemy, "slots": candidates}
			fault_choice_pending = true
			return
	for hit in fault.apply(enemy, towers, slots, _enemy_pos(enemy), fault_duration_bonus, fault_bypass):
		tower_disabled.emit(int(hit.slot), float(hit.duration))


func resolve_fault_choice(choice: String) -> bool:
	if not fault_choice_pending or fault_pending.is_empty():
		return false
	if choice == "bypass" and fault_bypass_locked:
		return false
	var enemy: Dictionary = fault_pending.enemy
	var chosen := choice == "bypass"
	var hits := fault.apply_slots(enemy, towers, slots, fault_pending.slots, chosen, fault_duration_bonus)
	fault_bypass = chosen
	fault_choice_made = true
	fault_choice_pending = false
	fault_pending = {}
	for hit in hits:
		tower_disabled.emit(int(hit.slot), float(hit.duration))
		if str(hit.get("mode", "")) == "bypass":
			pending_adjacent.append({"slot": int(hit.slot), "timer": 4.0, "duration": 4.0})
	return true


func _update_adjacent_degradation(dt: float) -> void:
	if pending_adjacent.is_empty():
		return
	for entry in pending_adjacent.duplicate():
		entry.timer -= dt
		if float(entry.timer) > 0.0:
			continue
		var source_slot := int(entry.slot)
		var source_pos: Vector2 = slots[source_slot]
		for tower: Dictionary in towers:
			if int(tower.slot) == source_slot:
				continue
			if source_pos.distance_to(slots[int(tower.slot)]) <= 160.0:
				tower.degraded_timer = maxf(float(tower.get("degraded_timer", 0.0)), float(entry.duration))
				tower.degraded_factor = 0.5
				tower_degraded.emit(int(tower.slot), float(entry.duration))
		pending_adjacent.erase(entry)


func _escape_fault(index: int) -> void:
	var enemy: Dictionary = enemies[index]
	enemies.remove_at(index)
	fault_escaped.emit(enemy)


func _on_enemy_leaked(enemy: Dictionary) -> void:
	mission.damage(float(enemy.def.leak_damage))
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
	return towers_module.tower_damage(tower)


func _tower_range(tower: Dictionary) -> float:
	return towers_module.tower_range(tower)


func _supply_income(tower: Dictionary) -> float:
	return towers_module.supply_income(tower)


func _supply_repair(tower: Dictionary) -> float:
	return towers_module.supply_repair(tower)


func _enemy_pos(enemy: Dictionary) -> Vector2:
	return enemies_module.pos(enemy)


func point_at(distance: float) -> Vector2:
	return map.point_at(distance)

func get_result() -> Dictionary:
	return result.duplicate(true)


func get_tower_at(slot_index: int) -> Variant:
	return _tower_at(slot_index)
