# LiveBay · 主页（独立页面）
extends Control

const PageUi = preload("res://scripts/presentation/page_ui.gd")

var app: Node


func setup(app_node: Node) -> void:
	app = app_node
	set_anchors_preset(Control.PRESET_FULL_RECT)
	mouse_filter = Control.MOUSE_FILTER_STOP
	theme = PageUi.make_theme()

	var bg := ColorRect.new()
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	bg.color = Color("#0C1412")
	add_child(bg)

	var center := CenterContainer.new()
	center.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(center)

	var card := PanelContainer.new()
	card.custom_minimum_size = Vector2(680, 460)
	card.add_theme_stylebox_override("panel", PageUi.panel_style(Color("#182326"), Color("#D9622B"), 14))
	center.add_child(card)
	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 42)
	margin.add_theme_constant_override("margin_right", 42)
	margin.add_theme_constant_override("margin_top", 36)
	margin.add_theme_constant_override("margin_bottom", 30)
	card.add_child(margin)
	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation", 10)
	margin.add_child(box)

	var kicker := Label.new()
	kicker.text = "LIVEBAY / 逍遥湾 · NIGHT SHIFT"
	kicker.add_theme_font_size_override("font_size", 11)
	kicker.add_theme_color_override("font_color", Color("#D9622B"))
	box.add_child(kicker)

	var title := Label.new()
	title.text = "今晚，守哪一段？"
	title.add_theme_font_size_override("font_size", 36)
	title.add_theme_color_override("font_color", Color("#F5EFE2"))
	box.add_child(title)

	var sub := Label.new()
	sub.text = "主线是岗位塔防；自由模式是外环试验场。\n两套入口，互不覆盖存档。"
	sub.add_theme_font_size_override("font_size", 14)
	sub.add_theme_color_override("font_color", Color("#B8C1BC"))
	sub.custom_minimum_size = Vector2(560, 46)
	box.add_child(sub)
	box.add_child(Control.new())

	var main_btn := Button.new()
	main_btn.text = "进入主线 · 正式班次"
	main_btn.custom_minimum_size = Vector2(560, 54)
	main_btn.add_theme_font_size_override("font_size", 18)
	PageUi.style_button(main_btn, Color("#2F6B65"), Color("#F5EFE2"))
	main_btn.pressed.connect(func() -> void: app.open_game())
	box.add_child(main_btn)

	var lab_btn := Button.new()
	lab_btn.text = "自由模式 · 外环试验场"
	lab_btn.custom_minimum_size = Vector2(560, 54)
	lab_btn.add_theme_font_size_override("font_size", 18)
	PageUi.style_button(lab_btn, Color("#C95B2C"), Color("#F5EFE2"))
	lab_btn.pressed.connect(func() -> void: app.open_lab())
	box.add_child(lab_btn)

	var hint := Label.new()
	hint.text = "主线：记录 / 合同 / 班次记忆    自由：标签 / 覆盖 / 独立存档"
	hint.add_theme_font_size_override("font_size", 11)
	hint.add_theme_color_override("font_color", Color("#8C978F"))
	box.add_child(hint)

	var foot := Label.new()
	foot.text = "F1 回主页 · Q 退出 · 自由模式内 L 打开实验场"
	foot.add_theme_font_size_override("font_size", 10)
	foot.add_theme_color_override("font_color", Color("#6F7B73"))
	box.add_child(foot)
