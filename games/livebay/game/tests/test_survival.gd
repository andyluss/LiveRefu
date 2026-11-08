# LiveBay · 生存玩法与数值自动测试
# 运行：./run.sh survival-test
extends SceneTree

const LabLoaderScript = preload("res://scripts/lab/lab_loader.gd")
const SimScript = preload("res://scripts/core/sim.gd")
const SurvivalScript = preload("res://scripts/lab/survival_module.gd")

var failures := 0
var checks := 0


func _initialize() -> void:
	print("== LiveBay survival tests ==")
	var scenarios: Array = LabLoaderScript.load_all()
	var scenario: Dictionary = {}
	for s: Variant in scenarios:
		if str(s.get("id", "")) == "lab.bay01.low_power":
			scenario = s
	_check(not scenario.is_empty(), "survival scenario exists")
	if scenario.is_empty():
		_finish()
		return
	var data: Dictionary = LabLoaderScript.apply(scenario)
	_check(not data.is_empty() and str(data.get("lab_meta", {}).get("mode", "")) == "survival", "survival scenario applies")
	_test_oxygen_penalty(data)
	_test_seal(data)
	_test_evacuation(data)
	_test_matrix(data)
	_finish()


func _new_run(data: Dictionary, tower_share := 0.5) -> Dictionary:
	var sim := SimScript.new(data)
	# 生存测试隔离战斗失败：保留高保障度，只验证氧气/救援/舱门。
	sim.integrity = 1000.0
	for slot: int in [3, 4]:
		sim.build(slot, "interceptor")
	var survival := SurvivalScript.new()
	survival.configure(data, sim)
	survival.tower_share = tower_share
	sim.start_wave()
	return {"sim": sim, "survival": survival}


func _advance(run: Dictionary, seconds: float) -> void:
	var sim: Variant = run.sim
	var survival: LiveBaySurvival = run.survival
	var steps := int(seconds * 60.0)
	for i: int in range(steps):
		if survival.failed or survival.won:
			return
		sim.step(1.0 / 60.0)
		survival.update(1.0 / 60.0, sim)
		if sim.state == SimScript.State.BETWEEN:
			sim.start_wave()


func _test_oxygen_penalty(data: Dictionary) -> void:
	var run := _new_run(data)
	var sim: Variant = run.sim
	var survival: LiveBaySurvival = run.survival
	survival.power = 40.0
	survival.tower_share = 0.7
	survival.oxygen = 0.0
	_advance(run, 301.0)
	_check(not survival.failed, "oxygen empty does not fail")
	_check(survival.won and survival.reason == "救援抵达", "rescue wins with empty oxygen")
	_check(survival.grade(sim) == "C", "oxygen empty only lowers grade")


func _test_seal(data: Dictionary) -> void:
	var run_a := _new_run(data, 0.7)
	var run_b := _new_run(data, 0.7)
	var a: LiveBaySurvival = run_a.survival
	var b: LiveBaySurvival = run_b.survival
	a.oxygen = 200.0
	b.oxygen = 200.0
	a.power = 40.0
	b.power = 40.0
	b.toggle_seal()
	_advance(run_a, 10.0)
	_advance(run_b, 10.0)
	_check(b.oxygen > a.oxygen, "seal reduces oxygen drain")
	_check(b.sealed and b.power < a.power, "seal costs power")


func _test_evacuation(data: Dictionary) -> void:
	var run := _new_run(data)
	run.survival.rescue_left = 50.0
	_check(run.survival.can_evacuate(run.sim), "evacuation available near rescue")
	_check(run.survival.evacuate(), "evacuation command")
	_check(run.survival.won and run.survival.reason == "主动撤离", "evacuation ends run")


func _test_matrix(data: Dictionary) -> void:
	print("share | grade | integrity | oxygen | reason")
	print("--- | --- | --- | --- | ---")
	for share: float in [0.3, 0.5, 0.7]:
		var run := _new_run(data, share)
		_advance(run, 301.0)
		var sim: Variant = run.sim
		var survival: LiveBaySurvival = run.survival
		print("%.1f | %s | %d | %d | %s" % [
			share, survival.grade(sim), int(sim.integrity), int(survival.oxygen), survival.reason,
		])
		_check(not survival.failed, "matrix run completes without combat failure")


func _check(ok: bool, name: String) -> void:
	checks += 1
	if ok:
		print("PASS  ", name)
	else:
		failures += 1
		print("FAIL  ", name)


func _finish() -> void:
	print("-- %d checks, %d failed --" % [checks, failures])
	quit(0 if failures == 0 else 1)
