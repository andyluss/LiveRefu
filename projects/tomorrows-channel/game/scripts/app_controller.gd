class_name AppController
extends Node
## App 壳 / 全局装配控制器（M1 已接线）。
##
## 职责（主程序侧全局串联，模块各自骨架职责不变）：
##   1. 初始化 config_loader（autoload 已 load_all()）→ 读 meta/channel/timer/mixer_track；
##   2. 装载磁带频道（channel_loader 读 channel.json 的 "tape_warm"）+ 后处理栈（channel_fx）+ UI
##      （channel_shell / tape_channel_panel / focus_timer_panel / mixer_panel）；
##   3. 启动番茄专注（进入 FOCUS 态时 pomodoro_timer.start_focus()）。
## 事件驱动：模块通过 event_bus 广播/订阅，AppController 只做主控串联，不插手模块内部职责。
## 对齐 plans/00-project-plan.md §三 M1（频道氛围/番茄不打断/三态可切/混音台/正反馈占位）。
##
## 结构（main.tscn + 运行时实例化）：
##   Main (AppController)
##   ├─ ChannelLoader  (scripts/channel_loader.gd)  装载频道 bundle
##   ├─ PomodoroTimer  (scripts/pomodoro_timer.gd)  番茄计时
##   ├─ MixerController(scripts/mixer_controller.gd) 混音台逻辑
##   └─ (运行时) ChannelFX + ChannelShell(+ 三面板)  后处理 + 三态 UI

# ---- 场景/资源前置加载（res:// 根 = game/）----
const CHANNEL_FX_SCENE: String = "res://scenes/channel/channel_fx.tscn"
const CHANNEL_SHELL_SCENE: String = "res://scenes/ui/channel_shell.tscn"
const TAPE_PANEL_SCENE: String = "res://scenes/channel/tape_channel_panel.tscn"
const FOCUS_TIMER_SCENE: String = "res://scenes/timer/focus_timer_panel.tscn"
const MIXER_PANEL_SCENE: String = "res://scenes/mixer/mixer_panel.tscn"

# ---- 依赖子节点（main.tscn 内挂载）----
@onready var _channel_loader: ChannelLoader = $ChannelLoader
@onready var _pomodoro: PomodoroTimer = $PomodoroTimer
@onready var _mixer_controller: MixerController = $MixerController

## 运行时实例引用（供测试/后续系统挂接）。
var channel_fx: ChannelFX
var channel_shell: Node
var _focus_timer_panel: FocusTimerPanel
var _mixer_panel: Node
var _pomodoro_started: bool = false

## 无头自检失败计数（仅 headless 校验用）。
var _verify_fails: int = 0


## 后台常驻是否启用（低功耗模式，见 01_tech-stack-draft.md §二）。
var _enable_background: bool = false


func _ready() -> void:
	_setup_low_processor_usage()
	_bootstrap()
	# 无头（CI/脚本）下做一次闭环自检：驱动三态切换→番茄启动→混音事件，并校核数据驱动装载。
	if _is_headless():
		_verify_closed_loop()


func _unhandled_input(event: InputEvent) -> void:
	# 应用内三态切换入口（不夺焦、不打断专注）：F / 空格 在 漫游↔专注 间切换。
	# @pending: M1 骨架仅此应用内热键；系统级全局快捷键需插件，见 00-project-plan §五。
	if event is InputEventKey and event.pressed and not event.echo:
		if event.keycode == KEY_F or event.keycode == KEY_SPACE:
			var next := FocusStateMachine.State.FOCUS if focus_state_machine.is_focusing() else FocusStateMachine.State.ROAM
			focus_state_machine.request_transition(next)


# ---------------------------------------------------------------------------
# 引导（全局串联）
# ---------------------------------------------------------------------------
func _bootstrap() -> void:
	_verify_config_loaded()

	# 1) 装载磁带频道（channel_loader → channel.json "tape_warm"）；成功则拿到皮肤 Token。
	var loaded := _channel_loader.load_channel("tape_warm")
	if not loaded:
		push_error("AppController: 频道装载失败（tape_warm），无法构建频道闭环")
		return
	var skin := _channel_loader.loaded_skin
	_gdprint("AppController: 频道装载完成 id=%s name=%s skin=%s" % [
		_channel_loader.current_channel_id,
		_channel_loader.loaded_channel.get("name_zh", ""),
		"ok" if skin != null else "null",
	])

	# 2) 后处理栈（channel_fx）：注入皮肤 Token，构建三层 CanvasLayer + 4 shader。
	_init_channel_fx(skin)

	# 3) 三态 UI 骨架（channel_shell）+ 三面板装配（数据驱动注入皮肤/track）。
	_init_channel_shell(skin)

	# 4) 订阅逻辑层状态变化：进入 FOCUS 启动番茄（事件驱动，不打断专注）。
	event_bus.state_changed.connect(_on_logic_state_changed)

	_gdprint("AppController: 引导完成（M1 最小闭环已接线）")


func _verify_config_loaded() -> void:
	if config_loader == null:
		push_error("AppController: config_loader autoload 缺失")
		return
	if config_loader.meta.is_empty():
		config_loader.load_all()
	_gdprint("AppController: meta loaded [%s] channel=[%d] timer=[%d] mixer_track=[%d]" % [
		config_loader.meta.get("pomodoro_work", "?"),
		config_loader.channels.size(),
		config_loader.timer_sessions.size(),
		config_loader.mixer_tracks.size(),
	])


## 构建并挂载频道 2D 后处理栈（channel_fx 自建三层 CanvasLayer）。
func _init_channel_fx(skin: ChannelSkin) -> void:
	var fx_scene: PackedScene = load(CHANNEL_FX_SCENE)
	if fx_scene == null:
		push_error("AppController: channel_fx 场景加载失败")
		return
	channel_fx = fx_scene.instantiate() as ChannelFX
	if skin != null:
		channel_fx.skin = skin   # 在入树前注入，使 _ready 中 _apply_skin_params 生效
	add_child(channel_fx)
	_gdprint("AppController: 后处理栈已挂载 motion=%s scanline=%s noise=%s" % [
		channel_fx.motion_enabled,
		channel_fx.scanline_enabled,
		channel_fx.noise_enabled,
	])


## 构建并挂载三态 UI 骨架，并把三面板数据驱动装进对应视图：
##   RoamView → TapeChannelPanel；FocusView → FocusTimerPanel + MixerPanel。
func _init_channel_shell(skin: ChannelSkin) -> void:
	var shell_scene: PackedScene = load(CHANNEL_SHELL_SCENE)
	if shell_scene == null:
		push_error("AppController: channel_shell 场景加载失败")
		return
	channel_shell = shell_scene.instantiate()
	add_child(channel_shell)
	if skin != null:
		channel_shell.skin = skin

	# 装入漫游视图：磁带频道最小面板（接收机中央窗口）。
	var roam_view: Node = channel_shell.get_node("RoamView")
	if skin != null:
		_mount_panel(roam_view, TAPE_PANEL_SCENE, skin)

	# 装入专注视图：专注计时 + 混音台（均数据驱动）。
	var focus_view: Node = channel_shell.get_node("FocusView")
	_focus_timer_panel = _mount_panel(focus_view, FOCUS_TIMER_SCENE, skin)
	_mount_mixer_panel(focus_view, skin)


## 实例化混音台面板：在入树前注入数据驱动的轨（MixerTrack 资源，来自 mixer_track 表），
## 使 _ready 直接从数据生成滑杆行（而非占位），兑现"混音台数据驱动"。
func _mount_mixer_panel(parent: Node, skin: ChannelSkin) -> void:
	var mixer_scene: PackedScene = load(MIXER_PANEL_SCENE)
	if mixer_scene == null:
		push_error("AppController: 混音台场景加载失败")
		return
	var mixer_panel: Node = mixer_scene.instantiate()
	if skin != null and "skin" in mixer_panel:
		mixer_panel.skin = skin
	if "tracks" in mixer_panel:
		mixer_panel.tracks = _build_mixer_track_resources()
	parent.add_child(mixer_panel)
	_mixer_panel = mixer_panel


## 从 mixer_controller 的轨数据（mixer_track 表）构建 MixerTrack 资源数组（数据驱动）。
func _build_mixer_track_resources() -> Array[MixerTrack]:
	var result: Array[MixerTrack] = []
	for t in _mixer_controller.tracks:
		if t is Dictionary:
			var tr := MixerTrack.new()
			tr.id = String(t.get("track_id", ""))
			tr.display_name = String(t.get("name_zh", ""))
			tr.bus = String(t.get("bus", "Master"))
			tr.default_volume = float(t.get("default_volume", 0.5))
			result.append(tr)
	return result


## 实例化一个面板场景，注入皮肤 Token，挂到父容器；返回该面板节点（或 null）。
func _mount_panel(parent: Node, scene_path: String, skin: ChannelSkin) -> Node:
	var scene: PackedScene = load(scene_path)
	if scene == null:
		push_error("AppController: 面板场景加载失败 -> %s" % scene_path)
		return null
	var panel: Node = scene.instantiate()
	if skin != null and "skin" in panel:
		panel.skin = skin
	parent.add_child(panel)
	return panel


## 响应逻辑层状态变化（event_bus.state_changed）：进入 FOCUS 时启动番茄（不打断专注）。
func _on_logic_state_changed(state_name: String) -> void:
	_gdprint("AppController: 状态切换 -> %s" % state_name)
	if state_name == "FOCUS" and not _pomodoro_started:
		_pomodoro_started = true
		_pomodoro.start_focus()
		_gdprint("AppController: 番茄开始 duration=%dmin 剩余=%dsec" % [
			config_loader.get_focus_minutes(),
			int(_pomodoro.remaining_sec),
		])


## 无头/CI 闭环自检：驱动三态切换→番茄启动→混音事件→回切不打断，并校核数据驱动装载。
## 仅 headless 运行（生产窗口态不触发）。输出 VERIFY PASS/FAIL。
func _verify_closed_loop() -> void:
	_verify_fails = 0
	var shell_focus: Node = channel_shell.get_node("FocusView")
	var shell_roam: Node = channel_shell.get_node("RoamView")

	_check("meta 装载 pomodoro_work=25", config_loader.meta.get("pomodoro_work") == 25)
	_check("channel 装载 current=tape_warm", _channel_loader.current_channel_id == "tape_warm")
	_check("皮肤 Token 装载 loaded_skin!=null", _channel_loader.loaded_skin != null)
	_check("混音轨数据 = 2 轨", _mixer_controller.tracks.size() == 2)
	_check("后处理栈 channel_fx 已挂接", channel_fx != null)

	# 三态：默认 ROAM（漫游视图可见 / 专注视图隐藏）。
	_check("默认 ROAM 可见", shell_roam.visible and not shell_focus.visible)

	# 切到 FOCUS：状态机广播 → shell 改可见度 → 番茄启动。
	var ok := focus_state_machine.request_transition(FocusStateMachine.State.FOCUS)
	_check("请求 FOCUS 成功", ok)
	_check("进入 FOCUS 态", focus_state_machine.is_focusing())
	_check("FOCUS 视图可见", shell_focus.visible and not shell_roam.visible)
	_check("番茄已启动", _pomodoro.is_running)
	_check("番茄剩余 ≈ 25min", absi(int(_pomodoro.remaining_sec) - 25 * 60) < 3)

	# 混音台：UI 经 event_bus 广播音量 → mixer_controller 订阅生效（数据驱动）。
	event_bus.mixer_volume_changed.emit("tape_track_hum", 0.8)
	_check("混音事件生效 嗡鸣=0.8", is_equal_approx(_mixer_controller.get_track_volume("tape_track_hum"), 0.8))
	# 混音台面板用数据驱动轨（来自 mixer_track 表，非占位）。
	_check("混音台面板数据驱动 2 轨", _mixer_panel != null and _mixer_panel.tracks.size() == 2)
	_check("混音台面板含嗡鸣轨", _mixer_panel != null and _mixer_panel.tracks[0].id == "tape_track_hum")

	# 专注计时面板从 data 读 25min（而非占位）。
	_check("专注计时面板 = 25min", _focus_timer_panel != null and _focus_timer_panel.total_seconds == 25 * 60)

	# 回切 ROAM：不打断专注（M1 口径）。
	var ok2 := focus_state_machine.request_transition(FocusStateMachine.State.ROAM)
	_check("回切 ROAM 成功", ok2)
	_check("ROAM 视图可见", shell_roam.visible and not shell_focus.visible)
	_check("回切后番茄继续（不打断）", _pomodoro.is_running)

	if _verify_fails == 0:
		printerr("VERIFY PASS: M1 单频道闭环全部检查通过")
	else:
		push_error("VERIFY FAIL: 有 %d 项检查未通过" % _verify_fails)
		printerr("VERIFY FAIL: %d 项检查未通过" % _verify_fails)


func _check(label: String, cond: bool) -> void:
	if not cond:
		_verify_fails += 1
	printerr("%s %s" % ["OK  " if cond else "FAIL", label])


## 后台常驻（低功耗）：开启 OS 低功耗模式，允许最小化后仍运行计时+氛围。
func _setup_low_processor_usage() -> void:
	# 骨架占位：验证 OS.low_processor_usage_mode 是否适用（最小化后仍跑，见 01_ §二）。
	_append_todo("OS.low_processor_usage_mode / 动态降刷新")


## 骨架占位说明：记录待接入项。
func _append_todo(item: String) -> void:
	# 骨架：接入时替换为实际实现。
	pass


## 调试输出：无头（CI/脚本）下走 stderr（判定/日志可见），窗口态不打印以避免生产 UI 噪音。
func _gdprint(msg: String) -> void:
	if _is_headless():
		printerr(msg)


## 是否运行于无头（headless）环境。OS.has_feature("headless") 在 4.7 下不可靠，改用显示服务名。
func _is_headless() -> bool:
	return DisplayServer.get_name() == "headless"
