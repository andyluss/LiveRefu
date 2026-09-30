extends Node
## 无头自检（`./run.sh boot`）：不渲染任何东西，只证明三件事——
##   1. 工程与 autoload 能装载；2. 数据表目录可枚举；3. 每张表是合法 JSON 且可读出条目数。
## 它是 S1 的"工程底座探针"：S2 起会把"跑完一局"的断言接到这里（或新增 res://scenes/tools/headless_sim.tscn）。

const EXIT_OK := 0
const EXIT_FAIL := 1

func _ready() -> void:
	var failures := PackedStringArray()
	var tables := AppInfo.list_data_tables()

	if tables.is_empty():
		failures.append("数据表目录为空：%s" % AppInfo.ERAS_DIR)
	else:
		print("[boot] 数据表 %d 个" % tables.size())
		for table in tables:
			var path := "%s/%s" % [AppInfo.ERAS_DIR, table]
			var count := _count_entries(path, failures)
			if count >= 0:
				print("[boot]   %s → %d 条" % [table, count])

	print("[boot] schema=v%d | %s" % [AppInfo.DATA_SCHEMA_VERSION, AppInfo.PROJECT_PHASE])
	if failures.is_empty():
		print("BOOT OK")
		get_tree().quit(EXIT_OK)
		return
	for message in failures:
		printerr("[boot] FAIL: %s" % message)
	print("BOOT FAILED（%d 项）" % failures.size())
	get_tree().quit(EXIT_FAIL)

## 读一张表并返回条目数；失败计入 failures 并返回 -1。
func _count_entries(path: String, failures: PackedStringArray) -> int:
	var text := FileAccess.get_file_as_string(path)
	if text.is_empty():
		failures.append("读不到文件：%s" % path)
		return -1
	var parsed: Variant = JSON.parse_string(text)
	if parsed == null:
		failures.append("不是合法 JSON：%s" % path)
		return -1
	if typeof(parsed) != TYPE_DICTIONARY:
		failures.append("顶层必须是对象（含 schemaVersion 与 entries）：%s" % path)
		return -1
	var dict: Dictionary = parsed
	if not dict.has("entries") or typeof(dict["entries"]) != TYPE_ARRAY:
		failures.append("缺少 entries 数组：%s" % path)
		return -1
	return (dict["entries"] as Array).size()
