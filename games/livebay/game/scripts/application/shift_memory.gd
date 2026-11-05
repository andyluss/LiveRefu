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
		history = loaded.slice(max(0, loaded.size() - 10))
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
	history = history.slice(-10)
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
	var streak := low_streak()
	var audit := ""
	if streak > 0:
		audit = "\n\n审计备注：连续低报 %d 班，下次故障停塔 +%ds、准备时间 -5s。" % [streak, streak]
		var broadcast := broadcast_text()
		if not broadcast.is_empty():
			audit += "\n" + broadcast
	var last_shift := "\n\n上一班：%s / 保障度 %d%s" % [
		str(last_report.grade),
		int(last_report.integrity),
		" / 低报 +1" if int(last_report.low_report) > 0 else "",
	]
	var recent := ""
	if history.size() > 1:
		var parts: Array = []
		for entry in history:
			parts.append("第%d班 %s" % [int(entry.shift), str(entry.grade)])
		recent = "\n\n最近三班：" + " · ".join(parts)
	return {
		"title": "接班简报 · 第 %d 班" % (int(last_report.shift) + 1),
		"body": "%s%s%s%s" % [text, last_shift, audit, recent],
	}


func bypass_locked() -> bool:
	return low_streak() >= 3


func audit_prep_penalty() -> float:
	return 5.0 if bypass_locked() else 0.0


func broadcast_text() -> String:
	var streak := low_streak()
	if streak >= 3:
		return "广播：外环进入停班审计，事故统计暂停对外发布。"
	if streak >= 2:
		return "广播：外环事故统计与交接记录不一致，已列入本周复核。"
	return ""


func low_streak() -> int:
	var count := 0
	for i in range(history.size() - 1, -1, -1):
		if int(history[i].get("low_report", 0)) <= 0:
			break
		count += 1
	return count


func archive_text() -> String:
	if history.is_empty():
		return "还没有班次记录。"
	var labels := {"honest": "如实", "custom": "按惯例", "review": "待复查", "": "未记录"}
	var lines: Array = []
	for entry in history:
		lines.append("第 %d 班   %s   保障度 %d   %s%s" % [
			int(entry.shift),
			str(entry.grade),
			int(entry.integrity),
			str(labels.get(str(entry.choice), str(entry.choice))),
			"   低报 +1" if int(entry.low_report) > 0 else "",
		])
	return "\n".join(lines)


func next_low_report() -> int:
	return low_streak()


func next_fault_bonus() -> float:
	return float(low_streak())
