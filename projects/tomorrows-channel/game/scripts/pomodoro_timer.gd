class_name PomodoroTimer
extends Node
## 番茄计时器（M1 骨架）。
##
## 职责：专注段（番茄）计时——M1 验收"专注 25min 不打断"；后台/最小化仍准确（OS.low_processor_usage_mode，
## 见 01_tech-stack-draft.md §二）。时间参数从 meta.json 读取（min→换算秒），禁止魔法数。
## 结束用频道音色轻提示 + 一次极简泛光（可关、不弹窗，见 plans/00-project-plan.md §三 M1#2）。
## 休息段【待定·数值】不计正反馈（meta 注释：休息不产出碎片）。


## 当前段剩余秒数。
var remaining_sec: float = 0.0


## 当前段是否运行中。
var is_running: bool = false


## 单段总时长（秒，由 meta 的 pomodoro_work 换算）。
var _duration_sec: int = 0


func _ready() -> void:
	# 骨架占位：M1 接入时在此初始化并订阅 focus_state_machine / config_loader。
	pass


## 开始一段专注计时（min 由 meta 读取，见 ConfigLoader.get_pomodoro_work_min()）。
func start_focus() -> void:
	var work_min: int = _get_meta_work_min()
	_duration_sec = work_min * 60
	remaining_sec = float(_duration_sec)
	is_running = true
	event_bus.pomodoro_started.emit(_duration_sec)


## 暂停 / 恢复（后台常驻场景）。
func set_paused(paused: bool) -> void:
	if paused:
		is_running = false
	else:
		is_running = true


## 取消当前段（reason "aborted"）。
func abort() -> void:
	event_bus.pomodoro_finished.emit("aborted")
	is_running = false
	remaining_sec = 0.0


## 帧驱动（M1 在 _process 内按 delta 递减，或改用 Timer 节点；此处仅骨架）。
func _process(delta: float) -> void:
	if not is_running:
		return
	remaining_sec -= delta
	if remaining_sec <= 0.0:
		# 完成段：广播 pomodoro_finished("completed") + 轻提示 + 极简泛光（后置实现）。
		is_running = false
		remaining_sec = 0.0
		event_bus.pomodoro_finished.emit("completed")


## 从配置读取默认专注分钟（经 ConfigLoader，禁止硬编码）。
func _get_meta_work_min() -> int:
	# 数据驱动：先读 timer 表 focus 时段，兜底 meta.pomodoro_work，再兜底 25。
	if config_loader != null:
		return config_loader.get_focus_minutes()
	return 25
