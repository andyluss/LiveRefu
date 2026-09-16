extends Control
## LevelSelect —— 关卡选择 + 挑战卡（doc 06 第三节：难度也是卡，局前自选）。

const CARD_W := 112.0

var _selected_level: String = ""
var _level_list: VBoxContainer
var _detail: VBoxContainer
var _challenge_list: VBoxContainer


func _ready() -> void:
	set_anchors_preset(Control.PRESET_FULL_RECT)
	_selected_level = AppState.level_id
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
	root.add_theme_constant_override("separation", 10)
	add_child(root)

	var head := HBoxContainer.new()
	head.add_theme_constant_override("separation", 10)
	var back := UiKit.ghost_button("← 返回", UiKit.FS_SMALL, UiKit.LINE)
	back.custom_minimum_size = Vector2(96, 44)
	back.pressed.connect(func(): AppState.goto("res://scenes/ui/main_menu.tscn"))
	head.add_child(back)
	head.add_child(UiKit.label("选择关卡", UiKit.FS_H1, UiKit.TEXT))
	root.add_child(head)
	root.add_child(UiKit.label("关卡 = 地图卡 + 波次卡组 + 事件卡组 + 规则卡（doc 06）。",
		UiKit.FS_SMALL, UiKit.TEXT_DIM))

	_level_list = VBoxContainer.new()
	_level_list.add_theme_constant_override("separation", 8)
	root.add_child(_level_list)

	root.add_child(UiKit.divider())
	root.add_child(UiKit.label("挑战卡（难度也是卡）", UiKit.FS_H2, UiKit.AMBER))
	_challenge_list = VBoxContainer.new()
	_challenge_list.add_theme_constant_override("separation", 6)
	root.add_child(_challenge_list)

	root.add_child(UiKit.divider())
	_detail = VBoxContainer.new()
	_detail.add_theme_constant_override("separation", 6)
	root.add_child(_detail)

	var actions := HBoxContainer.new()
	actions.add_theme_constant_override("separation", 8)
	var deck := UiKit.ghost_button("编辑卡组", UiKit.FS_BODY, UiKit.LINE)
	deck.pressed.connect(func():
		AppState.level_id = _selected_level
		AppState.goto("res://scenes/ui/deck_builder.tscn"))
	actions.add_child(deck)
	var go := UiKit.button("开始战斗", UiKit.FS_BODY, UiKit.TEAL)
	go.pressed.connect(func():
		AppState.level_id = _selected_level
		AppState.start_battle())
	actions.add_child(go)
	root.add_child(actions)


func _refresh() -> void:
	for c in _level_list.get_children():
		_level_list.remove_child(c)
		c.queue_free()
	for level in GameData.levels:
		var lid := String(level.get("id", ""))
		var unlocked := AppState.is_unlocked(lid)
		var selected := lid == _selected_level
		var row := UiKit.panel(UiKit.BG_PANEL if not selected else Color("#16283a"),
			12, UiKit.TEAL if selected else UiKit.LINE, 2 if selected else 1)
		var line := HBoxContainer.new()
		line.add_theme_constant_override("separation", 10)
		var col := VBoxContainer.new()
		col.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		col.add_child(UiKit.label("%s　%s" % [lid, level.get("name", "")], UiKit.FS_H2, UiKit.TEXT))
		var map_data := GameData.get_map(level.get("map", ""))
		var best := AppState.best_result(lid)
		var sub := "%s　｜　%s　｜　%s" % [map_data.get("name", ""), level.get("wave_set", ""),
			"可挂挑战卡" if bool(level.get("challenges_allowed", false)) else "教学关（不开放挑战卡）"]
		if not best.is_empty():
			sub += "　｜　最佳 %s" % best.get("grade", "-")
		col.add_child(UiKit.label(sub, UiKit.FS_SMALL, UiKit.TEXT_DIM))
		col.add_child(UiKit.label(String(level.get("desc", "")), UiKit.FS_TINY, UiKit.TEXT_FAINT))
		line.add_child(col)
		if not unlocked:
			line.add_child(UiKit.label("未解锁", UiKit.FS_SMALL, UiKit.DANGER))
		row.add_child(line)
		if unlocked:
			var btn := UiKit.ghost_button("选择", UiKit.FS_SMALL, UiKit.TEAL)
			btn.custom_minimum_size = Vector2(80, 40)
			btn.pressed.connect(func():
				_selected_level = lid
				AppState.level_id = lid
				AppState.challenge_ids.clear()
				_refresh())
			row.add_child(btn)
		_level_list.add_child(row)

	_refresh_challenges()
	_refresh_detail()


func _refresh_challenges() -> void:
	for c in _challenge_list.get_children():
		_challenge_list.remove_child(c)
		c.queue_free()
	var level := GameData.get_level(_selected_level)
	var allowed_here := bool(level.get("challenges_allowed", false))
	if not allowed_here:
		_challenge_list.add_child(UiKit.label(
			"本关为教学关，不开放挑战卡（doc 06 第四节：可读性是第一难度参数）。",
			UiKit.FS_SMALL, UiKit.TEXT_DIM))
		return
	var total_score := 0
	for cid in AppState.challenge_ids:
		total_score += int(GameData.challenges.get(cid, {}).get("score", 0))
	for cid in GameData.challenges.keys():
		var ch: Dictionary = GameData.challenges[cid]
		var picked := AppState.challenge_ids.has(cid)
		var check := AppState.challenge_allowed(cid)
		var row := HBoxContainer.new()
		row.add_theme_constant_override("separation", 8)
		var info := VBoxContainer.new()
		info.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		info.add_child(UiKit.label("%s　难度分 %d　掉落 +%d%%" % [ch.get("name", ""), int(ch.get("score", 0)),
			int(float(ch.get("reward", {}).get("drop", 0.0)) * 100.0)], UiKit.FS_BODY, UiKit.TEXT))
		var sub := String(ch.get("desc", ""))
		if not bool(check["ok"]):
			sub += "　⛔ " + String(check["reason"])
		info.add_child(UiKit.label(sub, UiKit.FS_TINY, UiKit.TEXT_DIM if bool(check["ok"]) else UiKit.DANGER))
		row.add_child(info)
		var btn := UiKit.ghost_button("取消" if picked else "选上", UiKit.FS_SMALL,
			UiKit.AMBER if picked else UiKit.LINE)
		btn.custom_minimum_size = Vector2(76, 40)
		btn.disabled = (not picked) and (not bool(check["ok"]))
		btn.pressed.connect(func():
			if picked:
				AppState.challenge_ids.erase(cid)
			else:
				AppState.challenge_ids.append(cid)
			_refresh())
		row.add_child(btn)
		_challenge_list.add_child(row)
	var score_row := HBoxContainer.new()
	score_row.add_child(UiKit.label("已选难度分合计 %d / 上限 %d　→　掉落系数 ×%.2f"
		% [total_score, GameData.challenge_score_cap(), minf(2.0, 1.0 + 0.05 * total_score)],
		UiKit.FS_SMALL, UiKit.PURPLE))
	_challenge_list.add_child(score_row)


func _refresh_detail() -> void:
	for c in _detail.get_children():
		_detail.remove_child(c)
		c.queue_free()
	var level := GameData.get_level(_selected_level)
	var map_data := GameData.get_map(level.get("map", ""))
	var rule := GameData.get_rule(level.get("rule", ""))
	var wave_set := GameData.get_wave_set(level.get("wave_set", ""))

	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 10)
	row.add_child(UiKit.label("地图卡", UiKit.FS_SMALL, UiKit.TEXT_DIM))
	row.add_child(UiKit.label("%s　%s" % [map_data.get("id", ""), map_data.get("name", "")],
		UiKit.FS_BODY, UiKit.TEXT))
	row.add_child(UiKit.label("标准 %d / 支援 %d / 修饰 %d" % [
		(map_data.get("slots", {}) as Dictionary).get("standard", []).size(),
		(map_data.get("slots", {}) as Dictionary).get("support", []).size(),
		(map_data.get("slots", {}) as Dictionary).get("modifier", []).size()],
		UiKit.FS_SMALL, UiKit.TEXT_DIM))
	_detail.add_child(row)

	var terrain_names: Array[String] = []
	for tile in map_data.get("terrain", []):
		var def := GameData.terrain_def(String(tile.get("id", "")))
		var label := String(def.get("label", ""))
		if not terrain_names.has(label):
			terrain_names.append(label)
	_detail.add_child(UiKit.label("地形：%s　｜　规则卡 %s（基地 %d / 起始能量 %d / 人口 %d）"
		% ["、".join(terrain_names), level.get("rule", ""), int(rule.get("base_hp", 20)),
		   int(rule.get("start_energy", 10)), int(rule.get("population_cap", 5))],
		UiKit.FS_SMALL, UiKit.TEXT_DIM))

	var waves: Array = wave_set.get("waves", [])
	var lines: Array[String] = []
	for w in waves:
		var parts: Array[String] = []
		for comp in w.get("composition", []):
			parts.append("%s×%d" % [GameData.get_enemy(String(comp.get("enemy", ""))).get("name", ""),
				int(comp.get("count", 0))])
		lines.append("W%d %s" % [int(w.get("index", 0)), " + ".join(parts)])
	_detail.add_child(UiKit.label("波次卡组 %s（合计威胁值 B=%d）：%s"
		% [wave_set.get("id", ""), int(wave_set.get("total_threat", 0)), "　".join(lines)],
		UiKit.FS_TINY, UiKit.TEXT_DIM))

	var deck_check := AppState.validate_deck(AppState.deck_ids)
	_detail.add_child(UiKit.label("当前卡组 %d 张　%s" % [AppState.deck_ids.size(),
		"✅ 合法" if bool(deck_check["ok"]) else "❌ " + String(deck_check["reason"])],
		UiKit.FS_SMALL, UiKit.GREEN if bool(deck_check["ok"]) else UiKit.DANGER))
