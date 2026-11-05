# LiveBay · 任务时钟
# 只负责「模拟时间」：暂停、倍速、累计时长、tick 计数。
# 不读真实时间，不画动画；视图的插值时间不在这里。
class_name LiveBayMissionClock
extends RefCounted

var paused := false
var speed := 1.0
var sim_time := 0.0
var ticks := 0


func consume(delta: float) -> float:
	if paused:
		return 0.0
	var step := maxf(0.0, delta) * speed
	if step <= 0.0:
		return 0.0
	sim_time += step
	ticks += 1
	return step


func set_paused(value: bool) -> void:
	paused = value


func set_speed(value: float) -> void:
	speed = clampf(value, 0.25, 4.0)


func reset() -> void:
	sim_time = 0.0
	ticks = 0
	paused = false
