extends Control
## DeckBuilder —— 卡组编辑（doc 05：20 张；同名 ≤2；至少 2 个不同标签）。
## 点池中卡＝加入一张；点卡组中卡＝移除一张；长按＝看完整卡面。
##
## 本文件只负责骨架（背景 / 标题 / 状态行 / 两个分区标题 / 底部动作）与校验；
## 网格与卡面弹窗拆在 deck/ 下：deck_grids.gd、deck_art_modal.gd。

var _deck: Array[String] = []
var _status: Label
var _grids: DeckGrids
var _art: DeckArtModal


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
	var deck_grid := DeckGrids.make_grid(root)

	root.add_child(UiKit.divider())
	root.add_child(UiKit.label("卡池 · 铁砧联邦 12 卡（点一下加入一张）", UiKit.FS_BODY, UiKit.TEAL))
	var pool_grid := DeckGrids.make_grid(root)

	_grids = DeckGrids.new()
	_grids.setup(self, deck_grid, pool_grid)
	_art = DeckArtModal.create(self)

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
	_status.text = "卡组 %d / 20　%s" % [_deck.size(),
		"✅ 合法" if bool(check["ok"]) else "❌ " + String(check["reason"])]
	_status.add_theme_color_override("font_color", UiKit.GREEN if bool(check["ok"]) else UiKit.DANGER)
	_grids.refresh()


func _show_art(cid: String) -> void:
	_art.open(cid)
