# LiveBay · 扩展包运行时测试
# 校验 manifest、baseline、多个 L1 变体互斥与 A/B 运行。
extends SceneTree

const RegistryScript = preload("res://scripts/expansion/expansion_registry.gd")
const DataLoaderScript = preload("res://scripts/core/data_loader.gd")
const RuntimeScript = preload("res://scripts/application/mission_runtime.gd")
const SimScript = preload("res://scripts/core/sim.gd")

var failures := 0
var checks := 0


func _check(ok: bool, label: String) -> void:
	checks += 1
	if not ok:
		failures += 1
	print(("PASS  " if ok else "FAIL  ") + label)


func _initialize() -> void:
	var registry := RegistryScript.new()
	registry.scan()
	_check(registry.manifests.size() == 2, "registry: 2 sample packs")
	_check(registry.errors.is_empty(), "registry: no scan errors")

	var baseline := registry.resolve_file("res://data/expansion_sets/baseline.json")
	var a := registry.resolve_file("res://data/expansion_sets/l1_compare_a.json")
	var b := registry.resolve_file("res://data/expansion_sets/l1_compare_b.json")
	var invalid := registry.resolve_file("res://data/expansion_sets/l1_invalid.json")
	_check(baseline.ok and baseline.data.pack_ids().is_empty(), "preset: baseline empty")
	_check(a.ok and a.data.has_pack("lb.exp.l1.shift_a") and not a.data.has_pack("lb.exp.l1.shift_b"), "preset: variant A selected")
	_check(b.ok and b.data.has_pack("lb.exp.l1.shift_b") and not b.data.has_pack("lb.exp.l1.shift_a"), "preset: variant B selected")
	_check(not invalid.ok, "preset: same variant group rejected")

	var data: Dictionary = DataLoaderScript.load_mission_pack()
	var run_a: LiveBayMissionRuntime = RuntimeScript.new(data, a.data)
	var run_b: LiveBayMissionRuntime = RuntimeScript.new(data, b.data)
	_check(is_equal_approx(run_a.sim.energy, 95.0), "modifier: A starting energy 95")
	_check(is_equal_approx(run_b.sim.energy, 85.0), "modifier: B starting energy 85")
	run_a.dispose()
	run_b.dispose()
	var result_a := _run_variant(data, a.data)
	var result_b := _run_variant(data, b.data)
	_check(result_a.get("grade", "") == result_b.get("grade", ""), "compare: same grade (sample modifiers)")
	_check(int(result_a.get("integrity", -1)) == int(result_b.get("integrity", -2)), "compare: same integrity")

	print("-- %d checks, %d failed --" % [checks, failures])
	quit(0 if failures == 0 else 1)


func _run_variant(data: Dictionary, set: LiveBayExpansionSet) -> Dictionary:
	var rt: LiveBayMissionRuntime = RuntimeScript.new(data, set)
	rt.blackbox.enabled = false
	rt.dispatch(&"build_tower", {"slot": 3, "tower_id": "interceptor"})
	rt.dispatch(&"build_tower", {"slot": 4, "tower_id": "pulse"})
	rt.dispatch(&"start_wave")
	var frames := 0
	while rt.sim.state != SimScript.State.WON and rt.sim.state != SimScript.State.LOST and frames < 60 * 600:
		rt.step(1.0 / 60.0)
		if rt.sim.state == SimScript.State.BETWEEN:
			rt.dispatch(&"start_wave")
		frames += 1
	var result: Dictionary = rt.sim.result.duplicate(true)
	rt.dispose()
	return result
