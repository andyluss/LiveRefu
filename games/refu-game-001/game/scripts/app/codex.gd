extends Control
## Codex —— 卡牌图鉴：直接复用美术出图（全量卡面 PNG）+ 敌人数值 + 地图卡。
## 用途：让"卡片即规则"这件事在游戏内可查——每张卡的规则层字段都来自同一份数据表。
##
## 本文件只负责骨架（背景 / 标题 / 滚动容器 / 三段标题与网格）；条目构建在 codex/codex_entries.gd。

func _ready() -> void:
	set_anchors_preset(Control.PRESET_FULL_RECT)
	_build()


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
	back.pressed.connect(func(): AppState.goto("res://scenes/ui/main_menu.tscn"))
	head.add_child(back)
	head.add_child(UiKit.label("卡牌图鉴", UiKit.FS_H1, UiKit.TEXT))
	root.add_child(head)

	var scroll := ScrollContainer.new()
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	root.add_child(scroll)

	var col := VBoxContainer.new()
	col.add_theme_constant_override("separation", 12)
	col.custom_minimum_size = Vector2(660, 0)
	scroll.add_child(col)

	col.add_child(UiKit.label("铁砧联邦核心 12 卡", UiKit.FS_H2, UiKit.TEAL))
	var grid := GridContainer.new()
	grid.columns = 3
	grid.add_theme_constant_override("h_separation", 10)
	grid.add_theme_constant_override("v_separation", 10)
	col.add_child(grid)
	for card in GameData.pool_for_level(GameData.get_level("L1-1")):
		grid.add_child(CodexEntries.card_entry(card))

	col.add_child(UiKit.divider())
	col.add_child(UiKit.label("敌方原型（数值/04）", UiKit.FS_H2, UiKit.DANGER))
	var egrid := GridContainer.new()
	egrid.columns = 3
	egrid.add_theme_constant_override("h_separation", 10)
	egrid.add_theme_constant_override("v_separation", 10)
	col.add_child(egrid)
	for e in GameData.enemies.values():
		egrid.add_child(CodexEntries.enemy_entry(e))

	col.add_child(UiKit.divider())
	col.add_child(UiKit.label("地图卡（19 号卡表）", UiKit.FS_H2, UiKit.PURPLE))
	for m in GameData.maps.values():
		col.add_child(CodexEntries.map_entry(m))
