class_name FocusStateMachine
extends Node
## 专注状态机（Autoload 单例）。
##
## 职责：三态切换骨架（漫游 / 专注 / 设置·图鉴）。M1 支持【漫游 ↺ 专注】可切，
## 设置/图鉴态【待定·M3】仅定骨架占位。切换不夺焦、不打断专注（见 plans/00-project-plan.md §二）。
## 切换结果经 event_bus.state_changed 广播，UI 订阅后驱动换肤/面板显隐。


enum State {
	ROAM,    ## 漫游（默认，氛围播放）
	FOCUS,   ## 专注（番茄进行中，计时器接管）
	SETTINGS,## 【待定·M3】设置态（仅占位）
	GALLERY, ## 【待定·M3】图鉴态（仅占位）
}

## 当前状态。
var current: State = State.ROAM


func _ready() -> void:
	# 骨架占位：M1 接入时在此订阅 event_bus 或暴露切换入口。
	pass


## 请求切换状态。返回是否切换成功。
## M1 仅允许 ROAM / FOCUS 互切；SETTINGS / GALLERY 忽略并告警。
func request_transition(next: State) -> bool:
	if next == State.SETTINGS or next == State.GALLERY:
		# 【待定·M3】设置/图鉴态未实现，M1 只记日志、不改变当前状态。
		push_warning("FocusStateMachine: 设置/图鉴态 M1 未实现，忽略切换 -> %s" % State.keys()[next])
		return false
	if next == current:
		return false
	# TODO(M1): 若处于 FOCUS 且切换发生，需与 pomodoro_timer 协同（不打断专注）。
	current = next
	_emit_state_changed()
	return true


## 是否处于专注态（UI/氛围查询用）。
func is_focusing() -> bool:
	return current == State.FOCUS


## 广播当前状态（供 event_bus 接入；当前为骨架说明）。
func _emit_state_changed() -> void:
	# TODO(M1): 接入 event_bus 后取消注释。
	# EventBus.state_changed.emit(State.keys()[current])
	pass
