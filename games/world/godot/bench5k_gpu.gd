extends Node3D

const WARMUP := 60
const FRAMES := 180
var world: WorldNode
var camera: Camera3D
var samples: Array[float] = []
var frame := 0

func _ready() -> void:
	camera = $Camera
	camera.look_at(Vector3.ZERO, Vector3.UP)
	var file := FileAccess.open("res://pack.data", FileAccess.READ)
	if file == null:
		push_error("5k pack.data 不存在")
		get_tree().quit(2)
		return
	world = WorldNode.new()
	add_child(world)
	if not world.load_pack(file.get_buffer(file.get_length())):
		push_error("5k load_pack failed")
		get_tree().quit(2)
		return
	world.enable_multimesh((1 << 3) | (1 << 4), 6000)
	world.sync_views()
	print("GPU_BENCH5K_START mode=", DisplayServer.get_name(), " view=", world.view_count(), " multi=", world.multimesh_count())

func _process(delta: float) -> void:
	if world == null:
		return
	if DisplayServer.get_name() != "headless":
		DisplayServer.window_set_vsync_mode(DisplayServer.VSYNC_DISABLED)
	world.tick()
	world.sync_views_at(1.0)
	frame += 1
	if frame > WARMUP:
		samples.append(delta * 1000.0)
	if samples.size() >= FRAMES:
		samples.sort()
		var p50: float = samples[int(samples.size() * 0.50) - 1]
		var p95: float = samples[int(samples.size() * 0.95) - 1]
		var host := OS.get_environment("BENCH_HOST")
		if host == "":
			host = OS.get_name()
		var summary := {
			"host": host,
			"mode": DisplayServer.get_name(),
			"frames": samples.size(),
			"frame_ms_p50": p50,
			"frame_ms_p95": p95,
			"view_count": world.view_count(),
			"multimesh_count": world.multimesh_count(),
		}
		var json_path := OS.get_environment("BENCH_JSON")
		if json_path != "":
			var out := FileAccess.open(json_path, FileAccess.WRITE)
			if out != null:
				out.store_string(JSON.stringify(summary))
		print("GPU_BENCH5K_RESULT ", JSON.stringify(summary))
		get_tree().quit(0)
