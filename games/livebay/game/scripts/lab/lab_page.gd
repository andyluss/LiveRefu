# LiveBay · 自由模式页面（独立页面）
extends Control

const LabLoaderScript = preload("res://scripts/lab/lab_loader.gd")
const PageUi = preload("res://scripts/presentation/page_ui.gd")

var app: Node
var scenarios: Array = []
var axis_filter := "all"
var difficulty_filter := "all"
var list_box: VBoxContainer
var status_label: Label
var import_dialog: FileDialog


func setup(app_node: Node) -> void:
	app = app_node
	scenarios = LabLoaderScript.load_all()
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	mouse_filter = Control.MOUSE_FILTER_STOP
	theme = PageUi.make_theme()
	add_child(PageUi.make_background())
	var wrap := VBoxContainer.new()
	wrap.set_anchors_preset(Control.PRESET_FULL_RECT)
	wrap.offset_left = 60
	wrap.offset_right = -60
	wrap.offset_top = 34
	wrap.offset_bottom = -34
	wrap.add_theme_constant_override("separation", 10)
	add_child(wrap)

	var top := HBoxContainer.new()
	top.add_theme_constant_override("separation", 10)
	var back := Button.new()
	back.text = "← 主页"
	back.custom_minimum_size = Vector2(100, 34)
	PageUi.style_button(back, Color("#2F6B65"), Color("#F5EFE2"))
	back.pressed.connect(func() -> void: app.open_home())
	top.add_child(back)
	var title := Label.new()
	title.text = "自由模式 · 外环试验场"
	title.add_theme_font_size_override("font_size", 26)
	title.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	top.add_child(title)
	wrap.add_child(top)

	var filters := HBoxContainer.new()
	filters.add_theme_constant_override("separation", 4)
	for pair in [["all", "全部主轴"], ["tower_defense", "塔防"], ["idle", "放置"], ["hybrid", "混合"], ["toy", "玩具"]]:
		var b := Button.new()
		b.text = str(pair[1])
		b.custom_minimum_size = Vector2(86, 30)
		PageUi.style_button(b, Color("#2F6B65") if axis_filter == str(pair[0]) else Color("#223136"), Color("#F5EFE2"))
		b.pressed.connect(_set_axis.bind(str(pair[0])))
		filters.add_child(b)
	wrap.add_child(filters)
	var diffs := HBoxContainer.new()
	diffs.add_theme_constant_override("separation", 4)
	for pair in [["all", "全部难度"], ["easy", "容易"], ["normal", "标准"], ["hard", "困难"], ["extreme", "超难"], ["experimental", "实验"]]:
		var b := Button.new()
		b.text = str(pair[1])
		b.custom_minimum_size = Vector2(82, 28)
		PageUi.style_button(b, Color("#2F6B65") if difficulty_filter == str(pair[0]) else Color("#223136"), Color("#F5EFE2"))
		b.pressed.connect(_set_difficulty.bind(str(pair[0])))
		diffs.add_child(b)
	wrap.add_child(diffs)

	var scroll := ScrollContainer.new()
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	wrap.add_child(scroll)
	list_box = VBoxContainer.new()
	list_box.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	list_box.add_theme_constant_override("separation", 6)
	scroll.add_child(list_box)

	var footer := HBoxContainer.new()
	footer.add_theme_constant_override("separation", 6)
	var import_btn := Button.new()
	import_btn.text = "导入实验"
	import_btn.custom_minimum_size = Vector2(120, 34)
	PageUi.style_button(import_btn, Color("#2F6B65"), Color("#F5EFE2"))
	import_btn.pressed.connect(_open_import)
	footer.add_child(import_btn)
	status_label = Label.new()
	status_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	status_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	status_label.add_theme_color_override("font_color", Color("#B8C1BC"))
	status_label.text = "实验不写主线存档；候选/导出写入 user://lab/"
	footer.add_child(status_label)
	wrap.add_child(footer)
	_render()


func _set_axis(value: String) -> void:
	axis_filter = value
	_render()


func _set_difficulty(value: String) -> void:
	difficulty_filter = value
	_render()


func _render() -> void:
	for c in list_box.get_children():
		c.queue_free()
	var shown := 0
	for s: Variant in scenarios:
		var tags: Dictionary = s.get("tags", {})
		var axes: Array = tags.get("axis", [])
		var diffs: Array = tags.get("difficulty", [])
		if axis_filter != "all" and axis_filter not in axes:
			continue
		if difficulty_filter != "all" and difficulty_filter not in diffs:
			continue
		shown += 1
		var row := HBoxContainer.new()
		row.add_theme_constant_override("separation", 4)
		var name := Button.new()
		name.text = "%s\n%s · %s\n%s" % [str(s.get("name", "?")), ", ".join(axes), ", ".join(diffs), str(s.get("description", ""))]
		name.custom_minimum_size = Vector2(580, 62)
		name.alignment = HORIZONTAL_ALIGNMENT_LEFT
		PageUi.style_button(name, Color("#182326"), Color("#E9E3D5"))
		name.pressed.connect(func() -> void: app.open_game(s))
		row.add_child(name)
		var candidate := Button.new()
		candidate.text = "候选"
		candidate.custom_minimum_size = Vector2(74, 62)
		PageUi.style_button(candidate, Color("#B47A16"), Color("#F5EFE2"))
		candidate.pressed.connect(func() -> void: _export_candidate(s))
		row.add_child(candidate)
		var export_btn := Button.new()
		export_btn.text = "导出"
		export_btn.custom_minimum_size = Vector2(64, 62)
		PageUi.style_button(export_btn, Color("#3D4D4D"), Color("#F5EFE2"))
		export_btn.pressed.connect(func() -> void: _export_scenario(s))
		row.add_child(export_btn)
		list_box.add_child(row)
	if shown == 0:
		var empty := Label.new()
		empty.text = "没有符合筛选的实验。"
		list_box.add_child(empty)


func _export_candidate(scenario: Dictionary) -> void:
	var path := LabLoaderScript.export_candidate(scenario)
	status_label.text = "候选已写入：%s" % path if not path.is_empty() else "候选导出失败"


func _export_scenario(scenario: Dictionary) -> void:
	var path := LabLoaderScript.export_scenario(scenario)
	status_label.text = "实验已导出：%s" % path if not path.is_empty() else "实验导出失败"


func _open_import() -> void:
	if import_dialog == null:
		import_dialog = FileDialog.new()
		import_dialog.file_mode = FileDialog.FILE_MODE_OPEN_FILE
		import_dialog.access = FileDialog.ACCESS_FILESYSTEM
		import_dialog.filters = PackedStringArray(["*.json ; 自由模式实验"])
		import_dialog.file_selected.connect(_import)
		add_child(import_dialog)
	import_dialog.popup_centered_ratio(0.7)


func _import(path: String) -> void:
	var scenario := LabLoaderScript.import_scenario(path)
	if scenario.is_empty():
		status_label.text = "导入失败：不是有效实验 JSON"
		return
	var id := str(scenario.get("id", ""))
	for i in range(scenarios.size()):
		if str(scenarios[i].get("id", "")) == id:
			scenarios[i] = scenario
			_render()
			status_label.text = "已更新：%s" % id
			return
	scenarios.append(scenario)
	_render()
	status_label.text = "已导入：%s" % id


func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and not event.echo:
		if event.keycode == KEY_F1 or event.keycode == KEY_ESCAPE:
			app.open_home()
