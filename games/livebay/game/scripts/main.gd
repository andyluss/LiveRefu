# LiveBay · 入口
# 只负责启动、连线、每帧驱动与绘制；规则在 core/sim.gd。
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
const CommandControllerScript = preload("res://scripts/presentation/game_command_controller.gd")
const FeedbackControllerScript = preload("res://scripts/presentation/game_feedback.gd")
const UiPresenterScript = preload("res://scripts/presentation/game_ui_presenter.gd")
const Consts = preload("res://scripts/shared/constants.gd")
const LabLoaderScript = preload("res://scripts/lab/lab_loader.gd")


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
var commands: LiveBayGameCommandController
var feedback: LiveBayGameFeedback
var ui_presenter: LiveBayGameUiPresenter

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
var current_contract := "stable"
var current_mode := "main"
var current_lab := ""
var lab_scenarios: Array = []
var audio: LiveBayAudioDirector

var fatal_label: Label


func _exit_tree() -> void:
	if session_controller != null:
		session_controller.dispose()


func _ready() -> void:
	audio = AudioScript.new()
	add_child(audio)
	audio.play_music("prep")
	audio.play("ambient_hum")
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

	feedback = FeedbackControllerScript.new()
	feedback.setup(self)
	commands = CommandControllerScript.new()
	commands.setup(self, Consts.PALETTE)
	lab_scenarios = LabLoaderScript.load_all()
	session_controller = SessionControllerScript.new()
	session_controller.setup(self)
	if data.is_empty():
		return
	_build_ui()
	flow_controller = FlowControllerScript.new()
	flow_controller.setup(self, game_hud, Consts.PALETTE)
	ui_presenter = UiPresenterScript.new()
	ui_presenter.setup(self)
	input_controller = InputControllerScript.new()
	input_controller.setup(self, Consts.TOWER_ORDER.size())
	queue_redraw()
	if shift_memory.has_last():
		commands.show_briefing()


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
	ui_presenter.update()
	queue_redraw()


func _build_ui() -> void:
	game_hud = GameHudScript.new()
	game_hud.build(self, data, ui_theme, Consts.PALETTE, {
		"select_tower": commands.select_tower,
		"start_wave": commands.start_wave,
		"upgrade": commands.upgrade_selected,
		"sell": commands.sell_selected,
		"pause": commands.toggle_pause,
		"speed": commands.toggle_speed,
		"map": commands.show_map_picker,
		"archive": commands.show_archive.bind(0),
		"restart": commands.restart,
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
	game_hud.refresh_tower_buttons(selected_tower_id)


func _show_fatal(message: String) -> void:
	var layer := CanvasLayer.new()
	add_child(layer)
	fatal_label = Label.new()
	fatal_label.text = message
	fatal_label.add_theme_font_size_override("font_size", 20)
	fatal_label.add_theme_color_override("font_color", Consts.PALETTE.rust)
	fatal_label.position = Vector2(40, 40)
	fatal_label.size = Vector2(1200, 60)
	layer.add_child(fatal_label)


# ---------------------------------------------------------------- 输入

func _unhandled_input(event: InputEvent) -> void:
	if input_controller != null:
		input_controller.handle(event)


func _draw() -> void:
	if renderer == null:
		renderer = RendererScript.new()
	renderer.font = font
	renderer.draw(self, sim, selected_slot, hover_slot, beams, leak_flash, toast_text, toast_timer, runtime != null and runtime.clock.paused)
