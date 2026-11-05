# LiveBay · L1 A/B/C 对比
# 运行：./run.sh compare
# 同一张图、同一命令脚本、同一检查单选择，只换 variant。
extends SceneTree

const DataLoaderScript = preload("res://scripts/core/data_loader.gd")
const RuntimeScript = preload("res://scripts/application/mission_runtime.gd")
const RegistryScript = preload("res://scripts/expansion/expansion_registry.gd")
const SimScript = preload("res://scripts/core/sim.gd")


func _initialize() -> void:
	var data: Dictionary = DataLoaderScript.load_mission_pack()
	var registry := RegistryScript.new()
	registry.scan()
	var presets := {
		"A": "res://data/expansion_sets/l1_compare_a.json",
		"B": "res://data/expansion_sets/l1_compare_b.json",
		"C": "res://data/expansion_sets/l1_compare_c.json",
	}
	print("variant | grade | integrity | kills | leaked | energy | duration")
	print("---     | ---   | ---       | ---   | ---    | ---    | ---")
	for name in presets.keys():
		var preset := registry.resolve_file(presets[name])
		if not preset.ok:
			print("%s | ERROR %s" % [name, preset.message])
			continue
		var result := _run(data, preset.data)
		print("%s | %s | %d | %d | %d | %d | %.1fs" % [
			name,
			str(result.get("grade", "?")),
			int(result.get("integrity", 0)),
			int(result.get("kills", 0)),
			int(result.get("leaked", 0)),
			int(result.get("energy", 0)),
			float(result.get("duration", 0.0)),
		])
	quit(0)


func _run(data: Dictionary, set: LiveBayExpansionSet) -> Dictionary:
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
				option = "isolate"
			rt.dispatch(&"submit_checklist", {"card_id": str(card.id), "option_id": option})
			continue
		if rt.sim.fault_choice_pending:
			rt.dispatch(&"submit_fault_choice", {"choice": "isolate"})
			continue
		rt.step(1.0 / 60.0)
		if rt.sim.state == SimScript.State.BETWEEN:
			if rt.sim.energy >= 40.0 and rt.sim.get_tower_at(5) == null:
				rt.dispatch(&"build_tower", {"slot": 5, "tower_id": "supply"})
			elif rt.sim.energy >= 30.0 and rt.sim.get_tower_at(2) == null:
				rt.dispatch(&"build_tower", {"slot": 2, "tower_id": "interceptor"})
			elif rt.sim.energy >= 60.0 and rt.sim.get_tower_at(3) != null:
				rt.dispatch(&"upgrade_tower", {"slot": 3})
			rt.dispatch(&"start_wave")
		frames += 1
	var out: Dictionary = rt.sim.result.duplicate(true)
	out["energy"] = int(rt.sim.energy)
	out["duration"] = float(frames) / 60.0
	rt.dispose()
	return out
