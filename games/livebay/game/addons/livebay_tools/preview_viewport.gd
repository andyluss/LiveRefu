@tool
extends SubViewportContainer

# LiveBay Tools · 内嵌预览
# 用真实的 Sim 跑选中波次，默认摆两座塔；只读，不写 numbers。

const SimScript = preload("res://scripts/core/sim.gd")
const DataLoaderScript = preload("res://scripts/core/data_loader.gd")
const PreviewCanvas = preload("res://addons/livebay_tools/preview_canvas.gd")

signal status(text: String)
var selected_tower_id := "interceptor"
var viewport: SubViewport
var canvas: Node2D
var sim: Variant = null
var running := false
var paused := false
var wave_offset := 0
var total_waves := 0


func _ready() -> void:
	_ensure_initialized()


func _ensure_initialized() -> void:
	if viewport != null:
		return
	stretch = true
	custom_minimum_size = Vector2(260, 146)
	viewport = SubViewport.new()
	viewport.size = Vector2i(640, 360)
	viewport.render_target_update_mode = SubViewport.UPDATE_ALWAYS
	add_child(viewport)
	canvas = PreviewCanvas.new()
	canvas.scale = Vector2(0.5, 0.5)
	viewport.add_child(canvas)
	mouse_filter = Control.MOUSE_FILTER_STOP


func start_preview(map_data: Dictionary, wave_data: Array, wave_index: int) -> String:
	_ensure_initialized()
	if wave_index < 0 or wave_index >= wave_data.size():
		return "没有可预览的波次。"
	var data: Dictionary = DataLoaderScript.load_game_data()
	if data.is_empty():
		return "无法加载 game/data。"
	data["map"] = map_data.duplicate(true)
	data["waves"] = wave_data.slice(wave_index).duplicate(true)
	wave_offset = wave_index
	total_waves = wave_data.size()
	if canvas:
		canvas.wave_offset = wave_index
	sim = SimScript.new(data)
	# 默认布防：前两个可用塔位。仅用于预览，不写回。
	if sim.slots.size() > 0:
		sim.build(0, "interceptor")
	if sim.slots.size() > 1:
		sim.build(1, "pulse")
	sim.tower_fired.connect(func(from: Vector2, to: Vector2, kind: String):
		if canvas:
			canvas.add_beam(from, to, kind)
	)
	sim.enemy_killed.connect(func(enemy: Dictionary):
		if canvas:
			canvas.add_float(sim.point_at(float(enemy.dist)), "KILL +%d" % int(enemy.def.get("reward", 0)))
	)
	sim.start_wave()
	canvas.set_sim(sim)
	running = true
	paused = false
	set_process(true)
	return "内嵌预览 W%d；按「停止内嵌」结束。" % int(wave_data[wave_index].get("index", wave_index + 1))


func stop_preview() -> void:
	running = false
	paused = false
	set_process(false)
	if sim:
		sim = null
	if canvas:
		canvas.set_sim(null)


func _process(delta: float) -> void:
	if not running or paused or sim == null:
		return
	if sim.state == SimScript.State.BETWEEN:
		paused = true
		status.emit("波间整备：点「下一波」继续。")
		return
	sim.step(delta)
	canvas.queue_redraw()
	if sim.state == SimScript.State.WON or sim.state == SimScript.State.LOST:
		running = false
		set_process(false)
		status.emit("内嵌预览结束：%s" % ("WON" if sim.state == SimScript.State.WON else "LOST"))


func toggle_pause() -> void:
	if not running or sim == null:
		return
	if sim.state == SimScript.State.WON or sim.state == SimScript.State.LOST:
		return
	paused = not paused
	status.emit("预览已暂停。" if paused else "预览继续。")
	set_process(true)


func next_wave() -> void:
	if not running or sim == null:
		return
	if sim.state == SimScript.State.BETWEEN:
		sim.start_wave()
		paused = false
		status.emit("下一波开始。")
		set_process(true)


func _gui_input(event: InputEvent) -> void:
	if not running or sim == null or viewport == null or canvas == null:
		return
	if not (event is InputEventMouseButton and event.pressed):
		return
	if event.button_index == MOUSE_BUTTON_RIGHT:
		_sell_at(event.position)
		accept_event()
		return
	if event.button_index != MOUSE_BUTTON_LEFT:
		return
	var local: Vector2 = event.position / size * Vector2(viewport.size)
	var world: Vector2 = local / canvas.scale.x
	var slot := _slot_at(world)
	if slot < 0:
		return
	if sim.get_tower_at(slot) == null:
		if sim.build(slot, selected_tower_id):
			status.emit("预览：在 %d 号塔位建造 %s" % [slot + 1, selected_tower_id])
		else:
			status.emit("预览：供能不足或塔位不可用")
	else:
		if sim.upgrade(slot):
			status.emit("预览：升级 %d 号塔位" % [slot + 1])
		else:
			status.emit("预览：无法升级（满级或供能不足）")
	canvas.queue_redraw()
	accept_event()


func _sell_at(pos: Vector2) -> void:
	var local: Vector2 = pos / size * Vector2(viewport.size)
	var world: Vector2 = local / canvas.scale.x
	var slot := _slot_at(world)
	if slot >= 0 and sim.get_tower_at(slot) != null:
		if sim.sell(slot):
			status.emit("预览：出售 %d 号塔位" % [slot + 1])
			canvas.queue_redraw()


func _slot_at(world: Vector2) -> int:
	var best := -1
	var best_d := 22.0
	for i in range(sim.slots.size()):
		var d: float = world.distance_to(sim.slots[i])
		if d < best_d:
			best = i
			best_d = d
	return best
