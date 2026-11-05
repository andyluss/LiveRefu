# LiveBay · 班次流程模块
# 只负责检查单：何时请求、选项、把结果写入 Sim 的窄字段。
class_name LiveBayProcedureModule
extends RefCounted

var cards: Array = []
var done: Dictionary = {}
var pending: Dictionary = {}


func configure(game_data: Dictionary) -> void:
	var procedures: Dictionary = game_data.get("procedures", {})
	cards = procedures.get("cards", [])
	reset()


func reset() -> void:
	done.clear()
	pending.clear()


func has_pending() -> bool:
	return not pending.is_empty()


func update(sim: Variant) -> Dictionary:
	if not pending.is_empty():
		return pending
	if sim.state != 0 and sim.state != 2:
		return {}
	var next_wave := int(sim.wave_index) + 2
	for card in cards:
		if int(card.get("wave", 0)) != next_wave:
			continue
		var card_id := str(card.get("id", ""))
		if card_id.is_empty() or done.has(card_id):
			continue
		pending = card.duplicate(true)
		return pending
	return {}


func resolve(card_id: String, option_id: String, sim: Variant) -> LiveBayResult:
	if pending.is_empty() or str(pending.get("id", "")) != card_id:
		return LiveBayResult.failure(&"checklist_not_open", "该检查单未打开")
	for option in pending.get("options", []):
		if str(option.get("id", "")) != option_id:
			continue
		var effect := str(option.get("effect", "none"))
		if effect == "review":
			sim.fault_duration_bonus = minf(float(sim.fault_duration_bonus), -1.0)
		elif effect == "custom":
			sim.low_report += 1
		elif effect == "isolate":
			sim.fault_bypass = false
		elif effect == "bypass":
			sim.fault_bypass = true
		done[card_id] = option_id
		pending.clear()
		return LiveBayResult.success("检查单已处理", {"effect": effect})
	return LiveBayResult.failure(&"checklist_option", "未知选项 %s" % option_id)
