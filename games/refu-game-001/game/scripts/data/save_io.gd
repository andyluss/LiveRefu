extends RefCounted
class_name SaveIo
## SaveIo —— 存档读写（user://refu_game_001_save.json）：只存"解锁进度 + 各关最佳成绩"。

const SAVE_PATH := "user://refu_game_001_save.json"


static func save(state: AppState) -> void:
	var payload := {"unlocked": state.unlocked_levels, "results": state.results}
	var f := FileAccess.open(SAVE_PATH, FileAccess.WRITE)
	if f != null:
		f.store_string(JSON.stringify(payload))


static func load_into(state: AppState) -> void:
	if not FileAccess.file_exists(SAVE_PATH):
		return
	var parsed = JSON.parse_string(FileAccess.get_file_as_string(SAVE_PATH))
	if typeof(parsed) != TYPE_DICTIONARY:
		return
	state.unlocked_levels = []
	for l in parsed.get("unlocked", ["L1-1"]):
		state.unlocked_levels.append(String(l))
	state.results = parsed.get("results", {})
