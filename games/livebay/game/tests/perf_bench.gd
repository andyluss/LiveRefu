# LiveBay · 性能基准
# 运行：./run.sh perf
# 输出 docs-ai/design01/performance/bench.json；只读，不写游戏数据。
extends SceneTree

const DataLoaderScript = preload("res://scripts/core/data_loader.gd")
const SimScript = preload("res://scripts/core/sim.gd")
const AudioScript = preload("res://scripts/presentation/audio_director.gd")
const RendererScript = preload("res://scripts/presentation/game_renderer.gd")
const MAPS := ["bay01", "bay02", "bay03"]


func _initialize() -> void:
	var payload := {
		"schema": 1,
		"engine": Engine.get_version_info().get("string", "Godot"),
		"hardware": {
			"os": OS.get_name(),
			"processor": OS.get_processor_name(),
			"cores": OS.get_processor_count(),
		},
		"generated_at": Time.get_datetime_string_from_system(),
		"scenario": "standard",
		"map_load": _map_load(),
		"frame_time": _frame_time(),
		"entities": _entities(),
		"long_run": _long_run(),
		"audio": _audio(),
		"render": _render(),
	}
	var out := ProjectSettings.globalize_path("res://").path_join("../docs-ai/design01/performance/bench.json").simplify_path()
	DirAccess.make_dir_recursive_absolute(out.get_base_dir())
	var file := FileAccess.open(out, FileAccess.WRITE)
	if file == null:
		print("FAIL cannot write ", out)
		quit(1)
		return
	file.store_string(JSON.stringify(payload, "\t"))
	file.close()
	print("wrote ", out)
	print("frame p50/p95/max: ", payload.frame_time.p50_ms, " / ", payload.frame_time.p95_ms, " / ", payload.frame_time.max_ms, " ms")
	print("long_run: ", payload.long_run.wall_ms, " ms / ", payload.long_run.frames, " frames")
	quit(0)


func _new_sim(map_id: String) -> Variant:
	var data: Dictionary = DataLoaderScript.load_game_data("res://data", map_id)
	return SimScript.new(data)


func _standard(sim: Variant) -> void:
	var slots: int = sim.slots.size()
	var picks: Array = [3, 4] if slots >= 5 else [0, 1]
	for slot: int in picks:
		sim.build(slot, "interceptor")
	if slots > 5:
		sim.build(5, "supply")


func _map_load() -> Dictionary:
	var rows := {}
	for map_id: String in MAPS:
		# 预热一次，避免把首次磁盘/解析冷启动算进 p95。
		DataLoaderScript.load_mission_pack("res://data", map_id)
		var samples: Array = []
		for i: int in range(20):
			var t := Time.get_ticks_usec()
			var data: Dictionary = DataLoaderScript.load_mission_pack("res://data", map_id)
			samples.append((Time.get_ticks_usec() - t) / 1000.0)
			if data.is_empty():
				samples[-1] = -1.0
		rows[map_id] = _stats(samples)
	return rows


func _frame_time() -> Dictionary:
	var mem_before := OS.get_static_memory_usage()
	var sim: Variant = _new_sim("bay01")
	_standard(sim)
	sim.start_wave()
	var samples: Array = []
	var frames := 0
	while sim.state != SimScript.State.WON and sim.state != SimScript.State.LOST and frames < 60 * 600:
		var t := Time.get_ticks_usec()
		sim.step(1.0 / 60.0)
		samples.append((Time.get_ticks_usec() - t) / 1000.0)
		if sim.state == SimScript.State.BETWEEN:
			_between(sim)
			sim.start_wave()
		frames += 1
	var s := _stats(samples)
	s["frames"] = frames
	s["result"] = sim.get_result()
	s["static_memory_mb_before"] = mem_before / 1048576.0
	s["static_memory_mb_after"] = OS.get_static_memory_usage() / 1048576.0
	return s


func _between(sim: Variant) -> void:
	var slots: int = sim.slots.size()
	if sim.energy >= 40.0 and slots > 6 and sim.get_tower_at(6) == null:
		sim.build(6, "supply")
	elif sim.energy >= 30.0 and sim.get_tower_at(2) == null:
		sim.build(2, "interceptor")
	elif sim.energy >= 60.0 and sim.get_tower_at(3) != null:
		sim.upgrade(3)


func _entities() -> Dictionary:
	var rows := []
	for n: int in [100, 500, 1000, 2000]:
		var sim: Variant = _new_sim("bay01")
		_standard(sim)
		sim.start_wave()
		sim.spawn_queue.clear()
		var def: Dictionary = sim.enemies_by_id["debris"].duplicate(true)
		def.hp = 1.0e12
		def.speed = 0.0
		for i: int in range(n):
			sim.enemies.append({
				"def": def, "hp": def.hp, "max_hp": def.hp,
				"dist": (float(i) / float(n)) * sim.path_total,
				"direction": 1, "hit_towers": {}, "slow_factor": 0.0,
				"slow_timer": 0.0, "dead": false,
			})
		var samples: Array = []
		for i: int in range(120):
			var t := Time.get_ticks_usec()
			sim.step(1.0 / 60.0)
			samples.append((Time.get_ticks_usec() - t) / 1000.0)
		var s := _stats(samples)
		s["n"] = n
		s["static_memory_mb"] = OS.get_static_memory_usage() / 1048576.0
		rows.append(s)
	return {"rows": rows}


func _long_run() -> Dictionary:
	var mem_before := OS.get_static_memory_usage()
	var sim: Variant = _new_sim("bay01")
	_standard(sim)
	sim.start_wave()
	sim.spawn_queue.clear()
	var def: Dictionary = sim.enemies_by_id["armor"].duplicate(true)
	def.hp = 1.0e12
	def.speed = 0.0
	sim.enemies.append({
		"def": def, "hp": def.hp, "max_hp": def.hp, "dist": 0.0,
		"direction": 1, "hit_towers": {}, "slow_factor": 0.0,
		"slow_timer": 0.0, "dead": false,
	})
	var start := Time.get_ticks_usec()
	var frames := 0
	for i: int in range(60 * 300):
		sim.step(1.0 / 60.0)
		frames += 1
	var wall := (Time.get_ticks_usec() - start) / 1000.0
	return {
		"frames": frames,
		"wall_ms": wall,
		"ms_per_frame": wall / maxf(1.0, float(frames)),
		"entities": sim.enemies.size(),
		"state": sim.state,
		"static_memory_mb_before": mem_before / 1048576.0,
		"static_memory_mb_after": OS.get_static_memory_usage() / 1048576.0,
	}


class FakeCanvas:
	var calls := 0
	func draw_rect(_r: Rect2, _c: Color, _filled := true, _width := -1.0, _aa := false) -> void: calls += 1
	func draw_line(_a: Vector2, _b: Vector2, _c: Color, _w := 1.0, _aa := false) -> void: calls += 1
	func draw_circle(_p: Vector2, _r: float, _c: Color) -> void: calls += 1
	func draw_arc(_p: Vector2, _r: float, _a: float, _b: float, _n: int, _c: Color, _w := 1.0, _aa := false) -> void: calls += 1
	func draw_polyline(_p: PackedVector2Array, _c: Color, _w := 1.0, _aa := false) -> void: calls += 1
	func draw_colored_polygon(_p: PackedVector2Array, _c: Color) -> void: calls += 1
	func draw_string(_f: Font, _p: Vector2, _t: String, _a := 0, _w := -1.0, _s := 16, _c := Color.WHITE) -> void: calls += 1


func _render() -> Dictionary:
	var font := SystemFont.new()
	font.font_names = PackedStringArray(["PingFang SC", "Arial Unicode MS"])
	var sim: Variant = _new_sim("bay01")
	_standard(sim)
	sim.start_wave()
	var renderer: Variant = RendererScript.new()
	renderer.font = font
	var fake := FakeCanvas.new()
	var samples: Array = []
	for i: int in range(1000):
		sim.step(1.0 / 60.0)
		var t := Time.get_ticks_usec()
		renderer.draw(fake, sim, -1, -1, [], 0.0, "", 0.0, false)
		samples.append((Time.get_ticks_usec() - t) / 1000.0)
	var stats := _stats(samples)
	return {
		"headless": true,
		"cpu_draw": stats,
		"draw_calls_per_frame": fake.calls / 1000,
		"adapter": RenderingServer.get_video_adapter_name(),
		"gpu_note": "headless 无 GPU 帧；cpu_draw 只测绘制命令生成，不是 GPU 时间",
	}


func _audio() -> Dictionary:
	var audio: Variant = AudioScript.new()
	root.add_child(audio)
	audio._ready()
	var out := {
		"voices": audio._players.size(),
		"driver": AudioServer.get_driver_name(),
		"mix_rate": AudioServer.get_mix_rate(),
		"output_latency_ms": AudioServer.get_output_latency() * 1000.0,
		"note": "headless/dummy：只验证音频通道与驱动参数；播放延迟需显示环境/真机。",
	}
	audio.queue_free()
	return out


func _stats(values: Array) -> Dictionary:
	var clean: Array = []
	for v: Variant in values:
		if float(v) >= 0.0:
			clean.append(float(v))
	clean.sort()
	if clean.is_empty():
		return {"n": 0, "p50_ms": 0.0, "p95_ms": 0.0, "max_ms": 0.0, "avg_ms": 0.0}
	var total := 0.0
	for v: float in clean:
		total += v
	return {
		"n": clean.size(),
		"avg_ms": total / clean.size(),
		"p50_ms": clean[int(clean.size() * 0.5)],
		"p95_ms": clean[int(clean.size() * 0.95)],
		"max_ms": clean[-1],
	}
