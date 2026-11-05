# LiveBay · 地图试玩
# 运行：./run.sh playtest
# 用同一套基础策略跑三张图：先两座拦截炮，再按能量补供给/输出/升级。
# 这不是人类试玩，是可复现的无头压力测试；结果用于发现地图时长与难度问题。
extends SceneTree

const DataLoaderScript = preload("res://scripts/core/data_loader.gd")
const SimScript = preload("res://scripts/core/sim.gd")


func _initialize() -> void:
	print("map | grade | integrity | kills | leaked | built | frames | seconds")
	print("--- | --- | --- | --- | --- | --- | --- | ---")
	for map_id in ["bay01", "bay02", "bay03"]:
		_run(map_id)
	quit(0)


func _run(map_id: String) -> void:
	var data: Dictionary = DataLoaderScript.load_game_data("res://data", map_id)
	var sim := SimScript.new(data)
	var slots: int = sim.slots.size()
	var picks: Array = [3, 4] if slots >= 5 else [0, 1]
	for slot: int in picks:
		if slot < slots:
			sim.build(slot, "interceptor")
	if slots > 5:
		sim.build(5, "supply")
	sim.start_wave()
	var frames := 0
	while sim.state != SimScript.State.WON and sim.state != SimScript.State.LOST and frames < 60 * 900:
		sim.step(1.0 / 60.0)
		if sim.state == SimScript.State.BETWEEN:
			if sim.energy >= 40.0 and slots > 6 and sim.get_tower_at(6) == null:
				sim.build(6, "supply")
			elif sim.energy >= 30.0 and sim.get_tower_at(2) == null:
				sim.build(2, "interceptor")
			elif sim.energy >= 60.0 and sim.get_tower_at(3) != null:
				sim.upgrade(3)
			sim.start_wave()
		frames += 1
	var result: Dictionary = sim.get_result()
	print("%s | %s | %d | %d | %d | %d | %d | %.1f" % [
		map_id, str(result.get("grade", "?")), int(result.get("integrity", 0)),
		int(result.get("kills", 0)), int(result.get("leaked", 0)),
		int(result.get("built", 0)), frames, float(frames) / 60.0,
	])
