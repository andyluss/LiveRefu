# LiveBay · 自由模式游戏页
# 独立于主模式 GamePage：自己的 Runtime/HUD/输入；复用 Sim/Data/Renderer/常量。
extends Node2D

const LabLoaderScript = preload("res://scripts/lab/lab_loader.gd")
const RuntimeScript = preload("res://scripts/application/mission_runtime.gd")
const RendererScript = preload("res://scripts/presentation/game_renderer.gd")
const HUDScript = preload("res://scripts/lab/lab_hud.gd")
const AudioScript = preload("res://scripts/presentation/audio_director.gd")
const SurvivalScript = preload("res://scripts/lab/survival_module.gd")

var app: Node
var scenario: Dictionary = {}
var data: Dictionary = {}
var runtime: LiveBayMissionRuntime
var sim: Variant
var renderer: LiveBayGameRenderer
var hud: LiveBayLabHud
var survival: LiveBaySurvival
var audio: LiveBayAudioDirector
var font: SystemFont
var selected_tower_id := "interceptor"
var selected_slot := -1
var hover_slot := -1
var beams: Array = []
var leak_flash := 0.0
var toast_text := ""
var toast_timer := 0.0
var ended := false


func _ready() -> void:
	data = LabLoaderScript.apply(scenario)
	if data.is_empty():
		app.open_lab()
		return
	runtime = RuntimeScript.new(data)
	sim = runtime.sim
	sim.fault_duration_bonus += float(data.get("lab_meta", {}).get("fault_bonus", 0.0))
	if str(data.get("lab_meta", {}).get("mode", "")) == "survival":
		survival = SurvivalScript.new()
		survival.configure(data, sim)
	selected_tower_id = str(data.towers[0].id)
	font = SystemFont.new()
	font.font_names = PackedStringArray(["PingFang SC", "Hiragino Sans GB", "Noto Sans CJK SC", "Microsoft YaHei"])
	audio = AudioScript.new()
	add_child(audio)
	audio.play_music("prep")
	hud = HUDScript.new()
	hud.build(self, data, {
		"select_tower": select_tower,
		"start_wave": start_wave,
		"speed": toggle_speed,
		"back": back_to_lab,
		"retry": retry,
		"tower_less": func() -> void: survival.adjust_share(-0.05) if survival != null else null,
		"tower_more": func() -> void: survival.adjust_share(0.05) if survival != null else null,
		"battery": func() -> void: survival.use_battery() if survival != null else null,
		"seal": func() -> void: survival.toggle_seal() if survival != null else null,
		"evacuate": func() -> void: survival.evacuate() if survival != null else null,
	})
	sim.tower_fired.connect(_on_fired)
	sim.enemy_leaked.connect(_on_leak)
	sim.game_won.connect(func(result: Dictionary) -> void: _finish(true, result))
	sim.game_lost.connect(func(result: Dictionary) -> void: _finish(false, result))
	queue_redraw()


func _process(delta: float) -> void:
	if runtime == null or ended:
		return
	runtime.step(delta)
	if survival != null:
		survival.update(delta, sim)
		if survival.failed or survival.won:
			_finish(survival.won, _survival_result())
			return
	leak_flash = maxf(0.0, leak_flash - delta)
	toast_timer = maxf(0.0, toast_timer - delta)
	for i in range(beams.size() - 1, -1, -1):
		beams[i].life -= delta
		if beams[i].life <= 0.0:
			beams.remove_at(i)
	hud.update()
	queue_redraw()


func _unhandled_input(event: InputEvent) -> void:
	if runtime == null:
		return
	if event is InputEventMouseMotion:
		hover_slot = _slot_at(event.position)
		return
	if event is InputEventMouseButton and event.pressed:
		if event.button_index == MOUSE_BUTTON_LEFT:
			var slot := _slot_at(event.position)
			if slot >= 0:
				_build(slot)
		return
	if event is InputEventKey and event.pressed and not event.echo:
		match event.keycode:
			KEY_1, KEY_2, KEY_3, KEY_4, KEY_5, KEY_6:
				var ids: Array = data.towers.map(func(t: Variant) -> String: return str(t.id))
				var idx := int(event.keycode - KEY_1)
				if idx < ids.size():
					select_tower(ids[idx])
			KEY_SPACE:
				start_wave()
			KEY_TAB:
				toggle_speed()
			KEY_R:
				retry()
			KEY_ESCAPE, KEY_Q:
				back_to_lab()
			KEY_F1:
				app.open_home()


func _draw() -> void:
	if renderer == null:
		renderer = RendererScript.new()
	if font == null:
		font = SystemFont.new()
		font.font_names = PackedStringArray(["PingFang SC", "Hiragino Sans GB", "Noto Sans CJK SC", "Microsoft YaHei"])
	renderer.font = font
	renderer.draw(self, sim, selected_slot, hover_slot, beams, leak_flash, toast_text, toast_timer, runtime != null and runtime.clock.paused)


func _slot_at(pos: Vector2) -> int:
	if sim == null:
		return -1
	for i: int in range(sim.slots.size()):
		if pos.distance_to(sim.slots[i]) <= 28.0:
			return i
	return -1


func _build(slot: int) -> void:
	if sim.get_tower_at(slot) != null:
		selected_slot = slot
		return
	var result: LiveBayResult = runtime.dispatch(&"build_tower", {"slot": slot, "tower_id": selected_tower_id})
	if result.ok:
		selected_slot = slot
		audio.play("build")


func select_tower(tower_id: String) -> void:
	if data.get("tower_disabled", []).has(tower_id):
		return
	selected_tower_id = tower_id
	audio.play("ui_hover")


func start_wave() -> void:
	if sim != null and sim.state in [0, 2]:
		runtime.dispatch(&"start_wave")
		audio.play_music("wave")


func toggle_speed() -> void:
	var next := 1.0
	var current := float(runtime.clock.speed)
	if current < 1.5:
		next = 2.0
	elif current < 3.0:
		next = 4.0
	runtime.dispatch(&"set_speed", {"speed": next})


func retry() -> void:
	app.open_game(scenario)


func back_to_lab() -> void:
	app.open_lab()


func _on_fired(from: Vector2, to: Vector2, kind: String) -> void:
	beams.append({"from": from, "to": to, "kind": kind, "life": 0.09, "max_life": 0.09})


func _on_leak(_enemy: Dictionary) -> void:
	leak_flash = 0.4
	toast_text = "保障度受损"
	toast_timer = 1.2


func _survival_result() -> Dictionary:
	var result: Dictionary = sim.get_result().duplicate(true)
	result["won"] = survival.won
	result["reason"] = survival.reason
	result["integrity"] = sim.integrity
	result["max_integrity"] = sim.max_integrity
	result["kills"] = sim.stats.get("kills", 0)
	result["leaked"] = sim.stats.get("leaked", 0)
	result["grade"] = survival.grade(sim)
	return result


func _finish(won: bool, result: Dictionary) -> void:
	if ended:
		return
	ended = true
	audio.play_music("result")
	audio.play("win" if won else "lost")
	hud.show_result(won, result)
