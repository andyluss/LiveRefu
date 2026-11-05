# LiveBay · 连续班次记忆
# 保留最近 3 班；只用于接班简报与低报 carry，不参与规则。
class_name LiveBayShiftMemory
extends RefCounted

var shifts := 0
var history: Array = []
var last_report: Dictionary = {}
var store: LiveBayShiftStore


func _init(persist: LiveBayShiftStore = null) -> void:
	store = persist
	if store != null:
		var loaded: Array = store.load_records()
		history = loaded.slice(max(0, loaded.size() - 3))
		if not history.is_empty():
			last_report = history[history.size() - 1]
			shifts = int(last_report.get("shift", history.size()))


func has_last() -> bool:
	return not last_report.is_empty()


func record(result: Dictionary, choice: String, low_report: int) -> void:
	shifts += 1
	var entry := {
		"shift": shifts,
		"choice": choice,
		"low_report": low_report,
		"grade": str(result.get("grade", "C")),
		"integrity": int(result.get("integrity", 0)),
	}
	history.append(entry)
	history = history.slice(-3)
	last_report = entry
	if store != null:
		store.save_records(history)


func briefing() -> Dictionary:
	if not has_last():
		return {}
	var choice := str(last_report.choice)
	var text := ""
	match choice:
		"honest":
			text = "上一班如实记录了 T-07 异响。广播事故数与档案对上了，但维修组会来问细节。"
		"custom":
			text = "上一班按惯例写了「系统运行正常」。档案里留了一笔低报；这一班的广播听起来干净得有点过头。"
		"review":
			text = "上一班把 T-07 标成「待复查」。没有人被追责，但这件事还挂在交接单上。"
		_:
			text = "上一班没有留下文字记录。交接单上只有评级与保障度。"
	var audit := "\n\n审计备注：本班交接后，下次故障停塔 +1s。" if int(last_report.low_report) > 0 else ""
	var recent := ""
	if history.size() > 1:
		var parts: Array = []
		for entry in history:
			parts.append("第%d班 %s" % [int(entry.shift), str(entry.grade)])
		recent = "\n\n最近三班：" + " · ".join(parts)
	return {
		"title": "接班简报 · 第 %d 班" % (int(last_report.shift) + 1),
		"body": "%s\n\n上一班：%s / 保障度 %d%s%s%s" % [
			text,
			str(last_report.grade),
			int(last_report.integrity),
			" / 低报 +1" if int(last_report.low_report) > 0 else "",
			audit,
			recent,
		],
	}


func next_low_report() -> int:
	return int(last_report.get("low_report", 0))


func next_fault_bonus() -> float:
	return 1.0 if next_low_report() > 0 else 0.0
