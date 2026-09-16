extends Control
## Codex —— 卡牌图鉴：直接复用美术出图（全量卡面 PNG）+ 敌人数值 + 地图卡。
## 用途：让"卡片即规则"这件事在游戏内可查——每张卡的规则层字段都来自同一份数据表。

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
		grid.add_child(_card_entry(card))

	col.add_child(UiKit.divider())
	col.add_child(UiKit.label("敌方原型（数值/04）", UiKit.FS_H2, UiKit.DANGER))
	var egrid := GridContainer.new()
	egrid.columns = 3
	egrid.add_theme_constant_override("h_separation", 10)
	egrid.add_theme_constant_override("v_separation", 10)
	col.add_child(egrid)
	for e in GameData.enemies.values():
		egrid.add_child(_enemy_entry(e))

	col.add_child(UiKit.divider())
	col.add_child(UiKit.label("地图卡（19 号卡表）", UiKit.FS_H2, UiKit.PURPLE))
	for m in GameData.maps.values():
		col.add_child(_map_entry(m))


func _card_entry(card: Dictionary) -> Control:
	var panel := UiKit.card_panel(UiKit.TYPE_COLORS.get(String(card.get("type", "")), UiKit.TEAL), 10)
	panel.custom_minimum_size = Vector2(210, 420)
	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation", 3)
	panel.add_child(box)
	var art := String(card.get("icon", ""))
	if art != "" and ResourceLoader.exists(art):
		var tr := TextureRect.new()
		tr.texture = load(art)
		tr.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		tr.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
		tr.custom_minimum_size = Vector2(182, 253)
		box.add_child(tr)
	box.add_child(UiKit.label("%s %s" % [card.get("id", ""), card.get("name", "")], UiKit.FS_SMALL, UiKit.TEXT))
	box.add_child(UiKit.label("费 %d · %s" % [int(card.get("cost", 0)), card.get("keyword", "")],
		UiKit.FS_TINY, UiKit.TEXT_DIM))
	var nums: Array[String] = []
	for pair in card.get("face_stats", []):
		nums.append("%s %s" % [pair[0], pair[1]])
	box.add_child(UiKit.label("　".join(nums), UiKit.FS_TINY, UiKit.TEXT))
	box.add_child(UiKit.label(String(card.get("effect_line", "")), UiKit.FS_TINY, UiKit.TEXT_FAINT))
	return panel


func _enemy_entry(e: Dictionary) -> Control:
	var panel := UiKit.card_panel(UiKit.DANGER, 10)
	panel.custom_minimum_size = Vector2(210, 300)
	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation", 3)
	panel.add_child(box)
	var art := String(e.get("art", ""))
	if art != "" and ResourceLoader.exists(art):
		var tr := TextureRect.new()
		tr.texture = load(art)
		tr.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		tr.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
		tr.custom_minimum_size = Vector2(182, 190)
		box.add_child(tr)
	box.add_child(UiKit.label("%s　威胁 %d" % [e.get("name", ""), int(e.get("threat", 0))],
		UiKit.FS_SMALL, UiKit.TEXT))
	box.add_child(UiKit.label("生命 %d · 攻击 %d · 攻速 %.1f/s" % [int(e.get("hp", 0)),
		int(e.get("attack", 0)), float(e.get("attack_speed", 0.0))], UiKit.FS_TINY, UiKit.TEXT_DIM))
	box.add_child(UiKit.label("移速 %.1f · 护甲 %d · 击杀能量 %d" % [float(e.get("speed", 0.0)),
		int(e.get("armor", 0)), int(e.get("kill_energy", 0))], UiKit.FS_TINY, UiKit.TEXT_DIM))
	box.add_child(UiKit.label(String(e.get("desc", "")), UiKit.FS_TINY, UiKit.TEXT_FAINT))
	return panel


func _map_entry(m: Dictionary) -> Control:
	var panel := UiKit.card_panel(UiKit.PURPLE, 10)
	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation", 3)
	panel.add_child(box)
	var art := String(m.get("image", ""))
	if art != "" and ResourceLoader.exists(art):
		var tr := TextureRect.new()
		tr.texture = load(art)
		tr.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		tr.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
		tr.custom_minimum_size = Vector2(620, 418)
		box.add_child(tr)
	box.add_child(UiKit.label("%s　%s　｜　入口 %d　｜　标准 %d / 支援 %d / 修饰 %d%s"
		% [m.get("id", ""), m.get("name", ""), (m.get("entrances", []) as Array).size(),
		   (m.get("slots", {}) as Dictionary).get("standard", []).size(),
		   (m.get("slots", {}) as Dictionary).get("support", []).size(),
		   (m.get("slots", {}) as Dictionary).get("modifier", []).size(),
		   "　｜　双入口（可挂双流）" if bool(m.get("dual_entry", false)) else "　｜　单入口"],
		UiKit.FS_SMALL, UiKit.TEXT))
	return panel
