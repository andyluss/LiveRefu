extends Control
class_name BattleHandView
## 手牌视图：**用 [CardView] 画每一张牌**（不再自己画一套卡面）。
##
## 为什么必须复用：手牌与卡牌库若各画一套，就会出现"同一个字段在两处显示不同"，
## 而且改动卡面版式要改两遍（漏一处就长期不一致）。
## 手牌只是**紧凑模式 + 可支付态**的卡面，不是另一种卡。

signal card_clicked(hand_index: int)

## 卡面缩放**由可用宽度反推**（见 [HandLayout]）——固定缩放会在宽视口下切掉最后一张牌。
var _card_scale := CardView.COMPACT_SCALE

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
	custom_minimum_size = Vector2(0, card_size().y + 8)
	size_flags_horizontal = Control.SIZE_EXPAND_FILL
	# 尺寸**必须等布局完成后再定**：`resized` 在容器确定宽度时触发。
	# 实测教训：在 setup 里直接取父容器宽度会拿到 0，卡面被按"最小宽度"算得极小。
	resized.connect(_relayout)
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
		view.position = Vector2(index * (card_size().x + HandLayout.gap()), 0)
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
		_views[index].setup_compact(card, _tokens, _font, cost, card.might, affordable, _card_scale)
	queue_redraw()

func select(index: int) -> void:
	_selected = index
	queue_redraw()

func selected_index() -> int:
	return _selected

## 手牌里一张牌的实际尺寸。**命中判定与摆放必须用同一个值**，
## 否则宽视口下会出现"点得到但看不见"这类错位。
func card_size() -> Vector2:
	return HandLayout.card_size(_card_scale)

## 容器尺寸变化时重算卡面尺寸（响应式的实际入口）。
func _relayout() -> void:
	var count := _battle.hand.size() if _battle != null else 0
	var scale := HandLayout.scale_for(count, _available_width())
	if is_equal_approx(scale, _card_scale):
		return
	_card_scale = scale
	custom_minimum_size = Vector2(0, card_size().y + 8)
	rebuild()

## 可用宽度：优先取**自身**宽度（EXPAND_FILL 下即容器给的实际宽度）；
## 布局尚未完成时回落到父容器、再到视口。三个来源都要试——
## 只取一个会拿到 0，卡面就会被算得极小（实测）。
func _available_width() -> float:
	# 顺序很重要：**父容器（VBox）的宽度才是"可用宽度"**。
	# 自身宽度在 EXPAND_FILL 下由父容器给出，但取自身会在首次布局时拿到 0 或旧值，
	# 于是卡面被算得过小（实测：1920 视口下 8 张牌只占了一半宽）。
	var parent := get_parent() as Control
	if parent != null and parent.size.x > 0.0:
		return parent.size.x
	if size.x > 0.0:
		return size.x
	var tree := Engine.get_main_loop() as SceneTree
	if tree != null and tree.root != null:
		return tree.root.get_visible_rect().size.x - 32.0
	return CardView.W * 4.0

func _gui_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
		var index := _card_at(event.position)
		if index >= 0:
			card_clicked.emit(index)

func _card_at(point: Vector2) -> int:
	if _battle == null:
		return -1
	var width := card_size().x
	for i in _battle.hand.size():
		if Rect2(Vector2(i * (width + HandLayout.gap()), 0), card_size()).has_point(point):
			return i
	return -1

## 选中框由本控件画在卡面**之上**（卡面本身不该知道"手牌选中"这件事）。
## 颜色取 `--focus`（焦点指示是可用性基础设施，不复用语义色）。
func _draw() -> void:
	if _tokens == null or _selected < 0 or _selected >= _views.size():
		return
	var view := _views[_selected]
	draw_rect(Rect2(view.position, view.custom_minimum_size), _tokens.color("--focus"), false, 2.0)
