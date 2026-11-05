# LiveBay · 任务读模型
# 视图只读这个快照，不直接触碰 Sim 内部状态。
class_name LiveBayMissionReadModel
extends RefCounted

var energy := 0.0
var integrity := 0.0
var max_integrity := 100.0
var state := 0
var state_name := ""
var wave_index := -1
var wave_count := 0
var timer := 0.0
var paused := false
var speed := 1.0
var tower_count := 0
var enemy_count := 0
var result: Dictionary = {}


static func from_sim(sim: Variant, clock: Variant = null) -> LiveBayMissionReadModel:
	var view := LiveBayMissionReadModel.new()
	if sim == null:
		return view
	view.energy = float(sim.energy)
	view.integrity = float(sim.integrity)
	view.max_integrity = float(sim.max_integrity)
	view.state = int(sim.state)
	view.state_name = str(sim.state_name())
	view.wave_index = int(sim.wave_index)
	view.wave_count = sim.waves.size()
	view.timer = float(sim.timer)
	view.tower_count = sim.towers.size()
	view.enemy_count = sim.enemies.size()
	view.result = sim.result.duplicate(true)
	if clock != null:
		view.paused = bool(clock.paused)
		view.speed = float(clock.speed)
	return view


func to_dict() -> Dictionary:
	return {
		"energy": energy,
		"integrity": integrity,
		"max_integrity": max_integrity,
		"state": state,
		"state_name": state_name,
		"wave_index": wave_index,
		"wave_count": wave_count,
		"timer": timer,
		"paused": paused,
		"speed": speed,
		"tower_count": tower_count,
		"enemy_count": enemy_count,
		"result": result.duplicate(true),
	}
