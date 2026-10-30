extends Control
## MainMenu —— 主菜单。竖屏 720×1280，复古未来 / 千禧透明基调（美术设定 002）。

var _challenge_preview: Label


func _ready() -> void:
	set_anchors_preset(Control.PRESET_FULL_RECT)
	_build()


func _build() -> void:
	var bg := ColorRect.new()
	bg.color = UiKit.BG_DEEP
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	bg.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(bg)

	# 顶部箔带（千禧透明的虹彩页眉）
	var foil := ColorRect.new()
	foil.color = Color(0.37, 0.95, 0.88, 0.10)
	foil.position = Vector2(0, 0)
	foil.size = Vector2(720, 220)
	foil.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(foil)

	var root := VBoxContainer.new()
	root.position = Vector2(48, 90)
	root.size = Vector2(624, 1100)
	root.add_theme_constant_override("separation", 14)
	add_child(root)

	root.add_child(UiKit.label("REFU GAME 001", UiKit.FS_SMALL, UiKit.TEAL))
	root.add_child(UiKit.label("节点防线", UiKit.FS_TITLE + 14, UiKit.TEXT))
	root.add_child(UiKit.label("卡片式塔防 · 铁砧联邦垂直切片", UiKit.FS_H2, UiKit.TEXT_DIM))
	root.add_child(UiKit.divider())
	root.add_child(UiKit.label(
		"所有内容都是卡：地图卡、波次卡、事件卡、规则卡组成一关；\n"
		+ "塔卡、单位卡、技能卡、修饰卡组成你的卡组。\n"
		+ "本切片实现：铁砧联邦 12 卡 + 齿轮帮支援 + 峡谷哨站 6 波 + 挑战卡。",
		UiKit.FS_BODY, UiKit.TEXT_DIM))
	root.add_child(UiKit.hsep(16))

	var start := UiKit.button("出击", UiKit.FS_H2, UiKit.TEAL)
	start.pressed.connect(func(): AppState.goto("res://scenes/ui/level_select.tscn"))
	root.add_child(start)

	var deck := UiKit.ghost_button("卡组编辑", UiKit.FS_BODY, UiKit.LINE)
	deck.pressed.connect(func(): AppState.goto("res://scenes/ui/deck_builder.tscn"))
	root.add_child(deck)

	var codex := UiKit.ghost_button("卡牌图鉴", UiKit.FS_BODY, UiKit.LINE)
	codex.pressed.connect(func(): AppState.goto("res://scenes/ui/codex.tscn"))
	root.add_child(codex)

	root.add_child(UiKit.hsep(20))
	root.add_child(UiKit.divider())
	_challenge_preview = UiKit.label(_status_text(), UiKit.FS_SMALL, UiKit.TEXT_DIM)
	_challenge_preview.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	root.add_child(_challenge_preview)
	root.add_child(UiKit.hsep(10))

	var quit := UiKit.ghost_button("退出", UiKit.FS_BODY, UiKit.DANGER)
	quit.pressed.connect(func(): get_tree().quit())
	root.add_child(quit)


func _status_text() -> String:
	var unlocked := AppState.unlocked_levels.size()
	var best := AppState.best_result("L1-1")
	var line := "进度：已解锁 %d 关　｜　字体：%s" % [unlocked, UiFont.source_path]
	if not best.is_empty():
		line += "\nL1-1 最佳：评级 %s（%.2f）" % [best.get("grade", "-"), float(best.get("score", 0.0))]
	return line
