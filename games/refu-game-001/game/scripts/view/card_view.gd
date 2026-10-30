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
	# 画法在 CardPainter（静态、无状态），本类只持有状态与交互
	CardPainter.draw_card(self, card, size.x, size.y, selected, affordable, show_count, _font)
