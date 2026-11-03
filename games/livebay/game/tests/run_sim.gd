# LiveBay · 无头测试
# 运行：godot --headless --path game --script tests/run_sim.gd
extends SceneTree

const DataLoaderScript = preload("res://scripts/core/data_loader.gd")
const SimScript = preload("res://scripts/core/sim.gd")

var failures: int = 0
var checks: int = 0


func _initialize() -> void:
	print("== LiveBay sim tests ==")
	var data: Dictionary = DataLoaderScript.load_game_data()
	_check(not data.is_empty(), "data loads and validates")
	if data.is_empty():
		_finish()
		return

	_test_data(data)
	_test_economy(data)
	_test_upgrade(data)
	_test_loss(data)
	_test_win(data)
	_finish()


func _test_data(data: Dictionary) -> void:
	_check(data.towers.size() == 3, "3 towers")
	_check(data.enemies.size() == 3, "3 enemies")
	_check(data.waves.size() == 5, "5 waves")
	var sim := SimScript.new(data)
	_check(sim.path.size() >= 2, "path has points")
	_check(sim.path_total > 500.0, "path has length")
	_check(sim.slots.size() == 7, "7 build slots")
	_check(sim.energy == 90.0, "starting energy 90")
	_check(sim.integrity == 100.0, "starting integrity 100")


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
