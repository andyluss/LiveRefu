extends Control
class_name Popups
## 浮字与涟漪：把"刚刚发生了什么"画在发生的地方。
##
## 为什么值得单独做：战斗里最重要的因果（**放牌 → 电力变化 → 残渣增加 → 降级区扩张**）
## 在数值上全都在 HUD 里，但玩家的眼睛在棋盘上。若不把这些变化**画在发生点附近**，
## 玩家就得在两个区域之间来回找——那是可读性最大的敌人（也是 HUD 独立成件后的新问题）。
##
## 它**只负责表现**：外部通过 `spawn_text` / `spawn_ripple` 投喂，自己不改 battle 状态。

const MAX_ITEMS := 24

var _items: Array[Dictionary] = []
var _tokens: TokenSet
var _font: Font

func setup(tokens: TokenSet, font: Font) -> void:
	_tokens = tokens
	_font = font
	mouse_filter = Control.MOUSE_FILTER_IGNORE   # 不抢输入：它只是画在最上层

## 浮字：向上飘并淡出。`color_token` 用语义色（如 --residue），不写字面量。
func spawn_text(position: Vector2, text: String, color_token: String, size_level: String = "caption") -> void:
	if _items.size() >= MAX_ITEMS:
		_items.pop_front()
	_items.append({
		"kind": "text", "pos": position, "text": text, "color": color_token,
		"size": size_level, "age": 0.0, "life": 0.9,
	})

## 涟漪：从某点扩散的圆环（放置、清理、扩张各用不同半径与颜色）。
func spawn_ripple(position: Vector2, color_token: String, radius: float, life: float) -> void:
	if _items.size() >= MAX_ITEMS:
		_items.pop_front()
	_items.append({
		"kind": "ripple", "pos": position, "color": color_token,
		"radius": radius, "age": 0.0, "life": maxf(0.05, life),
	})

func _process(delta: float) -> void:
	if _items.is_empty():
		return
	var kept: Array[Dictionary] = []
	for item in _items:
		item["age"] = float(item["age"]) + delta
		if float(item["age"]) < float(item["life"]):
			kept.append(item)
	_items = kept
	queue_redraw()

func _draw() -> void:
	if _tokens == null or _font == null:
		return
	for item in _items:
		var ratio := clampf(float(item["age"]) / float(item["life"]), 0.0, 1.0)
		var color := _tokens.color(str(item["color"]))
		color.a = 1.0 - ratio
		if str(item["kind"]) == "text":
			_draw_text(item, color, ratio)
		else:
			_draw_ripple(item, color, ratio)

func _draw_text(item: Dictionary, color: Color, ratio: float) -> void:
	var origin: Vector2 = item["pos"]
	var rise := 26.0 * ratio
	var size := _tokens.size(str(item["size"]))
	# 先画一圈暗描边：浮字会压在任何东西上（卡面/热力条），没有描边就时常读不清
	var outline := _tokens.color("--bg-base")
	outline.a = color.a * 0.85
	for offset in [Vector2(-1, 0), Vector2(1, 0), Vector2(0, -1), Vector2(0, 1)]:
		draw_string(_font, origin + offset + Vector2(0, -rise), str(item["text"]),
			HORIZONTAL_ALIGNMENT_LEFT, -1, size, outline)
	draw_string(_font, origin + Vector2(0, -rise), str(item["text"]),
		HORIZONTAL_ALIGNMENT_LEFT, -1, size, color)

func _draw_ripple(item: Dictionary, color: Color, ratio: float) -> void:
	var radius := float(item["radius"]) * ratio
	if radius <= 0.5:
		return
	draw_arc(item["pos"], radius, 0.0, TAU, 40, color, 2.0, true)
