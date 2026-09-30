extends Control
class_name BattleHandView
## 手牌视图：**用 [CardView] 画每一张牌**（不再自己画一套卡面）。
##
## 为什么必须复用：手牌与卡牌库若各画一套，就会出现"同一个字段在两处显示不同"，
## 而且改动卡面版式要改两遍（漏一处就长期不一致）。
## 手牌只是**紧凑模式 + 可支付态**的卡面，不是另一种卡。

signal card_clicked(hand_index: int)

const CARD_SCALE := 0.32
const GAP := 10

var _battle: Battle
var _tokens: TokenSet
var _font: Font
var _views: Array[CardView] = []
var _selected := -1

func setup(battle: Battle, tokens: TokenSet, font: Font) -> void:
	_battle = battle
	_tokens = tokens
	_font = font
	mouse_filter = Control.MOUSE_FILTER_STOP
	custom_minimum_size = Vector2(0, CardView.H * CARD_SCALE + 8)
	rebuild()

## 重建手牌（手牌数量变化时调用；视图自己不做增删逻辑）。
func rebuild() -> void:
	for view in _views:
		view.queue_free()
	_views.clear()
	if _battle == null or _tokens == null:
		return
	for index in _battle.hand.size():
		var view := CardView.new()
		view.position = Vector2(index * (CardView.W * CARD_SCALE + GAP), 0)
		view.mouse_filter = Control.MOUSE_FILTER_IGNORE   # 点击由本控件统一判定
		add_child(view)
		_views.append(view)
	refresh()

## 刷新每张牌的内容（费用可能被规则卡改变，战力可能被残渣削弱）。
## **手牌数量变化时必须先 rebuild**——这里只负责刷新已有视图的内容。
func refresh() -> void:
	if _battle == null or _tokens == null:
		return
	var changed := _views.size() != _battle.hand.size()
	if changed:
		rebuild()
		return
	for index in _views.size():
		var card: CardData = _battle.hand[index]
		var cost := CardCost.of(_battle, card, 0)
		var affordable := cost <= ResourceSystem.power(_battle.resources)
		_views[index].setup_compact(card, _tokens, _font, cost, card.might, affordable)
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
	var width: float = CardView.W * CARD_SCALE
	for i in _battle.hand.size():
		if Rect2(Vector2(i * (width + GAP), 0), Vector2(width, CardView.H * CARD_SCALE)).has_point(point):
			return i
	return -1

## 选中框由本控件画在卡面**之上**（卡面本身不该知道"手牌选中"这件事）。
## 颜色取 `--focus`（焦点指示是可用性基础设施，不复用语义色）。
func _draw() -> void:
	if _tokens == null or _selected < 0 or _selected >= _views.size():
		return
	var view := _views[_selected]
	draw_rect(Rect2(view.position, view.custom_minimum_size), _tokens.color("--focus"), false, 2.0)
