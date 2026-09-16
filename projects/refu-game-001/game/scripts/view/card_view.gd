extends Control
class_name CardView
## CardView —— 一张卡的界面控件（代码绘制，不用 .tscn）。
##
## 小屏只显示"3 个数字 + 1 个关键词"（doc 07 第一节的信息分层）；
## 完整卡面（美术出图 PNG）留给长按详情与图鉴，两处读到的是同一份数据。

signal pressed(card_view: CardView)
signal long_pressed(card_view: CardView)

const LONG_PRESS_SEC := 0.45

var card: Dictionary = {}
var compact: bool = true
var affordable: bool = true
var selected: bool = false
var disabled_reason: String = ""
var show_count: int = 0

const ASPECT := 1.42          # 高 / 宽

var _font: Font
var _hold_time: float = 0.0
var _holding: bool = false
var _long_fired: bool = false


func _ready() -> void:
	_font = UiFont.get_font()
	mouse_filter = Control.MOUSE_FILTER_STOP
	if custom_minimum_size == Vector2.ZERO:
		custom_minimum_size = Vector2(112, 112 * ASPECT)
	set_process(false)


func _process(delta: float) -> void:
	if not _holding:
		return
	_hold_time += delta
	if _hold_time >= LONG_PRESS_SEC and not _long_fired:
		_long_fired = true
		set_process(false)
		emit_signal("long_pressed", self)


func setup(card_def: Dictionary, is_compact: bool = true) -> void:
	card = card_def
	compact = is_compact
	var w: float = custom_minimum_size.x if custom_minimum_size.x > 0.0 else 112.0
	custom_minimum_size = Vector2(w, w * ASPECT)
	queue_redraw()


func set_affordable(value: bool, reason: String = "") -> void:
	affordable = value
	disabled_reason = reason
	modulate = Color(1, 1, 1, 1) if value else Color(0.62, 0.66, 0.72, 1)
	queue_redraw()


func set_selected(value: bool) -> void:
	selected = value
	queue_redraw()


func _gui_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
		if event.pressed:
			_holding = true
			_hold_time = 0.0
			_long_fired = false
			set_process(true)
			emit_signal("pressed", self)
			accept_event()
		else:
			_holding = false
			set_process(false)


func _draw() -> void:
	if card.is_empty():
		return
	var w := size.x
	var h := size.y
	var ctype := String(card.get("type", ""))
	var accent: Color = UiKit.TYPE_COLORS.get(ctype, UiKit.TEAL)
	var faction: Color = UiKit.FACTION_COLORS.get(String(card.get("faction", "ANV")), UiKit.BLUE)

	# 卡体：亚克力感（深底 + 族色描边 + 顶部族色箔带）
	var body := StyleBoxFlat.new()
	body.bg_color = Color("#101a24")
	body.set_corner_radius_all(12)
	body.border_color = accent if not selected else UiKit.AMBER
	body.set_border_width_all(3 if selected else 2)
	draw_style_box(body, Rect2(Vector2.ZERO, Vector2(w, h)))

	var band := StyleBoxFlat.new()
	band.bg_color = Color(faction.r, faction.g, faction.b, 0.30)
	band.corner_radius_top_left = 12
	band.corner_radius_top_right = 12
	draw_style_box(band, Rect2(Vector2(2, 2), Vector2(w - 4, h * 0.30)))

	# 费用（右上）
	var cost := int(card.get("cost", 0))
	draw_circle(Vector2(w - 20, 20), 14, Color(0.95, 0.97, 1.0, 0.92))
	_draw_centered(str(cost), Rect2(w - 34, 8, 28, 22), 17, Color("#1B2733"))

	# 名称（按可用宽度截断，避免压到右上角的费用圆）
	draw_string(_font, Vector2(10, 26), _fit(String(card.get("name", "")), w - 52, 14),
		HORIZONTAL_ALIGNMENT_LEFT, w - 48, 14, UiKit.TEXT)

	# 卡号 + 槽位
	draw_string(_font, Vector2(10, 42), "%s · %s" % [card.get("id", ""),
		UiKit.SLOT_LABELS.get(String(card.get("slot", "none")), "")],
		HORIZONTAL_ALIGNMENT_LEFT, w - 12, 9, UiKit.TEXT_DIM)

	# 3 个数值块
	var stats: Array = card.get("face_stats", [])
	var top := h * 0.34
	var block_h := h * 0.24
	var gap := 4.0
	var bw := (w - 16 - gap * 2.0) / 3.0
	for i in mini(3, stats.size()):
		var pair: Array = stats[i]
		var x := 8.0 + float(i) * (bw + gap)
		var sb := StyleBoxFlat.new()
		sb.bg_color = Color("#0f1a26")
		sb.set_corner_radius_all(6)
		sb.border_color = Color(accent.r, accent.g, accent.b, 0.55)
		sb.set_border_width_all(1)
		draw_style_box(sb, Rect2(Vector2(x, top), Vector2(bw, block_h)))
		# 数值在上（大），标签在下（小）——与出图卡面一致
		_draw_centered(_fit(String(pair[1]), bw - 4, 13), Rect2(x, top + 1, bw, block_h * 0.58), 13, UiKit.TEXT)
		_draw_centered(_fit(String(pair[0]), bw - 4, 10), Rect2(x, top + block_h * 0.5, bw, block_h * 0.46), 9, UiKit.TEXT_DIM)

	# 关键词
	var kw_y := top + block_h + 15.0
	draw_string(_font, Vector2(10, kw_y), _fit("关键词：" + String(card.get("keyword", "")), w - 16, 10),
		HORIZONTAL_ALIGNMENT_LEFT, w - 12, 10, UiKit.TEXT)

	# 一句话效果（超宽截断，绝不压到相邻卡）
	draw_string(_font, Vector2(10, kw_y + 14), _fit(String(card.get("effect_line", "")), w - 16, 9),
		HORIZONTAL_ALIGNMENT_LEFT, w - 12, 9, UiKit.TEXT_DIM)

	# 手牌张数角标
	if show_count > 1:
		draw_circle(Vector2(18, h - 16), 12, Color(UiKit.AMBER.r, UiKit.AMBER.g, UiKit.AMBER.b, 0.9))
		_draw_centered("×%d" % show_count, Rect2(6, h - 28, 24, 22), 13, Color("#1B2733"))

	# 不可用的斜线标记
	if not affordable:
		draw_line(Vector2(8, h - 10), Vector2(w - 8, 10), Color(1, 0.4, 0.35, 0.5), 2.0)


## 按像素宽度截断（draw_string 的 width 不裁剪，会溢出到相邻卡上，所以自己截）
func _fit(text: String, max_width: float, font_size: int) -> String:
	if _font == null:
		return text
	if _font.get_string_size(text, HORIZONTAL_ALIGNMENT_LEFT, -1, font_size).x <= max_width:
		return text
	var out := text
	while out.length() > 1 and _font.get_string_size(out + "…", HORIZONTAL_ALIGNMENT_LEFT, -1, font_size).x > max_width:
		out = out.substr(0, out.length() - 1)
	return out + "…"


func _draw_centered(text: String, rect: Rect2, font_size: int, color: Color) -> void:
	var baseline := rect.position.y + rect.size.y * 0.78
	draw_string(_font, Vector2(rect.position.x, baseline), text,
		HORIZONTAL_ALIGNMENT_CENTER, rect.size.x, font_size, color)
