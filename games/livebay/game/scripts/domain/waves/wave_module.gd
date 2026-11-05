# LiveBay · 波次模块
# 只负责准备计时、波次顺序、生成队列；敌人由 Sim 按队列创建。
class_name LiveBayWaveModule
extends RefCounted

var waves: Array = []
var index := -1
var time := 0.0
var timer := 30.0
var queue: Array = []


func reset(wave_defs: Array, balance: Dictionary) -> void:
	waves = wave_defs
	index = -1
	time = 0.0
	timer = float(waves[0].get("prep", balance.get("prepare_time", 30.0))) if not waves.is_empty() else 30.0
	queue.clear()


func current() -> Dictionary:
	if index >= 0 and index < waves.size():
		return waves[index]
	return {}


func start() -> bool:
	if index + 1 >= waves.size():
		return false
	index += 1
	time = 0.0
	timer = 0.0
	queue.clear()
	for group: Variant in waves[index].get("groups", []):
		var enemy_id := str(group.get("enemy", ""))
		var count := int(group.get("count", 0))
		var interval := float(group.get("interval", 1.0))
		var delay := float(group.get("delay", 0.0))
		for i in range(count):
			queue.append({"time": delay + i * interval, "enemy_id": enemy_id})
	queue.sort_custom(func(a: Dictionary, b: Dictionary) -> bool: return float(a.time) < float(b.time))
	return true


func tick_timer(delta: float) -> bool:
	timer -= delta
	return timer <= 0.0


func advance_time(delta: float) -> void:
	time += delta


func due() -> Array:
	var out: Array = []
	while not queue.is_empty() and float(queue[0].time) <= time:
		out.append(queue.pop_front())
	return out


func next_prep(balance: Dictionary) -> float:
	if index + 1 < waves.size():
		return float(waves[index + 1].get("prep", balance.get("between_wave_time", 20.0)))
	return 0.0
