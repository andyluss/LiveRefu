# LiveBay · HUD 构建器（Presenter）
# 只创建/持有 UI 节点、连接回调；不读规则、不写模拟状态。
class_name LiveBayGameHud
extends RefCounted

const Consts = preload("res://scripts/shared/constants.gd")

var host: Node
var data: Dictionary
var theme: Theme
var palette: Dictionary
var callbacks: Dictionary
var root: Control

var energy_label: Label
var integrity_label: Label
var wave_label: Label
var state_label: Label
var best_label: Label
var hint_label: Label
var tower_buttons: Array = []
var start_button: Button
var upgrade_button: Button
var sell_button: Button
var pause_button: Button
var speed_button: Button
var map_button: Button
var archive_button: Button
var quit_button: Button

var overlay: Control
var overlay_title: Label
var overlay_body: Label
var overlay_close: Button
var report_buttons: HBoxContainer
var checklist_overlay: Control
var checklist_title: Label
var checklist_body: Label
var checklist_close: Button
var checklist_buttons: VBoxContainer
var broadcast_banner: PanelContainer
var broadcast_label: Label


func build(host_node: Node, game_data: Dictionary, ui_theme: Theme, palette_data: Dictionary, cb: Dictionary) -> void:
	host = host_node
	data = game_data
	theme = ui_theme
	palette = palette_data
	callbacks = cb
	var layer := CanvasLayer.new()
	host.add_child(layer)
	root = Control.new()
	root.set_anchors_preset(Control.PRESET_FULL_RECT)
	root.theme = theme
	root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	layer.add_child(root)
	_build_top()
	_build_banner()
	_build_bottom()
	_build_result_overlay()
	_build_checklist_overlay()
	refresh_tower_buttons("")


func _build_top() -> void:
	var top := Panel.new()
	top.position = Vector2.ZERO
	top.size = Vector2(Consts.VIEW_SIZE.x, Consts.TOP_BAR_H)
	top.add_theme_stylebox_override("panel", panel_style(palette.slate, palette.ink))
	root.add_child(top)

	var stats := HBoxContainer.new()
	stats.position = Vector2(18, 14)
	stats.size = Vector2(650, 32)
	stats.add_theme_constant_override("separation", 26)
	top.add_child(stats)

	energy_label = make_label("供能 0", 18, palette.amber)
	integrity_label = make_label("保障度 0/0", 18, palette.cream)
	wave_label = make_label("波次 待命", 18, palette.cream)
	state_label = make_label("准备", 18, palette.sage)
	best_label = make_label("最佳 —", 15, Color(palette.cream, 0.72))
	var widths := [130, 190, 190, 90, 170]
	var labels: Array = [energy_label, integrity_label, wave_label, state_label, best_label]
	for i: int in range(labels.size()):
		labels[i].custom_minimum_size = Vector2(widths[i], 30)
		stats.add_child(labels[i])

	map_button = make_top_button("地图 (G)", Vector2(670, 11))
	map_button.pressed.connect(callbacks["map"])
	top.add_child(map_button)
	archive_button = make_top_button("档案 (H)", Vector2(778, 11))
	archive_button.pressed.connect(callbacks["archive"])
	top.add_child(archive_button)
	pause_button = make_top_button("暂停 (P)", Vector2(882, 11))
	pause_button.pressed.connect(callbacks["pause"])
	top.add_child(pause_button)
	speed_button = make_top_button("速度 1x", Vector2(986, 11))
	speed_button.pressed.connect(callbacks["speed"])
	top.add_child(speed_button)
	quit_button = make_top_button("退出 (Q)", Vector2(1090, 11))
	quit_button.pressed.connect(callbacks["quit"])
	top.add_child(quit_button)


func _build_banner() -> void:
	broadcast_banner = PanelContainer.new()
	broadcast_banner.add_theme_stylebox_override("panel", panel_style(palette.slate, palette.amber, 6))
	broadcast_banner.position = Vector2(250, 66)
	broadcast_banner.size = Vector2(780, 38)
	broadcast_banner.visible = false
	broadcast_banner.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(broadcast_banner)
	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 14)
	margin.add_theme_constant_override("margin_right", 14)
	margin.add_theme_constant_override("margin_top", 8)
	margin.add_theme_constant_override("margin_bottom", 8)
	broadcast_banner.add_child(margin)
	broadcast_label = make_label("", 13, palette.cream)
	broadcast_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	margin.add_child(broadcast_label)


func _build_bottom() -> void:
	var bottom := Panel.new()
	bottom.position = Vector2(0, Consts.VIEW_SIZE.y - Consts.BOTTOM_BAR_H)
	bottom.size = Vector2(Consts.VIEW_SIZE.x, Consts.BOTTOM_BAR_H)
	bottom.add_theme_stylebox_override("panel", panel_style(palette.panel, palette.ink))
	root.add_child(bottom)

	var bar := HBoxContainer.new()
	bar.position = Vector2(16, 12)
	bar.size = Vector2(Consts.VIEW_SIZE.x - 32, 64)
	bar.add_theme_constant_override("separation", 10)
	bottom.add_child(bar)

	for i: int in range(Consts.TOWER_ORDER.size()):
		var id: String = Consts.TOWER_ORDER[i]
		var def: Dictionary = data.towers_by_id.get(id, {})
		var button := make_build_button(i, def)
		bar.add_child(button)
		tower_buttons.append(button)

	var spacer := Control.new()
	spacer.custom_minimum_size = Vector2(12, 64)
	bar.add_child(spacer)

	start_button = make_action_button("开波 (空格)", palette.orange)
	start_button.pressed.connect(callbacks["start_wave"])
	bar.add_child(start_button)
	upgrade_button = make_action_button("升级 (U)", palette.teal)
	upgrade_button.pressed.connect(callbacks["upgrade"])
	bar.add_child(upgrade_button)
	sell_button = make_action_button("出售 (X)", palette.rust)
	sell_button.pressed.connect(callbacks["sell"])
	bar.add_child(sell_button)

	var hint_bg := ColorRect.new()
	hint_bg.position = Vector2(12, Consts.VIEW_SIZE.y - Consts.BOTTOM_BAR_H - 34)
	hint_bg.size = Vector2(Consts.VIEW_SIZE.x - 24, 26)
	hint_bg.color = Color(palette.paper, 0.92)
	hint_bg.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(hint_bg)
	hint_label = make_label("", 14, palette.ink)
	hint_label.position = Vector2(18, Consts.VIEW_SIZE.y - Consts.BOTTOM_BAR_H - 31)
	hint_label.size = Vector2(Consts.VIEW_SIZE.x - 36, 20)
	root.add_child(hint_label)


func _build_result_overlay() -> void:
	overlay = Control.new()
	overlay.set_anchors_preset(Control.PRESET_FULL_RECT)
	overlay.visible = false
	root.add_child(overlay)
	var shade := ColorRect.new()
	shade.set_anchors_preset(Control.PRESET_FULL_RECT)
	shade.color = Color(0.09, 0.11, 0.12, 0.84)
	overlay.add_child(shade)
	var center := CenterContainer.new()
	center.set_anchors_preset(Control.PRESET_FULL_RECT)
	overlay.add_child(center)
	var card := PanelContainer.new()
	card.add_theme_stylebox_override("panel", panel_style(palette.paper, palette.ink, 10))
	card.custom_minimum_size = Vector2(460, 300)
	center.add_child(card)
	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 28)
	margin.add_theme_constant_override("margin_right", 28)
	margin.add_theme_constant_override("margin_top", 24)
	margin.add_theme_constant_override("margin_bottom", 24)
	card.add_child(margin)
	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation", 14)
	margin.add_child(box)
	var overlay_header := HBoxContainer.new()
	overlay_header.add_theme_constant_override("separation", 8)
	overlay_title = make_label("", 28, palette.ink)
	overlay_title.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
	overlay_title.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	overlay_header.add_child(overlay_title)
	overlay_close = Button.new()
	overlay_close.text = "×"
	overlay_close.tooltip_text = "关闭 (Esc)"
	overlay_close.custom_minimum_size = Vector2(34, 34)
	style_button(overlay_close, palette.paper, palette.slate, 18)
	overlay_close.pressed.connect(callbacks["close_modal"])
	overlay_header.add_child(overlay_close)
	box.add_child(overlay_header)
	overlay_body = make_label("", 16, palette.slate)
	overlay_body.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	overlay_body.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	overlay_body.custom_minimum_size = Vector2(400, 120)
	box.add_child(overlay_body)
	report_buttons = HBoxContainer.new()
	report_buttons.add_theme_constant_override("separation", 8)
	box.add_child(report_buttons)
	var again := Button.new()
	again.text = "再来一班 (R)"
	again.custom_minimum_size = Vector2(200, 46)
	style_button(again, palette.orange, palette.cream)
	again.pressed.connect(callbacks["restart"])
	var again_center := CenterContainer.new()
	again_center.add_child(again)
	box.add_child(again_center)


func _build_checklist_overlay() -> void:
	checklist_overlay = Control.new()
	checklist_overlay.set_anchors_preset(Control.PRESET_FULL_RECT)
	checklist_overlay.visible = false
	root.add_child(checklist_overlay)
	var shade := ColorRect.new()
	shade.set_anchors_preset(Control.PRESET_FULL_RECT)
	shade.color = Color(0.09, 0.11, 0.12, 0.72)
	checklist_overlay.add_child(shade)
	var center := CenterContainer.new()
	center.set_anchors_preset(Control.PRESET_FULL_RECT)
	checklist_overlay.add_child(center)
	var card := PanelContainer.new()
	card.add_theme_stylebox_override("panel", panel_style(palette.paper, palette.ink, 10))
	card.custom_minimum_size = Vector2(520, 300)
	center.add_child(card)
	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 26)
	margin.add_theme_constant_override("margin_right", 26)
	margin.add_theme_constant_override("margin_top", 22)
	margin.add_theme_constant_override("margin_bottom", 22)
	card.add_child(margin)
	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation", 12)
	margin.add_child(box)
	var checklist_header := HBoxContainer.new()
	checklist_header.add_theme_constant_override("separation", 8)
	checklist_title = make_label("", 22, palette.ink)
	checklist_title.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	checklist_header.add_child(checklist_title)
	checklist_close = Button.new()
	checklist_close.text = "×"
	checklist_close.tooltip_text = "关闭 (Esc)"
	checklist_close.custom_minimum_size = Vector2(34, 34)
	set_checklist_close_visible(false)
	style_button(checklist_close, palette.paper, palette.slate, 18)
	checklist_close.pressed.connect(callbacks["close_modal"])
	checklist_header.add_child(checklist_close)
	box.add_child(checklist_header)
	checklist_body = make_label("", 15, palette.slate)
	checklist_body.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	box.add_child(checklist_body)
	checklist_buttons = VBoxContainer.new()
	box.add_child(checklist_buttons)


func make_label(text: String, size: int, color: Color) -> Label:
	var label := Label.new()
	label.text = text
	label.add_theme_font_size_override("font_size", size)
	label.add_theme_color_override("font_color", color)
	return label


func make_top_button(text: String, pos: Vector2) -> Button:
	var button := Button.new()
	button.text = text
	button.position = pos
	button.size = Vector2(100, 34)
	style_button(button, palette.teal, palette.cream, 15)
	return button


func make_build_button(index: int, def: Dictionary) -> Button:
	var button := Button.new()
	button.custom_minimum_size = Vector2(150, 64)
	button.alignment = HORIZONTAL_ALIGNMENT_LEFT
	button.text = "%d  %s\n    %d 供能 · %s" % [
		index + 1,
		String(def.get("name", "?")),
		int(def.get("cost", 0)),
		tower_kind_label(String(def.get("kind", ""))),
	]
	button.add_theme_font_size_override("font_size", 14)
	button.set_meta("base_text", button.text)
	style_button(button, palette.cream, palette.slate, 15)
	button.pressed.connect(callbacks["select_tower"].bind(index))
	return button


func make_action_button(text: String, accent: Color) -> Button:
	var button := Button.new()
	button.text = text
	button.custom_minimum_size = Vector2(126, 64)
	style_button(button, accent, palette.cream, 15)
	return button


func style_button(button: Button, bg: Color, fg: Color, font_size: int = 15) -> void:
	var normal := panel_style(bg, palette.ink, 6)
	var hover := panel_style(bg.lightened(0.08), palette.orange, 6)
	var pressed := panel_style(bg.darkened(0.12), palette.ink, 6)
	var disabled := panel_style(Color(palette.panel, 0.55), Color(palette.slate, 0.35), 6)
	button.add_theme_stylebox_override("normal", normal)
	button.add_theme_stylebox_override("hover", hover)
	button.add_theme_stylebox_override("pressed", pressed)
	button.add_theme_stylebox_override("disabled", disabled)
	button.add_theme_stylebox_override("focus", hover)
	button.add_theme_color_override("font_color", fg)
	button.add_theme_color_override("font_hover_color", fg)
	button.add_theme_color_override("font_pressed_color", fg)
	button.add_theme_color_override("font_disabled_color", Color(palette.slate, 0.45))
	button.add_theme_font_size_override("font_size", font_size)


func panel_style(bg: Color, border: Color, radius: int = 0) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = bg
	style.border_color = border
	style.set_border_width_all(1 if radius == 0 else 2)
	style.set_corner_radius_all(radius)
	style.content_margin_left = 10
	style.content_margin_right = 10
	style.content_margin_top = 6
	style.content_margin_bottom = 6
	return style


func tower_kind_label(kind: String) -> String:
	match kind:
		"single": return "单体"
		"aoe": return "范围"
		"supply": return "经济"
	return kind


func set_checklist_close_visible(value: bool) -> void:
	if checklist_close != null:
		checklist_close.visible = value


func refresh_tower_buttons(selected_id: String) -> void:
	for i: int in range(tower_buttons.size()):
		var selected: bool = Consts.TOWER_ORDER[i] == selected_id
		var base := str(tower_buttons[i].get_meta("base_text", tower_buttons[i].text))
		tower_buttons[i].text = ("▶ " if selected else "") + base
		tower_buttons[i].modulate = Color(1, 1, 1, 1) if selected else Color(1, 1, 1, 0.82)
		style_button(tower_buttons[i], palette.orange if selected else palette.cream, palette.cream if selected else palette.slate, 15)
