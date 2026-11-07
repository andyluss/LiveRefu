# LiveBay · 命令控制器
# 把输入/按钮动作翻译成 Runtime 命令或流程视图调用；不直接改规则状态。
class_name LiveBayGameCommandController
extends RefCounted

const Consts = preload("res://scripts/shared/constants.gd")

var host: Node
var palette: Dictionary


func setup(host_node: Node, palette_data: Dictionary) -> void:
	host = host_node
	palette = palette_data


func slot_at(pos: Vector2) -> int:
	if host.sim == null:
		return -1
	for i: int in range(host.sim.slots.size()):
		if pos.distance_to(host.sim.slots[i]) <= 28.0:
			return i
	return -1


func click_slot(slot: int) -> void:
	if host.sim.get_tower_at(slot) != null:
		host.selected_slot = slot
		return
	var result: LiveBayResult = host.runtime.dispatch(&"build_tower", {"slot": slot, "tower_id": host.selected_tower_id})
	if result.ok:
		host.selected_slot = slot
		host.audio.play("build")
		host.toast_text = "已建造 %s" % String(host.data.towers_by_id[host.selected_tower_id].name)
		host.toast_timer = 1.4


func select_tower(index: int) -> void:
	if index < 0 or index >= Consts.TOWER_ORDER.size():
		return
	host.selected_tower_id = Consts.TOWER_ORDER[index]
	host.audio.play("ui_hover")
	host.ui_presenter.refresh_tower_buttons()


func start_wave() -> void:
	if host.sim != null:
		host.runtime.dispatch(&"start_wave")


func upgrade_selected() -> void:
	if host.selected_slot < 0:
		return
	var result: LiveBayResult = host.runtime.dispatch(&"upgrade_tower", {"slot": host.selected_slot})
	if result.ok:
		host.audio.play("upgrade")
		host.toast_text = "已升级"
		host.toast_timer = 1.2


func sell_selected() -> void:
	if host.selected_slot < 0:
		return
	var result: LiveBayResult = host.runtime.dispatch(&"sell_tower", {"slot": host.selected_slot})
	if result.ok:
		host.audio.play("sell")
		host.toast_text = "已出售"
		host.toast_timer = 1.2
		host.selected_slot = -1


func toggle_pause() -> void:
	if host.runtime != null:
		host.runtime.dispatch(&"set_pause", {"paused": not host.runtime.clock.paused})


func toggle_speed() -> void:
	if host.runtime != null:
		host.runtime.dispatch(&"set_speed", {"speed": 2.0 if host.runtime.clock.speed == 1.0 else 1.0})


func restart() -> void:
	if host.session_controller != null:
		host.session_controller.restart()
	host.audio.play_music("prep")


func toggle_audio() -> void:
	if host.audio == null:
		return
	host.audio.set_muted(not host.audio.muted)
	host.toast_text = "音效已关闭" if host.audio.muted else "音效已开启"
	host.toast_timer = 1.4
	if not host.audio.muted:
		host.audio.play("ui")


func show_checklist(card: Dictionary) -> void:
	if host.flow_controller != null:
		host.flow_controller.show_checklist(card)


func show_fault() -> void:
	if host.flow_controller != null:
		host.flow_controller.show_fault()


func request_quit() -> void:
	if host.flow_controller != null:
		host.flow_controller.show_quit_confirm()


func confirm_quit() -> void:
	host.get_tree().quit()


func return_home() -> void:
	if host.router != null:
		host.router.open_home()
		return
	cancel_quit()
	host.toast_text = "直接游戏页没有主页"
	host.toast_timer = 1.8


func cancel_quit() -> void:
	if host.flow_controller != null:
		host.flow_controller.hide_all()
	if host.runtime != null:
		host.runtime.clock.paused = false


func show_home() -> void:
	if host.router != null:
		host.router.open_home()
		return
	host.toast_text = "直接游戏页：无主页；按 Q 退出"
	host.toast_timer = 1.8


func enter_main() -> void:
	if host.router != null:
		host.router.open_game()
		return
	if host.current_mode == "lab" and host.session_controller != null:
		host.session_controller.start_main()
	if host.runtime != null:
		host.runtime.clock.paused = false
	if host.shift_memory != null and host.shift_memory.has_last() and not host.briefing_seen:
		host.briefing_seen = true
		show_briefing()


func open_lab() -> void:
	if host.router != null:
		host.router.open_lab()
		return
	show_lab()


func show_lab(axis: String = "all", difficulty: String = "all") -> void:
	if host.router != null:
		host.router.open_lab()
		return
	if host.flow_controller != null:
		host.flow_controller.show_lab(host.lab_scenarios, host.current_mode, axis, difficulty)


func open_import_dialog() -> void:
	if host.flow_controller != null:
		host.flow_controller.open_import_dialog()


func export_lab_scenario(scenario_id: String) -> void:
	for scenario: Variant in host.lab_scenarios:
		if str(scenario.get("id", "")) == scenario_id:
			var path: String = LiveBayLabLoader.export_scenario(scenario)
			host.toast_text = "已导出实验：%s" % path if not path.is_empty() else "导出失败"
			host.toast_timer = 2.4
			return


func import_lab(path: String) -> void:
	var scenario: Dictionary = LiveBayLabLoader.import_scenario(path)
	if scenario.is_empty():
		host.toast_text = "导入失败：不是有效实验 JSON"
		host.toast_timer = 2.0
		return
	var id := str(scenario.get("id", ""))
	for i: int in range(host.lab_scenarios.size()):
		if str(host.lab_scenarios[i].get("id", "")) == id:
			host.lab_scenarios[i] = scenario
			host.flow_controller.show_lab(host.lab_scenarios, host.current_mode)
			return
	host.lab_scenarios.append(scenario)
	host.flow_controller.show_lab(host.lab_scenarios, host.current_mode)


func export_candidate(scenario_id: String) -> void:
	for scenario: Variant in host.lab_scenarios:
		if str(scenario.get("id", "")) != scenario_id:
			continue
		var path: String = LiveBayLabLoader.export_candidate(scenario)
		if path.is_empty():
			host.toast_text = "候选导出失败"
			host.toast_timer = 1.6
			return
		host.flow_controller.show_candidate(scenario, LiveBayLabLoader.diff(scenario), path)
		return


func start_lab(scenario_id: String) -> void:
	for scenario: Variant in host.lab_scenarios:
		if str(scenario.get("id", "")) != scenario_id:
			continue
		if host.session_controller.start_lab(scenario):
			host.flow_controller.hide_all()
			host.audio.play_music("prep")
			host.toast_text = "自由模式：%s" % str(scenario.get("name", scenario_id))
			host.toast_timer = 2.4
		return


func return_main() -> void:
	if host.session_controller.start_main():
		host.flow_controller.hide_all()
		host.audio.play_music("prep")
		host.toast_text = "已回到主线"
		host.toast_timer = 1.6


func show_map_picker() -> void:
	if host.flow_controller != null:
		host.flow_controller.show_map_picker(host.data, host.current_map_id)


func show_contracts() -> void:
	if host.flow_controller != null:
		host.flow_controller.show_contracts()


func show_residents() -> void:
	if host.flow_controller != null:
		host.flow_controller.show_residents(host.data)


func close_residents() -> void:
	if host.flow_controller != null:
		host.flow_controller.hide_all()
	if host.runtime != null:
		host.runtime.clock.paused = false


func show_archive(page: int = 0, filter: String = "all") -> void:
	if host.flow_controller != null:
		host.flow_controller.show_archive(page, filter)


func close_archive() -> void:
	if host.flow_controller != null:
		host.flow_controller.close_archive()


func show_briefing() -> void:
	if host.flow_controller != null and host.shift_memory != null:
		host.flow_controller.show_briefing(host.shift_memory.briefing())


func dismiss_briefing() -> void:
	if host.flow_controller != null:
		host.flow_controller.hide_all()
	if host.runtime != null:
		host.runtime.clock.paused = false
	if host.shift_memory != null:
		var broadcast: String = host.shift_memory.broadcast_text()
		if not broadcast.is_empty():
			show_broadcast(broadcast, 6.0)


func show_broadcast(text: String, duration: float) -> void:
	if host.flow_controller == null:
		return
	host.audio.play("broadcast")
	host.flow_controller.show_broadcast(text)
	host.broadcast_timer = duration


func choose_contract(contract_id: String) -> void:
	if host.session_controller != null and host.session_controller.choose_contract(contract_id):
		host.toast_text = "已切换合同：%s" % contract_id
		host.toast_timer = 1.6


func choose_map(map_id: String) -> void:
	if host.session_controller != null and host.session_controller.switch_map(map_id):
		host.toast_text = "已切换到 %s" % str(host.data.get("map", {}).get("name", map_id))
		host.toast_timer = 1.6


func choose_fault_choice(choice: String) -> void:
	if host.runtime == null:
		return
	var result: LiveBayResult = host.runtime.dispatch(&"submit_fault_choice", {"choice": choice})
	if not result.ok:
		host.toast_text = "故障处置：" + result.message
		host.toast_timer = 1.6
		return
	host.flow_controller.hide_all()


func choose_checklist(card_id: String, option_id: String) -> void:
	if host.runtime == null:
		return
	var result: LiveBayResult = host.runtime.dispatch(&"submit_checklist", {"card_id": card_id, "option_id": option_id})
	if not result.ok:
		host.toast_text = "检查单：" + result.message
		host.toast_timer = 1.6
		return
	host.flow_controller.hide_all()
	host.feedback.show_result(true, result)
