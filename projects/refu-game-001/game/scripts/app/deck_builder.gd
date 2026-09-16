extends Control
## DeckBuilder —— 卡组编辑（doc 05：20 张；同名 ≤2；至少 2 个不同标签）。
## 点池中卡＝加入一张；点卡组中卡＝移除一张；长按＝看完整卡面。

var _deck: Array[String] = []
var _deck_grid: GridContainer
var _pool_grid: GridContainer
var _status: Label
var _deck_views: Array[CardView] = []
var _pool_views: Array[CardView] = []


func _ready() -> void:
	set_anchors_preset(Control.PRESET_FULL_RECT)
	_deck = AppState.deck_ids.duplicate()
	_build()
	_refresh()


func _build() -> void:
	var bg := ColorRect.new()
	bg.color = UiKit.BG_DEEP
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	bg.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(bg)

	var root := VBoxContainer.new()
	root.position = Vector2(24, 24)
	root.size = Vector2(672, 1232)
	root.add_theme_constant_override("separation", 8)
	add_child(root)

	var head := HBoxContainer.new()
	head.add_theme_constant_override("separation", 10)
	var back := UiKit.ghost_button("← 返回", UiKit.FS_SMALL, UiKit.LINE)
	back.custom_minimum_size = Vector2(96, 44)
	back.pressed.connect(func(): AppState.goto("res://scenes/ui/level_select.tscn"))
	head.add_child(back)
	head.add_child(UiKit.label("卡组编辑", UiKit.FS_H1, UiKit.TEXT))
	root.add_child(head)

	_status = UiKit.label("", UiKit.FS_SMALL, UiKit.TEXT)
	_status.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	root.add_child(_status)

	root.add_child(UiKit.label("卡组（点一下移除一张 · 长按看卡面）", UiKit.FS_BODY, UiKit.TEAL))
	_deck_grid = GridContainer.new()
	_deck_grid.columns = 6
	_deck_grid.add_theme_constant_override("h_separation", 6)
	_deck_grid.add_theme_constant_override("v_separation", 6)
	root.add_child(_deck_grid)

	root.add_child(UiKit.divider())
	root.add_child(UiKit.label("卡池 · 铁砧联邦 12 卡（点一下加入一张）", UiKit.FS_BODY, UiKit.TEAL))
	_pool_grid = GridContainer.new()
	_pool_grid.columns = 6
	_pool_grid.add_theme_constant_override("h_separation", 6)
	_pool_grid.add_theme_constant_override("v_separation", 6)
	root.add_child(_pool_grid)

	var actions := HBoxContainer.new()
	actions.add_theme_constant_override("separation", 8)
	var recommend := UiKit.ghost_button("推荐卡组", UiKit.FS_BODY, UiKit.TEAL)
	recommend.pressed.connect(func():
		_deck = AppState.default_deck(AppState.level_id)
		_refresh())
	actions.add_child(recommend)
	var clear := UiKit.ghost_button("清空", UiKit.FS_BODY, UiKit.DANGER)
	clear.pressed.connect(func():
		_deck.clear()
		_refresh())
	actions.add_child(clear)
	var save := UiKit.button("保存并返回", UiKit.FS_BODY, UiKit.TEAL)
	save.pressed.connect(func():
		var check := AppState.validate_deck(_deck)
		if not bool(check["ok"]):
			_status.text = "❌ " + String(check["reason"])
			_status.add_theme_color_override("font_color", UiKit.DANGER)
			return
		AppState.deck_ids = _deck.duplicate()
		AppState.goto("res://scenes/ui/level_select.tscn"))
	actions.add_child(save)
	root.add_child(actions)


func _refresh() -> void:
	var check := AppState.validate_deck(_deck)
	var counts := _counts(_deck)
	_status.text = "卡组 %d / 20　%s" % [_deck.size(),
		"✅ 合法" if bool(check["ok"]) else "❌ " + String(check["reason"])]
	_status.add_theme_color_override("font_color", UiKit.GREEN if bool(check["ok"]) else UiKit.DANGER)

	# 卡组：合并同名，显示 ×N
	var deck_ids: Array = counts.keys()
	deck_ids.sort()
	_rebuild_grid(_deck_grid, _deck_views, deck_ids, counts, true)
	# 卡池
	var pool := GameData.pool_for_level(GameData.get_level(AppState.level_id))
	var pool_ids: Array = []
	for c in pool:
		pool_ids.append(String(c["id"]))
	_rebuild_grid(_pool_grid, _pool_views, pool_ids, counts, false)


func _rebuild_grid(grid: GridContainer, views: Array[CardView], ids: Array, counts: Dictionary,
		is_deck: bool) -> void:
	for c in grid.get_children():
		grid.remove_child(c)
		c.queue_free()
	views.clear()
	for cid in ids:
		var cv := CardView.new()
		cv.custom_minimum_size = Vector2(100, 143)
		cv.setup(GameData.get_card(String(cid)), true)
		cv.show_count = int(counts.get(cid, 0)) if is_deck else int(counts.get(cid, 0))
		if not is_deck and int(counts.get(cid, 0)) >= 2:
			cv.set_affordable(false, "已达 2 张上限")
		cv.pressed.connect(func(view):
			if is_deck:
				_deck.erase(String(cid))
			else:
				if int(counts.get(cid, 0)) >= 2 or _deck.size() >= 20:
					return
				_deck.append(String(cid))
			_refresh())
		cv.long_pressed.connect(func(view): _show_art(String(cid)))
		grid.add_child(cv)
		views.append(cv)


func _counts(ids: Array) -> Dictionary:
	var out := {}
	for cid in ids:
		out[cid] = int(out.get(cid, 0)) + 1
	return out


func _show_art(cid: String) -> void:
	var card := GameData.get_card(cid)
	var layer := ColorRect.new()
	layer.color = Color(0, 0, 0, 0.7)
	layer.set_anchors_preset(Control.PRESET_FULL_RECT)
	layer.mouse_filter = Control.MOUSE_FILTER_STOP
	add_child(layer)
	var panel := UiKit.card_panel(UiKit.TYPE_COLORS.get(String(card.get("type", "")), UiKit.TEAL))
	panel.position = Vector2(150, 180)
	panel.size = Vector2(420, 900)
	layer.add_child(panel)
	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation", 6)
	panel.add_child(box)
	var art := String(card.get("icon", ""))
	if art != "" and ResourceLoader.exists(art):
		var tr := TextureRect.new()
		tr.texture = load(art)
		tr.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		tr.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
		tr.custom_minimum_size = Vector2(360, 500)
		box.add_child(tr)
	box.add_child(UiKit.label(String(card.get("effect_line", "")), UiKit.FS_BODY, UiKit.TEXT))
	box.add_child(UiKit.label(String(card.get("flavor", "")), UiKit.FS_SMALL, UiKit.TEXT_DIM))
	var close := UiKit.ghost_button("关闭", UiKit.FS_BODY, UiKit.LINE)
	close.pressed.connect(func(): layer.queue_free())
	box.add_child(close)
