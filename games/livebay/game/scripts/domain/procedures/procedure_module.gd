# LiveBay · 班次流程模块
# 只负责检查单：何时请求、选项、把结果写入 Sim 的窄字段。
class_name LiveBayProcedureModule
extends RefCounted

var cards: Array = []
var report_options: Array = []
var report_choice := ""
var done: Dictionary = {}
var pending: Dictionary = {}


func configure(game_data: Dictionary, prior_low_report := 0) -> void:
	var procedures: Dictionary = game_data.get("procedures", {})
	cards = procedures.get("cards", [])
	if int(prior_low_report) > 0:
		# 有低报时，第 4 波先过一张审计卡，替代原 W4 检查单。
		cards = cards.filter(func(card: Dictionary) -> bool: return int(card.get("wave", 0)) != 4)
		cards.insert(0, {
			"id": "audit_previous_low",
			"wave": 4,
			"title": "交接审计 · 上一班低报",
			"body": "上一班的记录对不上。配合审计，还是继续按惯例？",
			"options": [
				{"id": "cooperate", "label": "配合审计：如实补记", "effect": "sign"},
				{"id": "deny", "label": "按惯例：再记一笔低报", "effect": "custom"},
			],
		})
	report_options = procedures.get("report", [])
	report_choice = ""
	reset()


func reset() -> void:
	done.clear()
	pending.clear()
	report_choice = ""


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


func submit_report(option_id: String, sim: Variant) -> LiveBayResult:
	for option in report_options:
		if str(option.get("id", "")) != option_id:
			continue
		var effect := str(option.get("effect", "none"))
		if effect == "custom":
			sim.low_report += 1
		report_choice = option_id
		return LiveBayResult.success("记录已提交", {"effect": effect, "choice": option_id})
	return LiveBayResult.failure(&"report_option", "未知记录选项 %s" % option_id)
