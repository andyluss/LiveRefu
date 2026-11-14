# LiveBay: Severed · 舱段模拟测试
extends SceneTree

const SimScript = preload("res://scripts/section_sim.gd")
const DATA_PATH := "res://data/section_bay01.json"

var checks := 0
var failures := 0


func _initialize() -> void:
	print("== LiveBay: Severed · section tests ==")
	var data := _load()
	_check(not data.is_empty(), "section data loads")
	if data.is_empty():
		_finish()
		return
	var sim = SimScript.new()
	sim.setup(data)
	_check(sim.rooms.size() == 6, "6 rooms")
	_check(sim.doors.size() == 5, "5 doors")
	_check(sim.power_on and sim.battery > 90.0, "power starts on")
	_test_leak(sim)
	_test_power(sim)
	_test_seal(sim)
	_test_fire(sim)
	_test_npc(sim)
	_test_evac(sim)
	_test_death(sim)
	_finish()


func _load() -> Dictionary:
	var f := FileAccess.open(DATA_PATH, FileAccess.READ)
	if f == null:
		return {}
	var parsed: Variant = JSON.parse_string(f.get_as_text())
	return parsed if parsed is Dictionary else {}


func _test_leak(sim: LiveBaySectionSim) -> void:
	var p0 := float(sim.room("corridor").pressure)
	sim.step(20.0)
	_check(float(sim.room("corridor").pressure) < p0, "leak lowers pressure")
	sim.repair_leak("corridor")
	var p1 := float(sim.room("corridor").pressure)
	sim.step(2.0)
	_check(float(sim.room("corridor").pressure) >= p1 - 0.6, "repair stops pressure loss")


func _test_power(sim: LiveBaySectionSim) -> void:
	sim.toggle_power()
	_check(not sim.power_on, "power toggles off")
	var o0 := float(sim.room("control").o2)
	sim.step(5.0)
	_check(float(sim.room("control").o2) < o0, "power off drains room O2")


func _test_seal(sim: LiveBaySectionSim) -> void:
	var kits := sim.seal_kits
	sim.seal_door("d_med")
	_check(sim.seal_kits == kits - 1, "seal consumes kit")
	var door: Dictionary = sim.doors[3]
	_check(bool(door.sealed), "door becomes sealed")


func _test_fire(sim: LiveBaySectionSim) -> void:
	sim.room("med")["fire"] = 0.8
	_check(sim.extinguish("med"), "fire can be extinguished")
	_check(float(sim.room("med").fire) == 0.0, "fire reaches zero")


func _test_npc(sim: LiveBaySectionSim) -> void:
	sim.player_room = "med"
	_check(sim.rescue_npc(), "NPC can be rescued in med")
	_check(bool(sim.npc.rescued), "NPC rescued flag")


func _test_evac(sim: LiveBaySectionSim) -> void:
	sim.player_room = "dock"
	sim.rescue_open = true
	_check(sim.evacuate(), "evacuation at dock")
	_check(sim.state == "evacuated", "evacuation state")


func _test_death(sim: LiveBaySectionSim) -> void:
	var s = SimScript.new()
	s.setup(_load())
	s.suit_o2 = 0.0
	s.health = 1.0
	s.step(1.0)
	_check(s.state == "dead", "death when suit/health gone")


func _check(ok: bool, name: String) -> void:
	checks += 1
	if ok:
		print("PASS  ", name)
	else:
		failures += 1
		print("FAIL  ", name)


func _finish() -> void:
	print("-- %d checks, %d failed --" % [checks, failures])
	quit(0 if failures == 0 else 1)
