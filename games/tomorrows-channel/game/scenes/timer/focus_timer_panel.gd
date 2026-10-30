class_name FocusTimerPanel
extends Control
## 专注计时器面板（M1 最小集）——皮肤化计时，角标形态 ↔ 沉浸形态切换骨架。
##
## 呈现原则（见 docs/ui-artist-a/05_m1-ui-skeleton.md §五）：
##  - 默认 = 不显眼的角标/胶囊（频道色进度）+ 等宽数字（防跳动）；
##  - 沉浸 = 用户显式切换的大标盘/大字，不弹窗、不遮必要信息；一键还原为角标；
##  - 结束提醒 = 克制（声音第一、视觉第二），绝不用全屏遮罩/强弹窗；
##  - **别抢戏**：切换只改可见度/字号级，不打断计时源。

# 两种呈现形态
enum TimerDisplayMode { BADGE, IMMERSIVE }

# 形态切换信号（供骨架/托盘订阅）
signal immersive_changed(immersive: bool)
signal timer_finished

# 频道皮肤 Token（换肤载体：频道色胶囊/倒计时盘/沉浸大字的颜色都来自 token）
@export var skin: ChannelSkin

# 总专注时长（占位默认 25min；真实值来自 timer 表，禁止硬编码）
@export var total_seconds: int = 25 * 60

# 当前呈现形态（默认角标 = 不显眼）
var display_mode: TimerDisplayMode = TimerDisplayMode.BADGE

@onready var _badge: Control = %Badge
@onready var _immersive: Control = %Immersive
@onready var _badge_digits: Label = %BadgeDigits
@onready var _immersive_digits: Label = %ImmersiveDigits
@onready var _badge_progress: ProgressBar = %BadgeProgress


func _ready() -> void:
	# 数据驱动：专注时长取自 meta 表（config_loader），零硬编码（缺表时兜底 25min）。
	_load_duration()
	# 默认以"角标形态"起步（别抢戏），数值用时长格式化一次。
	_apply_display_mode(display_mode)
	_apply_skin()
	_refresh_digits(0)
	# 订阅逻辑层计时事件（UI 只经 event_bus 订阅，不直接轮询计时器）。
	event_bus.pomodoro_started.connect(_on_pomodoro_started)
	event_bus.pomodoro_finished.connect(_on_pomodoro_finished)


## 切换形态（角标 ↔ 沉浸）：显式用户动作才触发；只切可见度，不碰计时源。
func toggle_display_mode() -> void:
	set_display_mode(TimerDisplayMode.IMMERSIVE if display_mode == TimerDisplayMode.BADGE else TimerDisplayMode.BADGE)


func set_display_mode(mode: TimerDisplayMode) -> void:
	display_mode = mode
	_apply_display_mode(mode)
	_apply_skin()
	immersive_changed.emit(mode == TimerDisplayMode.IMMERSIVE)


func _apply_display_mode(mode: TimerDisplayMode) -> void:
	_badge.visible = (mode == TimerDisplayMode.BADGE)
	_immersive.visible = (mode == TimerDisplayMode.IMMERSIVE)


## 换肤：角标胶囊的频道色 / 沉浸大字的荧光色都从 token 取，不在脚本硬编码 hex。
func _apply_skin() -> void:
	if skin == null:
		return
	# 角标胶囊底 = 顶栏暖黑（暗底，荧光体只在其上成立）
	_badge_digits.add_theme_color_override("font_color", skin.lut_phosphor_amber)
	_immersive_digits.add_theme_color_override("font_color", skin.lut_phosphor_amber)
	# 沉浸大字更强调（主荧光），进度条用辅荧光（低占用/状态）
	if _badge_progress:
		_badge_progress.add_theme_color_override("fill_color", skin.lut_phosphor_green)


## 数字刷新：一直用等宽数位（tabular）格式化，MM:SS 位宽固定（防倒计时跳动）。
func set_remaining(seconds: int) -> void:
	var text := _format_time(seconds)
	_badge_digits.text = text
	_immersive_digits.text = text
	if _badge_progress and total_seconds > 0:
		_badge_progress.value = float(total_seconds - seconds)


## 等宽数字格式：%02d:%02d 固定位宽，配合 tabular figures（见 05_ §7.3 数字等宽）。
func _format_time(seconds: int) -> String:
	var m := seconds / 60
	var s := seconds % 60
	return "%02d:%02d" % [m, s]


func _refresh_digits(_offset: int) -> void:
	_badge_digits.text = _format_time(total_seconds)
	_immersive_digits.text = _format_time(total_seconds)


## 数据驱动：专注时长取自 meta 表（config_loader.get_pomodoro_work_min()），单位 min → sec。
## M1 只做默认时长；可调范围 5–120（focus_min/focus_max）随设置态（M3）接入。
func _load_duration() -> void:
	if is_instance_valid(config_loader):
		total_seconds = config_loader.get_pomodoro_work_min() * 60
	if total_seconds <= 0:
		total_seconds = 25 * 60  # 兜底：meta 缺失才触发，正常由 config_loader 供给


## 逻辑层开段（event_bus.pomodoro_started）→ 同步时长与剩余。
func _on_pomodoro_started(duration_sec: int) -> void:
	total_seconds = duration_sec
	set_remaining(duration_sec)


## 逻辑层收段（event_bus.pomodoro_finished）→ 触发结束提示（克制：声音第一、视觉第二）。
func _on_pomodoro_finished(_reason: String) -> void:
	timer_finished.emit()
