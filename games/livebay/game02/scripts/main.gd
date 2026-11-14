# LiveBay: Severed · 舱段生存原型
# 独立游戏：房间图 + 资源 + 故障 + 救援窗口。没有塔防。
extends Node2D

const SimScript = preload("res://scripts/section_sim.gd")
const RendererScript = preload("res://scripts/section_renderer.gd")
const HudScript = preload("res://scripts/hud.gd")
const DATA_PATH := "res://data/section_bay01.json"

var section: Dictionary = {}
var sim: LiveBaySectionSim
var renderer: LiveBaySectionRenderer
var hud: LiveBaySurvivalHud
var player_pos := Vector2(640, 340)
var player_room := "corridor"
var state := "menu" # menu / playing / paused / ended
var context: Dictionary = {}
var last_context_id := ""


func _ready() -> void:
	section = _load_json(DATA_PATH)
	if section.is_empty():
		push_error("无法加载舱段数据")
		return
	sim = SimScript.new()
	sim.setup(section)
	player_room = sim.player_room
	player_pos = Vector2(section.get("player_start", [640, 340])[0], section.get("player_start", [640, 340])[1])
	renderer = RendererScript.new()
	hud = HudScript.new()
	add_child(hud)
	hud.build({
		"start": start_shift,
		"restart": start_shift,
		"resume": func() -> void: _set_paused(false),
		"menu": show_menu,
	})
	hud.show_menu()
	state = "menu"
	queue_redraw()


func _load_json(path: String) -> Dictionary:
	var f := FileAccess.open(path, FileAccess.READ)
	if f == null:
		return {}
	var parsed: Variant = JSON.parse_string(f.get_as_text())
	return parsed if parsed is Dictionary else {}


func start_shift() -> void:
	sim.setup(section)
	player_room = str(section.get("start_room", "corridor"))
	var start: Array = section.get("player_start", [640, 340])
	player_pos = Vector2(start[0], start[1])
	state = "playing"
	context = {}
	last_context_id = ""
	hud.start_play()
	hud.update(sim, {})
	queue_redraw()


func show_menu() -> void:
	state = "menu"
	hud.show_menu()
	queue_redraw()


func _set_paused(value: bool) -> void:
	if value:
		state = "paused"
		hud.set_paused(true)
	else:
		state = "playing"
		hud.set_paused(false)


func _process(delta: float) -> void:
	if state == "playing":
		_handle_movement(delta)
		sim.step(delta)
		context = _find_context()
		hud.update(sim, context)
		if sim.state != "playing":
			_finish()
	if state == "playing" or state == "paused" or state == "ended":
		queue_redraw()


func _handle_movement(delta: float) -> void:
	var dir := Input.get_vector("ui_left", "ui_right", "ui_up", "ui_down")
	if dir.length() > 0.01:
		var speed := 165.0
		player_pos += dir.normalized() * speed * delta
	var r: Dictionary = sim.current_room()
	var margin := 16.0
	player_pos.x = clampf(player_pos.x, float(r.rect[0]) + margin, float(r.rect[0] + r.rect[2]) - margin)
	player_pos.y = clampf(player_pos.y, float(r.rect[1]) + margin, float(r.rect[1] + r.rect[3]) - margin)


func _unhandled_input(event: InputEvent) -> void:
	if not event is InputEventKey or not event.pressed or event.echo:
		return
	match state:
		"menu":
			if event.keycode == KEY_E or event.keycode == KEY_ENTER:
				start_shift()
		"playing":
			match event.keycode:
				KEY_E:
					_interact()
				KEY_R:
					_seal_door()
				KEY_F:
					_stay()
				KEY_TAB:
					hud.toggle_map()
					context = {}
				KEY_SPACE:
					_set_paused(true)
				KEY_ESCAPE:
					_set_paused(true)
		"paused":
			if event.keycode == KEY_SPACE or event.keycode == KEY_ESCAPE:
				_set_paused(false)
		"ended":
			if event.keycode == KEY_E or event.keycode == KEY_ENTER:
				start_shift()


func _find_context() -> Dictionary:
	var r: Dictionary = sim.current_room()
	# doors
	for d: Dictionary in sim.doors:
		var in_a := str(d.a) == player_room
		var in_b := str(d.b) == player_room
		if not in_a and not in_b:
			continue
		var p: Vector2 = Vector2(d.a_pos[0], d.a_pos[1]) if in_a else Vector2(d.b_pos[0], d.b_pos[1])
		if player_pos.distance_to(p) <= 42:
			var target := str(d.b) if in_a else str(d.a)
			var label := "门 → " + str(sim.room(target).get("name", target))
			if bool(d.sealed):
				label = "门已封死"
			elif not bool(d.open):
				label = "开门 → " + str(sim.room(target).get("name", target))
			return {"type": "door", "door": str(d.id), "target": target, "pos": p, "label": label}
	# leak
	if float(r.get("leak", 0.0)) > 0.0 and r.has("breach_pos"):
		var bp := Vector2(r.breach_pos[0], r.breach_pos[1])
		if player_pos.distance_to(bp) <= 62:
			return {"type": "leak", "room": player_room, "pos": bp, "label": "修补泄漏"}
	# fire
	if float(r.get("fire", 0.0)) > 0.0:
		var fp := Vector2(float(r.rect[0]) + float(r.rect[2]) * 0.55, float(r.rect[1]) + float(r.rect[3]) * 0.45)
		if player_pos.distance_to(fp) <= 78:
			return {"type": "fire", "room": player_room, "pos": fp, "label": "灭火"}
	# NPC
	if not sim.npc.is_empty() and str(sim.npc.get("room", "")) == player_room and not bool(sim.npc.get("rescued", false)) and int(sim.npc.get("health", 0)) > 0:
		var np := Vector2(sim.npc.pos[0], sim.npc.pos[1])
		if player_pos.distance_to(np) <= 62:
			return {"type": "npc", "pos": np, "label": "救出岚"}
	# consoles
	if r.has("console_pos"):
		var cp := Vector2(r.console_pos[0], r.console_pos[1])
		if player_pos.distance_to(cp) <= 60:
			match str(r.get("type", "")):
				"power":
					return {"type": "power", "pos": cp, "label": "切换主电"}
				"life":
					return {"type": "life", "pos": cp, "label": "补充 suit 氧气"}
				"dock":
					var label := "撤离" if sim.rescue_open else "等待救援"
					return {"type": "dock", "pos": cp, "label": label}
	return {}


func _interact() -> void:
	match str(context.get("type", "")):
		"door":
			_use_door()
		"leak":
			if sim.repair_leak(str(context.room)):
				sim.add_log("泄漏修补完成。")
		"fire":
			sim.extinguish(str(context.room))
		"power":
			sim.toggle_power()
		"life":
			sim.refill_suit()
		"npc":
			sim.rescue_npc()
		"dock":
			if sim.rescue_open:
				sim.evacuate()
			else:
				sim.add_log("救援还没到。先撑住。")
	context = {}
	queue_redraw()


func _use_door() -> void:
	var door_id := str(context.get("door", ""))
	for d: Dictionary in sim.doors:
		if str(d.id) != door_id:
			continue
		if bool(d.sealed):
			sim.add_log("门已封死。")
			return
		if not bool(d.open):
			sim.toggle_door(door_id)
			return
		# cross to the other room
		var target := str(context.get("target", ""))
		player_room = target
		sim.player_room = target
		var target_room: Dictionary = sim.room(target)
		var entry := Vector2(float(target_room.rect[0]) + float(target_room.rect[2]) * 0.5, float(target_room.rect[1]) + float(target_room.rect[3]) * 0.5)
		player_pos = entry
		sim.add_log("进入 " + str(target_room.get("name", target)) + "。")
		return


func _seal_door() -> void:
	if str(context.get("type", "")) != "door":
		return
	sim.seal_door(str(context.get("door", "")))
	context = {}
	queue_redraw()


func _stay() -> void:
	if str(context.get("type", "")) == "dock" and sim.rescue_open:
		sim.stay()
		context = {}


func _finish() -> void:
	state = "ended"
	hud.update(sim, {})
	hud.show_end(sim)
	queue_redraw()


func _draw() -> void:
	if renderer == null:
		return
	renderer.draw(self, sim, player_pos, context, false)
