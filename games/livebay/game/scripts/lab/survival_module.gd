# LiveBay · 低功率夜班生存模块
# 只在 lab/ 使用；读取 Sim 状态，控制电力分配、氧气与救援倒计时。
class_name LiveBaySurvival
extends RefCounted

var rescue_seconds := 300.0
var rescue_left := 300.0
var power := 100.0
var tower_share := 0.5
var oxygen := 120.0
var oxygen_max := 120.0
var oxygen_drain_per_gap := 0.8
var battery_power := 40.0
var battery_used := false
var life_base := 30.0
var life_per_wave := 3.0
var tower_per_tower := 6.0
var tower_per_wave := 4.0
var failed := false
var won := false
var reason := ""
var _base_damage_mult := 1.0


func configure(data: Dictionary, sim: Variant) -> void:
	var s: Dictionary = data.get("lab_meta", {}).get("survival", {})
	rescue_seconds = float(s.get("rescue_seconds", 300.0))
	rescue_left = rescue_seconds
	power = float(s.get("power", 100.0))
	tower_share = float(s.get("tower_share", 0.5))
	oxygen_max = float(s.get("oxygen_seconds", 120.0))
	oxygen = oxygen_max
	oxygen_drain_per_gap = float(s.get("oxygen_drain_per_gap", 0.8))
	battery_power = float(s.get("battery_power", 40.0))
	life_base = float(s.get("life_demand_base", 30.0))
	life_per_wave = float(s.get("life_demand_per_wave", 3.0))
	tower_per_tower = float(s.get("tower_demand_per_tower", 6.0))
	tower_per_wave = float(s.get("tower_demand_per_wave", 4.0))
	_base_damage_mult = float(sim.towers_module.damage_mult)


func update(dt: float, sim: Variant) -> void:
	if failed or won:
		return
	rescue_left = maxf(0.0, rescue_left - dt)
	var wave := maxi(0, int(sim.wave_index) + 1)
	var life_demand := life_base + life_per_wave * float(wave)
	var tower_demand := tower_per_tower * float(sim.towers.size()) + tower_per_wave * float(wave)
	var life_power := power * (1.0 - tower_share)
	var tower_power := power * tower_share
	var factor := clampf(tower_power / maxf(1.0, tower_demand), 0.0, 1.0)
	sim.towers_module.damage_mult = _base_damage_mult * factor
	var gap := life_demand - life_power
	if gap > 0.0:
		oxygen -= gap * oxygen_drain_per_gap * dt
	else:
		oxygen = minf(oxygen_max, oxygen + 0.15 * dt)
	oxygen = maxf(0.0, oxygen)
	if oxygen <= 0.0:
		failed = true
		reason = "氧气耗尽"
	elif sim.integrity <= 0.0:
		failed = true
		reason = "保障度归零"
	elif rescue_left <= 0.0:
		won = true
		reason = "救援抵达"


func use_battery() -> bool:
	if battery_used or failed or won:
		return false
	battery_used = true
	power += battery_power
	return true


func adjust_share(delta: float) -> void:
	if failed or won:
		return
	tower_share = clampf(tower_share + delta, 0.1, 0.9)


func tower_factor(sim: Variant) -> float:
	var wave := maxi(0, int(sim.wave_index) + 1)
	var demand := tower_per_tower * float(sim.towers.size()) + tower_per_wave * float(wave)
	return clampf((power * tower_share) / maxf(1.0, demand), 0.0, 1.0)


func life_power() -> float:
	return power * (1.0 - tower_share)


func life_demand(sim: Variant) -> float:
	return life_base + life_per_wave * float(maxi(0, int(sim.wave_index) + 1))
