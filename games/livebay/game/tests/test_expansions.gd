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
	_check(registry.manifests.size() == 3, "registry: 3 sample packs")
	_check(registry.errors.is_empty(), "registry: no scan errors")

	var baseline := registry.resolve_file("res://data/expansion_sets/baseline.json")
	var a := registry.resolve_file("res://data/expansion_sets/l1_compare_a.json")
	var b := registry.resolve_file("res://data/expansion_sets/l1_compare_b.json")
	var c := registry.resolve_file("res://data/expansion_sets/l1_compare_c.json")
	var invalid := registry.resolve_file("res://data/expansion_sets/l1_invalid.json")
	_check(baseline.ok and baseline.data.pack_ids().is_empty(), "preset: baseline empty")
	_check(a.ok and a.data.has_pack("lb.exp.l1.shift_a") and not a.data.has_pack("lb.exp.l1.shift_b"), "preset: variant A selected")
	_check(b.ok and b.data.has_pack("lb.exp.l1.shift_b") and not b.data.has_pack("lb.exp.l1.shift_a"), "preset: variant B selected")
	_check(c.ok and c.data.has_pack("lb.exp.l1.shift_c") and not c.data.has_pack("lb.exp.l1.shift_a"), "preset: variant C selected")
	_check(not invalid.ok, "preset: same variant group rejected")

	var data: Dictionary = DataLoaderScript.load_mission_pack()
	var run_a: LiveBayMissionRuntime = RuntimeScript.new(data, a.data)
	var run_b: LiveBayMissionRuntime = RuntimeScript.new(data, b.data)
	_check(is_equal_approx(run_a.sim.energy, 95.0), "modifier: A starting energy 95")
	_check(is_equal_approx(run_b.sim.energy, 85.0), "modifier: B starting energy 85")
	run_a.dispose()
	run_b.dispose()
	var proc_data: Dictionary = a.data.apply_data(data)
	var sim_for_proc: Variant = SimScript.new(proc_data)
	sim_for_proc.wave.index = 2
	sim_for_proc.state = 2
	var procedure: LiveBayProcedureModule = preload("res://scripts/domain/procedures/procedure_module.gd").new()
	procedure.configure(proc_data)
	var card: Dictionary = procedure.update(sim_for_proc)
	_check(not card.is_empty() and int(card.wave) == 4, "procedure: W4 checklist requested")
	_check(procedure.resolve(str(card.id), "review", sim_for_proc).ok and sim_for_proc.fault_duration_bonus < 0.0, "procedure: review modifies fault duration")
	var sim_w5: Variant = SimScript.new(proc_data)
	sim_w5.wave.index = 3
	sim_w5.state = 2
	var procedure_w5: LiveBayProcedureModule = preload("res://scripts/domain/procedures/procedure_module.gd").new()
	procedure_w5.configure(proc_data)
	var card_w5: Dictionary = procedure_w5.update(sim_w5)
	_check(not card_w5.is_empty() and int(card_w5.wave) == 5, "procedure: W5 fault plan requested")
	_check(procedure_w5.resolve(str(card_w5.id), "bypass", sim_w5).ok and sim_w5.fault_bypass, "procedure: bypass selected")
	var fault_mod: LiveBayFaultModule = preload("res://scripts/domain/faults/fault_module.gd").new()
	var enemy_fault := {"def": {"disable_duration": 2.5, "disable_radius": 100, "disable_targets": 2}, "hit_towers": {}}
	var tower_bypass := [{"slot": 0, "disabled_timer": 0.0, "degraded_timer": 0.0, "degraded_factor": 1.0}]
	var hits := fault_mod.apply(enemy_fault, tower_bypass, [Vector2.ZERO], Vector2.ZERO, 0.0, true)
	_check(hits.size() == 1 and float(tower_bypass[0].degraded_timer) > 0.0 and float(tower_bypass[0].disabled_timer) == 0.0, "fault: bypass degrades without disabling")
	var result_a := _run_variant(data, a.data, "isolate")
	var result_b := _run_variant(data, b.data, "isolate")
	var result_c := _run_variant(data, c.data, "bypass")
	_check(result_a.get("grade", "") == result_b.get("grade", ""), "compare: same grade (sample modifiers)")
	_check(int(result_a.get("integrity", -1)) == int(result_b.get("integrity", -2)), "compare: same integrity")
	_check(not result_c.is_empty(), "compare: C bypass run completes")

	print("-- %d checks, %d failed --" % [checks, failures])
	quit(0 if failures == 0 else 1)


func _run_variant(data: Dictionary, set: LiveBayExpansionSet, w5_choice := "isolate") -> Dictionary:
	var rt: LiveBayMissionRuntime = RuntimeScript.new(data, set)
	rt.blackbox.enabled = false
	rt.dispatch(&"build_tower", {"slot": 3, "tower_id": "interceptor"})
	rt.dispatch(&"build_tower", {"slot": 4, "tower_id": "pulse"})
	rt.dispatch(&"start_wave")
	var frames := 0
	while rt.sim.state != SimScript.State.WON and rt.sim.state != SimScript.State.LOST and frames < 60 * 600:
		if rt.procedure.has_pending():
			var card: Dictionary = rt.procedure.pending
			var option := "sign"
			if int(card.get("wave", 0)) == 5:
				option = w5_choice
			rt.dispatch(&"submit_checklist", {"card_id": str(card.id), "option_id": option})
			continue
		rt.step(1.0 / 60.0)
		if rt.sim.state == SimScript.State.BETWEEN:
			rt.dispatch(&"start_wave")
		frames += 1
	var result: Dictionary = rt.sim.result.duplicate(true)
	rt.dispose()
	return result
