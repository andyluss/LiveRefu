# LiveBay · 反馈控制器
# 处理模拟信号 → 音乐/音效/toast/流程结果；不参与规则。
class_name LiveBayGameFeedback
extends RefCounted

var host: Node


func setup(host_node: Node) -> void:
	host = host_node


func on_tower_fired(from: Vector2, to: Vector2, kind: String) -> void:
	host.beams.append({"from": from, "to": to, "kind": kind, "life": 0.09, "max_life": 0.09})


func on_enemy_leaked(_enemy: Dictionary) -> void:
	host.leak_flash = 0.4
	host.toast_text = "保障度受损"
	host.toast_timer = 1.2


func on_wave_started(index: int) -> void:
	host.audio.play_music("wave")
	host.audio.play("wave_warning")
	var resident := _resident_line(index)
	if not resident.is_empty():
		host.toast_text = resident
		host.toast_timer = 3.2
		host.audio.play("resident")
	elif index >= 4:
		host.toast_text = "第 %d 波 · 故障链" % index
		host.toast_timer = 1.8
	else:
		host.toast_text = "第 %d 波 · 交战中" % index
		host.toast_timer = 1.8


func on_tower_disabled(slot: int, duration: float) -> void:
	host.audio.play("fault_spark")
	host.toast_text = "第 %d 号塔故障 · %.0f 秒" % [slot + 1, duration]
	host.toast_timer = 2.0


func on_tower_degraded(slot: int, duration: float) -> void:
	host.audio.play("degraded")
	host.audio.play("fault_short")
	host.toast_text = "第 %d 号塔降级 · %.0f 秒" % [slot + 1, duration]
	host.toast_timer = 2.0


func on_fault_escaped(_enemy: Dictionary) -> void:
	host.audio.play("fault_arc")
	host.toast_text = "故障已扩散出外环"
	host.toast_timer = 1.6


func on_game_won(result: Dictionary) -> void:
	host.audio.play("win")
	if host.current_mode == "main":
		SaveStore.record_result(result)
	show_result(true, result)


func on_game_lost(result: Dictionary) -> void:
	host.audio.play("lost")
	if host.current_mode == "main":
		SaveStore.record_result(result)
	show_result(false, result)


func show_result(won: bool, result: Dictionary) -> void:
	host.audio.play_music("result")
	host.audio.play("result_stamp")
	host.current_result = result.duplicate(true)
	if host.flow_controller != null:
		host.flow_controller.show_result(won, result)


func submit_report(option_id: String) -> void:
	if host.runtime == null:
		return
	var result: LiveBayResult = host.runtime.dispatch(&"submit_report", {"option_id": option_id})
	if not result.ok:
		return
	host.flow_controller.set_report_note("本班记录：%s" % ("低报" if str(result.data.get("effect", "")) == "custom" else "已记录"))
	if host.current_mode == "main":
		host.shift_memory.record(host.current_result, option_id, host.runtime.sim.low_report)
	host.flow_controller.clear_report_buttons()


func _resident_line(index: int) -> String:
	for r: Variant in host.data.get("residents", []):
		var waves: Array = r.get("waves", [])
		var pos := waves.find(index)
		if pos >= 0:
			var lines: Array = r.get("lines", [])
			if pos < lines.size():
				return "%s（%s）：%s" % [str(r.get("name", "?")), str(r.get("role", "")), str(lines[pos])]
	return ""
