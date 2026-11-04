@tool
extends Control

# LiveBay Tools · 波次时间轴
# 只负责画与点击；编辑逻辑在 plugin.gd。

signal group_selected(wave_index: int, group_index: int)
signal group_delay_changed(wave_index: int, group_index: int, delay: float)
signal group_interval_changed(wave_index: int, group_index: int, interval: float)
signal group_delay_finished

const ROW_H := 30.0
const TOP := 18.0
const LEFT := 34.0
const BAR_H := 12.0

var waves: Array = []
var enemies: Array = []
var selected_wave := -1
var selected_group := -1
var _hits: Array = []
var _drag_wave := -1
var _drag_group := -1
var _drag_start_x := 0.0
var _drag_start_delay := 0.0
var _drag_start_interval := 1.0
var _drag_mode := "delay"
var _drag_count := 1
var _dragging := false


func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_STOP
	custom_minimum_size = Vector2(260, 190)


func set_data(new_waves: Array, new_enemies: Array, wave_index := -1, group_index := -1) -> void:
	waves = new_waves
	enemies = new_enemies
	selected_wave = wave_index
	selected_group = group_index
	queue_redraw()


func _enemy(id: String) -> Dictionary:
	for e in enemies:
		if str(e.get("id", "")) == id:
			return e
	return {}


func _color(id: String) -> Color:
	var e: Dictionary = _enemy(id)
	return Color.from_string(str(e.get("color", "#8C978F")), Color("#8C978F"))


func _max_time() -> float:
	var m: float = 1.0
	for w in waves:
		for g in w.get("groups", []):
			var end: float = float(g.get("delay", 0.0)) + maxf(0.0, float(g.get("count", 1)) - 1.0) * float(g.get("interval", 1.0))
			m = max(m, end + 1.0)
	return m


func _draw() -> void:
	_hits.clear()
	var font: Font = ThemeDB.fallback_font
	draw_rect(Rect2(Vector2.ZERO, size), Color("#F5EFE2"), true)
	draw_rect(Rect2(Vector2.ZERO, size), Color("#D6CBB6"), false, 1.0)
	if waves.is_empty():
		draw_string(font, Vector2(10, 24), "没有波次数据", HORIZONTAL_ALIGNMENT_LEFT, -1, 12, Color("#566264"))
		return
	var tmax: float = _max_time()
	var plot_w: float = maxf(40.0, size.x - LEFT - 10.0)
	for wi in range(waves.size()):
		var w: Dictionary = waves[wi]
		var y: float = TOP + wi * ROW_H
		if y + BAR_H > size.y:
			break
		draw_string(font, Vector2(8, y + 11), "W%d" % int(w.get("index", wi + 1)), HORIZONTAL_ALIGNMENT_LEFT, -1, 10, Color("#566264"))
		draw_line(Vector2(LEFT, y + BAR_H - 1), Vector2(LEFT + plot_w, y + BAR_H - 1), Color("#D6CBB6"), 1.0)
		for gi in range(w.get("groups", []).size()):
			var g: Dictionary = w["groups"][gi]
			var start: float = float(g.get("delay", 0.0))
			var count: int = int(g.get("count", 1))
			var interval: float = float(g.get("interval", 1.0))
			var end: float = start + maxf(0.0, float(count - 1)) * interval
			var x1: float = LEFT + (start / tmax) * plot_w
			var x2: float = LEFT + (end / tmax) * plot_w
			if x2 - x1 < 6.0:
				x2 = x1 + 6.0
			var rect: Rect2 = Rect2(Vector2(x1, y), Vector2(x2 - x1, BAR_H))
			draw_rect(rect, _color(str(g.get("enemy", ""))), true)
			draw_rect(rect, Color("#232B2F"), false, 1.0)
			if wi == selected_wave and gi == selected_group:
				draw_rect(rect.grow(2.0), Color("#232B2F"), false, 2.0)
				# 右缘把手：拖动改 interval
				draw_line(Vector2(x2, y), Vector2(x2, y + BAR_H), Color("#232B2F"), 2.0)
			_hits.append({"wave": wi, "group": gi, "rect": rect.grow(3.0), "start": start, "end_x": x2, "count": count, "interval": interval})
	draw_line(Vector2(LEFT, size.y - 12), Vector2(LEFT + plot_w, size.y - 12), Color("#566264"), 1.0)
	draw_string(font, Vector2(LEFT, size.y - 2), "0s", HORIZONTAL_ALIGNMENT_LEFT, -1, 9, Color("#7B8683"))
	draw_string(font, Vector2(LEFT + plot_w - 30, size.y - 2), "%.0fs" % tmax, HORIZONTAL_ALIGNMENT_LEFT, -1, 9, Color("#7B8683"))


func _gui_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
		if event.pressed:
			for hit in _hits:
				if hit["rect"].has_point(event.position):
					_dragging = true
					_drag_wave = int(hit["wave"])
					_drag_group = int(hit["group"])
					_drag_start_x = event.position.x
					_drag_start_delay = float(hit["start"])
					_drag_start_interval = float(hit["interval"])
					_drag_count = int(hit["count"])
					_drag_mode = "interval" if abs(event.position.x - float(hit["end_x"])) <= 7.0 and _drag_count > 1 else "delay"
					group_selected.emit(_drag_wave, _drag_group)
					accept_event()
					return
		elif _dragging:
			_dragging = false
			group_delay_finished.emit()
			accept_event()
			return
	if event is InputEventMouseMotion and _dragging:
		var tmax := _max_time()
		var plot_w: float = maxf(40.0, size.x - LEFT - 10.0)
		var delta: float = (event.position.x - _drag_start_x) / plot_w * tmax
		if _drag_mode == "interval":
			var new_interval: float = maxf(0.1, snappedf(_drag_start_interval + delta / maxf(1.0, float(_drag_count - 1)), 0.1))
			group_interval_changed.emit(_drag_wave, _drag_group, new_interval)
		else:
			var new_delay: float = maxf(0.0, snappedf(_drag_start_delay + delta, 0.1))
			group_delay_changed.emit(_drag_wave, _drag_group, new_delay)
		accept_event()
