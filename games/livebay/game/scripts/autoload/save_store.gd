# LiveBay · 存档
# 只存「记录」与设置，不存不可恢复的进度；损坏时静默重置。
extends Node

const SAVE_PATH := "user://save.json"

var data: Dictionary = {
	"best_grade": "F",
	"best_integrity": 0.0,
	"clears": 0,
	"attempts": 0,
	"preferred_speed": 1,
}


func _ready() -> void:
	load_save()


func load_save() -> void:
	if not FileAccess.file_exists(SAVE_PATH):
		return
	var file := FileAccess.open(SAVE_PATH, FileAccess.READ)
	if file == null:
		return
	var parsed: Variant = JSON.parse_string(file.get_as_text())
	if typeof(parsed) != TYPE_DICTIONARY:
		return
	for key: Variant in data.keys():
		if parsed.has(key):
			data[key] = parsed[key]


func save() -> void:
	var file := FileAccess.open(SAVE_PATH, FileAccess.WRITE)
	if file == null:
		push_warning("SaveStore: 无法写入 %s" % SAVE_PATH)
		return
	file.store_string(JSON.stringify(data, "\t"))


func record_result(result: Dictionary) -> void:
	data.attempts = int(data.attempts) + 1
	if bool(result.get("won", false)):
		data.clears = int(data.clears) + 1
		var integrity: float = float(result.get("integrity", 0.0))
		if integrity > float(data.best_integrity):
			data.best_integrity = integrity
		var grade: String = String(result.get("grade", "C"))
		if grade_rank(grade) > grade_rank(String(data.best_grade)):
			data.best_grade = grade
	save()


func grade_rank(grade: String) -> int:
	match grade:
		"S":
			return 4
		"A":
			return 3
		"B":
			return 2
		"C":
			return 1
	return 0
