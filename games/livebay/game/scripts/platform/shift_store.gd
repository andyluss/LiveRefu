# LiveBay · 上一班记录持久化
# 只存上一班简报所需字段；不写长期进度，不参与规则。
class_name LiveBayShiftStore
extends RefCounted

const PATH := "user://shift.json"


func load_record() -> Dictionary:
	if not FileAccess.file_exists(PATH):
		return {}
	var parsed: Variant = JSON.parse_string(FileAccess.get_file_as_string(PATH))
	return parsed if parsed is Dictionary else {}


func save_record(record: Dictionary) -> void:
	var file := FileAccess.open(PATH, FileAccess.WRITE)
	if file == null:
		return
	file.store_string(JSON.stringify(record, "\t"))
	file.close()
