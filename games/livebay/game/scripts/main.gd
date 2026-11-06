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
const AudioScript = preload("res://scripts/presentation/audio_director.gd")
const GameHudScript = preload("res://scripts/presentation/game_hud.gd")
const FlowControllerScript = preload("res://scripts/presentation/game_flow_controller.gd")
const InputControllerScript = preload("res://scripts/presentation/game_input_controller.gd")
const SessionControllerScript = preload("res://scripts/presentation/game_session_controller.gd")

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
var game_hud: LiveBayGameHud
var flow_controller: LiveBayGameFlowController
var input_controller: LiveBayGameInputController
var session_controller: LiveBayGameSession

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
var checklist_overlay: Control
var checklist_title: Label
var checklist_body: Label
var checklist_buttons: VBoxContainer
var report_buttons: HBoxContainer
var shift_memory: LiveBayShiftMemory
var current_result: Dictionary = {}
var broadcast_banner: PanelContainer
var broadcast_label: Label
var broadcast_timer := 0.0
var broadcast_reveal := 0.0
var broadcast_full := ""
var archive_button: Button
var map_button: Button
var current_map_id := "bay01"
var audio: LiveBayAudioDirector

var fatal_label: Label


func _exit_tree() -> void:
	if session_controller != null:
		session_controller.dispose()


func _ready() -> void:
	audio = AudioScript.new()
	add_child(audio)
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

	session_controller = SessionControllerScript.new()
	session_controller.setup(self)
	if data.is_empty():
		return

	_build_ui()
	flow_controller = FlowControllerScript.new()
	flow_controller.setup(self, game_hud, PALETTE)
	input_controller = InputControllerScript.new()
	input_controller.setup(self, TOWER_ORDER.size())
	queue_redraw()
	if shift_memory.has_last():
		_show_briefing()


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
	if broadcast_timer > 0.0:
		broadcast_timer = max(0.0, broadcast_timer - delta)
		broadcast_reveal = minf(float(broadcast_full.length()), broadcast_reveal + delta * 28.0)
		broadcast_label.text = "BROADCAST  /  " + broadcast_full.substr(0, int(broadcast_reveal))
		broadcast_banner.visible = broadcast_timer > 0.0
	_update_ui()
	queue_redraw()


func _new_sim() -> void:
	if session_controller != null:
		session_controller.new_sim()


# ---------------------------------------------------------------- UI 构建

func _build_ui() -> void:
	game_hud = GameHudScript.new()
	game_hud.build(self, data, ui_theme, PALETTE, {
		"select_tower": _select_tower,
		"start_wave": _start_wave,
		"upgrade": _upgrade_selected,
		"sell": _sell_selected,
		"pause": _toggle_pause,
		"speed": _toggle_speed,
		"map": _show_map_picker,
		"archive": _show_archive.bind(0),
		"restart": _restart,
	})
	# 兼容现有流程代码：HUD 节点以别名暴露，业务状态仍由 Main/Controller 管理。
	energy_label = game_hud.energy_label
	integrity_label = game_hud.integrity_label
	wave_label = game_hud.wave_label
	state_label = game_hud.state_label
	best_label = game_hud.best_label
	hint_label = game_hud.hint_label
	tower_buttons = game_hud.tower_buttons
	start_button = game_hud.start_button
	upgrade_button = game_hud.upgrade_button
	sell_button = game_hud.sell_button
	pause_button = game_hud.pause_button
	speed_button = game_hud.speed_button
	map_button = game_hud.map_button
	archive_button = game_hud.archive_button
	overlay = game_hud.overlay
	overlay_title = game_hud.overlay_title
	overlay_body = game_hud.overlay_body
	report_buttons = game_hud.report_buttons
	checklist_overlay = game_hud.checklist_overlay
	checklist_title = game_hud.checklist_title
	checklist_body = game_hud.checklist_body
	checklist_buttons = game_hud.checklist_buttons
	broadcast_banner = game_hud.broadcast_banner
	broadcast_label = game_hud.broadcast_label
	_refresh_tower_buttons()


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
	if input_controller != null:
		input_controller.handle(event)


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
		audio.play("build")
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
		audio.play("upgrade")
		toast_text = "已升级"
		toast_timer = 1.2


func _sell_selected() -> void:
	if selected_slot < 0:
		return
	var result: LiveBayResult = runtime.dispatch(&"sell_tower", {"slot": selected_slot})
	if result.ok:
		audio.play("sell")
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
	if session_controller != null:
		session_controller.restart()


func _on_checklist_requested(envelope: Dictionary) -> void:
	audio.play("checklist")
	var card: Dictionary = envelope.get("payload", {}).get("card", {})
	if flow_controller != null:
		flow_controller.show_checklist(card)

func _toggle_audio() -> void:
	if audio == null:
		return
	audio.muted = not audio.muted
	toast_text = "音效已关闭" if audio.muted else "音效已开启"
	toast_timer = 1.4
	if not audio.muted:
		audio.play("ui")


func _show_map_picker() -> void:
	if flow_controller != null:
		flow_controller.show_map_picker(data, current_map_id)

func _choose_map(map_id: String) -> void:
	if session_controller != null and session_controller.switch_map(map_id):
		toast_text = "已切换到 %s" % str(data.get("map", {}).get("name", map_id))
		toast_timer = 1.6


func _show_archive(page := 0, filter := "all") -> void:
	if flow_controller != null:
		flow_controller.show_archive(page, filter)

func _close_archive() -> void:
	if flow_controller != null:
		flow_controller.close_archive()

func _show_briefing() -> void:
	if flow_controller != null and shift_memory != null:
		flow_controller.show_briefing(shift_memory.briefing())

func _dismiss_briefing() -> void:
	if flow_controller != null:
		flow_controller.hide_all()
	if runtime != null:
		runtime.clock.paused = false
	if shift_memory != null:
		var broadcast: String = shift_memory.broadcast_text()
		if not broadcast.is_empty():
			_show_broadcast(broadcast, 6.0)

func _show_broadcast(text: String, duration: float) -> void:
	if flow_controller == null:
		return
	audio.play("broadcast")
	flow_controller.show_broadcast(text)
	broadcast_timer = duration

func _on_fault_choice_requested(_envelope: Dictionary) -> void:
	audio.play("fault")
	if flow_controller != null:
		flow_controller.show_fault()

func _choose_fault_choice(choice: String) -> void:
	if runtime == null:
		return
	var result: LiveBayResult = runtime.dispatch(&"submit_fault_choice", {"choice": choice})
	if not result.ok:
		toast_text = "故障处置：" + result.message
		toast_timer = 1.6
		return
	if flow_controller != null:
		flow_controller.hide_all()
	else:
		checklist_overlay.visible = false


func _choose_checklist(card_id: String, option_id: String) -> void:
	if runtime == null:
		return
	var result: LiveBayResult = runtime.dispatch(&"submit_checklist", {"card_id": card_id, "option_id": option_id})
	if not result.ok:
		toast_text = "检查单：" + result.message
		toast_timer = 1.6
		return
	checklist_overlay.visible = false


func _update_ui() -> void:
	if sim == null or energy_label == null:
		return
	var view: LiveBayMissionReadModel = ReadModelScript.from_sim(sim, runtime.clock)
	var hud_data: Dictionary = LiveBayMissionPresenter.hud(view)
	energy_label.text = hud_data.energy_text
	integrity_label.text = hud_data.integrity_text
	wave_label.text = hud_data.wave_text
	state_label.text = hud_data.state_text
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
	speed_button.text = hud_data.speed_text

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
	if game_hud != null:
		game_hud.refresh_tower_buttons(selected_tower_id)


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


func _on_tower_degraded(slot: int, duration: float) -> void:
	audio.play("degraded")
	toast_text = "第 %d 号塔降级 · %.0f 秒" % [slot + 1, duration]
	toast_timer = 2.0


func _on_fault_escaped(_enemy: Dictionary) -> void:
	toast_text = "故障已扩散出外环"
	toast_timer = 1.6


func _on_game_won(result: Dictionary) -> void:
	audio.play("win")
	SaveStore.record_result(result)
	_show_overlay(true, result)


func _on_game_lost(result: Dictionary) -> void:
	audio.play("lost")
	SaveStore.record_result(result)
	_show_overlay(false, result)


func _show_overlay(won: bool, result: Dictionary) -> void:
	current_result = result.duplicate(true)
	if flow_controller != null:
		flow_controller.show_result(won, result)

func _submit_report(option_id: String) -> void:
	if runtime == null:
		return
	var result: LiveBayResult = runtime.dispatch(&"submit_report", {"option_id": option_id})
	if result.ok:
		overlay_body.text += "\n本班记录：%s" % ("低报" if str(result.data.get("effect", "")) == "custom" else "已记录")
		shift_memory.record(current_result, option_id, runtime.sim.low_report)
		for child in report_buttons.get_children():
			child.queue_free()


# ---------------------------------------------------------------- 绘制

func _draw() -> void:
	if renderer == null:
		renderer = RendererScript.new()
	renderer.font = font
	renderer.draw(self, sim, selected_slot, hover_slot, beams, leak_flash, toast_text, toast_timer, runtime != null and runtime.clock.paused)
