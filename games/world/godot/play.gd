extends Node3D

const STEP := 1.0 / 60.0
const AssetSlots = preload("res://asset_slots.gd")
var world: WorldNode
var accumulator := 0.0
var camera: Camera3D
var sfx: AudioStreamPlayer

func _ready() -> void:
	camera = $Camera
	sfx = $Sfx
	var real_audio := _load_wav("res://assets/audio/airlock_open.wav")
	sfx.stream = real_audio if real_audio != null else _make_tone()
	var file := FileAccess.open("res://pack.data", FileAccess.READ)
	if file == null:
		push_error("pack.data 不存在")
		return
	var bytes := file.get_buffer(file.get_length())
	world = WorldNode.new()
	add_child(world)
	if not world.load_pack(bytes):
		push_error("WorldNode.load_pack failed")
		return
	var pack_json = JSON.parse_string(bytes.get_string_from_utf8())
	if pack_json is Dictionary:
		for asset_id in pack_json.get("assets", {}):
			var source: String = pack_json["assets"][asset_id].get("source", "")
			if source.ends_with(".glb"):
				var scene = AssetSlots.load_scene("res://assets/" + source)
				if scene != null:
					world.register_visual(source, scene)
	var ground := MeshInstance3D.new()
	var plane := PlaneMesh.new()
	plane.size = Vector2(80, 80)
	ground.mesh = plane
	add_child(ground)
	world.sync_views()
	_update_camera()

func _process(delta: float) -> void:
	if world == null:
		return
	var move := Vector2.ZERO
	if Input.is_key_pressed(KEY_W): move.y -= 1.0
	if Input.is_key_pressed(KEY_S): move.y += 1.0
	if Input.is_key_pressed(KEY_A): move.x -= 1.0
	if Input.is_key_pressed(KEY_D): move.x += 1.0
	if Input.is_key_pressed(KEY_ESCAPE):
		get_tree().quit()
		return
	accumulator += delta
	while accumulator >= STEP:
		world.set_move(move.x, move.y)
		if world.tick() < 0:
			push_error("world tick failed")
			get_tree().quit(2)
			return
		accumulator -= STEP
	world.sync_views()
	_poll_audio()
	_update_camera()

func _poll_audio() -> void:
	for line in world.poll_events().split("\n"):
		if line.strip_edges().is_empty():
			continue
		var event = JSON.parse_string(line)
		if event is Dictionary and event.get("kind", "") in ["dialogue_started", "item_acquired", "sound"]:
			sfx.play()

func _load_wav(path: String) -> AudioStreamWAV:
	var file := FileAccess.open(path, FileAccess.READ)
	if file == null:
		return null
	var bytes := file.get_buffer(file.get_length())
	if bytes.size() < 44:
		return null
	var rate := 22050
	var channels := 1
	var bits := 16
	var pcm := PackedByteArray()
	var i := 12
	while i + 8 <= bytes.size():
		var chunk := bytes.slice(i, i + 4).get_string_from_ascii()
		var size := bytes.decode_u32(i + 4)
		if chunk == "fmt " and i + 24 <= bytes.size():
			channels = bytes.decode_u16(i + 10)
			rate = bytes.decode_u32(i + 12)
			bits = bytes.decode_u16(i + 22)
		elif chunk == "data":
			pcm = bytes.slice(i + 8, min(i + 8 + size, bytes.size()))
			break
		i += 8 + size + (size % 2)
	if pcm.is_empty() or bits != 16:
		return null
	var wav := AudioStreamWAV.new()
	wav.format = AudioStreamWAV.FORMAT_16_BITS
	wav.mix_rate = rate
	wav.stereo = channels == 2
	wav.data = pcm
	return wav

func _make_tone() -> AudioStreamWAV:
	var rate := 22050
	var count := int(rate * 0.12)
	var data := PackedByteArray()
	data.resize(count * 2)
	for i in range(count):
		var value := int(sin(TAU * 440.0 * i / rate) * 12000.0)
		data.encode_s16(i * 2, value)
	var wav := AudioStreamWAV.new()
	wav.format = AudioStreamWAV.FORMAT_16_BITS
	wav.mix_rate = rate
	wav.stereo = false
	wav.data = data
	return wav

func _update_camera() -> void:
	var target := world.player_position()
	camera.position = target + Vector3(8, 8, 10)
	camera.look_at(target + Vector3(0, 0.8, 0), Vector3.UP)
