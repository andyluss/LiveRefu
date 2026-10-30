extends RefCounted
class_name CardType
## 文字原语：卡面上所有文字都走这两条，保证字号取自 token、不散落魔法数字。

## 单行文字（左对齐）
static func text(canvas: CanvasItem, at: Vector2, value: String, level: String,
		color_token: String, s: float, tokens: TokenSet, font: Font) -> void:
	canvas.draw_string(font, at, value, HORIZONTAL_ALIGNMENT_LEFT, -1,
		int(tokens.size(level) * s), tokens.color(color_token))

## 在盒子里居中画一行
static func centered(canvas: CanvasItem, box: Rect2, value: String, level: String,
		color_token: String, s: float, tokens: TokenSet, font: Font) -> void:
	var size := int(tokens.size(level) * s)
	var width := font.get_string_size(value, HORIZONTAL_ALIGNMENT_LEFT, -1, size).x
	canvas.draw_string(font, box.position + Vector2((box.size.x - width) * 0.5, box.size.y * 0.78),
		value, HORIZONTAL_ALIGNMENT_LEFT, -1, size, tokens.color(color_token))
