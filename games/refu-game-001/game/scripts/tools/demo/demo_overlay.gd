extends RefCounted
class_name DemoOverlay
## DemoOverlay —— 演示片底部字幕条（CanvasLayer 置顶，压在界面之上）。

const HEIGHT := 64.0


## 建好字幕条，返回 {caption: Label, progress: Label}。
static func build(parent: Node) -> Dictionary:
	var layer := CanvasLayer.new()
	layer.layer = 10
	parent.add_child(layer)
	var panel := PanelContainer.new()
	var sb := StyleBoxFlat.new()
	sb.bg_color = Color(0.04, 0.07, 0.11, 0.86)
	sb.set_corner_radius_all(10)
	sb.border_color = Color(0.37, 0.89, 0.82, 0.55)
	sb.set_border_width_all(1)
	sb.content_margin_left = 14
	sb.content_margin_right = 14
	sb.content_margin_top = 8
	sb.content_margin_bottom = 8
	panel.add_theme_stylebox_override("panel", sb)
	panel.position = Vector2(20, 1280 - HEIGHT - 12)
	panel.size = Vector2(680, HEIGHT)
	layer.add_child(panel)
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 10)
	panel.add_child(row)
	var caption := Label.new()
	caption.add_theme_font_size_override("font_size", 16)
	caption.add_theme_color_override("font_color", Color("#F7FBFF"))
	caption.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	caption.custom_minimum_size = Vector2(560, 0)
	row.add_child(caption)
	var progress := Label.new()
	progress.add_theme_font_size_override("font_size", 13)
	progress.add_theme_color_override("font_color", Color("#5FE3D0"))
	row.add_child(progress)
	return {"caption": caption, "progress": progress}


static func set_text(labels: Dictionary, text: String, index: int, total: int) -> void:
	(labels["caption"] as Label).text = text
	(labels["progress"] as Label).text = "%d/%d" % [index + 1, total]
