# LiveBay · 主页
# 只负责模式入口；游戏状态由 Main/Session 驱动。
class_name LiveBayHomeScreen
extends RefCounted

var host: Node
var palette: Dictionary
var layer: CanvasLayer
var root: Control


func build(host_node: Node, palette_data: Dictionary, callbacks: Dictionary) -> void:
	host = host_node
	palette = palette_data
	layer = CanvasLayer.new()
	layer.layer = 100
	host.add_child(layer)
	root = Control.new()
	root.set_anchors_preset(Control.PRESET_FULL_RECT)
	layer.add_child(root)

	var bg := ColorRect.new()
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	bg.color = Color(0.07, 0.10, 0.11, 0.94)
	root.add_child(bg)

	var center := CenterContainer.new()
	center.set_anchors_preset(Control.PRESET_FULL_RECT)
	root.add_child(center)

	var card := PanelContainer.new()
	card.add_theme_stylebox_override("panel", host.game_hud.panel_style(palette.paper, palette.orange, 14))
	card.custom_minimum_size = Vector2(660, 460)
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
	kicker.add_theme_color_override("font_color", palette.orange)
	box.add_child(kicker)

	var title := Label.new()
	title.text = "今晚，守哪一段？"
	title.add_theme_font_size_override("font_size", 34)
	title.add_theme_color_override("font_color", palette.ink)
	box.add_child(title)

	var sub := Label.new()
	sub.text = "主线是岗位塔防；自由模式是外环试验场。\n两套入口，互不覆盖存档。"
	sub.add_theme_font_size_override("font_size", 14)
	sub.add_theme_color_override("font_color", palette.slate)
	sub.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	sub.custom_minimum_size = Vector2(560, 46)
	box.add_child(sub)

	var spacer := Control.new()
	spacer.custom_minimum_size = Vector2(0, 10)
	box.add_child(spacer)

	var main_btn := Button.new()
	main_btn.text = "进入主线 · 正式班次"
	main_btn.custom_minimum_size = Vector2(560, 54)
	main_btn.add_theme_font_size_override("font_size", 18)
	host.game_hud.style_button(main_btn, palette.teal, palette.cream, 18)
	main_btn.pressed.connect(callbacks["main"])
	box.add_child(main_btn)

	var lab_btn := Button.new()
	lab_btn.text = "自由模式 · 外环试验场"
	lab_btn.custom_minimum_size = Vector2(560, 54)
	lab_btn.add_theme_font_size_override("font_size", 18)
	host.game_hud.style_button(lab_btn, palette.orange, palette.cream, 18)
	lab_btn.pressed.connect(callbacks["lab"])
	box.add_child(lab_btn)

	var hint := Label.new()
	hint.text = "主线：记录 / 合同 / 班次记忆    自由：标签 / 覆盖 / 独立存档"
	hint.add_theme_font_size_override("font_size", 11)
	hint.add_theme_color_override("font_color", palette.ink)
	box.add_child(hint)
	var foot := Label.new()
	foot.text = "F1 随时回到这里 · Esc 关闭当前层"
	foot.add_theme_font_size_override("font_size", 10)
	foot.add_theme_color_override("font_color", palette.slate)
	box.add_child(foot)


func show() -> void:
	if root != null:
		root.visible = true


func hide() -> void:
	if root != null:
		root.visible = false
