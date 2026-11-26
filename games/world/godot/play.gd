extends Node3D

const STEP := 1.0 / 60.0
const AssetSlots = preload("res://asset_slots.gd")
var world: WorldNode
var accumulator := 0.0
var camera: Camera3D
var sfx: AudioStreamPlayer
var axis_mode := "3d"
var prompt_label: Label
var status_label: Label
var targets := {
	"demo.airlock": "气闸",
	"demo.keeper": "值班员",
	"item.keycard": "钥匙卡",
}

func _ready() -> void:
	for arg in OS.get_cmdline_user_args():
		if arg.begins_with("--axis="):
			axis_mode = arg.trim_prefix("--axis=")
	camera = $Camera
	sfx = $Sfx
	prompt_label = $UI/Prompt
	status_label = $UI/Status
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
	world.enable_multimesh((1 << 3) | (1 << 4), 64)
	if pack_json is Dictionary:
		for asset_id in pack_json.get("assets", {}):
			var source: String = pack_json["assets"][asset_id].get("source", "")
			if source.ends_with(".glb"):
				var scene = AssetSlots.load_scene("res://assets/" + source)
				if scene != null:
					world.register_visual(source, scene)
	_add_box(Vector3(0, -0.1, 0), Vector3(40, 0.2, 40), Color(0.16, 0.19, 0.22))
	for x in [-12.0, 12.0]:
		_add_box(Vector3(x, 2.0, 0), Vector3(0.3, 4.0, 24), Color(0.28, 0.33, 0.36))
	_add_box(Vector3(0, 2.0, -12.0), Vector3(24, 4.0, 0.3), Color(0.28, 0.33, 0.36))
	_add_box(Vector3(0, 1.2, 6.5), Vector3(3.0, 2.4, 0.4), Color(0.38, 0.44, 0.40))
	world.sync_views()
	_update_camera()

func _unhandled_input(event: InputEvent) -> void:
	if world == null or not (event is InputEventKey and event.pressed and not event.echo):
		return
	match event.keycode:
		KEY_E:
			var id := _nearest_of(["demo.airlock", "demo.keeper"])
			if id != "":
				world.interact("player", id)
				status_label.text = "交互：" + str(targets[id])
		KEY_F:
			var id := _nearest_of(["item.keycard"])
			if id != "":
				world.pickup("player", id)
				status_label.text = "拾取：" + str(targets[id])
		KEY_T:
			var id := _nearest_of(["demo.keeper"])
			if id != "":
				world.talk("player", id)
				status_label.text = "对话：" + str(targets[id])

func _nearest_of(ids: Array) -> String:
	var player := world.player_position()
	var best := ""
	var best_dist := 2.8
	for id in ids:
		var pos := world.entity_position(id)
		if pos == Vector3.ZERO:
			continue
		var dist := player.distance_to(pos)
		if dist < best_dist:
			best_dist = dist
			best = id
	return best

func _add_box(pos: Vector3, size: Vector3, color: Color) -> void:
	var mesh := BoxMesh.new()
	mesh.size = size
	var material := StandardMaterial3D.new()
	material.albedo_color = color
	var node := MeshInstance3D.new()
	node.mesh = mesh
	node.material_override = material
	node.position = pos
	add_child(node)

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
		match axis_mode:
			"2d": world.set_move_2d(move.x, move.y)
			"iso": world.set_move_iso(move.x, move.y)
			_: world.set_move(move.x, move.y)
		if world.tick() < 0:
			push_error("world tick failed")
			get_tree().quit(2)
			return
		accumulator -= STEP
	world.sync_views_at(clamp(accumulator / STEP, 0.0, 1.0))
	_poll_events()
	_update_prompt()
	_update_camera()

func _poll_events() -> void:
	for line in world.poll_events().split("\n"):
		if line.strip_edges().is_empty():
			continue
		var event = JSON.parse_string(line)
		if not (event is Dictionary):
			continue
		var kind: String = event.get("kind", "")
		if kind in ["dialogue_started", "item_acquired", "sound"]:
			sfx.play()
		if kind == "toast" and status_label != null:
			status_label.text = str(event.get("text", ""))
		elif kind == "item_acquired" and status_label != null:
			status_label.text = "获得：" + str(event.get("item", ""))
		elif kind == "dialogue_started" and status_label != null:
			status_label.text = "对话开始：" + str(event.get("target", ""))

func _update_prompt() -> void:
	var near := _nearest_of(["demo.airlock", "demo.keeper", "item.keycard"])
	if near == "":
		prompt_label.text = "靠近气闸 / 值班员 / 钥匙卡"
	else:
		prompt_label.text = "目标：" + str(targets[near]) + " · E/F/T"

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
