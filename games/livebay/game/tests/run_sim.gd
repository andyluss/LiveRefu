# LiveBay · 无头测试
# 运行：godot --headless --path game --script tests/run_sim.gd
# 规则：TECH-B2（验收与不回归）
extends SceneTree

const DataLoaderScript = preload("res://scripts/core/data_loader.gd")
const SimScript = preload("res://scripts/core/sim.gd")
const RuntimeScript = preload("res://scripts/application/mission_runtime.gd")
const ClockScript = preload("res://scripts/kernel/mission_clock.gd")
const EventBusScript = preload("res://scripts/kernel/event_bus.gd")
const CommandBusScript = preload("res://scripts/kernel/command_bus.gd")
const MapModuleScript = preload("res://scripts/domain/map/map_module.gd")
const EconomyModuleScript = preload("res://scripts/domain/economy/economy_module.gd")
const WaveModuleScript = preload("res://scripts/domain/waves/wave_module.gd")
const MissionModuleScript = preload("res://scripts/domain/mission/mission_module.gd")

var failures: int = 0
var checks: int = 0


func _initialize() -> void:
	print("== LiveBay sim tests ==")
	var data: Dictionary = DataLoaderScript.load_mission_pack()
	_check(not data.is_empty(), "data loads and validates")
	if data.is_empty():
		_finish()
		return

	_test_kernel(data)
	_test_data(data)
	_test_economy(data)
	_test_upgrade(data)
	_test_supply_upgrade(data)
	_test_fault(data)
	_test_loss(data)
	_test_win(data)
	_finish()


func _test_kernel(data: Dictionary) -> void:
	var ok := LiveBayResult.success("ok")
	var bad := LiveBayResult.failure(&"bad", "no")
	_check(ok.ok and ok.code == &"ok", "kernel: result success")
	_check(not bad.ok and bad.code == &"bad", "kernel: result failure")
	var clock := ClockScript.new()
	clock.set_speed(2.0)
	var d: float = clock.consume(0.5)
	_check(is_equal_approx(d, 1.0) and is_equal_approx(clock.sim_time, 1.0), "kernel: clock speed")
	clock.set_paused(true)
	_check(is_equal_approx(clock.consume(0.5), 0.0), "kernel: clock pause")
	var bus := EventBusScript.new()
	var seen := [0]
	bus.subscribe(&"Ping", func(env: Dictionary): seen[0] = int(env.seq))
	bus.emit_event(&"Ping", {"x": 1}, &"test")
	_check(seen[0] == 1 and bus.seq == 1, "kernel: event bus envelope")
	var commands := CommandBusScript.new()
	commands.register(&"double", func(payload: Dictionary): return int(payload.get("x", 0)) * 2)
	var r: LiveBayResult = commands.dispatch(&"double", {"x": 3})
	_check(r.ok and int(r.data) == 6, "kernel: command bus dispatch")
	_check(commands.dispatch(&"missing").code == &"unknown_command", "kernel: unknown command")
	var map := MapModuleScript.new()
	map.load_map(data.map)
	_check(map.path.size() >= 2 and map.path_total > 500.0, "domain: map module geometry")
	_check(map.point_at(0.0).distance_to(map.path[0]) < 0.01, "domain: map point_at start")
	var eco := EconomyModuleScript.new()
	eco.reset(10.0)
	_check(eco.spend(4.0) and is_equal_approx(eco.energy, 6.0), "domain: economy spend")
	_check(not eco.spend(7.0), "domain: economy rejects overspend")
	var wave_mod := WaveModuleScript.new()
	wave_mod.reset(data.waves, data.balance)
	_check(is_equal_approx(wave_mod.timer, 30.0), "domain: wave module prep")
	_check(wave_mod.start() and wave_mod.index == 0, "domain: wave module starts W1")
	wave_mod.advance_time(1.0)
	_check(wave_mod.due().size() > 0, "domain: wave module spawn queue")
	var mission_mod := MissionModuleScript.new()
	mission_mod.reset(data.profession, data.balance)
	mission_mod.damage(10.0)
	mission_mod.repair(5.0)
	_check(is_equal_approx(mission_mod.integrity, 95.0), "domain: mission damage/repair")
	var result := mission_mod.finish(false, {"kills": 0, "leaked": 1, "built": 0, "spent": 0, "waves_cleared": 0}, 5, data.balance)
	_check(result.grade == "F", "domain: mission failure grade")
	var runtime: LiveBayMissionRuntime = RuntimeScript.new(data)
	runtime.blackbox.enabled = false
	var built: LiveBayResult = runtime.dispatch(&"build_tower", {"slot": 0, "tower_id": "interceptor"})
	var started: LiveBayResult = runtime.dispatch(&"start_wave")
	runtime.step(0.1)
	_check(built.ok and started.ok and runtime.clock.ticks == 1, "kernel: runtime commands/tick")
	_check(runtime.events.seq >= 4, "kernel: runtime emits events")
	runtime.dispose()


func _test_data(data: Dictionary) -> void:
	_check(data.towers.size() == 3, "3 towers")
	_check(data.enemies.size() == 4, "4 enemies")
	_check(data.enemies_by_id.has("fault"), "fault enemy exists")
	_check(String(data.enemies_by_id["fault"].get("behavior", "")) == "reverse", "fault moves in reverse")
	_check(data.waves.size() == 5, "5 waves")
	var sim := SimScript.new(data)
	_check(sim.path.size() >= 2, "path has points")
	_check(sim.path_total > 500.0, "path has length")
	_check(sim.slots.size() == 7, "7 build slots")
	_check(sim.energy == 90.0, "starting energy 90")
	_check(sim.integrity == 100.0, "starting integrity 100")
	_check(data.balance.has("grade_s_ratio"), "grade thresholds are data-driven")
	_check(data.get("pack_manifest", {}).get("schema_version", 0) == 1, "mission pack schema version")
	_check(str(data.get("pack_manifest", {}).get("hash", "")).begins_with("sha256:"), "mission pack hash")
	_check(is_equal_approx(float(data.waves[0].prep), 30.0), "wave 1 prep 30")
	_check(is_equal_approx(float(data.waves[1].prep), 20.0), "wave 2 prep 20")


func _test_economy(data: Dictionary) -> void:
	var sim := SimScript.new(data)
	var start: float = sim.energy
	_check(sim.build(0, "interceptor"), "build interceptor")
	_check(is_equal_approx(sim.energy, start - 30.0), "build costs 30")
	_check(not sim.build(0, "interceptor"), "slot occupied")
	var before_sell: float = sim.energy
	_check(sim.sell(0), "sell tower")
	_check(is_equal_approx(sim.energy, before_sell + 21.0), "sell refunds 70%")


func _test_upgrade(data: Dictionary) -> void:
	var sim := SimScript.new(data)
	_check(sim.build(0, "interceptor"), "build for upgrade")
	var tower: Variant = sim.get_tower_at(0)
	var damage_before: float = sim._tower_damage(tower)
	_check(sim.upgrade(0), "upgrade")
	var damage_after: float = sim._tower_damage(tower)
	_check(damage_after > damage_before, "upgrade increases damage")
	_check(int(tower.level) == 2, "level is 2")


func _test_supply_upgrade(data: Dictionary) -> void:
	var sim := SimScript.new(data)
	_check(sim.build(0, "supply"), "supply test: build")
	var tower: Variant = sim.get_tower_at(0)
	_check(is_equal_approx(sim._supply_income(tower), 6.0), "supply L1 income 6")
	_check(sim.upgrade(0), "supply test: upgrade")
	_check(is_equal_approx(sim._supply_income(tower), 9.0), "supply L2 income 9")
	_check(is_equal_approx(sim._supply_repair(tower), 4.5), "supply L2 repair 4.5")


func _test_fault(data: Dictionary) -> void:
	var custom: Dictionary = data.duplicate(true)
	custom.waves = [{
		"index": 1,
		"prep": 0.0,
		"groups": [{"enemy": "fault", "count": 1, "interval": 1.0, "delay": 0.0}],
	}]
	var sim := SimScript.new(custom)
	_check(sim.build(6, "supply"), "fault test: build supply at slot 7")
	sim.start_wave()
	var frames: int = 0
	while float(sim.get_tower_at(6).disabled_timer) <= 0.0 and frames < 60 * 15:
		sim.step(1.0 / 60.0)
		frames += 1
	_check(float(sim.get_tower_at(6).disabled_timer) > 0.0, "fault disables tower")
	while sim.enemies.size() > 0 and frames < 60 * 30:
		sim.step(1.0 / 60.0)
		frames += 1
	_check(sim.integrity == 100.0, "fault escape does not damage integrity")


func _test_loss(data: Dictionary) -> void:
	var sim := SimScript.new(data)
	sim.start_wave()
	var frames: int = 0
	var limit: int = 60 * 400
	while sim.state != SimScript.State.LOST and sim.state != SimScript.State.WON and frames < limit:
		sim.step(1.0 / 60.0)
		if sim.state == SimScript.State.BETWEEN:
			sim.start_wave()
		frames += 1
	_check(sim.state == SimScript.State.LOST, "no towers -> lost")


func _test_win(data: Dictionary) -> void:
	var sim := SimScript.new(data)
	_check(sim.build(3, "interceptor"), "win: build interceptor")
	_check(sim.build(4, "pulse"), "win: build pulse")
	sim.start_wave()
	var frames: int = 0
	var limit: int = 60 * 600
	while sim.state != SimScript.State.WON and sim.state != SimScript.State.LOST and frames < limit:
		sim.step(1.0 / 60.0)
		if sim.state == SimScript.State.BETWEEN:
			if sim.energy >= 40.0 and sim.get_tower_at(5) == null:
				sim.build(5, "supply")
			elif sim.energy >= 30.0 and sim.get_tower_at(2) == null:
				sim.build(2, "interceptor")
			elif sim.energy >= 60.0 and sim.get_tower_at(3) != null:
				sim.upgrade(3)
			sim.start_wave()
		frames += 1
	_check(sim.state == SimScript.State.WON, "2+ towers -> won")
	if sim.state == SimScript.State.WON:
		var result: Dictionary = sim.get_result()
		_check(int(result.waves_cleared) == 5, "cleared 5 waves")
		_check(float(result.integrity) > 0.0, "integrity above zero")
		print("   win result: grade=%s integrity=%d kills=%d leaked=%d" % [
			String(result.grade), int(result.integrity), int(result.kills), int(result.leaked),
		])


func _check(condition: bool, label: String) -> void:
	checks += 1
	if condition:
		print("PASS  ", label)
	else:
		failures += 1
		print("FAIL  ", label)


func _finish() -> void:
	print("-- %d checks, %d failed --" % [checks, failures])
	if failures == 0:
		print("ALL TESTS PASSED")
		quit(0)
	else:
		print("%d TEST(S) FAILED" % failures)
		quit(1)
