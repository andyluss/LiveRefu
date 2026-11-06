# LiveBay · 会期控制器（Session）
# 负责数据/运行时/模拟的生命周期：新建、重开、切图、释放。
# UI 只通过 host 的方法更新；规则仍在 application/core。
class_name LiveBayGameSession
extends RefCounted

const DataLoaderScript = preload("res://scripts/core/data_loader.gd")
const RuntimeScript = preload("res://scripts/application/mission_runtime.gd")
const ExpansionBootScript = preload("res://scripts/expansion/expansion_boot.gd")
const ShiftMemoryScript = preload("res://scripts/application/shift_memory.gd")
const ShiftStoreScript = preload("res://scripts/platform/shift_store.gd")

var host: Node


func setup(host_node: Node) -> void:
	host = host_node
	host.shift_memory = ShiftMemoryScript.new(ShiftStoreScript.new())
	host.current_map_id = "bay01"
	host.current_contract = "stable"
	host.data = DataLoaderScript.load_mission_pack()
	if host.data.is_empty():
		host._show_fatal("数据加载失败：请检查 game/data/*.json")
		return
	new_sim()


func new_sim() -> void:
	if host == null or host.data.is_empty():
		return
	_apply_contract()
	var boot: LiveBayResult = ExpansionBootScript.load_preset("res://data/expansion_sets/baseline.json")
	var expansion_set: LiveBayExpansionSet = boot.data if boot.ok else null
	host.runtime = RuntimeScript.new(host.data, expansion_set, host.shift_memory.next_low_report(), host.shift_memory.audit_remaining)
	host.runtime.events.subscribe(&"ChecklistRequested", host._on_checklist_requested)
	host.runtime.events.subscribe(&"FaultChoiceRequested", host._on_fault_choice_requested)
	host.current_map_id = str(host.data.get("map_id", "bay01"))
	host.sim = host.runtime.sim
	if _contract().get("bypass_locked", false):
		host.sim.fault_bypass_locked = true
	host.sim.fault_duration_bonus += float(_contract().get("fault_bonus", 0.0))
	_connect_sim()
	host.selected_slot = -1
	host.beams.clear()
	host.leak_flash = 0.0
	host.toast_timer = 0.0
	host.runtime.clock.paused = false
	if host.flow_controller != null:
		host.flow_controller.hide_all()
	elif host.overlay != null:
		host.overlay.visible = false
		if host.checklist_overlay != null:
			host.checklist_overlay.visible = false
	if host.shift_memory.has_last():
		host._show_briefing()


func restart() -> void:
	if host == null or host.sim == null:
		return
	host.runtime.reset()
	host.runtime.procedure.configure(host.runtime.data, host.shift_memory.next_low_report())
	host.sim = host.runtime.sim
	host.sim.fault_duration_bonus = host.shift_memory.next_fault_bonus()
	host.sim.fault_bypass_locked = host.shift_memory.bypass_locked()
	if host.shift_memory.audit_prep_penalty() > 0.0:
		host.sim.wave.timer = maxf(0.0, host.sim.wave.timer - host.shift_memory.audit_prep_penalty())
	host.selected_slot = -1
	host.beams.clear()
	host.leak_flash = 0.0
	host.toast_timer = 0.0
	if host.flow_controller != null:
		host.flow_controller.hide_all()
	elif host.overlay != null:
		host.overlay.visible = false
		if host.checklist_overlay != null:
			host.checklist_overlay.visible = false
	if host.shift_memory.has_last():
		host._show_briefing()


func choose_contract(contract_id: String) -> bool:
	if host == null:
		return false
	var found := false
	for c: Variant in host.data.get("contracts", []):
		if str(c.get("id", "")) == contract_id:
			found = true
			break
	if not found:
		return false
	host.current_contract = contract_id
	host.data = DataLoaderScript.load_mission_pack("res://data", host.current_map_id)
	if host.data.is_empty():
		return false
	new_sim()
	return true


func _contract() -> Dictionary:
	for c: Variant in host.data.get("contracts", []):
		if str(c.get("id", "")) == str(host.current_contract):
			return c
	return {}


func _apply_contract() -> void:
	var c := _contract()
	if c.is_empty():
		return
	host.data.balance["starting_energy"] = float(host.data.balance.get("starting_energy", 0.0)) + float(c.get("energy_delta", 0.0))
	var prep_delta := float(c.get("prep_delta", 0.0))
	if not is_zero_approx(prep_delta):
		for w: Dictionary in host.data.get("waves", []):
			w.prep = maxf(1.0, float(w.get("prep", 0.0)) + prep_delta)


func switch_map(map_id: String) -> bool:
	if host == null:
		return false
	if map_id == host.current_map_id:
		if host.runtime != null:
			host.runtime.clock.paused = false
		return false
	if host.runtime != null:
		host.runtime.dispose()
		host.runtime = null
	host.sim = null
	host.data = DataLoaderScript.load_mission_pack("res://data", map_id)
	if host.data.is_empty():
		host._show_fatal("地图加载失败：%s" % map_id)
		return false
	new_sim()
	return true


func dispose() -> void:
	if host == null:
		return
	_disconnect_sim()
	if host.runtime != null:
		host.runtime.dispose()
		host.runtime = null
	host.sim = null


func _connect_sim() -> void:
	var s = host.sim
	s.tower_fired.connect(host._on_tower_fired)
	s.game_won.connect(host._on_game_won)
	s.game_lost.connect(host._on_game_lost)
	s.enemy_leaked.connect(host._on_enemy_leaked)
	s.fault_escaped.connect(host._on_fault_escaped)
	s.tower_disabled.connect(host._on_tower_disabled)
	s.tower_degraded.connect(host._on_tower_degraded)
	s.wave_started.connect(host._on_wave_started)


func _disconnect_sim() -> void:
	var s = host.sim
	if s == null:
		return
	for sig: String in ["tower_fired", "game_won", "game_lost", "enemy_leaked", "fault_escaped", "tower_disabled", "tower_degraded", "wave_started"]:
		var callable: Callable = Callable(host, "_on_" + sig)
		if s.is_connected(sig, callable):
			s.disconnect(sig, callable)
