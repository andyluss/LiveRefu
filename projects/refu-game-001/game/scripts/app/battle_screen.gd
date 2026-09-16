extends Control
## BattleScreen —— 一局的主界面：HUD + 战场 + 手牌 + 弹窗。
##
## 分层约定（对应 doc 04 / 07）：
##   * 逻辑：core/battle.gd（纯逻辑，固定步长）
##   * 画面：view/battle_view.gd（只画）
##   * 本文件：把两者接起来 —— 布局、输入（拖拽/长按/双击/上滑）、弹窗、结算
## 竖屏 720×1280：HUD 100 / 战场 600 / 波次预告 70 / 手牌 350 / 底栏 160。

const TICK_HZ := 30.0
const HUD_H := 100.0
const FIELD_TOP := 100.0
const FIELD_H := 600.0
const STRIP_TOP := 700.0
const STRIP_H := 70.0
const HAND_TOP := 770.0
const HAND_H := 350.0

var battle: Battle = null
var view: BattleView = null

# --- HUD 引用 ---
var _base_bar: ProgressBar
var _base_label: Label
var _energy_label: Label
var _wave_label: Label
var _phase_label: Label
var _speed_button: Button
var _enemies_label: Label
var _strip: HBoxContainer
var _hand_grid: GridContainer
var _hint_label: Label
var _log_label: Label
var _bonds_label: Label

# --- 交互状态 ---
var _card_views: Array[CardView] = []
var _drag_card_id: String = ""
var _drag_from_hand: bool = true
var _targeting_card_id: String = ""
var _selected_tower_uid: int = 0
var _modal: Control = null
var _acc: float = 0.0
var _paused: bool = false
var _result_shown: bool = false
var _last_log_index: int = 0


func _ready() -> void:
	set_anchors_preset(Control.PRESET_FULL_RECT)
	_start_battle()
	_build_ui()
	_refresh_all()


func _start_battle() -> void:
	battle = Battle.new(AppState.level_id, AppState.challenge_ids, AppState.deck_ids, AppState.seed_value)
	battle.start()


# ==================================================================== 布局

func _build_ui() -> void:
	var bg := ColorRect.new()
	bg.color = UiKit.BG_DEEP
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	bg.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(bg)

	_build_hud()
	_build_field()
	_build_strip()
	_build_hand()
	_build_bottom()


func _build_hud() -> void:
	var hud := UiKit.panel(UiKit.BG_PANEL, 0, UiKit.LINE, 0)
	hud.position = Vector2(0, 0)
	hud.size = Vector2(720, HUD_H)
	hud.mouse_filter = Control.MOUSE_FILTER_PASS

	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 12)
	hud.add_child(row)

	# 基地生命
	var base_box := VBoxContainer.new()
	base_box.custom_minimum_size = Vector2(200, 0)
	_base_label = UiKit.label("基地 20 / 20", UiKit.FS_SMALL, UiKit.TEXT)
	_base_bar = UiKit.bar(20, 20, UiKit.DANGER, 190, 12)
	base_box.add_child(_base_label)
	base_box.add_child(_base_bar)
	row.add_child(base_box)

	# 能量
	var energy_box := VBoxContainer.new()
	energy_box.custom_minimum_size = Vector2(96, 0)
	energy_box.add_child(UiKit.label("能量", UiKit.FS_TINY, UiKit.TEXT_DIM))
	_energy_label = UiKit.label("10", UiKit.FS_H1, UiKit.TEAL)
	energy_box.add_child(_energy_label)
	row.add_child(energy_box)

	# 波次 / 阶段
	var wave_box := VBoxContainer.new()
	wave_box.custom_minimum_size = Vector2(150, 0)
	_wave_label = UiKit.label("波次 1 / 6", UiKit.FS_BODY, UiKit.TEXT)
	_phase_label = UiKit.label("布防期 15s", UiKit.FS_SMALL, UiKit.AMBER)
	wave_box.add_child(_wave_label)
	wave_box.add_child(_phase_label)
	row.add_child(wave_box)

	# 场上敌人 / 羁绊
	var info_box := VBoxContainer.new()
	info_box.custom_minimum_size = Vector2(150, 0)
	_enemies_label = UiKit.label("敌人 0", UiKit.FS_TINY, UiKit.TEXT_DIM)
	_bonds_label = UiKit.label("羁绊 —", UiKit.FS_TINY, UiKit.PURPLE)
	info_box.add_child(_enemies_label)
	info_box.add_child(_bonds_label)
	row.add_child(info_box)

	# 控制
	var ctrl := HBoxContainer.new()
	ctrl.add_theme_constant_override("separation", 6)
	_speed_button = UiKit.ghost_button("1×", UiKit.FS_SMALL, UiKit.TEAL)
	_speed_button.custom_minimum_size = Vector2(56, 40)
	_speed_button.pressed.connect(_toggle_speed)
	ctrl.add_child(_speed_button)
	var pause_btn := UiKit.ghost_button("暂停", UiKit.FS_SMALL, UiKit.LINE)
	pause_btn.custom_minimum_size = Vector2(64, 40)
	pause_btn.pressed.connect(_toggle_pause)
	ctrl.add_child(pause_btn)
	row.add_child(ctrl)

	add_child(hud)


func _build_field() -> void:
	var field := Control.new()
	field.position = Vector2(0, FIELD_TOP)
	field.size = Vector2(720, FIELD_H)
	field.mouse_filter = Control.MOUSE_FILTER_STOP
	field.gui_input.connect(_on_field_input)
	add_child(field)

	view = BattleView.new()
	view.setup(battle)
	view.configure(Vector2(720, FIELD_H - 20), Vector2(0, 10))
	field.add_child(view)


func _build_strip() -> void:
	var strip_panel := UiKit.panel(UiKit.BG_PANEL_SOFT, 0, UiKit.LINE, 0)
	strip_panel.position = Vector2(0, STRIP_TOP)
	strip_panel.size = Vector2(720, STRIP_H)
	add_child(strip_panel)
	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation", 2)
	strip_panel.add_child(box)
	box.add_child(UiKit.label("下一波预告", UiKit.FS_TINY, UiKit.TEXT_DIM))
	_strip = HBoxContainer.new()
	_strip.add_theme_constant_override("separation", 10)
	box.add_child(_strip)


func _build_hand() -> void:
	var hand_panel := UiKit.panel(UiKit.BG_PANEL, 0, UiKit.LINE, 0)
	hand_panel.position = Vector2(0, HAND_TOP)
	hand_panel.size = Vector2(720, HAND_H)
	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation", 4)
	hand_panel.add_child(box)

	var hand_head := HBoxContainer.new()
	hand_head.add_child(UiKit.label("手牌", UiKit.FS_BODY, UiKit.TEXT))
	hand_head.add_child(UiKit.label("　拖到塔位放置 · 点一下看详情 · 拖到已有塔上＝挂修饰",
		UiKit.FS_TINY, UiKit.TEXT_FAINT))
	box.add_child(hand_head)

	_hand_grid = GridContainer.new()
	_hand_grid.columns = 6
	_hand_grid.add_theme_constant_override("h_separation", 6)
	_hand_grid.add_theme_constant_override("v_separation", 6)
	box.add_child(_hand_grid)

	add_child(hand_panel)


func _build_bottom() -> void:
	var bottom := UiKit.panel(UiKit.BG_PANEL_SOFT, 0, UiKit.LINE, 0)
	bottom.position = Vector2(0, HAND_TOP + HAND_H)
	bottom.size = Vector2(720, 1280 - (HAND_TOP + HAND_H))
	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation", 4)
	bottom.add_child(box)
	_hint_label = UiKit.label("提示：先放塔，再考虑修饰与支援。", UiKit.FS_SMALL, UiKit.AMBER)
	_log_label = UiKit.label("", UiKit.FS_TINY, UiKit.TEXT_DIM)
	_log_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	box.add_child(_hint_label)
	box.add_child(_log_label)

	var btns := HBoxContainer.new()
	btns.add_theme_constant_override("separation", 8)
	var skip := UiKit.ghost_button("跳过布防", UiKit.FS_TINY, UiKit.TEAL)
	skip.custom_minimum_size = Vector2(96, 40)
	skip.pressed.connect(_skip_build)
	btns.add_child(skip)
	var ranges := UiKit.ghost_button("显示射程", UiKit.FS_TINY, UiKit.LINE)
	ranges.custom_minimum_size = Vector2(96, 40)
	ranges.pressed.connect(func(): view.show_all_ranges = not view.show_all_ranges)
	btns.add_child(ranges)
	var back := UiKit.ghost_button("放弃返回", UiKit.FS_TINY, UiKit.DANGER)
	back.custom_minimum_size = Vector2(96, 40)
	back.pressed.connect(func(): AppState.goto("res://scenes/ui/level_select.tscn"))
	btns.add_child(back)
	box.add_child(btns)

	add_child(bottom)


# ==================================================================== 主循环

func _process(delta: float) -> void:
	if battle == null:
		return
	if _modal != null or _paused:
		return
	var speed := AppState.speed_multiplier
	_acc += delta * speed
	var step := 1.0 / TICK_HZ
	var guard := 0
	while _acc >= step and guard < 240:
		battle.tick(step)
		_acc -= step
		guard += 1
	_refresh_all()
	if (battle.phase == Battle.PHASE_WON or battle.phase == Battle.PHASE_LOST) and not _result_shown:
		_show_result()
	elif battle.phase == Battle.PHASE_DRAW and _modal == null:
		_show_draw_modal()


# ==================================================================== 刷新

func _refresh_all() -> void:
	_base_bar.max_value = battle.base_hp_max
	_base_bar.value = battle.base_hp
	_base_label.text = "基地 %d / %d" % [int(battle.base_hp), int(battle.base_hp_max)]
	_energy_label.text = str(int(battle.energy))
	_wave_label.text = "波次 %d / %d" % [battle.current_wave_number(), battle.total_waves()]
	match battle.phase:
		Battle.PHASE_BUILD:
			_phase_label.text = "布防期 %.0fs" % battle.build_time_left()
			_phase_label.add_theme_color_override("font_color", UiKit.AMBER)
		Battle.PHASE_BREATH:
			_phase_label.text = "波间 %.0fs" % battle.build_time_left()
			_phase_label.add_theme_color_override("font_color", UiKit.TEAL)
		Battle.PHASE_WAVE:
			_phase_label.text = "交战中"
			_phase_label.add_theme_color_override("font_color", UiKit.DANGER)
		Battle.PHASE_DRAW:
			_phase_label.text = "调度中"
			_phase_label.add_theme_color_override("font_color", UiKit.PURPLE)
		_:
			_phase_label.text = "已结束"
	var alive := 0
	for e in battle.enemies:
		if e.alive:
			alive += 1
	_enemies_label.text = "敌 %d · 杀 %d · 漏 %d" % [alive, int(battle.stats["kills"]), int(battle.stats["leaks"])]
	if battle.active_bonds.is_empty():
		_bonds_label.text = "羁绊 —"
	else:
		var names: Array[String] = []
		for b in battle.active_bonds:
			names.append(String(b.get("name", "")))
		_bonds_label.text = "羁绊 " + "、".join(names)
	_speed_button.text = "%d×" % int(AppState.speed_multiplier)
	_refresh_strip()
	_refresh_hand()
	if battle.log_lines.size() > _last_log_index:
		var last: Dictionary = battle.log_lines[battle.log_lines.size() - 1]
		_log_label.text = String(last["text"])
		_last_log_index = battle.log_lines.size()
	_hint_label.text = _hint_text()
	view.selected_tower_uid = _selected_tower_uid


func _hint_text() -> String:
	if _targeting_card_id != "":
		return "选择目标：点一座已放置的塔 → 施放「%s」" % GameData.get_card(_targeting_card_id).get("name", "")
	if _drag_card_id != "":
		return "拖到高亮位置上松手即可放置"
	if battle.phase == Battle.PHASE_BUILD:
		return "布防期：把塔拖到标准塔位（深蓝方格）"
	if battle.phase == Battle.PHASE_DRAW:
		return "波间调度：三选一，抽一张进手牌"
	return "提示：点已放置的塔可查看详情或回收（返还 50%）"


var _strip_key: String = ""


func _refresh_strip() -> void:
	var idx := battle.wave_index
	var key := "%d|%d|%d" % [idx, battle.phase == Battle.PHASE_WAVE as int, battle.total_waves()]
	if key == _strip_key and _strip.get_child_count() > 0:
		return
	_strip_key = key
	for c in _strip.get_children():
		_strip.remove_child(c)
		c.queue_free()
	for item in battle.wave_preview(idx):
		var e: Dictionary = item["enemy"]
		var box := VBoxContainer.new()
		box.add_theme_constant_override("separation", 0)
		box.add_child(UiKit.label("%s ×%d" % [e.get("name", ""), int(item["count"])], UiKit.FS_SMALL, UiKit.TEXT))
		box.add_child(UiKit.label("威胁 %d · %s" % [int(e.get("threat", 0)), String(e.get("desc", ""))],
			UiKit.FS_TINY, UiKit.TEXT_DIM))
		_strip.add_child(box)


var _hand_key: String = ""


func _refresh_hand() -> void:
	# 相同卡号合并显示并带 ×N 角标（手牌可能同时有多张同名卡）
	var counts := {}
	var order: Array[String] = []
	for cid in battle.deck.hand:
		if not counts.has(cid):
			counts[cid] = 0
			order.append(cid)
		counts[cid] = int(counts[cid]) + 1
	order.sort()
	var key := ",".join(order)
	if key == _hand_key and _card_views.size() == order.size():
		for i in mini(order.size(), _card_views.size()):
			var cid2 := order[i]
			_card_views[i].set_selected(cid2 == _drag_card_id or cid2 == _targeting_card_id)
			_card_views[i].set_affordable(battle.affordable(cid2), _why_unaffordable(cid2))
		return
	_hand_key = key
	if _card_views.size() != order.size():
		for c in _hand_grid.get_children():
			_hand_grid.remove_child(c)
			c.queue_free()
		_card_views.clear()
		for cid in order:
			var cv := CardView.new()
			cv.custom_minimum_size = Vector2(112, 160)
			cv.setup(GameData.get_card(cid), true)
			cv.pressed.connect(_on_card_pressed)
			cv.long_pressed.connect(_on_card_long_pressed)
			_hand_grid.add_child(cv)
			_card_views.append(cv)
	for i in mini(order.size(), _card_views.size()):
		var cid := order[i]
		var cv := _card_views[i]
		cv.setup(GameData.get_card(cid), true)
		cv.show_count = int(counts[cid])
		cv.set_selected(cid == _targeting_card_id or cid == _drag_card_id)
		cv.set_affordable(battle.affordable(cid), _why_unaffordable(cid))


func _why_unaffordable(cid: String) -> String:
	var card := GameData.get_card(cid)
	if battle.energy < float(card.get("cost", 0)):
		return "能量不足"
	return ""


# ==================================================================== 输入

## 点一下手牌 = 选中该卡（战场高亮可放位置）；再点一次取消。
## 长按 = 打开完整卡面（doc 07：长按读完整卡面，暂停战场）。
func _on_card_pressed(cv: CardView) -> void:
	var cid := String(cv.card.get("id", ""))
	if _drag_card_id == cid:
		_drag_card_id = ""
		_targeting_card_id = ""
		view.ghost = {}
		_refresh_all()
		return
	_drag_card_id = cid
	_targeting_card_id = "" if String(cv.card.get("type", "")) != "skill" else cid
	_selected_tower_uid = 0
	_update_drag_preview(cid, Vector2(490, 330))
	_refresh_all()


func _on_card_long_pressed(cv: CardView) -> void:
	_show_card_detail(String(cv.card.get("id", "")))


## 战场点击：放置 / 施放 / 查看塔
func _input(event: InputEvent) -> void:
	if _modal != null or _drag_card_id == "":
		return
	if event is InputEventMouseButton and not event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
		var local: Vector2 = event.position
		if local.y > FIELD_TOP and local.y < FIELD_TOP + FIELD_H:
			var world: Vector2 = view.to_world(local - Vector2(0, FIELD_TOP))
			var res := _try_place(_drag_card_id, world)
			if bool(res["ok"]):
				_drag_card_id = ""
				_targeting_card_id = ""
				view.ghost = {}
				_refresh_all()


func _on_field_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
		var world: Vector2 = view.to_world(event.position + Vector2(0, FIELD_TOP))
		if _targeting_card_id != "":
			var tw := battle.tower_at(world, 60.0)
			if tw != null:
				var res := battle.cast_card(_targeting_card_id, tw.uid)
				if bool(res["ok"]):
					_close_modal()
					_targeting_card_id = ""
					_refresh_all()
					return
			return
		if _drag_card_id != "":
			var res2 := _try_place(_drag_card_id, world)
			if bool(res2["ok"]):
				_drag_card_id = ""
				_close_modal()
				_refresh_all()
			return
		# 没在拖牌：点塔看详情
		var tw2 := battle.tower_at(world, 60.0)
		_selected_tower_uid = tw2.uid if tw2 != null else 0
		if tw2 != null:
			_show_tower_detail(tw2)
		view.ghost = {}
		_refresh_all()
	elif event is InputEventMouseMotion and _drag_card_id != "":
		var world2: Vector2 = view.to_world(event.position + Vector2(0, FIELD_TOP))
		_update_drag_preview(_drag_card_id, world2)


func _update_drag_preview(cid: String, world: Vector2) -> void:
	var card := GameData.get_card(cid)
	var ctype := String(card.get("type", ""))
	var ok := false
	var radius := 0.0
	var pos := world
	match ctype:
		"tower":
			var slot := GameData.slot_at(battle.map_data, world, 52.0)
			if not slot.is_empty():
				pos = slot["pos"]
				ok = String(slot["type"]) == "standard" and battle.tower_at(pos, 40.0) == null
			radius = float((card.get("stats", {}) as Dictionary).get("range", 0.0))
		"unit":
			var slot2 := GameData.slot_at(battle.map_data, world, 52.0)
			if String(card.get("slot", "")) == "path":
				var near := battle._nearest_path_point(world)
				if not near.is_empty():
					pos = near["pos"]
					ok = true
			elif not slot2.is_empty():
				pos = slot2["pos"]
				ok = String(slot2["type"]) == "support" and battle.tower_at(pos, 40.0) == null
		"modifier":
			var tw := battle.tower_at(world, 60.0)
			if tw != null:
				pos = tw.pos
				ok = true
			else:
				var slot3 := GameData.slot_at(battle.map_data, world, 52.0)
				if not slot3.is_empty() and String(slot3["type"]) == "modifier":
					pos = slot3["pos"]
					ok = true
	view.ghost = {"pos": pos, "ok": ok, "radius": radius}


func _try_place(cid: String, world: Vector2) -> Dictionary:
	var card := GameData.get_card(cid)
	var ctype := String(card.get("type", ""))
	if ctype == "skill":
		# 技能：需要目标就进入指定目标状态；不需要则直接施放
		var need_target := false
		for eff in (card.get("hooks", {}) as Dictionary).get("on_cast", []):
			if String(eff.get("target", "")) == "selected_tower":
				need_target = true
		if need_target:
			_targeting_card_id = cid
			_hint_label.text = _hint_text()
			return {"ok": false, "reason": "请选择目标塔"}
		var res := battle.cast_card(cid, 0)
		return res
	if ctype == "modifier" and String(cid) == "ANV-X03":
		var tw := battle.tower_at(world, 60.0)
		if tw != null:
			_show_tag_choice(cid, tw.uid)
			return {"ok": false, "reason": "选择附加标签"}
	var result := battle.place_card(cid, world, {})
	if not bool(result["ok"]):
		_flash(String(result["reason"]))
	return result


func _flash(text: String) -> void:
	_hint_label.text = text
	_hint_label.add_theme_color_override("font_color", UiKit.DANGER)
	await get_tree().create_timer(1.4).timeout
	_hint_label.add_theme_color_override("font_color", UiKit.AMBER)


func _skip_build() -> void:
	if battle.phase == Battle.PHASE_BUILD or battle.phase == Battle.PHASE_BREATH:
		battle.phase_t = 9999.0


func _toggle_speed() -> void:
	AppState.speed_multiplier = 1.0 if AppState.speed_multiplier >= 2.0 else 2.0


func _toggle_pause() -> void:
	_paused = not _paused


# ==================================================================== 弹窗

func _make_modal(panel: Control, width: float, height: float) -> void:
	_close_modal()
	var layer := ColorRect.new()
	layer.color = Color(0, 0, 0, 0.62)
	layer.set_anchors_preset(Control.PRESET_FULL_RECT)
	layer.mouse_filter = Control.MOUSE_FILTER_STOP
	add_child(layer)
	panel.position = Vector2((720 - width) * 0.5, (1280 - height) * 0.5)
	panel.size = Vector2(width, height)
	layer.add_child(panel)
	_modal = layer


func _close_modal() -> void:
	if _modal != null and is_instance_valid(_modal):
		_modal.queue_free()
	_modal = null


## 卡牌详情：长按/点击读完整卡面（doc 07：长按读完整卡面）。
func _show_card_detail(cid: String) -> void:
	var card := GameData.get_card(cid)
	if card.is_empty():
		return
	var panel := UiKit.card_panel(UiKit.TYPE_COLORS.get(String(card.get("type", "")), UiKit.TEAL), 14)
	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation", 6)
	panel.add_child(box)

	# 美术出图卡面（700×974）等比缩到弹窗宽度
	var art_path := String(card.get("icon", ""))
	if art_path != "" and ResourceLoader.exists(art_path):
		var tr := TextureRect.new()
		tr.texture = load(art_path)
		tr.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		tr.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
		tr.custom_minimum_size = Vector2(340, 473)
		box.add_child(tr)

	var stats_line: Array[String] = []
	for pair in card.get("face_stats", []):
		stats_line.append("%s %s" % [pair[0], pair[1]])
	box.add_child(UiKit.label("　".join(stats_line), UiKit.FS_BODY, UiKit.TEXT))
	box.add_child(UiKit.label("费用 %d · %s · %s" % [int(card.get("cost", 0)),
		UiKit.SLOT_LABELS.get(String(card.get("slot", "none")), ""), String(card.get("keyword", ""))],
		UiKit.FS_SMALL, UiKit.TEXT_DIM))
	box.add_child(UiKit.label(String(card.get("effect_line", "")), UiKit.FS_SMALL, UiKit.TEXT))
	var hooks: Dictionary = card.get("hooks", {})
	var hook_names: Array[String] = []
	for k in hooks.keys():
		hook_names.append(String(k))
	box.add_child(UiKit.label("钩子：%s" % ("、".join(hook_names) if not hook_names.is_empty() else "—"),
		UiKit.FS_TINY, UiKit.TEXT_DIM))
	box.add_child(UiKit.label(String(card.get("flavor", "")), UiKit.FS_TINY, UiKit.TEXT_FAINT))

	var actions := HBoxContainer.new()
	actions.add_theme_constant_override("separation", 8)
	var hint := UiKit.label("拖到战场放置；点关闭取消。", UiKit.FS_TINY, UiKit.TEXT_DIM)
	actions.add_child(hint)
	var close := UiKit.ghost_button("关闭", UiKit.FS_SMALL, UiKit.LINE)
	close.pressed.connect(func():
		_drag_card_id = ""
		_targeting_card_id = ""
		view.ghost = {}
		_close_modal()
		_refresh_all())
	actions.add_child(close)
	box.add_child(actions)

	_make_modal(panel, 430, 880)


func _show_tower_detail(tw: TowerUnit) -> void:
	var panel := UiKit.card_panel(UiKit.FACTION_COLORS.get(tw.faction, UiKit.BLUE))
	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation", 6)
	panel.add_child(box)
	box.add_child(UiKit.label(tw.name, UiKit.FS_H1, UiKit.TEXT))
	var tags: Array[String] = []
	for t in tw.tags:
		tags.append(String(t))
	box.add_child(UiKit.label("标签：%s　｜　羁绊按「本局上过场的卡」计数" % "、".join(tags),
		UiKit.FS_TINY, UiKit.TEXT_DIM))
	if tw.max_hp > 0.0:
		box.add_child(UiKit.label("生命 %d / %d　护盾 %d" % [int(tw.hp), int(tw.max_hp), int(tw.shield)],
			UiKit.FS_SMALL, UiKit.TEXT))
	if tw.is_attacker():
		box.add_child(UiKit.label("伤害 %.1f　攻速 %.2f/s　射程 %.1f 格　穿透 %d%s" % [
			float(tw.stats.get("damage", 0.0)), float(tw.stats.get("attack_speed", 0.0)),
			float(tw.stats.get("range", 0.0)), int(tw.stats.get("pierce", 0.0)),
			"　可对空" if float(tw.stats.get("targets_air", 0.0)) > 0.5 else "　不可对空"],
			UiKit.FS_SMALL, UiKit.TEXT))
	box.add_child(UiKit.label("累计伤害 %d　击杀 %d" % [int(tw.damage_dealt), tw.kills],
		UiKit.FS_SMALL, UiKit.TEXT_DIM))
	var mods: Array[String] = []
	for m in tw.modifiers:
		mods.append(String(GameData.get_card(String(m["card_id"])).get("name", m["card_id"])))
	box.add_child(UiKit.label("修饰：%s" % ("、".join(mods) if not mods.is_empty() else "无"),
		UiKit.FS_SMALL, UiKit.PURPLE))
	if tw.buffs.size() > 0:
		var buffs: Array[String] = []
		for b in tw.buffs:
			buffs.append("%s %+.0f%%" % [String(b["stat"]), float(b["value"]) * 100.0])
		box.add_child(UiKit.label("增益：%s" % "、".join(buffs), UiKit.FS_TINY, UiKit.TEAL))

	var actions := HBoxContainer.new()
	actions.add_theme_constant_override("separation", 8)
	var sell := UiKit.ghost_button("回收（返还 50%%）", UiKit.FS_SMALL, UiKit.AMBER)
	sell.pressed.connect(func():
		var r := battle.sell_tower(tw.uid)
		if bool(r["ok"]):
			_selected_tower_uid = 0
			_close_modal()
			_refresh_all())
	actions.add_child(sell)
	var close := UiKit.ghost_button("关闭", UiKit.FS_SMALL, UiKit.LINE)
	close.pressed.connect(_close_modal)
	actions.add_child(close)
	box.add_child(actions)

	_make_modal(panel, 500, 420)


func _show_draw_modal() -> void:
	var panel := UiKit.card_panel(UiKit.PURPLE, 16)
	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation", 8)
	panel.add_child(box)
	box.add_child(UiKit.label("波间调度 · 三选一", UiKit.FS_H1, UiKit.TEXT))
	box.add_child(UiKit.label("每波结束获得 1 调度点，从卡组抽一张进手牌（doc 05）。",
		UiKit.FS_SMALL, UiKit.TEXT_DIM))
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 12)
	for cid in battle.pending_draw:
		var cv := CardView.new()
		cv.custom_minimum_size = Vector2(180, 256)
		cv.setup(GameData.get_card(cid), false)
		cv.pressed.connect(func(_cv):
			if battle.pick_draw(cid):
				_close_modal()
				_refresh_all())
		row.add_child(cv)
	box.add_child(row)
	_make_modal(panel, 640, 420)


func _show_tag_choice(cid: String, tower_uid: int) -> void:
	var panel := UiKit.card_panel(UiKit.PURPLE)
	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation", 8)
	panel.add_child(box)
	box.add_child(UiKit.label("模块换装：为本塔附加哪个标签？", UiKit.FS_H2, UiKit.TEXT))
	box.add_child(UiKit.label("ANV-X03 模块化基座：为本塔额外附加 1 个标签（弹药或工事）。",
		UiKit.FS_SMALL, UiKit.TEXT_DIM))
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 10)
	for tag in ["弹药", "工事"]:
		var b := UiKit.button(tag, UiKit.FS_BODY, UiKit.TEAL if tag == "弹药" else UiKit.BRASS)
		b.pressed.connect(func():
			var tw := battle._tower_by_uid(tower_uid)
			var res := battle.place_card(cid, tw.pos, {"target_uid": tower_uid, "tag_choice": tag})
			if bool(res["ok"]):
				_close_modal()
				_drag_card_id = ""
				_refresh_all())
		row.add_child(b)
	box.add_child(row)
	var cancel := UiKit.ghost_button("取消", UiKit.FS_SMALL, UiKit.LINE)
	cancel.pressed.connect(func():
		_drag_card_id = ""
		_close_modal())
	box.add_child(cancel)
	_make_modal(panel, 520, 280)


func _show_result() -> void:
	_result_shown = true
	var rat := battle.rating()
	AppState.record_result(rat)
	var win: bool = bool(rat["win"])
	var panel := UiKit.card_panel(UiKit.TEAL if win else UiKit.DANGER, 16)
	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation", 8)
	panel.add_child(box)
	box.add_child(UiKit.label("通关" if win else "基地失守", UiKit.FS_TITLE,
		UiKit.TEAL if win else UiKit.DANGER))
	box.add_child(UiKit.label("评级 %s　综合 %.2f" % [rat["grade"], rat["score"]], UiKit.FS_H1, UiKit.AMBER))
	box.add_child(UiKit.divider())
	box.add_child(UiKit.label("基地生命　%d / %d　（得分 %.2f）"
		% [rat["base_hp"], rat["base_hp_max"], rat["hp_score"]], UiKit.FS_BODY, UiKit.TEXT))
	box.add_child(UiKit.label("能量效率　%.2f　（花费 / 获得）" % rat["energy_score"], UiKit.FS_BODY, UiKit.TEXT))
	box.add_child(UiKit.label("组合触发　羁绊 %d 条 · 钩子 %d 次　（得分 %.2f）"
		% [rat["bonds"], rat["hook_triggers"], rat["combo_score"]], UiKit.FS_BODY, UiKit.TEXT))
	box.add_child(UiKit.divider())
	box.add_child(UiKit.label("击杀 %d · 漏怪 %d · 用时 %.0fs"
		% [rat["kills"], rat["leaks"], rat["duration"]], UiKit.FS_SMALL, UiKit.TEXT_DIM))
	if int(rat["challenge_score"]) > 0:
		box.add_child(UiKit.label("挑战卡难度分 %d → 掉落系数 ×%.2f · 评级加成 +%.0f%%"
			% [rat["challenge_score"], rat["drop_multiplier"], rat["rating_bonus"] * 100.0],
			UiKit.FS_SMALL, UiKit.PURPLE))
	else:
		box.add_child(UiKit.label("未挂挑战卡：难度分 0，掉落系数 ×1.00", UiKit.FS_SMALL, UiKit.TEXT_DIM))

	var actions := HBoxContainer.new()
	actions.add_theme_constant_override("separation", 8)
	var again := UiKit.button("再来一局", UiKit.FS_BODY, UiKit.TEAL)
	again.pressed.connect(func(): AppState.start_battle())
	actions.add_child(again)
	var deck := UiKit.ghost_button("改卡组", UiKit.FS_BODY, UiKit.LINE)
	deck.pressed.connect(func(): AppState.goto("res://scenes/ui/deck_builder.tscn"))
	actions.add_child(deck)
	var back := UiKit.ghost_button("返回关卡", UiKit.FS_BODY, UiKit.LINE)
	back.pressed.connect(func(): AppState.goto("res://scenes/ui/level_select.tscn"))
	actions.add_child(back)
	box.add_child(actions)

	_make_modal(panel, 620, 560)
