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
	var tower_id := str(Consts.TOWER_ORDER[index])
	if tower_id in host.data.get("tower_disabled", []):
		host.toast_text = "本实验禁用了该塔"
		host.toast_timer = 1.4
		return
	host.selected_tower_id = tower_id
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
	if host.runtime == null:
		return
	var current := float(host.runtime.clock.speed)
	var next := 1.0
	if current < 1.5:
		next = 2.0
	elif current < 3.0:
		next = 4.0
	host.runtime.dispatch(&"set_speed", {"speed": next})


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


func show_checklist(envelope: Dictionary) -> void:
	# Runtime 事件传的是 envelope；直接调用时可传 card 本身。
	var card: Dictionary = envelope
	if envelope.has("payload") and envelope.get("payload") is Dictionary:
		card = envelope.payload.get("card", {})
	if host.flow_controller != null:
		host.flow_controller.show_checklist(card)


func show_fault() -> void:
	if host.flow_controller != null:
		host.flow_controller.show_fault()


func cancel_modal() -> void:
	if host.flow_controller != null and host.flow_controller.has_modal():
		host.flow_controller.close_modal()
		return
	host.selected_slot = -1


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


func show_lab(axis: String = "all", difficulty: String = "all") -> void:
	if host.router != null:
		host.router.open_lab()
		return
	host.toast_text = "请从主页进入自由模式"
	host.toast_timer = 1.8


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
