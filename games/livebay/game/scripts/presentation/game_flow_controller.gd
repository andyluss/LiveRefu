# LiveBay · 流程控制器（Controller）
# 负责地图/档案/简报/检查单/故障/结算等流程视图；
# 业务动作仍通过 host（Main）执行，避免把规则搬进 UI。
class_name LiveBayGameFlowController
extends RefCounted

var host: Node
var hud: LiveBayGameHud
var palette: Dictionary
var archive_page := 0
var archive_filter := "all"
var archive_open := false


func setup(host_node: Node, game_hud: LiveBayGameHud, palette_data: Dictionary) -> void:
	host = host_node
	hud = game_hud
	palette = palette_data


func hide_all() -> void:
	if hud == null:
		return
	hud.overlay.visible = false
	hud.checklist_overlay.visible = false
	archive_open = false


func show_checklist(card: Dictionary) -> void:
	if card.is_empty() or hud == null:
		return
	hud.checklist_title.text = str(card.get("title", "班前检查单"))
	hud.checklist_body.text = str(card.get("body", "请选择处理方式。"))
	_clear_buttons()
	for option in card.get("options", []):
		var button := Button.new()
		button.text = str(option.get("label", "选择"))
		button.custom_minimum_size = Vector2(440, 42)
		hud.style_button(button, palette.teal, palette.cream)
		button.pressed.connect(host._choose_checklist.bind(str(card.get("id", "")), str(option.get("id", ""))))
		hud.checklist_buttons.add_child(button)
	hud.checklist_overlay.visible = true


func show_map_picker(data: Dictionary, current_map_id: String) -> void:
	if hud == null or hud.checklist_overlay.visible:
		return
	hud.checklist_title.text = "选择地图"
	hud.checklist_body.text = "当前：%s · 合同：%s。切换会重开一班，接班记录与低报 carry 保留。" % [str(data.get("map", {}).get("name", current_map_id)), str(host.current_contract)]
	_clear_buttons()
	for map_id: String in data.get("maps", {}).keys():
		var map_data: Dictionary = data.maps[map_id]
		var button := Button.new()
		button.text = "%s · %s" % [str(map_data.get("name", map_id)), map_id]
		button.custom_minimum_size = Vector2(440, 42)
		hud.style_button(button, palette.teal if map_id == current_map_id else palette.sage, palette.cream)
		button.pressed.connect(host._choose_map.bind(map_id))
		hud.checklist_buttons.add_child(button)
	hud.checklist_overlay.visible = true
	if host.runtime != null:
		host.runtime.clock.paused = true


func show_contracts() -> void:
	if hud == null or hud.checklist_overlay.visible:
		return
	hud.checklist_title.text = "班次合同"
	hud.checklist_body.text = "合同改变本班规则，不是数值皮肤。当前：%s" % str(host.current_contract)
	_clear_buttons()
	for c: Variant in host.data.get("contracts", []):
		var button := Button.new()
		button.text = "%s · %s" % [str(c.get("name", "?")), str(c.get("description", ""))]
		button.custom_minimum_size = Vector2(440, 42)
		hud.style_button(button, palette.teal if str(c.get("id", "")) == str(host.current_contract) else palette.sage, palette.cream)
		button.pressed.connect(host._choose_contract.bind(str(c.get("id", ""))))
		hud.checklist_buttons.add_child(button)
	hud.checklist_overlay.visible = true
	if host.runtime != null:
		host.runtime.clock.paused = true


func show_archive(page: int = 0, filter: String = "all") -> void:
	if hud == null or (hud.checklist_overlay.visible and not archive_open):
		return
	archive_open = true
	archive_filter = filter
	var archive: Dictionary = host.shift_memory.archive_page(page, 5, filter) if host.shift_memory != null else {"text": "还没有班次记录。", "page": 0, "pages": 1}
	archive_page = int(archive.get("page", 0))
	var filter_labels := {"all": "全部", "low": "低报", "honest": "如实", "custom": "按惯例"}
	hud.checklist_title.text = "班次档案 · %s · %d/%d" % [str(filter_labels.get(filter, filter)), archive_page + 1, int(archive.get("pages", 1))]
	hud.checklist_body.text = str(archive.get("text", ""))
	_clear_buttons()
	var filter_row := HBoxContainer.new()
	for key in ["all", "low", "honest", "custom"]:
		var filter_button := Button.new()
		filter_button.text = str(filter_labels[key])
		filter_button.custom_minimum_size = Vector2(92, 30)
		hud.style_button(filter_button, palette.sage if key == filter else palette.paper, palette.ink, 12)
		filter_button.pressed.connect(show_archive.bind(0, key))
		filter_row.add_child(filter_button)
	hud.checklist_buttons.add_child(filter_row)
	if int(archive.get("pages", 1)) > 1:
		var prev := Button.new()
		prev.text = "上一页"
		prev.custom_minimum_size = Vector2(140, 34)
		hud.style_button(prev, palette.sage, palette.ink)
		prev.disabled = archive_page <= 0
		prev.pressed.connect(show_archive.bind(archive_page - 1, archive_filter))
		hud.checklist_buttons.add_child(prev)
		var next := Button.new()
		next.text = "下一页"
		next.custom_minimum_size = Vector2(140, 34)
		hud.style_button(next, palette.sage, palette.ink)
		next.disabled = archive_page >= int(archive.get("pages", 1)) - 1
		next.pressed.connect(show_archive.bind(archive_page + 1, archive_filter))
		hud.checklist_buttons.add_child(next)
	var close := Button.new()
	close.text = "关闭"
	close.custom_minimum_size = Vector2(140, 34)
	hud.style_button(close, palette.teal, palette.cream)
	close.pressed.connect(host._close_archive)
	hud.checklist_buttons.add_child(close)
	hud.checklist_overlay.visible = true
	if host.runtime != null:
		host.runtime.clock.paused = true


func close_archive() -> void:
	if hud == null:
		return
	hud.checklist_overlay.visible = false
	archive_open = false
	if host.runtime != null:
		host.runtime.clock.paused = false


func show_briefing(briefing: Dictionary) -> void:
	if briefing.is_empty() or hud == null:
		return
	hud.checklist_title.text = str(briefing.get("title", "接班简报"))
	hud.checklist_body.text = str(briefing.get("body", ""))
	_clear_buttons()
	var start := Button.new()
	start.text = "接班"
	start.custom_minimum_size = Vector2(440, 42)
	hud.style_button(start, palette.teal, palette.cream)
	start.pressed.connect(host._dismiss_briefing)
	hud.checklist_buttons.add_child(start)
	hud.checklist_overlay.visible = true
	if host.runtime != null:
		host.runtime.clock.paused = true


func show_fault() -> void:
	if hud == null:
		return
	hud.checklist_title.text = "第 5 波 · 故障命中"
	var targets: Array = []
	if host.runtime != null and not host.runtime.sim.fault_pending.is_empty():
		for slot in host.runtime.sim.fault_pending.get("slots", []):
			targets.append("T-%02d" % (int(slot) + 1))
	var target_text := "受影响塔位：" + ("、".join(targets) if not targets.is_empty() else "—")
	hud.checklist_body.text = "%s\n隔离保安全，但这段弧会短暂无人守；\n旁路保覆盖，但塔会降级 8 秒。" % target_text
	_clear_buttons()
	var isolate := Button.new()
	isolate.text = "隔离：停塔 2.5s"
	isolate.custom_minimum_size = Vector2(440, 42)
	hud.style_button(isolate, palette.teal, palette.cream)
	isolate.pressed.connect(host._choose_fault_choice.bind("isolate"))
	hud.checklist_buttons.add_child(isolate)
	if host.shift_memory != null and host.shift_memory.bypass_locked():
		hud.checklist_body.text += "\n\n停班审计期间，旁路被禁用。"
	else:
		var bypass := Button.new()
		bypass.text = "旁路：降级 8s，保持在线"
		bypass.custom_minimum_size = Vector2(440, 42)
		hud.style_button(bypass, palette.amber, palette.ink)
		bypass.pressed.connect(host._choose_fault_choice.bind("bypass"))
		hud.checklist_buttons.add_child(bypass)
	hud.checklist_overlay.visible = true


func show_result(won: bool, result: Dictionary) -> void:
	if hud == null:
		return
	hud.overlay.visible = true
	hud.overlay_title.text = "本班结束 · %s" % String(result.get("grade", "C")) if won else "事故报告 · F"
	hud.overlay_title.add_theme_color_override("font_color", palette.teal if won else palette.rust)
	if won:
		hud.overlay_body.text = "保障度 %d/%d\n击杀 %d · 漏过 %d · 建造 %d\n\n下一班见。" % [
			int(result.integrity), int(result.max_integrity),
			int(result.kills), int(result.leaked), int(result.built),
		]
	else:
		hud.overlay_body.text = "保障度归零。\n击杀 %d · 漏过 %d · 撑到第 %d 波\n\n复盘：先补控制，再补输出。" % [
			int(result.kills), int(result.leaked), int(result.waves_cleared),
		]
	for child in hud.report_buttons.get_children():
		child.queue_free()
	if host.runtime != null and not host.runtime.procedure.report_options.is_empty():
		for option in host.runtime.procedure.report_options:
			var button := Button.new()
			button.text = str(option.get("label", "记录"))
			button.custom_minimum_size = Vector2(140, 34)
			hud.style_button(button, palette.sage, palette.ink, 13)
			button.pressed.connect(host._submit_report.bind(str(option.get("id", ""))))
			hud.report_buttons.add_child(button)


func show_broadcast(text: String) -> void:
	if hud == null or hud.broadcast_banner == null:
		return
	host.broadcast_full = text
	host.broadcast_reveal = 0.0
	hud.broadcast_label.text = "BROADCAST  /  "
	host.broadcast_banner.visible = true


func _clear_buttons() -> void:
	for child in hud.checklist_buttons.get_children():
		child.queue_free()
