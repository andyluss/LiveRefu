# LiveBay · Godot 对账 trace
# 运行：./run.sh sim-trace
# 输出 docs-ai/design01/simulator/traces.json；只读，不写游戏数据。
extends SceneTree

const DataLoaderScript = preload("res://scripts/core/data_loader.gd")
const SimScript = preload("res://scripts/core/sim.gd")


func _initialize() -> void:
	var scenarios: Array = []
	for map_id: String in ["bay01", "bay02", "bay03"]:
		scenarios.append(_run(map_id))
	var payload := {
		"schema": 1,
		"generated_by": "game/tests/sim_trace.gd",
		"scenario": "standard",
		"note": "standard: two interceptors, then supply/interceptor/upgrade by energy; not human play",
		"scenarios": scenarios,
	}
	var root := ProjectSettings.globalize_path("res://")
	var out_path := root.path_join("../docs-ai/design01/simulator/traces.json").simplify_path()
	var file := FileAccess.open(out_path, FileAccess.WRITE)
	if file == null:
		print("FAIL cannot write ", out_path)
		quit(1)
		return
	file.store_string(JSON.stringify(payload, "\t"))
	file.close()
	print("wrote ", out_path)
	quit(0)


func _run(map_id: String) -> Dictionary:
	var data: Dictionary = DataLoaderScript.load_game_data("res://data", map_id)
	var sim := SimScript.new(data)
	var slots: int = sim.slots.size()
	var picks: Array = [3, 4] if slots >= 5 else [0, 1]
	var towers_built: Array = []
	for slot: int in picks:
		if slot < slots and sim.build(slot, "interceptor"):
			towers_built.append({"slot": slot, "tower": "interceptor"})
	if slots > 5 and sim.build(5, "supply"):
		towers_built.append({"slot": 5, "tower": "supply"})
	sim.start_wave()
	var frames := 0
	while sim.state != SimScript.State.WON and sim.state != SimScript.State.LOST and frames < 60 * 900:
		sim.step(1.0 / 60.0)
		if sim.state == SimScript.State.BETWEEN:
			if sim.energy >= 40.0 and slots > 6 and sim.get_tower_at(6) == null:
				if sim.build(6, "supply"):
					towers_built.append({"slot": 6, "tower": "supply"})
			elif sim.energy >= 30.0 and sim.get_tower_at(2) == null:
				if sim.build(2, "interceptor"):
					towers_built.append({"slot": 2, "tower": "interceptor"})
			elif sim.energy >= 60.0 and sim.get_tower_at(3) != null:
				if sim.upgrade(3):
					towers_built.append({"slot": 3, "tower": "upgrade"})
			sim.start_wave()
		frames += 1
	var result: Dictionary = sim.get_result()
	var wave_hp := 0
	var wave_count := 0
	for w: Variant in sim.waves:
		for g: Variant in w.get("groups", []):
			var enemy: Dictionary = sim.enemies_by_id.get(str(g.get("enemy", "")), {})
			wave_hp += int(g.get("count", 0)) * int(enemy.get("hp", 0))
			wave_count += int(g.get("count", 0))
	return {
		"id": "%s-standard" % map_id,
		"map": map_id,
		"scenario": "standard",
		"result": {
			"grade": str(result.get("grade", "?")),
			"won": bool(result.get("won", false)),
			"integrity": float(result.get("integrity", 0.0)),
			"max_integrity": float(result.get("max_integrity", 100.0)),
			"kills": int(result.get("kills", 0)),
			"leaked": int(result.get("leaked", 0)),
			"built": int(result.get("built", 0)),
			"spent": int(result.get("spent", 0)),
			"waves_cleared": int(result.get("waves_cleared", 0)),
			"seconds": float(frames) / 60.0,
		},
		"facts": {
			"path_length": sim.path_total,
			"slots": sim.slots.size(),
			"waves": sim.waves.size(),
			"wave_hp": wave_hp,
			"wave_count": wave_count,
		},
		"build": towers_built,
	}
