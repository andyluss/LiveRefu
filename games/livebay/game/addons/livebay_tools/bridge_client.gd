# LiveBay Tools · Python 数据桥客户端
# 规则：TECH-A1（单一数据源）、TECH-B1（可逆工程）
extends RefCounted

const BRIDGE := "res://addons/livebay_tools/bridge.py"
const TEMP_FILE := "user://livebay_tools_map.json"

var python: String


func _init() -> void:
	python = OS.get_environment("PYTHON")
	if python.is_empty():
		python = "python3"


func _bridge_path() -> String:
	return ProjectSettings.globalize_path(BRIDGE)


func _temp_path() -> String:
	return ProjectSettings.globalize_path(TEMP_FILE)


func _execute(action: String) -> Dictionary:
	var output: Array = []
	var code := OS.execute(python, [_bridge_path(), action, "--json", _temp_path()], output, true)
	var text := "\n".join(output)
	if code != 0:
		return {"ok": false, "error": text.strip_edges()}
	for i in range(output.size() - 1, -1, -1):
		var parsed: Variant = JSON.parse_string(str(output[i]))
		if parsed is Dictionary:
			return parsed
	return {"ok": false, "error": text.strip_edges()}


func read_map() -> Dictionary:
	if FileAccess.file_exists(TEMP_FILE):
		DirAccess.remove_absolute(_temp_path())
	var result := _execute("read")
	if not bool(result.get("ok", false)):
		return result
	if FileAccess.file_exists(TEMP_FILE):
		var parsed: Variant = JSON.parse_string(FileAccess.get_file_as_string(TEMP_FILE))
		if parsed is Dictionary:
			return parsed
	return result


func write_map(map_data: Dictionary) -> Dictionary:
	var file := FileAccess.open(TEMP_FILE, FileAccess.WRITE)
	if file == null:
		return {"ok": false, "error": "无法写临时文件"}
	file.store_string(JSON.stringify({"map": map_data}, "  "))
	file.close()
	return _execute("write")


func check() -> Dictionary:
	return _execute("check")
