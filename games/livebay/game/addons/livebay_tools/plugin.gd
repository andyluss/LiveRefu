@tool
extends EditorPlugin

# LiveBay Tools · 编辑器插件 MVP
# 规则：TECH-A1（单一数据源）、TECH-B1（可逆工程）、DES-C1（数值与场景引用）
#
# 在 2D 视口叠加路径/塔位/基地；拖动后保存到 numbers/05，再由 bridge.py 导出。
# 数据真正来源仍是 numbers/，插件不是第二套数据源。

const BridgeClient = preload("res://addons/livebay_tools/bridge_client.gd")
const COLOR_PATH := Color("#E0A22E")
const COLOR_SLOT := Color("#D9622B")
const COLOR_BASE := Color("#3E6F6B")
const COLOR_SELECT := Color("#F5EFE2")
const COLOR_TEXT := Color("#232B2F")
const COLOR_WARN := Color("#8C4A32")
const SNAP := 5.0

var bridge: RefCounted
var dock: VBoxContainer
var status: Label
var selection: Label
var tower_picker: OptionButton
var overlay_check: CheckButton
var map_data: Dictionary = {}
var towers: Array = []
var overlay_enabled := true
var selected_kind := ""
var selected_index := -1
var dragging := false


func _enter_tree() -> void:
	bridge = BridgeClient.new()
	_build_dock()
	_reload(false)


func _exit_tree() -> void:
	if dock:
		remove_control_from_docks(dock)
		dock.queue_free()
	update_overlays()


func _build_dock() -> void:
	dock = VBoxContainer.new()
	dock.name = "LiveBay Tools"
	dock.custom_minimum_size = Vector2(280, 0)

	var title := Label.new()
	title.text = "LiveBay Tools · 地图"
	title.add_theme_font_size_override("font_size", 15)
	dock.add_child(title)

	var hint := Label.new()
	hint.text = "在 2D 视口拖动路径点 / 塔位 / 基地。保存写回 numbers/05 并导出。"
	hint.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	hint.custom_minimum_size = Vector2(250, 0)
	dock.add_child(hint)

	var actions := HBoxContainer.new()
	dock.add_child(actions)
	var reload_button := Button.new()
	reload_button.text = "重载"
	reload_button.pressed.connect(func(): _reload(true))
	actions.add_child(reload_button)
	var save_button := Button.new()
	save_button.text = "保存"
	save_button.pressed.connect(_save)
	actions.add_child(save_button)
	var check_button := Button.new()
	check_button.text = "校验"
	check_button.pressed.connect(_check)
	actions.add_child(check_button)

	var run_button := Button.new()
	run_button.text = "运行游戏"
	run_button.pressed.connect(_run_game)
	dock.add_child(run_button)

	overlay_check = CheckButton.new()
	overlay_check.text = "显示叠加层"
	overlay_check.button_pressed = true
	overlay_check.toggled.connect(func(on: bool):
		overlay_enabled = on
		update_overlays()
	)
	dock.add_child(overlay_check)

	var tower_row := HBoxContainer.new()
	dock.add_child(tower_row)
	var tower_label := Label.new()
	tower_label.text = "塔预览"
	tower_row.add_child(tower_label)
	tower_picker = OptionButton.new()
	tower_picker.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	tower_picker.item_selected.connect(func(_i: int): _update_status())
	tower_row.add_child(tower_picker)

	var sep := HSeparator.new()
	dock.add_child(sep)
	selection = Label.new()
	selection.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	selection.custom_minimum_size = Vector2(250, 0)
	dock.add_child(selection)

	status = Label.new()
	status.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	status.custom_minimum_size = Vector2(250, 0)
	status.add_theme_color_override("font_color", Color("#566264"))
	dock.add_child(status)

	add_control_to_dock(DOCK_SLOT_RIGHT_UL, dock)


func _reload(announce: bool) -> void:
	var result: Dictionary = bridge.read_map()
	if not bool(result.get("ok", false)):
		_set_status("读取失败：" + str(result.get("error", "未知错误")), true)
		return
	map_data = result.get("map", {})
	towers = result.get("towers", [])
	selected_kind = ""
	selected_index = -1
	_refresh_tower_picker()
	_update_status()
	if announce:
		_set_status("已从 numbers/05 重载。")
	update_overlays()


func _refresh_tower_picker() -> void:
	tower_picker.clear()
	for t in towers:
		tower_picker.add_item("%s · %d" % [str(t.get("name", t.get("id", "?"))), int(t.get("cost", 0))])
	if tower_picker.item_count > 0:
		tower_picker.select(0)


func _save() -> void:
	var result: Dictionary = bridge.write_map(map_data)
	if not bool(result.get("ok", false)):
		_set_status("保存失败：" + str(result.get("error", "未知错误")), true)
		return
	_set_status(str(result.get("message", "已保存。")))
	_reload(false)


func _check() -> void:
	var result: Dictionary = bridge.check()
	if bool(result.get("ok", false)):
		_set_status("校验通过：" + str(result.get("message", "")))
	else:
		_set_status("校验失败：" + str(result.get("error", "")), true)


func _run_game() -> void:
	if get_editor_interface() and get_editor_interface().has_method("play_main_scene"):
		get_editor_interface().play_main_scene()


func _set_status(text: String, warn := false) -> void:
	if status:
		status.text = text
		status.add_theme_color_override("font_color", COLOR_WARN if warn else Color("#566264"))


func _update_status() -> void:
	if selection == null:
		return
	if selected_kind == "":
		selection.text = "未选中。点击路径点、塔位或基地。"
		return
	var pos := _selected_position()
	selection.text = "选中：%s %d · (%d, %d)" % [selected_kind, selected_index + 1, int(pos.x), int(pos.y)]
	update_overlays()


func _selected_position() -> Vector2:
	if selected_kind == "slot":
		return _vec(map_data.get("slots", [])[selected_index])
	if selected_kind == "path":
		return _vec(map_data.get("path", [])[selected_index])
	if selected_kind == "base":
		return _vec(map_data.get("base", {}).get("pos", [0, 0]))
	return Vector2.ZERO


func _vec(value: Variant) -> Vector2:
	if value is Array and value.size() >= 2:
		return Vector2(float(value[0]), float(value[1]))
	return Vector2.ZERO


func _set_vec(value: Variant, p: Vector2) -> void:
	if value is Array and value.size() >= 2:
		value[0] = int(p.x)
		value[1] = int(p.y)


func _snap(p: Vector2) -> Vector2:
	return Vector2(round(p.x / SNAP) * SNAP, round(p.y / SNAP) * SNAP)


func _world_from_event(event: InputEventMouse) -> Vector2:
	var vt := get_editor_interface().get_editor_viewport_2d()
	if vt == null:
		return event.position
	return vt.get_canvas_transform().affine_inverse() * event.position


func _find_handle(p: Vector2) -> Dictionary:
	var slots: Array = map_data.get("slots", [])
	for i in range(slots.size()):
		if p.distance_to(_vec(slots[i])) <= 16.0:
			return {"kind": "slot", "index": i}
	var base: Dictionary = map_data.get("base", {})
	if not base.is_empty() and p.distance_to(_vec(base.get("pos", [0, 0]))) <= max(12.0, float(base.get("radius", 26))):
		return {"kind": "base", "index": 0}
	var path: Array = map_data.get("path", [])
	for i in range(path.size()):
		if p.distance_to(_vec(path[i])) <= 14.0:
			return {"kind": "path", "index": i}
	return {}


func _move_handle(p: Vector2) -> void:
	p = _snap(p)
	if selected_kind == "slot":
		_set_vec(map_data["slots"][selected_index], p)
	elif selected_kind == "path":
		_set_vec(map_data["path"][selected_index], p)
	elif selected_kind == "base":
		_set_vec(map_data["base"]["pos"], p)
	_update_status()
	update_overlays()


func _forward_canvas_gui_input(event: InputEvent) -> bool:
	if not overlay_enabled or map_data.is_empty():
		return false
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
		if event.pressed:
			var hit := _find_handle(_world_from_event(event))
			if hit.is_empty():
				selected_kind = ""
				selected_index = -1
				dragging = false
				_update_status()
				return false
			selected_kind = str(hit["kind"])
			selected_index = int(hit["index"])
			dragging = true
			_update_status()
			return true
		if dragging:
			dragging = false
			return true
	if event is InputEventMouseMotion and dragging:
		_move_handle(_world_from_event(event))
		return true
	return false


func _forward_canvas_draw_over_viewport(overlay: Control) -> void:
	if not overlay_enabled or map_data.is_empty():
		return
	var vt := get_editor_interface().get_editor_viewport_2d()
	if vt == null:
		return
	var xform: Transform2D = vt.get_canvas_transform()
	overlay.draw_set_transform(xform.origin, xform.get_rotation(), xform.get_scale())
	var path: Array = map_data.get("path", [])
	var slots: Array = map_data.get("slots", [])
	var base: Dictionary = map_data.get("base", {})
	var font: Font = ThemeDB.fallback_font

	for i in range(path.size() - 1):
		overlay.draw_line(_vec(path[i]), _vec(path[i + 1]), COLOR_PATH, 2.0)
	for i in range(path.size()):
		var p := _vec(path[i])
		overlay.draw_circle(p, 5.0, COLOR_PATH)
		if selected_kind == "path" and selected_index == i:
			overlay.draw_arc(p, 9.0, 0, TAU, 24, COLOR_SELECT, 3.0)
	for i in range(slots.size()):
		var p := _vec(slots[i])
		overlay.draw_rect(Rect2(p - Vector2(7, 7), Vector2(14, 14)), COLOR_SLOT, false, 2.0)
		if selected_kind == "slot" and selected_index == i:
			overlay.draw_arc(p, 12.0, 0, TAU, 24, COLOR_SELECT, 3.0)
	if not base.is_empty():
		var bp := _vec(base.get("pos", [0, 0]))
		overlay.draw_circle(bp, float(base.get("radius", 26)), COLOR_BASE, false, 2.0)
		if selected_kind == "base":
			overlay.draw_arc(bp, float(base.get("radius", 26)) + 5.0, 0, TAU, 32, COLOR_SELECT, 3.0)

	# 塔预览：选中塔位 + 当前塔类型时画射程
	if selected_kind == "slot" and selected_index >= 0 and tower_picker and tower_picker.item_count > 0:
		var tower: Dictionary = towers[tower_picker.selected] if tower_picker.selected < towers.size() else {}
		var tower_range := float(tower.get("range", 0.0))
		if tower_range > 0.0:
			var sp := _vec(slots[selected_index])
			overlay.draw_circle(sp, tower_range, Color("#3E6F6B", 0.18), true)
			overlay.draw_arc(sp, tower_range, 0, TAU, 64, Color("#3E6F6B", 0.8), 1.5)

	overlay.draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)
	overlay.draw_string(font, Vector2(18, 22), "LiveBay Tools · 拖路径点/塔位/基地 · 保存写回 numbers", HORIZONTAL_ALIGNMENT_LEFT, -1, 12, COLOR_TEXT)
