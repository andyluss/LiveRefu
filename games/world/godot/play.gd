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
var quest_label: Label
var inventory_label: Label
var ui_accumulator := 0.0
var targets := {
	"demo.airlock": "气闸",
	"demo.keeper": "值班员",
	"demo.engineer": "轮机员",
	"item.keycard": "钥匙卡",
	"item.coffee": "咖啡",
	"item.radio": "对讲机",
	"demo.console": "控制台",
	"demo.crate": "货箱",
}

func _ready() -> void:
	_setup_input()
	_setup_touch()
	for arg in OS.get_cmdline_user_args():
		if arg.begins_with("--axis="):
			axis_mode = arg.trim_prefix("--axis=")
	camera = $Camera
	sfx = $Sfx
	prompt_label = $UI/Prompt
	status_label = $UI/Status
	quest_label = $UI/Quest
	inventory_label = $UI/Inventory
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
	for pos in [Vector3(-8, 0.6, -7), Vector3(-6, 0.6, -8), Vector3(7, 0.6, -7)]:
		_add_box(pos, Vector3(1.2, 1.2, 1.2), Color(0.42, 0.32, 0.18))
	_add_box(Vector3(-9, 1.1, 5), Vector3(3.0, 1.1, 1.0), Color(0.22, 0.30, 0.32))
	_add_box(Vector3(9, 1.1, 5), Vector3(3.0, 1.1, 1.0), Color(0.22, 0.30, 0.32))
	_add_box(Vector3(0, 3.8, 0), Vector3(0.15, 0.15, 20), Color(0.55, 0.62, 0.60))
	var light := OmniLight3D.new()
	light.position = Vector3(0, 5, 2)
	light.omni_range = 18.0
	light.light_energy = 1.2
	add_child(light)
	world.sync_views()
	_update_camera()

func _setup_input() -> void:
	var keys := {
		"move_up": KEY_W, "move_down": KEY_S, "move_left": KEY_A, "move_right": KEY_D,
		"interact": KEY_E, "pickup": KEY_F, "talk": KEY_T,
		"save_game": KEY_F5, "load_game": KEY_F9,
	}
	for action in keys:
		if not InputMap.has_action(action):
			InputMap.add_action(action, 0.2)
		var key := InputEventKey.new()
		key.physical_keycode = keys[action]
		InputMap.action_add_event(action, key)
	for action in ["interact", "pickup", "talk"]:
		var button := InputEventJoypadButton.new()
		button.button_index = {"interact": JOY_BUTTON_A, "pickup": JOY_BUTTON_X, "talk": JOY_BUTTON_Y}[action]
		InputMap.action_add_event(action, button)
	for action in ["move_left", "move_right", "move_up", "move_down"]:
		var motion := InputEventJoypadMotion.new()
		motion.axis = {"move_left": JOY_AXIS_LEFT_X, "move_right": JOY_AXIS_LEFT_X, "move_up": JOY_AXIS_LEFT_Y, "move_down": JOY_AXIS_LEFT_Y}[action]
		motion.axis_value = -1.0 if action in ["move_left", "move_up"] else 1.0
		InputMap.action_add_event(action, motion)

func _setup_touch() -> void:
	if not DisplayServer.is_touchscreen_available():
		return
	var panel := Control.new()
	panel.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_WIDE)
	panel.custom_minimum_size = Vector2(0, 170)
	add_child(panel)
	var layout := [
		["move_left", "←", 20], ["move_up", "↑", 90], ["move_down", "↓", 160], ["move_right", "→", 230],
		["interact", "E", 560], ["pickup", "F", 640], ["talk", "T", 720],
	]
	for entry in layout:
		var action: String = entry[0]
		var button := Button.new()
		button.text = entry[1]
		button.position = Vector2(entry[2], 100)
		button.custom_minimum_size = Vector2(64, 64)
		button.button_down.connect(func(): Input.action_press(action))
		button.button_up.connect(func(): Input.action_release(action))
		panel.add_child(button)

func _unhandled_input(event: InputEvent) -> void:
	if world == null:
		return
	if event.is_action_pressed("interact"):
		var id := _nearest_of(["demo.airlock", "demo.keeper", "demo.engineer", "demo.console", "demo.crate"])
		if id != "":
			world.interact("player", id)
			status_label.text = "交互：" + str(targets[id])
	elif event.is_action_pressed("pickup"):
		var id := _nearest_of(["item.keycard", "item.coffee", "item.radio"])
		if id != "":
			world.pickup("player", id)
			status_label.text = "拾取：" + str(targets[id])
	elif event.is_action_pressed("talk"):
		var id := _nearest_of(["demo.keeper", "demo.engineer"])
		if id != "":
			world.talk("player", id)
			status_label.text = "对话：" + str(targets[id])
	elif event.is_action_pressed("save_game"):
		_save_to_user()
	elif event.is_action_pressed("load_game"):
		_load_from_user()
	elif event.is_action_pressed("ui_cancel"):
		get_tree().quit()

func _save_to_user() -> void:
	var data := world.save()
	if data.is_empty():
		status_label.text = "存档失败"
		return
	var path := "user://harbor.save"
	var tmp := path + ".tmp"
	var file := FileAccess.open(tmp, FileAccess.WRITE)
	if file == null:
		status_label.text = "存档失败"
		return
	file.store_buffer(data)
	file.close()
	var err := DirAccess.rename_absolute(ProjectSettings.globalize_path(tmp), ProjectSettings.globalize_path(path))
	status_label.text = "已存档" if err == OK else "存档失败"
	if err == OK:
		print("PLAY_SAVE_HASH=", world.state_hash_hex())

func _load_from_user() -> void:
	var path := "user://harbor.save"
	if not FileAccess.file_exists(path):
		status_label.text = "没有存档"
		return
	var file := FileAccess.open(path, FileAccess.READ)
	if file == null or not world.load_save(file.get_buffer(file.get_length())):
		status_label.text = "读档失败"
		return
	status_label.text = "已读档"
	print("PLAY_LOAD_HASH=", world.state_hash_hex())

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
	var move := Input.get_vector("move_left", "move_right", "move_up", "move_down")
	if Input.is_action_just_pressed("ui_cancel"):
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
	ui_accumulator += delta
	if ui_accumulator >= 0.2:
		ui_accumulator = 0.0
		_update_hud()
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

func _update_hud() -> void:
	var state = JSON.parse_string(world.ui_state())
	if not (state is Dictionary):
		return
	var quest_lines: Array[String] = ["任务"]
	for quest in state.get("quests", []):
		var title: String = quest.get("title", quest.get("id", ""))
		if quest.get("completed", false):
			quest_lines.append("✓ " + title)
		elif quest.get("active", false):
			var done: int = quest.get("progress", {}).size()
			var total: int = quest.get("objective_count", 0)
			quest_lines.append("● " + title + (" %d/%d" % [done, total] if total > 0 else ""))
	if quest_lines.size() == 1:
		quest_lines.append("（无）")
	quest_label.text = "\n".join(quest_lines)
	var inv_lines: Array[String] = ["背包"]
	for stack in state.get("inventory", []):
		inv_lines.append(str(stack.get("name", stack.get("item", ""))) + " ×" + str(stack.get("count", 0)))
	if inv_lines.size() == 1:
		inv_lines.append("（空）")
	inventory_label.text = "\n".join(inv_lines)

func _update_prompt() -> void:
	var near := _nearest_of(["demo.airlock", "demo.keeper", "demo.engineer", "demo.console", "demo.crate", "item.keycard", "item.coffee", "item.radio"])
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
