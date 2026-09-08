class_name ChannelShell
extends Control
## 三态 UI 骨架（共用交互骨架，信息密度档位切换）。
##
## 三态 = 同一套骨架上的三种「信息密度档位」，靠「图层可见度 + 焦点不劫持」区分，
## **不是三个独立窗口 / 独立场景**（见 docs/ui-artist-a/05_m1-ui-skeleton.md §三）。
##
## 架构：本 Shell 为 **UI 层**，只订阅逻辑层状态（focus_state_machine → event_bus.state_changed），
## 驱动三视图可见度；不持有状态真值、不直接操作计时/混音逻辑。
## M1 只实测【漫游 ↔ 专注】两态；【设置·图鉴】为骨架层极简占位，全流程后置 M3。

# 三态视图（信息密度档位名；值域对齐 FocusStateMachine.State）
enum ShellState { ROAM, FOCUS, SETTINGS }

# 三态对应视图容器（tscn 内唯一命名；用 % 引用）
@onready var _roam_view: Control = %RoamView
@onready var _focus_view: Control = %FocusView
@onready var _settings_view: Control = %SettingsView

# 频道皮肤 Token（换肤载体，由装载器注入 tape_channel_skin.tres）
@export var skin: ChannelSkin

# 当前视图态（默认漫游；真值在 focus_state_machine，本变量为视图镜像）
var current_state: ShellState = ShellState.ROAM


func _ready() -> void:
	# 焦点策略：骨架根不设默认焦点、不放 modal；视图切换只改可见度、绝不 grab_focus。
	# 见 tscn 根 focus_mode = 0（FOCUS_MODE_NONE）与各视图注释（05_ §三.3 焦点不劫持）。
	# 订阅逻辑层状态变化 → 驱动可见度（UI 框架隔离：UI 只经 event_bus 订阅）。
	# event_bus / focus_state_machine 为 project.godot 注册的 autoload，可直接引用。
	event_bus.state_changed.connect(_on_logic_state_changed)
	_apply_visibility(current_state)


## 请求切换三态（UI 按钮入口）：脱手给逻辑层状态机，状态机广播后本 Shell 响应。
## 切换不抢焦点、不弹模态遮罩。
func request_state(state: ShellState) -> void:
	var target := _to_logic_state(state)
	focus_state_machine.request_transition(target)


## 响应逻辑层状态变化（event_bus.state_changed 携带字符串状态名）→ 改图层可见度。
func _on_logic_state_changed(state_name: String) -> void:
	match state_name:
		"ROAM":
			current_state = ShellState.ROAM
			_apply_visibility(ShellState.ROAM)
		"FOCUS":
			current_state = ShellState.FOCUS
			_apply_visibility(ShellState.FOCUS)
		"SETTINGS":
			current_state = ShellState.SETTINGS
			_apply_visibility(ShellState.SETTINGS)


## 三套图层可见度，而非三套窗口。三视图不是三个场景，仅是同一骨架上的容器。
func _apply_visibility(state: ShellState) -> void:
	_roam_view.visible = (state == ShellState.ROAM)
	_focus_view.visible = (state == ShellState.FOCUS)
	_settings_view.visible = (state == ShellState.SETTINGS)


# ---------------------------------------------------------------------------
# 状态映射（ShellState ⇄ FocusStateMachine.State）
# ---------------------------------------------------------------------------
func _to_logic_state(state: ShellState) -> int:
	match state:
		ShellState.ROAM:
			return FocusStateMachine.State.ROAM
		ShellState.FOCUS:
			return FocusStateMachine.State.FOCUS
		ShellState.SETTINGS:
			return FocusStateMachine.State.SETTINGS
	return FocusStateMachine.State.ROAM
