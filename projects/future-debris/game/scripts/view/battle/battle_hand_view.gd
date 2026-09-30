extends Control
class_name BattleHandView
## 手牌视图：画手牌、标出"付得起/付不起"，并**发出选牌信号**（交互只由 app 层处理）。
##
## 分层立场：view 只画与报点（`card_clicked`），**不改 battle 状态**。
## 出牌由 app 层调用 `CardPlayer`，这样"能出什么牌"只有一套判断（CardCost）。

signal card_clicked(hand_index: int)

const CARD_SIZE := Vector2(112, 150)
const GAP := 10

var _battle: Battle
var _tokens: TokenSet
var _font: Font
var _selected := -1

func setup(battle: Battle, tokens: TokenSet, font: Font) -> void:
	_battle = battle
	_tokens = tokens
	_font = font
	custom_minimum_size = Vector2(0, CARD_SIZE.y + 8)
	mouse_filter = Control.MOUSE_FILTER_STOP
	queue_redraw()

func refresh() -> void:
	queue_redraw()

func select(index: int) -> void:
	_selected = index
	queue_redraw()

func selected_index() -> int:
	return _selected

func _gui_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
		var index := _card_at(event.position)
		if index >= 0:
			card_clicked.emit(index)

func _card_at(point: Vector2) -> int:
	if _battle == null:
		return -1
	for i in _battle.hand.size():
		var rect := Rect2(Vector2(i * (CARD_SIZE.x + GAP), 0), CARD_SIZE)
		if rect.has_point(point):
			return i
	return -1

func _draw() -> void:
	if _battle == null or _tokens == null or _font == null:
		return
	for i in _battle.hand.size():
		_draw_card(i, _battle.hand[i])

func _draw_card(index: int, card: CardData) -> void:
	var rect := Rect2(Vector2(index * (CARD_SIZE.x + GAP), 0), CARD_SIZE)
	var cost := CardCost.of(_battle, card, 0)
	var affordable := cost <= ResourceSystem.power(_battle.resources)
	draw_rect(rect, _tokens.color("--bg-elev-2" if affordable else "--surface-sunken"), true)
	var border := _tokens.color("--line-strong")
	if index == _selected:
		border = _tokens.color("--focus")
	elif not affordable:
		border = _tokens.color("--line")
	draw_rect(rect, border, false, 2.0 if index == _selected else 1.5)
	var text_color := _tokens.color("--text" if affordable else "--text-faint")
	draw_string(_font, rect.position + Vector2(8, 24), card.name,
		HORIZONTAL_ALIGNMENT_LEFT, -1, _tokens.size("caption"), text_color)
	draw_string(_font, rect.position + Vector2(8, 60), "费 %d" % cost,
		HORIZONTAL_ALIGNMENT_LEFT, -1, _tokens.size("number-lg"), _tokens.color("--text"))
	draw_string(_font, rect.position + Vector2(8, 92), "战力 %d" % card.might,
		HORIZONTAL_ALIGNMENT_LEFT, -1, _tokens.size("caption"), _tokens.color("--power"))
	draw_string(_font, rect.position + Vector2(8, 112), "供电 %d" % card.power,
		HORIZONTAL_ALIGNMENT_LEFT, -1, _tokens.size("caption"), _tokens.color("--ok"))
	draw_string(_font, rect.position + Vector2(8, 132), "残渣 %d" % card.residue,
		HORIZONTAL_ALIGNMENT_LEFT, -1, _tokens.size("caption"), _tokens.color("--residue"))
