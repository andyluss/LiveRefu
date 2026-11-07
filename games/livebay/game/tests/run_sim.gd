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
const FaultModuleScript = preload("res://scripts/domain/faults/fault_module.gd")
const ReadModelScript = preload("res://scripts/application/mission_read_model.gd")
const PresenterScript = preload("res://scripts/presentation/mission_presenter.gd")
const EnemyModuleScript = preload("res://scripts/domain/enemies/enemy_module.gd")
const TowerModuleScript = preload("res://scripts/domain/towers/tower_module.gd")
const InputScript = preload("res://scripts/presentation/game_input.gd")
const LabLoaderScript = preload("res://scripts/lab/lab_loader.gd")

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
	_test_lab()
	_test_economy(data)
	_test_upgrade(data)
	_test_supply_upgrade(data)
	_test_fault(data)
	_test_replay(data)
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
	var fault_mod := FaultModuleScript.new()
	var enemy := {"def": {"disable_duration": 2.5, "disable_radius": 100, "disable_targets": 2}, "hit_towers": {}}
	var towers_data := [{"slot": 0, "disabled_timer": 0.0}, {"slot": 1, "disabled_timer": 0.0}, {"slot": 2, "disabled_timer": 0.0}]
	var slots_data := [Vector2(0, 0), Vector2(10, 0), Vector2(500, 0)]
	var hits := fault_mod.apply(enemy, towers_data, slots_data, Vector2(0, 0))
	_check(hits.size() == 2 and is_equal_approx(float(towers_data[0].disabled_timer), 2.5), "domain: fault module targets")
	_check(fault_mod.apply(enemy, towers_data, slots_data, Vector2(0, 0)).is_empty(), "domain: fault module no repeat")
	var runtime: LiveBayMissionRuntime = RuntimeScript.new(data)
	runtime.blackbox.enabled = false
	var built: LiveBayResult = runtime.dispatch(&"build_tower", {"slot": 0, "tower_id": "interceptor"})
	var started: LiveBayResult = runtime.dispatch(&"start_wave")
	runtime.step(0.1)
	_check(built.ok and started.ok and runtime.clock.ticks == 1, "kernel: runtime commands/tick")
	_check(runtime.events.seq >= 4, "kernel: runtime emits events")
	var view: LiveBayMissionReadModel = ReadModelScript.from_sim(runtime.sim, runtime.clock)
	_check(view.energy > 0.0 and view.wave_count == 8, "view: read model snapshot")
	var hud: Dictionary = PresenterScript.hud(view)
	_check(str(hud.energy_text).begins_with("供能"), "view: presenter HUD text")
	var enemy_mod := EnemyModuleScript.new()
	enemy_mod.configure(data.enemies_by_id, map)
	_check(enemy_mod.spawn("debris") and enemy_mod.enemies.size() == 1, "domain: enemy module spawn")
	_check(enemy_mod.pos(enemy_mod.enemies[0]).distance_to(map.path[0]) < 0.01, "domain: enemy module position")
	enemy_mod.update(0.1, map.path_total)
	_check(float(enemy_mod.enemies[0].dist) > 0.0, "domain: enemy module movement")
	enemy_mod.enemies[0].dead = true
	_check(enemy_mod.cleanup().size() == 1 and enemy_mod.enemies.is_empty(), "domain: enemy module cleanup")
	var tower_eco := EconomyModuleScript.new()
	tower_eco.reset(90.0)
	var tower_mod := TowerModuleScript.new()
	tower_mod.configure(data.towers_by_id, data.balance, data.profession, tower_eco)
	_check(tower_mod.build(0, "interceptor").ok and tower_mod.towers.size() == 1, "domain: tower module build")
	_check(tower_mod.upgrade(0).ok and int(tower_mod.towers[0].level) == 2, "domain: tower module upgrade")
	_check(tower_mod.sell(0).ok and tower_mod.towers.is_empty(), "domain: tower module sell")
	var slot_at := func(_pos: Vector2): return 2
	var mouse := InputEventMouseMotion.new()
	mouse.position = Vector2(10, 10)
	_check(str(InputScript.translate(mouse, slot_at, 3).type) == "hover", "view: input hover")
	var key := InputEventKey.new()
	key.keycode = KEY_SPACE
	key.pressed = true
	_check(str(InputScript.translate(key, slot_at, 3).type) == "start_wave", "view: input start wave")
	key.keycode = KEY_4
	_check(str(InputScript.translate(key, slot_at, 3).type) == "none", "view: input rejects unknown tower key")
	runtime.dispose()


func _test_data(data: Dictionary) -> void:
	_check(data.towers.size() == 6, "6 towers")
	_check(data.enemies.size() == 7, "7 enemies")
	var map2: Dictionary = DataLoaderScript.load_game_data("res://data", "bay02")
	_check(not map2.is_empty() and str(map2.get("map_id", "")) == "bay02" and map2.map.slots.size() == 9, "map 02 loads with 9 slots")
	var map2_sim := SimScript.new(map2)
	_check(map2_sim.path_total > 1000.0 and map2_sim.slots.size() == 9, "map 02 has a traversable path")
	_check(map2.waves.size() == 8 and int(map2.waves[0].groups[0].count) == 8, "map 02 has its own wave table")
	_check(is_equal_approx(map2_sim.energy, 75.0) and is_equal_approx(map2_sim.max_integrity, 90.0) and is_equal_approx(map2_sim.map_speed_mult, 1.15), "map 02 modifiers applied")
	var map3: Dictionary = DataLoaderScript.load_game_data("res://data", "bay03")
	_check(not map3.is_empty() and str(map3.get("map_id", "")) == "bay03" and map3.map.slots.size() == 5, "map 03 loads with 5 slots")
	var map3_sim := SimScript.new(map3)
	_check(map3_sim.path_total > 500.0 and map3_sim.slots.size() == 5, "map 03 has a short traversable path")
	_check(map3.waves.size() == 8 and int(map3.waves[0].groups[0].count) == 5, "map 03 has its own wave table")
	_check(is_equal_approx(map3_sim.energy, 100.0) and is_equal_approx(map3_sim.max_integrity, 85.0), "map 03 modifiers applied")
	_check(data.towers_by_id.has("tractor"), "tractor tower exists")
	_check(data.towers_by_id.has("welder"), "welder tower exists")
	_check(data.towers_by_id.has("beacon"), "beacon tower exists")
	_check(data.enemies_by_id.has("armor"), "armor enemy exists")
	_check(data.enemies_by_id.has("carrier"), "carrier enemy exists")
	_check(data.enemies_by_id.has("splitter"), "splitter enemy exists")
	_check(data.enemies_by_id.has("fault"), "fault enemy exists")
	_check(String(data.enemies_by_id["fault"].get("behavior", "")) == "reverse", "fault moves in reverse")
	_check(data.waves.size() == 8, "8 waves")
	_check(data.get("procedures", {}).get("cards", []).size() == 12, "12 checklist cards")
	_check(data.get("contracts", []).size() == 3, "3 contracts")
	_check(data.get("residents", []).size() == 3, "3 residents")
	var sim := SimScript.new(data)
	_check(sim.path.size() >= 2, "path has points")
	_check(sim.path_total > 500.0, "path has length")
	_check(sim.slots.size() == 7, "7 build slots")
	_check(sim.energy == 90.0, "starting energy 90")
	_check(sim.integrity == 100.0, "starting integrity 100")
	_check(data.balance.has("grade_s_ratio"), "grade thresholds are data-driven")
	_check(data.get("pack_manifest", {}).get("schema_version", 0) == 2, "mission pack schema version")
	_check(str(data.get("pack_manifest", {}).get("hash", "")).begins_with("sha256:"), "mission pack hash")
	_check(str(data.get("pack_manifest", {}).get("map_id", "")) == "bay01", "mission pack bay01 map_id")
	var pack2: Dictionary = DataLoaderScript.load_mission_pack("res://data", "bay02")
	_check(str(pack2.get("pack_manifest", {}).get("map_id", "")) == "bay02", "mission pack bay02 map_id")
	_check(str(pack2.get("pack_manifest", {}).get("pack_id", "")) == "livebay.bay02", "mission pack bay02 pack_id")
	var pack3: Dictionary = DataLoaderScript.load_mission_pack("res://data", "bay03")
	_check(str(pack3.get("pack_manifest", {}).get("map_id", "")) == "bay03", "mission pack bay03 map_id")
	_check(str(pack3.get("pack_catalog", {}).get("default_map", "")) == "bay01", "mission pack catalog default map")
	_check(is_equal_approx(float(data.waves[0].prep), 30.0), "wave 1 prep 30")
	_check(is_equal_approx(float(data.waves[1].prep), 20.0), "wave 2 prep 20")


func _test_lab() -> void:
	var labs: Array = LabLoaderScript.load_all()
	_check(labs.size() == 3, "lab: 3 scenarios load")
	if labs.is_empty():
		return
	var first: Dictionary = labs[0]
	var applied: Dictionary = LabLoaderScript.apply(first)
	_check(not applied.is_empty(), "lab: scenario applies")
	var base: Dictionary = DataLoaderScript.load_mission_pack("res://data", str(first.get("base", {}).get("map", "bay01")))
	_check(not base.is_empty() and float(applied.profession.start_energy) < float(base.profession.start_energy), "lab: energy override applies")
	_check(str(applied.get("lab_meta", {}).get("id", "")) == str(first.get("id", "")), "lab: metadata attached")
	var diff: Dictionary = LabLoaderScript.diff(first)
	_check(not diff.is_empty() and diff.has("starting_energy"), "lab: diff computed")
	var path: String = LabLoaderScript.export_candidate(first)
	_check(not path.is_empty() and FileAccess.file_exists(path), "lab: candidate exported")
	var export_path: String = LabLoaderScript.export_scenario(first)
	_check(not export_path.is_empty() and FileAccess.file_exists(export_path), "lab: scenario exported")
	var imported: Dictionary = LabLoaderScript.import_scenario(export_path)
	_check(not imported.is_empty() and str(imported.get("id", "")) == str(first.get("id", "")), "lab: scenario imported")


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


func _test_replay(data: Dictionary) -> void:
	# 回放测试聚焦模拟确定性；检查单会暂停时钟，另由 UI/流程测试覆盖。
	var replay_data: Dictionary = data.duplicate(true)
	replay_data["procedures"] = {"cards": [], "report": []}
	var runtime: LiveBayMissionRuntime = RuntimeScript.new(replay_data)
	runtime.dispatch(&"build_tower", {"slot": 3, "tower_id": "interceptor"})
	runtime.dispatch(&"build_tower", {"slot": 4, "tower_id": "pulse"})
	runtime.dispatch(&"start_wave")
	var frames := 0
	while runtime.sim.state != SimScript.State.WON and runtime.sim.state != SimScript.State.LOST and frames < 60 * 600:
		runtime.step(1.0 / 60.0)
		if runtime.sim.state == SimScript.State.BETWEEN:
			runtime.dispatch(&"start_wave")
		frames += 1
	var before: Dictionary = runtime.sim.result.duplicate(true)
	var entries: Array = runtime.blackbox.events.duplicate(true)
	var replay: LiveBayMissionRuntime = RuntimeScript.replay(replay_data, entries)
	_check(int(replay.sim.result.get("integrity", -1)) == int(before.get("integrity", -2)), "replay: integrity matches")
	_check(str(replay.sim.result.get("grade", "")) == str(before.get("grade", "")), "replay: grade matches")
	replay.dispose()
	runtime.dispose()


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
		_check(int(result.waves_cleared) == 8, "cleared 8 waves")
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
