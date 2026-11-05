# LiveBay · 班次记录持久化
# 保留最近 3 班；只存简报字段，不写长期进度。
class_name LiveBayShiftStore
extends RefCounted

const PATH := "user://shift.json"
const MAX_RECORDS := 3


func load_records() -> Array:
	if not FileAccess.file_exists(PATH):
		return []
	var parsed: Variant = JSON.parse_string(FileAccess.get_file_as_string(PATH))
	if parsed is Array:
		return parsed
	if parsed is Dictionary and parsed.has("shift"):
		return [parsed]  # 兼容旧的单条格式
	return []


func save_records(records: Array) -> void:
	var file := FileAccess.open(PATH, FileAccess.WRITE)
	if file == null:
		return
	file.store_string(JSON.stringify(records.slice(max(0, records.size() - MAX_RECORDS)), "\t"))
	file.close()
