# LiveBay · 连续班次记忆
# 只存「上一班记录」用于下一班简报；不写长期存档，不参与规则。
class_name LiveBayShiftMemory
extends RefCounted

var shifts := 0
var last_report: Dictionary = {}


func has_last() -> bool:
	return not last_report.is_empty()


func record(result: Dictionary, choice: String, low_report: int) -> void:
	shifts += 1
	last_report = {
		"shift": shifts,
		"choice": choice,
		"low_report": low_report,
		"grade": str(result.get("grade", "C")),
		"integrity": int(result.get("integrity", 0)),
	}


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
	return {
		"title": "接班简报 · 第 %d 班" % (int(last_report.shift) + 1),
		"body": "%s\n\n上一班：%s / 保障度 %d%s" % [
			text,
			str(last_report.grade),
			int(last_report.integrity),
			" / 低报 +1" if int(last_report.low_report) > 0 else "",
		],
	}
