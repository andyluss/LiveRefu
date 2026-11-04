@tool
extends EditorPlugin

# LiveBay Tools · 编辑器插件 MVP
# 规则：TECH-A1（单一数据源）、TECH-B1（可逆工程）、DES-C1（数值与场景引用）
#
# 在 2D 视口叠加路径/塔位/基地；拖动后保存到 numbers/05，再由 bridge.py 导出。
# 数据真正来源仍是 numbers/，插件不是第二套数据源。

const BridgeClient = preload("res://addons/livebay_tools/bridge_client.gd")
const WaveTimeline = preload("res://addons/livebay_tools/wave_timeline.gd")
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
var save_button: Button
var map_data: Dictionary = {}
var wave_data: Array = []
var enemies: Array = []
var wave_timeline: Control
var wave_stats: Label
var prep_spin: SpinBox
var enemy_picker: OptionButton
var count_spin: SpinBox
var interval_spin: SpinBox
var delay_spin: SpinBox
var selected_wave := -1
var selected_group := -1
var undo_stack: Array = []
var redo_stack: Array = []
var last_mouse_world := Vector2.ZERO
var dirty := false
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
	save_button = Button.new()
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

	var edit_row := HBoxContainer.new()
	dock.add_child(edit_row)
	var undo_button := Button.new()
	undo_button.text = "撤销"
	undo_button.tooltip_text = "Cmd/Ctrl+Z"
	undo_button.pressed.connect(_undo)
	edit_row.add_child(undo_button)
	var redo_button := Button.new()
	redo_button.text = "重做"
	redo_button.tooltip_text = "Cmd/Ctrl+Shift+Z"
	redo_button.pressed.connect(_redo)
	edit_row.add_child(redo_button)
	var del_button := Button.new()
	del_button.text = "删除选中"
	del_button.tooltip_text = "Delete"
	del_button.pressed.connect(_delete_selected)
	edit_row.add_child(del_button)

	var add_row := HBoxContainer.new()
	dock.add_child(add_row)
	var add_path_button := Button.new()
	add_path_button.text = "插入路径点"
	add_path_button.pressed.connect(_insert_path_point)
	add_row.add_child(add_path_button)
	var add_slot_button := Button.new()
	add_slot_button.text = "插入塔位"
	add_slot_button.pressed.connect(_insert_slot)
	add_row.add_child(add_slot_button)

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

	var wave_title := Label.new()
	wave_title.text = "波次时间轴"
	wave_title.add_theme_font_size_override("font_size", 14)
	dock.add_child(wave_title)

	wave_timeline = WaveTimeline.new()
	wave_timeline.custom_minimum_size = Vector2(260, 190)
	wave_timeline.group_selected.connect(_on_wave_group_selected)
	dock.add_child(wave_timeline)

	wave_stats = Label.new()
	wave_stats.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	wave_stats.custom_minimum_size = Vector2(250, 0)
	dock.add_child(wave_stats)

	var wave_grid := GridContainer.new()
	wave_grid.columns = 2
	dock.add_child(wave_grid)
	_add_spin_row(wave_grid, "准备 prep", "prep_spin")
	enemy_picker = OptionButton.new()
	wave_grid.add_child(_label("敌人"))
	wave_grid.add_child(enemy_picker)
	_add_spin_row(wave_grid, "数量", "count_spin")
	_add_spin_row(wave_grid, "间隔 s", "interval_spin")
	_add_spin_row(wave_grid, "延迟 s", "delay_spin")

	var wave_actions := HBoxContainer.new()
	dock.add_child(wave_actions)
	var apply_button := Button.new()
	apply_button.text = "应用"
	apply_button.pressed.connect(_apply_wave_values)
	wave_actions.add_child(apply_button)
	var add_group_button := Button.new()
	add_group_button.text = "加组"
	add_group_button.pressed.connect(_add_group)
	wave_actions.add_child(add_group_button)
	var del_group_button := Button.new()
	del_group_button.text = "删组"
	del_group_button.pressed.connect(_remove_group)
	wave_actions.add_child(del_group_button)

	var wave_actions2 := HBoxContainer.new()
	dock.add_child(wave_actions2)
	var add_wave_button := Button.new()
	add_wave_button.text = "加波"
	add_wave_button.pressed.connect(_add_wave)
	wave_actions2.add_child(add_wave_button)
	var del_wave_button := Button.new()
	del_wave_button.text = "删波"
	del_wave_button.pressed.connect(_remove_wave)
	wave_actions2.add_child(del_wave_button)

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
	wave_data = result.get("waves", [])
	enemies = result.get("enemies", [])
	undo_stack.clear()
	redo_stack.clear()
	dirty = false
	if save_button:
		save_button.text = "保存"
	selected_kind = ""
	selected_index = -1
	selected_wave = 0 if not wave_data.is_empty() else -1
	selected_group = 0 if selected_wave >= 0 and not wave_data[0].get("groups", []).is_empty() else -1
	_refresh_tower_picker()
	_refresh_enemy_picker()
	_refresh_wave_ui()
	_update_status()
	if announce:
		_set_status("已从 numbers/ 重载。")
	update_overlays()


func _refresh_tower_picker() -> void:
	tower_picker.clear()
	for t in towers:
		tower_picker.add_item("%s · %d" % [str(t.get("name", t.get("id", "?"))), int(t.get("cost", 0))])
	if tower_picker.item_count > 0:
		tower_picker.select(0)


func _save() -> void:
	var result: Dictionary = bridge.write_map(map_data, wave_data)
	if not bool(result.get("ok", false)):
		_set_status("保存失败：" + str(result.get("error", "未知错误")), true)
		return
	dirty = false
	if save_button:
		save_button.text = "保存"
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


func _snapshot() -> Dictionary:
	return {"map": map_data.duplicate(true), "waves": wave_data.duplicate(true)}


func _restore_snapshot(snapshot: Dictionary) -> void:
	map_data = snapshot.get("map", {}).duplicate(true)
	wave_data = snapshot.get("waves", []).duplicate(true)


func _label(text: String) -> Label:
	var label := Label.new()
	label.text = text
	return label


func _add_spin_row(grid: GridContainer, text: String, field: String) -> void:
	grid.add_child(_label(text))
	var spin := SpinBox.new()
	spin.step = 0.1 if field in ["interval_spin", "delay_spin"] else 1.0
	spin.min_value = 0.0 if field == "prep_spin" or field == "delay_spin" else (1.0 if field == "count_spin" else 0.1)
	spin.max_value = 120.0 if field == "prep_spin" else (100.0 if field == "count_spin" else 60.0)
	spin.allow_greater = true
	grid.add_child(spin)
	if field == "prep_spin":
		prep_spin = spin
	elif field == "count_spin":
		count_spin = spin
	elif field == "interval_spin":
		interval_spin = spin
	elif field == "delay_spin":
		delay_spin = spin


func _enemy_by_id(id: String) -> Dictionary:
	for e in enemies:
		if str(e.get("id", "")) == id:
			return e
	return {}


func _refresh_enemy_picker() -> void:
	if enemy_picker == null:
		return
	enemy_picker.clear()
	for e in enemies:
		enemy_picker.add_item(str(e.get("name", e.get("id", "?"))))
	var g := _current_group()
	if not g.is_empty():
		for i in range(enemies.size()):
			if str(enemies[i].get("id", "")) == str(g.get("enemy", "")):
				enemy_picker.select(i)
				break


func _current_wave() -> Dictionary:
	if selected_wave >= 0 and selected_wave < wave_data.size():
		return wave_data[selected_wave]
	return {}


func _current_group() -> Dictionary:
	var wave := _current_wave()
	if wave.is_empty():
		return {}
	var groups: Array = wave.get("groups", [])
	if selected_group >= 0 and selected_group < groups.size():
		return groups[selected_group]
	return {}


func _wave_summary() -> void:
	if wave_stats == null:
		return
	var wave := _current_wave()
	if wave.is_empty():
		wave_stats.text = "没有选中的波次。"
		return
	var total_hp := 0
	var reward := 0
	var leak := 0
	var groups: Array = wave.get("groups", [])
	for g in groups:
		var e := _enemy_by_id(str(g.get("enemy", "")))
		var n := int(g.get("count", 0))
		total_hp += int(e.get("hp", 0)) * n
		reward += int(e.get("reward", 0)) * n
		leak += int(e.get("leak_damage", 0)) * n
	wave_stats.text = "W%d · %d 组 · HP %d · 奖励 %d · 全漏 %d" % [int(wave.get("index", 0)), groups.size(), total_hp, reward, leak]


func _refresh_wave_ui() -> void:
	if wave_timeline == null:
		return
	wave_timeline.set_data(wave_data, enemies, selected_wave, selected_group)
	_wave_summary()
	var wave := _current_wave()
	var group := _current_group()
	if wave.is_empty() or group.is_empty():
		return
	prep_spin.set_value_no_signal(float(wave.get("prep", 20.0)))
	count_spin.set_value_no_signal(float(group.get("count", 1)))
	interval_spin.set_value_no_signal(float(group.get("interval", 1.0)))
	delay_spin.set_value_no_signal(float(group.get("delay", 0.0)))
	for i in range(enemies.size()):
		if str(enemies[i].get("id", "")) == str(group.get("enemy", "")):
			enemy_picker.select(i)
			break


func _on_wave_group_selected(wave_index: int, group_index: int) -> void:
	selected_wave = wave_index
	selected_group = group_index
	_refresh_wave_ui()


func _apply_wave_values() -> void:
	var wave := _current_wave()
	var group := _current_group()
	if wave.is_empty() or group.is_empty():
		_set_status("先选一个波次组。", true)
		return
	_begin_edit()
	wave["prep"] = max(0.0, prep_spin.value)
	group["count"] = max(1, int(count_spin.value))
	group["interval"] = max(0.1, interval_spin.value)
	group["delay"] = max(0.0, delay_spin.value)
	if enemy_picker.selected >= 0 and enemy_picker.selected < enemies.size():
		group["enemy"] = str(enemies[enemy_picker.selected].get("id", "debris"))
	_set_status("波次已修改；保存后生效。")
	_refresh_wave_ui()


func _add_group() -> void:
	var wave := _current_wave()
	if wave.is_empty():
		_set_status("先选一个波次。", true)
		return
	_begin_edit()
	var groups: Array = wave.get("groups", [])
	groups.append({"enemy": "debris", "count": 1, "interval": 1.0, "delay": 0.0})
	selected_group = groups.size() - 1
	_set_status("已加一组；保存后生效。")
	_refresh_wave_ui()


func _remove_group() -> void:
	var wave := _current_wave()
	if wave.is_empty() or selected_group < 0:
		return
	var groups: Array = wave.get("groups", [])
	if groups.size() <= 1:
		_set_status("每波至少保留 1 组。", true)
		return
	_begin_edit()
	groups.remove_at(selected_group)
	selected_group = clampi(selected_group - 1, 0, groups.size() - 1)
	_set_status("已删一组；保存后生效。")
	_refresh_wave_ui()


func _reindex_waves() -> void:
	for i in range(wave_data.size()):
		wave_data[i]["index"] = i + 1


func _add_wave() -> void:
	if wave_data.is_empty():
		return
	_begin_edit()
	wave_data.append({"index": wave_data.size() + 1, "prep": 20.0, "groups": [{"enemy": "debris", "count": 1, "interval": 1.0, "delay": 0.0}]})
	selected_wave = wave_data.size() - 1
	selected_group = 0
	_reindex_waves()
	_set_status("已加一波；保存后生效。")
	_refresh_wave_ui()


func _remove_wave() -> void:
	if wave_data.size() <= 1:
		_set_status("至少保留 1 波。", true)
		return
	if selected_wave < 0:
		return
	_begin_edit()
	wave_data.remove_at(selected_wave)
	_reindex_waves()
	selected_wave = clampi(selected_wave - 1, 0, wave_data.size() - 1)
	selected_group = 0
	_set_status("已删一波；保存后生效。")
	_refresh_wave_ui()


func _begin_edit() -> void:
	undo_stack.append(_snapshot())
	if undo_stack.size() > 40:
		undo_stack.pop_front()
	redo_stack.clear()
	dirty = true
	if save_button:
		save_button.text = "保存 *"


func _undo() -> void:
	if undo_stack.is_empty():
		_set_status("没有可撤销的操作。", true)
		return
	redo_stack.append(_snapshot())
	_restore_snapshot(undo_stack.pop_back())
	_clamp_selection()
	dirty = true
	if save_button:
		save_button.text = "保存 *"
	_set_status("已撤销。")
	_update_status()


func _redo() -> void:
	if redo_stack.is_empty():
		_set_status("没有可重做的操作。", true)
		return
	undo_stack.append(_snapshot())
	_restore_snapshot(redo_stack.pop_back())
	_clamp_selection()
	dirty = true
	if save_button:
		save_button.text = "保存 *"
	_set_status("已重做。")
	_update_status()


func _clamp_selection() -> void:
	if selected_kind == "path":
		var path: Array = map_data.get("path", [])
		if path.is_empty():
			selected_kind = ""
			selected_index = -1
		else:
			selected_index = clampi(selected_index, 0, path.size() - 1)
	elif selected_kind == "slot":
		var slots: Array = map_data.get("slots", [])
		if slots.is_empty():
			selected_kind = ""
			selected_index = -1
		else:
			selected_index = clampi(selected_index, 0, slots.size() - 1)
	elif selected_kind == "base":
		selected_index = 0
	if selected_wave >= wave_data.size():
		selected_wave = wave_data.size() - 1
	if selected_wave >= 0 and selected_wave < wave_data.size():
		var groups: Array = wave_data[selected_wave].get("groups", [])
		selected_group = clampi(selected_group, 0, max(0, groups.size() - 1))


func _insert_path_point() -> void:
	if map_data.is_empty():
		return
	var path: Array = map_data.get("path", [])
	if path.is_empty():
		return
	_begin_edit()
	var idx: int = selected_index + 1 if selected_kind == "path" else path.size()
	var p := _snap(last_mouse_world)
	if p == Vector2.ZERO:
		var last := _vec(path[path.size() - 1])
		p = last + Vector2(80, 0)
	path.insert(idx, [int(p.x), int(p.y)])
	selected_kind = "path"
	selected_index = idx
	_set_status("已插入路径点；保存后生效。")
	_update_status()


func _insert_slot() -> void:
	if map_data.is_empty():
		return
	var slots: Array = map_data.get("slots", [])
	_begin_edit()
	var idx: int = selected_index + 1 if selected_kind == "slot" else slots.size()
	var p := _snap(last_mouse_world)
	if p == Vector2.ZERO:
		p = Vector2(640, 400)
	slots.insert(idx, [int(p.x), int(p.y)])
	selected_kind = "slot"
	selected_index = idx
	_set_status("已插入塔位；保存后生效。")
	_update_status()


func _delete_selected() -> void:
	if map_data.is_empty():
		return
	if selected_kind == "path":
		var path: Array = map_data.get("path", [])
		if path.size() <= 2:
			_set_status("路径至少保留 2 个点。", true)
			return
		_begin_edit()
		path.remove_at(selected_index)
		selected_index = clampi(selected_index - 1, 0, path.size() - 1)
	elif selected_kind == "slot":
		var slots: Array = map_data.get("slots", [])
		if slots.size() <= 1:
			_set_status("至少保留 1 个塔位。", true)
			return
		_begin_edit()
		slots.remove_at(selected_index)
		selected_index = clampi(selected_index - 1, 0, slots.size() - 1)
	elif selected_kind == "base":
		_set_status("基地不能删除；可直接拖动。", true)
		return
	else:
		_set_status("先选中路径点或塔位。", true)
		return
	_set_status("已删除；保存后生效。")
	_update_status()


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
	if event is InputEventKey and event.pressed and not event.echo:
		var mod: bool = event.ctrl_pressed or event.meta_pressed
		if event.keycode == KEY_DELETE or event.keycode == KEY_BACKSPACE:
			_delete_selected()
			return true
		if mod and event.keycode == KEY_Z:
			if event.shift_pressed:
				_redo()
			else:
				_undo()
			return true
		if mod and event.keycode == KEY_Y:
			_redo()
			return true
	if event is InputEventMouseMotion:
		last_mouse_world = _world_from_event(event)
		if dragging:
			_move_handle(last_mouse_world)
			return true
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
			_begin_edit()
			dragging = true
			_update_status()
			return true
		if dragging:
			dragging = false
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
