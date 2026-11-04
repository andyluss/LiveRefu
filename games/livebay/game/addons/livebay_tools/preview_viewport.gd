@tool
extends SubViewportContainer

# LiveBay Tools · 内嵌预览
# 用真实的 Sim 跑选中波次，默认摆两座塔；只读，不写 numbers。

const SimScript = preload("res://scripts/core/sim.gd")
const DataLoaderScript = preload("res://scripts/core/data_loader.gd")
const PreviewCanvas = preload("res://addons/livebay_tools/preview_canvas.gd")

var viewport: SubViewport
var canvas: Node2D
var sim: Variant = null
var running := false


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


func start_preview(map_data: Dictionary, wave_data: Array, wave_index: int) -> String:
	_ensure_initialized()
	if wave_index < 0 or wave_index >= wave_data.size():
		return "没有可预览的波次。"
	var data: Dictionary = DataLoaderScript.load_game_data()
	if data.is_empty():
		return "无法加载 game/data。"
	data["map"] = map_data.duplicate(true)
	data["waves"] = [wave_data[wave_index].duplicate(true)]
	sim = SimScript.new(data)
	# 默认布防：前两个可用塔位。仅用于预览，不写回。
	if sim.slots.size() > 0:
		sim.build(0, "interceptor")
	if sim.slots.size() > 1:
		sim.build(1, "pulse")
	sim.start_wave()
	canvas.set_sim(sim)
	running = true
	set_process(true)
	return "内嵌预览 W%d；按「停止内嵌」结束。" % int(wave_data[wave_index].get("index", wave_index + 1))


func stop_preview() -> void:
	running = false
	set_process(false)
	if sim:
		sim = null
	if canvas:
		canvas.set_sim(null)


func _process(delta: float) -> void:
	if not running or sim == null:
		return
	sim.step(delta)
	canvas.queue_redraw()
	if sim.state == SimScript.State.WON or sim.state == SimScript.State.LOST:
		running = false
		set_process(false)
