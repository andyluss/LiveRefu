# LiveBay · 任务运行时（组合根的第一版）
# 把 Sim、时钟、事件、命令、黑匣子组装在一起；视图只持有 runtime，不自己拼。
# 规则：TECH-A2（模拟与视图分离）、TECH-B1（可逆工程）
class_name LiveBayMissionRuntime
extends RefCounted

const SimScript = preload("res://scripts/core/sim.gd")

var data: Dictionary
var sim: Variant
var clock: LiveBayMissionClock
var events: LiveBayEventBus
var commands: LiveBayCommandBus
var blackbox: LiveBayBlackBox
var expansion_set: LiveBayExpansionSet
var flags: LiveBayFeatureFlags
var _blackbox_meta: Dictionary
var _connections: Array = []


func _init(game_data: Dictionary, initial_set: LiveBayExpansionSet = null) -> void:
	data = initial_set.apply_data(game_data) if initial_set != null else game_data
	expansion_set = initial_set if initial_set != null else LiveBayExpansionSet.empty()
	flags = LiveBayFeatureFlags.from_set(expansion_set)
	clock = LiveBayMissionClock.new()
	events = LiveBayEventBus.new()
	commands = LiveBayCommandBus.new()
	blackbox = LiveBayBlackBox.new()
	_blackbox_meta = {
		"pack": "livebay.bay01",
		"schema": 0,
		"mode": "runtime",
		"expansion_set": expansion_set.to_meta(),
	}
	events.subscribe_all(func(envelope: Dictionary): blackbox.record(envelope))
	_new_sim()
	_register_commands()
	blackbox.begin(_blackbox_meta)
	events.emit_event(&"MissionStarted", _blackbox_meta, &"runtime")


func _new_sim() -> void:
	sim = SimScript.new(data)
	_connect(sim.wave_started, func(index: int): events.emit_event(&"WaveStarted", {"index": index}, &"wave"))
	_connect(sim.wave_cleared, func(index: int): events.emit_event(&"WaveCleared", {"index": index}, &"wave"))
	_connect(sim.enemy_killed, func(enemy: Dictionary): events.emit_event(&"EnemyKilled", {"enemy": str(enemy.get("def", {}).get("id", "")), "reward": int(enemy.get("def", {}).get("reward", 0))}, &"enemy"))
	_connect(sim.enemy_leaked, func(enemy: Dictionary): events.emit_event(&"EnemyLeaked", {"enemy": str(enemy.get("def", {}).get("id", "")), "damage": int(enemy.get("def", {}).get("leak_damage", 0))}, &"enemy"))
	_connect(sim.fault_escaped, func(enemy: Dictionary): events.emit_event(&"FaultEscaped", {"enemy": str(enemy.get("def", {}).get("id", ""))}, &"fault"))
	_connect(sim.tower_disabled, func(slot: int, duration: float): events.emit_event(&"TowerDisabled", {"slot": slot, "duration": duration}, &"fault"))
	_connect(sim.tower_fired, func(from: Vector2, to: Vector2, kind: String): events.emit_event(&"TowerFired", {"from": [from.x, from.y], "to": [to.x, to.y], "kind": kind}, &"tower"))
	_connect(sim.energy_changed, func(value: float): events.emit_event(&"EnergyChanged", {"value": value}, &"economy"))
	_connect(sim.integrity_changed, func(value: float): events.emit_event(&"IntegrityChanged", {"value": value}, &"mission"))
	_connect(sim.game_won, func(result: Dictionary): _on_result(true, result))
	_connect(sim.game_lost, func(result: Dictionary): _on_result(false, result))


func _connect(signal_ref: Signal, callback: Callable) -> void:
	signal_ref.connect(callback)
	_connections.append([signal_ref, callback])


func dispose() -> void:
	for entry in _connections:
		var signal_ref: Signal = entry[0]
		var callback: Callable = entry[1]
		if signal_ref.is_connected(callback):
			signal_ref.disconnect(callback)
	_connections.clear()
	events.clear()
	commands.clear()
	sim = null


func _register_commands() -> void:
	commands.register(&"build_tower", func(payload: Dictionary) -> LiveBayResult:
		if sim.build(int(payload.get("slot", -1)), str(payload.get("tower_id", ""))):
			events.emit_event(&"TowerBuilt", {"slot": int(payload.get("slot", -1)), "tower": str(payload.get("tower_id", ""))}, &"tower")
			return LiveBayResult.success("已建造")
		return LiveBayResult.failure(&"build_rejected", "供能不足、塔位占用或阶段不允许")
	)
	commands.register(&"upgrade_tower", func(payload: Dictionary) -> LiveBayResult:
		var slot := int(payload.get("slot", -1))
		if sim.upgrade(slot):
			events.emit_event(&"TowerUpgraded", {"slot": slot}, &"tower")
			return LiveBayResult.success("已升级")
		return LiveBayResult.failure(&"upgrade_rejected", "满级、供能不足或阶段不允许")
	)
	commands.register(&"sell_tower", func(payload: Dictionary) -> LiveBayResult:
		var slot := int(payload.get("slot", -1))
		if sim.sell(slot):
			events.emit_event(&"TowerSold", {"slot": slot}, &"tower")
			return LiveBayResult.success("已出售")
		return LiveBayResult.failure(&"sell_rejected", "该塔位没有塔")
	)
	commands.register(&"start_wave", func(_payload: Dictionary) -> LiveBayResult:
		if sim.start_wave():
			events.emit_event(&"WaveCommanded", {}, &"wave")
			return LiveBayResult.success("开波")
		return LiveBayResult.failure(&"start_rejected", "当前阶段不能开波")
	)
	commands.register(&"set_pause", func(payload: Dictionary) -> LiveBayResult:
		clock.set_paused(bool(payload.get("paused", false)))
		events.emit_event(&"PauseChanged", {"paused": clock.paused}, &"clock")
		return LiveBayResult.success()
	)
	commands.register(&"set_speed", func(payload: Dictionary) -> LiveBayResult:
		clock.set_speed(float(payload.get("speed", 1.0)))
		events.emit_event(&"SpeedChanged", {"speed": clock.speed}, &"clock")
		return LiveBayResult.success()
	)
	commands.register(&"reset", func(_payload: Dictionary) -> LiveBayResult:
		reset()
		return LiveBayResult.success("已重置")
	)


func step(delta: float) -> void:
	var step_delta := clock.consume(delta)
	events.tick = clock.ticks
	if step_delta > 0.0:
		sim.step(step_delta)


func dispatch(command: StringName, payload: Dictionary = {}) -> LiveBayResult:
	events.tick = clock.ticks
	events.emit_event(&"CommandIssued", {"command": String(command), "payload": payload.duplicate(true)}, &"view")
	return commands.dispatch(command, payload)


static func replay(game_data: Dictionary, entries: Array, max_ticks := 60 * 600) -> LiveBayMissionRuntime:
	var runtime: LiveBayMissionRuntime = LiveBayMissionRuntime.new(game_data)
	runtime.blackbox.enabled = false
	for entry in entries:
		if not (entry is Dictionary) or str(entry.get("type", "")) != "CommandIssued":
			continue
		var target_tick := int(entry.get("tick", 0))
		while runtime.clock.ticks < target_tick:
			runtime.step(1.0 / 60.0)
		var payload: Dictionary = entry.get("payload", {})
		runtime.dispatch(StringName(str(payload.get("command", ""))), payload.get("payload", {}))
	var guard := 0
	while runtime.sim.state != SimScript.State.WON and runtime.sim.state != SimScript.State.LOST and guard < max_ticks:
		runtime.step(1.0 / 60.0)
		guard += 1
	return runtime


func reset() -> void:
	sim.reset()
	clock.reset()
	blackbox.begin(_blackbox_meta)
	events.emit_event(&"MissionReset", {}, &"runtime")


func _on_result(won: bool, result: Dictionary) -> void:
	events.emit_event(&"ResultReady", {"won": won, "result": result.duplicate(true)}, &"mission")
	blackbox.finish(result)
