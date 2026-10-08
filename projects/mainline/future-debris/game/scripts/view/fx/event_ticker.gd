extends Control
class_name EventTicker
## **事件行**：把"刚刚发生了什么"排成最多三行，各占一行、逐行上移淡出。
##
## 为什么不用自由摆放的浮字（实测教训）：一回合里常常同时发生好几件事
## （清波 + 降级区扩张 + 基地受伤），自由摆放会让它们**叠在一起互相压字**，
## 反而比不显示更糟。排成固定行位的好处是：**任何组合都不会重叠**，
## 且玩家知道"最新的一条在最下面"，读起来有顺序。
##
## 它只负责表现：外部 `push(text, color_token, level)`，自己不改 battle 状态。

const MAX_LINES := 3
const LINE_HEIGHT := 26.0
const LIFE := 1.6

var _lines: Array[Dictionary] = []
var _tokens: TokenSet
var _font: Font

func setup(tokens: TokenSet, font: Font) -> void:
	_tokens = tokens
	_font = font
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	size_flags_horizontal = Control.SIZE_EXPAND_FILL

## 推入一条事件；超出上限时挤掉最旧的一条。
func push(text: String, color_token: String, level: String = "body") -> void:
	# 同一条文本连续重复时只刷新它的计时（例：连续几回合"残渣 +4"不该刷三行）
	for line in _lines:
		if str(line["text"]) == text:
			line["age"] = 0.0
			return
	_lines.append({"text": text, "color": color_token, "level": level, "age": 0.0})
	while _lines.size() > MAX_LINES:
		_lines.pop_front()
	queue_redraw()

func clear() -> void:
	_lines.clear()
	queue_redraw()

func _process(delta: float) -> void:
	if _lines.is_empty():
		return
	var kept: Array[Dictionary] = []
	for line in _lines:
		line["age"] = float(line["age"]) + delta
		if float(line["age"]) < LIFE:
			kept.append(line)
	_lines = kept
	queue_redraw()

func _draw() -> void:
	if _tokens == null or _font == null:
		return
	for index in _lines.size():
		var line := _lines[index]
		# 越旧的行越靠上（新事件从下往上顶），并随年龄淡出
		var age := float(line["age"])
		var fade := clampf(1.0 - age / LIFE, 0.0, 1.0)
		var color := _tokens.color(str(line["color"]))
		color.a = fade
		var y := 4.0 + LINE_HEIGHT * float(index)
		_draw_with_outline(Vector2(0, y), str(line["text"]), color, _tokens.size(str(line["level"])))

## 暗描边：事件行会压在任何东西上（卡面/热力条/覆盖层），没有描边时常读不清。
func _draw_with_outline(origin: Vector2, text: String, color: Color, size: int) -> void:
	var outline := _tokens.color("--bg-base")
	outline.a = color.a * 0.85
	for offset in [Vector2(-1, 0), Vector2(1, 0), Vector2(0, -1), Vector2(0, 1)]:
		draw_string(_font, origin + offset, text, HORIZONTAL_ALIGNMENT_LEFT, -1, size, outline)
	draw_string(_font, origin, text, HORIZONTAL_ALIGNMENT_LEFT, -1, size, color)
