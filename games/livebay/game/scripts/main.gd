# LiveBay · 视图与输入
# 只负责画、点、显示；规则全在 core/sim.gd。
# 规则：TECH-A2（模拟与视图分离）、ART-C1（色板字体与比例）
extends Node2D

const DataLoaderScript = preload("res://scripts/core/data_loader.gd")
const SimScript = preload("res://scripts/core/sim.gd")
const RuntimeScript = preload("res://scripts/application/mission_runtime.gd")
const ReadModelScript = preload("res://scripts/application/mission_read_model.gd")
const InputScript = preload("res://scripts/presentation/game_input.gd")
const RendererScript = preload("res://scripts/presentation/game_renderer.gd")
const ExpansionBootScript = preload("res://scripts/expansion/expansion_boot.gd")

const PALETTE := {
	"paper": Color("#E9E3D5"),
	"panel": Color("#D6CEBC"),
	"cream": Color("#F5EFE2"),
	"ink": Color("#232B2F"),
	"slate": Color("#2F3A3E"),
	"teal": Color("#3E6F6B"),
	"orange": Color("#D9622B"),
	"amber": Color("#E0A22E"),
	"rust": Color("#8C4A32"),
	"sage": Color("#7C8F6B"),
}

const TOWER_ORDER := ["interceptor", "pulse", "supply"]
const VIEW_SIZE := Vector2(1280, 720)
const TOP_BAR_H := 56.0
const BOTTOM_BAR_H := 88.0

var data: Dictionary = {}
var runtime: LiveBayMissionRuntime
var sim: Variant = null
var renderer: LiveBayGameRenderer
var font: SystemFont
var ui_theme: Theme

var selected_tower_id := "interceptor"
var selected_slot := -1
var hover_slot := -1
var beams: Array = []
var leak_flash := 0.0
var toast_text := ""
var toast_timer := 0.0

var energy_label: Label
var integrity_label: Label
var wave_label: Label
var state_label: Label
var best_label: Label
var hint_label: Label
var tower_buttons: Array = []
var start_button: Button
var upgrade_button: Button
var sell_button: Button
var pause_button: Button
var speed_button: Button

var overlay: Control
var overlay_title: Label
var overlay_body: Label

var fatal_label: Label


func _exit_tree() -> void:
	if sim != null:
		if sim.tower_fired.is_connected(_on_tower_fired):
			sim.tower_fired.disconnect(_on_tower_fired)
		if sim.game_won.is_connected(_on_game_won):
			sim.game_won.disconnect(_on_game_won)
		if sim.game_lost.is_connected(_on_game_lost):
			sim.game_lost.disconnect(_on_game_lost)
		if sim.enemy_leaked.is_connected(_on_enemy_leaked):
			sim.enemy_leaked.disconnect(_on_enemy_leaked)
		if sim.fault_escaped.is_connected(_on_fault_escaped):
			sim.fault_escaped.disconnect(_on_fault_escaped)
		if sim.tower_disabled.is_connected(_on_tower_disabled):
			sim.tower_disabled.disconnect(_on_tower_disabled)
		if sim.wave_started.is_connected(_on_wave_started):
			sim.wave_started.disconnect(_on_wave_started)
	if runtime != null:
		runtime.dispose()
		runtime = null
	sim = null


func _ready() -> void:
	font = SystemFont.new()
	font.font_names = PackedStringArray([
		"PingFang SC",
		"Hiragino Sans GB",
		"Noto Sans CJK SC",
		"Source Han Sans SC",
		"Microsoft YaHei",
		"Arial Unicode MS",
	])
	font.allow_system_fallback = true

	ui_theme = Theme.new()
	ui_theme.default_font = font
	ui_theme.default_font_size = 16

	data = DataLoaderScript.load_mission_pack()
	if data.is_empty():
		_show_fatal("数据加载失败：请检查 game/data/*.json")
		return

	_new_sim()
	_build_ui()
	queue_redraw()


func _process(delta: float) -> void:
	if sim == null:
		return
	if runtime != null:
		runtime.step(delta)
	for i: int in range(beams.size() - 1, -1, -1):
		beams[i].life -= delta
		if beams[i].life <= 0.0:
			beams.remove_at(i)
	leak_flash = max(0.0, leak_flash - delta)
	toast_timer = max(0.0, toast_timer - delta)
	_update_ui()
	queue_redraw()


func _new_sim() -> void:
	var boot: LiveBayResult = ExpansionBootScript.load_preset("res://data/expansion_sets/baseline.json")
	var expansion_set: LiveBayExpansionSet = boot.data if boot.ok else null
	runtime = RuntimeScript.new(data, expansion_set)
	sim = runtime.sim
	sim.tower_fired.connect(_on_tower_fired)
	sim.game_won.connect(_on_game_won)
	sim.game_lost.connect(_on_game_lost)
	sim.enemy_leaked.connect(_on_enemy_leaked)
	sim.fault_escaped.connect(_on_fault_escaped)
	sim.tower_disabled.connect(_on_tower_disabled)
	sim.wave_started.connect(_on_wave_started)
	selected_slot = -1
	beams.clear()
	leak_flash = 0.0
	toast_timer = 0.0
	runtime.clock.paused = false
	if overlay != null:
		overlay.visible = false


# ---------------------------------------------------------------- UI 构建

func _build_ui() -> void:
	var layer := CanvasLayer.new()
	add_child(layer)
	var root := Control.new()
	root.set_anchors_preset(Control.PRESET_FULL_RECT)
	root.theme = ui_theme
	root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	layer.add_child(root)

	# 顶栏
	var top := Panel.new()
	top.position = Vector2.ZERO
	top.size = Vector2(VIEW_SIZE.x, TOP_BAR_H)
	top.add_theme_stylebox_override("panel", _panel_style(PALETTE.slate, PALETTE.ink))
	root.add_child(top)

	var stats := HBoxContainer.new()
	stats.position = Vector2(18, 14)
	stats.size = Vector2(820, 32)
	stats.add_theme_constant_override("separation", 26)
	top.add_child(stats)

	energy_label = _make_label("供能 0", 18, PALETTE.amber)
	integrity_label = _make_label("保障度 0/0", 18, PALETTE.cream)
	wave_label = _make_label("波次 待命", 18, PALETTE.cream)
	state_label = _make_label("准备", 18, PALETTE.sage)
	best_label = _make_label("最佳 —", 15, Color(PALETTE.cream, 0.72))
	var widths := [130, 190, 190, 90, 170]
	var labels: Array = [energy_label, integrity_label, wave_label, state_label, best_label]
	for i: int in range(labels.size()):
		labels[i].custom_minimum_size = Vector2(widths[i], 30)
		stats.add_child(labels[i])

	pause_button = _make_top_button("暂停 (P)", Vector2(1040, 11))
	pause_button.pressed.connect(_toggle_pause)
	top.add_child(pause_button)

	speed_button = _make_top_button("速度 1x", Vector2(1150, 11))
	speed_button.pressed.connect(_toggle_speed)
	top.add_child(speed_button)

	# 底栏
	var bottom := Panel.new()
	bottom.position = Vector2(0, VIEW_SIZE.y - BOTTOM_BAR_H)
	bottom.size = Vector2(VIEW_SIZE.x, BOTTOM_BAR_H)
	bottom.add_theme_stylebox_override("panel", _panel_style(PALETTE.panel, PALETTE.ink))
	root.add_child(bottom)

	var bar := HBoxContainer.new()
	bar.position = Vector2(16, 12)
	bar.size = Vector2(VIEW_SIZE.x - 32, 64)
	bar.add_theme_constant_override("separation", 10)
	bottom.add_child(bar)

	for i: int in range(TOWER_ORDER.size()):
		var id: String = TOWER_ORDER[i]
		var def: Dictionary = data.towers_by_id.get(id, {})
		var button := _make_build_button(i, def)
		bar.add_child(button)
		tower_buttons.append(button)

	var spacer := Control.new()
	spacer.custom_minimum_size = Vector2(12, 64)
	bar.add_child(spacer)

	start_button = _make_action_button("开波 (空格)", PALETTE.orange)
	start_button.pressed.connect(_start_wave)
	bar.add_child(start_button)

	upgrade_button = _make_action_button("升级 (U)", PALETTE.teal)
	upgrade_button.pressed.connect(_upgrade_selected)
	bar.add_child(upgrade_button)

	sell_button = _make_action_button("出售 (X)", PALETTE.rust)
	sell_button.pressed.connect(_sell_selected)
	bar.add_child(sell_button)

	hint_label = _make_label("", 13, Color(PALETTE.cream, 0.7))
	hint_label.position = Vector2(18, VIEW_SIZE.y - 22)
	hint_label.size = Vector2(VIEW_SIZE.x - 36, 18)
	root.add_child(hint_label)

	# 结算层
	overlay = Control.new()
	overlay.set_anchors_preset(Control.PRESET_FULL_RECT)
	overlay.visible = false
	root.add_child(overlay)

	var shade := ColorRect.new()
	shade.set_anchors_preset(Control.PRESET_FULL_RECT)
	shade.color = Color(0.09, 0.11, 0.12, 0.84)
	overlay.add_child(shade)

	var center := CenterContainer.new()
	center.set_anchors_preset(Control.PRESET_FULL_RECT)
	overlay.add_child(center)

	var card := PanelContainer.new()
	card.add_theme_stylebox_override("panel", _panel_style(PALETTE.paper, PALETTE.ink, 10))
	card.custom_minimum_size = Vector2(460, 300)
	center.add_child(card)

	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 28)
	margin.add_theme_constant_override("margin_right", 28)
	margin.add_theme_constant_override("margin_top", 24)
	margin.add_theme_constant_override("margin_bottom", 24)
	card.add_child(margin)

	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation", 14)
	margin.add_child(box)

	overlay_title = _make_label("", 28, PALETTE.ink)
	overlay_title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	box.add_child(overlay_title)

	overlay_body = _make_label("", 16, PALETTE.slate)
	overlay_body.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	overlay_body.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	overlay_body.custom_minimum_size = Vector2(400, 120)
	box.add_child(overlay_body)

	var again := Button.new()
	again.text = "再来一班 (R)"
	again.custom_minimum_size = Vector2(200, 46)
	_style_button(again, PALETTE.orange, PALETTE.cream)
	again.pressed.connect(_restart)
	var again_center := CenterContainer.new()
	again_center.add_child(again)
	box.add_child(again_center)

	_refresh_tower_buttons()


func _make_label(text: String, size: int, color: Color) -> Label:
	var label := Label.new()
	label.text = text
	label.add_theme_font_size_override("font_size", size)
	label.add_theme_color_override("font_color", color)
	return label


func _make_top_button(text: String, pos: Vector2) -> Button:
	var button := Button.new()
	button.text = text
	button.position = pos
	button.size = Vector2(100, 34)
	_style_button(button, PALETTE.teal, PALETTE.cream, 15)
	return button


func _make_build_button(index: int, def: Dictionary) -> Button:
	var button := Button.new()
	button.custom_minimum_size = Vector2(200, 64)
	button.alignment = HORIZONTAL_ALIGNMENT_LEFT
	button.text = "%d  %s\n    %d 供能 · %s" % [
		index + 1,
		String(def.get("name", "?")),
		int(def.get("cost", 0)),
		_tower_kind_label(String(def.get("kind", ""))),
	]
	button.add_theme_font_size_override("font_size", 14)
	_style_button(button, PALETTE.cream, PALETTE.slate, 15)
	button.pressed.connect(_select_tower.bind(index))
	return button


func _make_action_button(text: String, accent: Color) -> Button:
	var button := Button.new()
	button.text = text
	button.custom_minimum_size = Vector2(126, 64)
	_style_button(button, accent, PALETTE.cream, 15)
	return button


func _style_button(button: Button, bg: Color, fg: Color, font_size: int = 15) -> void:
	var normal := _panel_style(bg, PALETTE.ink, 6)
	var hover := _panel_style(bg.lightened(0.08), PALETTE.orange, 6)
	var pressed := _panel_style(bg.darkened(0.12), PALETTE.ink, 6)
	var disabled := _panel_style(Color(PALETTE.panel, 0.55), Color(PALETTE.slate, 0.35), 6)
	button.add_theme_stylebox_override("normal", normal)
	button.add_theme_stylebox_override("hover", hover)
	button.add_theme_stylebox_override("pressed", pressed)
	button.add_theme_stylebox_override("disabled", disabled)
	button.add_theme_stylebox_override("focus", hover)
	button.add_theme_color_override("font_color", fg)
	button.add_theme_color_override("font_hover_color", fg)
	button.add_theme_color_override("font_pressed_color", fg)
	button.add_theme_color_override("font_disabled_color", Color(PALETTE.slate, 0.45))
	button.add_theme_font_size_override("font_size", font_size)


func _panel_style(bg: Color, border: Color, radius: int = 0) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = bg
	style.border_color = border
	style.set_border_width_all(1 if radius == 0 else 2)
	style.set_corner_radius_all(radius)
	style.content_margin_left = 10
	style.content_margin_right = 10
	style.content_margin_top = 6
	style.content_margin_bottom = 6
	return style


func _tower_kind_label(kind: String) -> String:
	match kind:
		"single":
			return "单体"
		"aoe":
			return "范围"
		"supply":
			return "经济"
	return kind


func _show_fatal(message: String) -> void:
	var layer := CanvasLayer.new()
	add_child(layer)
	fatal_label = Label.new()
	fatal_label.text = message
	fatal_label.add_theme_font_size_override("font_size", 20)
	fatal_label.add_theme_color_override("font_color", PALETTE.rust)
	fatal_label.position = Vector2(40, 40)
	fatal_label.size = Vector2(1200, 60)
	layer.add_child(fatal_label)


# ---------------------------------------------------------------- 输入

func _unhandled_input(event: InputEvent) -> void:
	if sim == null:
		return
	var action: Dictionary = InputScript.translate(event, _slot_at, TOWER_ORDER.size())
	match str(action.type):
		"hover":
			hover_slot = int(action.slot)
		"click_slot":
			_click_slot(int(action.slot))
		"clear":
			selected_slot = -1
		"select_tower":
			_select_tower(int(action.index))
		"start_wave":
			_start_wave()
		"pause":
			_toggle_pause()
		"speed":
			_toggle_speed()
		"restart":
			_restart()
		"upgrade":
			_upgrade_selected()
		"sell":
			_sell_selected()

func _slot_at(pos: Vector2) -> int:
	if sim == null:
		return -1
	for i: int in range(sim.slots.size()):
		if pos.distance_to(sim.slots[i]) <= 28.0:
			return i
	return -1


func _click_slot(slot: int) -> void:
	if sim.get_tower_at(slot) != null:
		selected_slot = slot
		return
	var result: LiveBayResult = runtime.dispatch(&"build_tower", {"slot": slot, "tower_id": selected_tower_id})
	if result.ok:
		selected_slot = slot
		toast_text = "已建造 %s" % String(data.towers_by_id[selected_tower_id].name)
		toast_timer = 1.4


func _select_tower(index: int) -> void:
	if index < 0 or index >= TOWER_ORDER.size():
		return
	selected_tower_id = TOWER_ORDER[index]
	_refresh_tower_buttons()


func _start_wave() -> void:
	if sim == null:
		return
	runtime.dispatch(&"start_wave")


func _upgrade_selected() -> void:
	if selected_slot < 0:
		return
	var result: LiveBayResult = runtime.dispatch(&"upgrade_tower", {"slot": selected_slot})
	if result.ok:
		toast_text = "已升级"
		toast_timer = 1.2


func _sell_selected() -> void:
	if selected_slot < 0:
		return
	var result: LiveBayResult = runtime.dispatch(&"sell_tower", {"slot": selected_slot})
	if result.ok:
		toast_text = "已出售"
		toast_timer = 1.2
		selected_slot = -1


func _toggle_pause() -> void:
	if runtime != null:
		runtime.dispatch(&"set_pause", {"paused": not runtime.clock.paused})


func _toggle_speed() -> void:
	if runtime != null:
		runtime.dispatch(&"set_speed", {"speed": 2.0 if runtime.clock.speed == 1.0 else 1.0})


func _restart() -> void:
	if sim == null:
		return
	runtime.reset()
	sim = runtime.sim
	selected_slot = -1
	beams.clear()
	leak_flash = 0.0
	toast_timer = 0.0
	if overlay != null:
		overlay.visible = false


# ---------------------------------------------------------------- UI 刷新

func _update_ui() -> void:
	if sim == null or energy_label == null:
		return
	var view: LiveBayMissionReadModel = ReadModelScript.from_sim(sim, runtime.clock)
	var hud: Dictionary = LiveBayMissionPresenter.hud(view)
	energy_label.text = hud.energy_text
	integrity_label.text = hud.integrity_text
	wave_label.text = hud.wave_text
	state_label.text = hud.state_text
	best_label.text = "最佳 %s · 通关 %d" % [String(SaveStore.data.best_grade), int(SaveStore.data.clears)]
	hint_label.text = _hint_text()

	var ended: bool = sim.state == SimScript.State.WON or sim.state == SimScript.State.LOST
	for i: int in range(tower_buttons.size()):
		var def: Dictionary = data.towers_by_id.get(TOWER_ORDER[i], {})
		var cost: int = int(round(float(def.get("cost", 0)) * float(sim.profession.get("tower_cost_mult", 1.0))))
		tower_buttons[i].disabled = ended or sim.energy < float(cost)
		var selected: bool = TOWER_ORDER[i] == selected_tower_id
		tower_buttons[i].modulate = Color(1, 1, 1, 1) if selected else Color(1, 1, 1, 0.88)

	start_button.disabled = ended or not (sim.state == SimScript.State.PREP or sim.state == SimScript.State.BETWEEN)
	start_button.text = "开波 (空格)" if sim.wave_index < 0 else "下一波 (空格)"
	pause_button.text = "继续 (P)" if runtime.clock.paused else "暂停 (P)"
	speed_button.text = hud.speed_text

	var tower: Variant = sim.get_tower_at(selected_slot) if selected_slot >= 0 else null
	var has_tower: bool = tower != null
	upgrade_button.visible = has_tower
	sell_button.visible = has_tower
	if has_tower:
		var max_level: int = int(sim.balance.get("max_tower_level", 3))
		upgrade_button.text = "升级 %d→%d" % [int(tower.level), int(tower.level) + 1] if int(tower.level) < max_level else "已满级"
		var cost: int = int(round(float(tower.def.cost) * float(sim.balance.get("upgrade_cost_factor", 0.8)) * float(tower.level)))
		upgrade_button.disabled = ended or int(tower.level) >= max_level or sim.energy < float(cost)
		sell_button.disabled = ended


func _hint_text() -> String:
	if sim.state == SimScript.State.WON:
		return "本班结束 · R 再来一班"
	if sim.state == SimScript.State.LOST:
		return "事故 · R 重新值班"
	if runtime.clock.paused:
		return "已暂停 · P 继续"
	var tower: Variant = sim.get_tower_at(selected_slot) if selected_slot >= 0 else null
	if tower != null:
		return "已选中 %s Lv.%d · U 升级 · X 出售 · 右键取消" % [String(tower.def.name), int(tower.level)]
	return "点击塔位建造 · 1/2/3 选塔 · 空格开波 · Tab 加速 · P 暂停"


func _refresh_tower_buttons() -> void:
	for i: int in range(tower_buttons.size()):
		var selected: bool = TOWER_ORDER[i] == selected_tower_id
		tower_buttons[i].modulate = Color(1, 1, 1, 1) if selected else Color(1, 1, 1, 0.82)


# ---------------------------------------------------------------- 信号

func _on_tower_fired(from: Vector2, to: Vector2, kind: String) -> void:
	beams.append({"from": from, "to": to, "kind": kind, "life": 0.09, "max_life": 0.09})


func _on_enemy_leaked(_enemy: Dictionary) -> void:
	leak_flash = 0.4
	toast_text = "保障度受损"
	toast_timer = 1.2


func _on_wave_started(index: int) -> void:
	if index == 4:
		toast_text = "第 4 波 · 内部故障"
	elif index == 5:
		toast_text = "第 5 波 · 故障链"
	else:
		toast_text = "第 %d 波 · 交战中" % index
	toast_timer = 1.8


func _on_tower_disabled(slot: int, duration: float) -> void:
	toast_text = "第 %d 号塔故障 · %.0f 秒" % [slot + 1, duration]
	toast_timer = 2.0


func _on_fault_escaped(_enemy: Dictionary) -> void:
	toast_text = "故障已扩散出外环"
	toast_timer = 1.6


func _on_game_won(result: Dictionary) -> void:
	SaveStore.record_result(result)
	_show_overlay(true, result)


func _on_game_lost(result: Dictionary) -> void:
	SaveStore.record_result(result)
	_show_overlay(false, result)


func _show_overlay(won: bool, result: Dictionary) -> void:
	overlay.visible = true
	overlay_title.text = "本班结束 · %s" % String(result.get("grade", "C")) if won else "事故报告 · F"
	overlay_title.add_theme_color_override("font_color", PALETTE.teal if won else PALETTE.rust)
	if won:
		overlay_body.text = "保障度 %d/%d\n击杀 %d · 漏过 %d · 建造 %d\n\n下一班见。" % [
			int(result.integrity), int(result.max_integrity),
			int(result.kills), int(result.leaked), int(result.built),
		]
	else:
		overlay_body.text = "保障度归零。\n击杀 %d · 漏过 %d · 撑到第 %d 波\n\n复盘：先补控制，再补输出。" % [
			int(result.kills), int(result.leaked), int(result.waves_cleared),
		]


# ---------------------------------------------------------------- 绘制

func _draw() -> void:
	if renderer == null:
		renderer = RendererScript.new()
	renderer.font = font
	renderer.draw(self, sim, selected_slot, hover_slot, beams, leak_flash, toast_text, toast_timer, runtime != null and runtime.clock.paused)
