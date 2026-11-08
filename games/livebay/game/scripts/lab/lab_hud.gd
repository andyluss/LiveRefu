# LiveBay · 自由模式 HUD
# 只属于 lab/，不复用主模式 HUD；复用字体/色板/读模型。
class_name LiveBayLabHud
extends RefCounted

const Consts = preload("res://scripts/shared/constants.gd")
const PageUi = preload("res://scripts/presentation/page_ui.gd")
const ReadModelScript = preload("res://scripts/application/mission_read_model.gd")
const PresenterScript = preload("res://scripts/presentation/mission_presenter.gd")

var host: Node
var layer: CanvasLayer
var root: Control
var title_label: Label
var energy_label: Label
var integrity_label: Label
var wave_label: Label
var state_label: Label
var start_button: Button
var speed_button: Button
var tower_buttons: Dictionary = {}
var overlay: Control
var overlay_title: Label
var overlay_body: Label


func build(host_node: Node, data: Dictionary, callbacks: Dictionary) -> void:
	host = host_node
	layer = CanvasLayer.new()
	layer.layer = 5
	host.add_child(layer)
	root = Control.new()
	root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	root.theme = PageUi.make_theme()
	root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	layer.add_child(root)

	var top := Panel.new()
	top.position = Vector2.ZERO
	top.size = Vector2(Consts.VIEW_SIZE.x, 58)
	top.add_theme_stylebox_override("panel", PageUi.panel_style(Color("#182326"), Color("#3D4D4D"), 0))
	root.add_child(top)
	var row := HBoxContainer.new()
	row.position = Vector2(16, 12)
	row.size = Vector2(Consts.VIEW_SIZE.x - 32, 34)
	row.add_theme_constant_override("separation", 18)
	top.add_child(row)
	title_label = make_label("实验", 16, Consts.PALETTE.cream)
	title_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_child(title_label)
	energy_label = make_label("供能 0", 15, Consts.PALETTE.amber)
	row.add_child(energy_label)
	integrity_label = make_label("保障度 0/0", 15, Consts.PALETTE.cream)
	row.add_child(integrity_label)
	wave_label = make_label("首波倒计时 0s", 15, Consts.PALETTE.cream)
	row.add_child(wave_label)
	state_label = make_label("准备", 15, Consts.PALETTE.sage)
	row.add_child(state_label)

	var bottom := Panel.new()
	bottom.position = Vector2(0, Consts.VIEW_SIZE.y - 82)
	bottom.size = Vector2(Consts.VIEW_SIZE.x, 82)
	bottom.add_theme_stylebox_override("panel", PageUi.panel_style(Color("#182326"), Color("#3D4D4D"), 0))
	root.add_child(bottom)
	var bar := HBoxContainer.new()
	bar.position = Vector2(10, 10)
	bar.size = Vector2(Consts.VIEW_SIZE.x - 20, 62)
	bar.add_theme_constant_override("separation", 6)
	bottom.add_child(bar)

	var disabled: Array = data.get("tower_disabled", [])
	for t: Variant in data.get("towers", []):
		var id := str(t.get("id", ""))
		if id in disabled:
			continue
		var b := Button.new()
		b.text = "%s\n%d" % [str(t.get("name", id)), int(t.get("cost", 0))]
		b.custom_minimum_size = Vector2(122, 58)
		b.add_theme_font_size_override("font_size", 12)
		PageUi.style_button(b, Consts.PALETTE.cream, Consts.PALETTE.slate)
		b.pressed.connect(callbacks["select_tower"].bind(id))
		bar.add_child(b)
		tower_buttons[id] = b

	var spacer := Control.new()
	spacer.custom_minimum_size = Vector2(8, 58)
	bar.add_child(spacer)
	start_button = Button.new()
	start_button.text = "开波 (空格)"
	start_button.custom_minimum_size = Vector2(112, 58)
	PageUi.style_button(start_button, Consts.PALETTE.orange, Consts.PALETTE.cream)
	start_button.pressed.connect(callbacks["start_wave"])
	bar.add_child(start_button)
	speed_button = Button.new()
	speed_button.text = "速度 1x"
	speed_button.custom_minimum_size = Vector2(92, 58)
	PageUi.style_button(speed_button, Consts.PALETTE.teal, Consts.PALETTE.cream)
	speed_button.pressed.connect(callbacks["speed"])
	bar.add_child(speed_button)
	var back := Button.new()
	back.text = "返回实验页"
	back.custom_minimum_size = Vector2(112, 58)
	PageUi.style_button(back, Consts.PALETTE.slate, Consts.PALETTE.cream)
	back.pressed.connect(callbacks["back"])
	bar.add_child(back)

	overlay = Control.new()
	overlay.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	overlay.visible = false
	root.add_child(overlay)
	var shade := ColorRect.new()
	shade.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	shade.color = Color(0.04, 0.07, 0.08, 0.82)
	overlay.add_child(shade)
	var center := CenterContainer.new()
	center.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	overlay.add_child(center)
	var card := PanelContainer.new()
	card.add_theme_stylebox_override("panel", PageUi.panel_style(Consts.PALETTE.paper, Consts.PALETTE.ink, 12))
	card.custom_minimum_size = Vector2(460, 260)
	center.add_child(card)
	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 28)
	margin.add_theme_constant_override("margin_right", 28)
	margin.add_theme_constant_override("margin_top", 24)
	margin.add_theme_constant_override("margin_bottom", 24)
	card.add_child(margin)
	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation", 12)
	margin.add_child(box)
	overlay_title = make_label("", 28, Consts.PALETTE.ink)
	box.add_child(overlay_title)
	overlay_body = make_label("", 15, Consts.PALETTE.slate)
	overlay_body.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	box.add_child(overlay_body)
	var buttons := HBoxContainer.new()
	buttons.add_theme_constant_override("separation", 8)
	box.add_child(buttons)
	var retry := Button.new()
	retry.text = "再来一次"
	retry.custom_minimum_size = Vector2(130, 38)
	PageUi.style_button(retry, Consts.PALETTE.orange, Consts.PALETTE.cream)
	retry.pressed.connect(callbacks["retry"])
	buttons.add_child(retry)
	var back2 := Button.new()
	back2.text = "返回实验页"
	back2.custom_minimum_size = Vector2(130, 38)
	PageUi.style_button(back2, Consts.PALETTE.teal, Consts.PALETTE.cream)
	back2.pressed.connect(callbacks["back"])
	buttons.add_child(back2)

	update()


func update() -> void:
	if host.sim == null:
		return
	var view: LiveBayMissionReadModel = ReadModelScript.from_sim(host.sim, host.runtime.clock)
	var info: Dictionary = PresenterScript.hud(view)
	title_label.text = "自由模式 · %s" % str(host.data.get("lab_meta", {}).get("name", "实验"))
	energy_label.text = info.energy_text
	integrity_label.text = info.integrity_text
	wave_label.text = info.wave_text
	state_label.text = info.state_text + (" %ds" % int(ceil(view.timer)) if host.sim.state in [0, 2] else "")
	start_button.disabled = host.sim.state not in [0, 2]
	start_button.text = "开波 (空格)" if host.sim.wave_index < 0 else "下一波 (空格)"
	speed_button.text = info.speed_text
	for id: String in tower_buttons:
		var def: Dictionary = host.data.towers_by_id.get(id, {})
		tower_buttons[id].disabled = host.sim.energy < float(def.get("cost", 0))
		tower_buttons[id].modulate = Color(1, 1, 1, 1) if host.selected_tower_id == id else Color(1, 1, 1, 0.72)


func show_result(won: bool, result: Dictionary) -> void:
	overlay.visible = true
	overlay_title.text = "实验结束 · %s" % str(result.get("grade", "C")) if won else "实验失败"
	overlay_body.text = "保障度 %d/%d\n击杀 %d · 漏过 %d\n\n自由模式结果不写主线存档。" % [
		int(result.get("integrity", 0)), int(result.get("max_integrity", 0)),
		int(result.get("kills", 0)), int(result.get("leaked", 0)),
	]


func make_label(text: String, size: int, color: Color) -> Label:
	var label := Label.new()
	label.text = text
	label.add_theme_font_size_override("font_size", size)
	label.add_theme_color_override("font_color", color)
	return label
