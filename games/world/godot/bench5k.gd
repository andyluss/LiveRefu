extends Node

const TICKS := 600

func _ready() -> void:
	var file := FileAccess.open("res://pack.data", FileAccess.READ)
	if file == null:
		push_error("5k pack.data 不存在")
		get_tree().quit(2)
		return
	var world := WorldNode.new()
	add_child(world)
	if not world.load_pack(file.get_buffer(file.get_length())):
		push_error("5k load_pack failed")
		get_tree().quit(2)
		return
	world.enable_multimesh((1 << 3) | (1 << 4), 6000)
	world.sync_views()
	var tick_ms: Array[float] = []
	var sync_ms: Array[float] = []
	for _i in range(TICKS):
		var t0 := Time.get_ticks_usec()
		if world.tick() < 0:
			push_error("5k tick failed")
			get_tree().quit(2)
			return
		tick_ms.append((Time.get_ticks_usec() - t0) / 1000.0)
		var t1 := Time.get_ticks_usec()
		world.sync_views_at(1.0)
		sync_ms.append((Time.get_ticks_usec() - t1) / 1000.0)
	tick_ms.sort()
	sync_ms.sort()
	var tick_p95: float = tick_ms[int(tick_ms.size() * 0.95) - 1]
	var sync_p95: float = sync_ms[int(sync_ms.size() * 0.95) - 1]
	var summary := {
		"props": 5000,
		"ticks": TICKS,
		"view_count": world.view_count(),
		"multimesh_count": world.multimesh_count(),
		"tick_ms_p95": tick_p95,
		"sync_ms_p95": sync_p95,
	}
	print("BENCH5K_RESULT ", JSON.stringify(summary))
	get_tree().quit(0 if world.multimesh_count() >= 5000 else 1)
