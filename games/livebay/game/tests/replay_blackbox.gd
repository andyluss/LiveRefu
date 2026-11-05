# LiveBay · 黑匣子回放 CLI
# 运行：./run.sh replay [path]
# 默认读 user://blackbox 里最新的 .jsonl。
extends SceneTree

const DataLoaderScript = preload("res://scripts/core/data_loader.gd")
const RuntimeScript = preload("res://scripts/application/mission_runtime.gd")
const BlackBoxScript = preload("res://scripts/platform/black_box.gd")


func _initialize() -> void:
	var args := OS.get_cmdline_user_args()
	var path := str(args[0]) if not args.is_empty() else _latest()
	if path.is_empty() or not FileAccess.file_exists(path):
		print("replay: 没有可读的黑匣子文件")
		quit(1)
		return
	var entries: Array = BlackBoxScript.read_events(path)
	var expected: Dictionary = {}
	for entry in entries:
		if str(entry.get("kind", "")) == "result":
			expected = entry.get("result", {})
	var data: Dictionary = DataLoaderScript.load_mission_pack()
	if data.is_empty():
		print("replay: 数据加载失败")
		quit(1)
		return
	var runtime: LiveBayMissionRuntime = RuntimeScript.replay(data, entries)
	var actual: Dictionary = runtime.sim.result
	print("replay: %s" % path)
	print("expected: grade=%s integrity=%d kills=%d" % [str(expected.get("grade", "-")), int(expected.get("integrity", 0)), int(expected.get("kills", 0))])
	print("actual:   grade=%s integrity=%d kills=%d" % [str(actual.get("grade", "-")), int(actual.get("integrity", 0)), int(actual.get("kills", 0))])
	var ok := expected.is_empty() or (
		str(expected.get("grade", "")) == str(actual.get("grade", "")) and
		int(expected.get("integrity", -1)) == int(actual.get("integrity", -2)) and
		int(expected.get("kills", -1)) == int(actual.get("kills", -2))
	)
	runtime.dispose()
	print("replay: %s" % ("OK" if ok else "MISMATCH"))
	quit(0 if ok else 1)


func _latest() -> String:
	var dir := DirAccess.open("user://blackbox")
	if dir == null:
		return ""
	var names: Array = []
	dir.list_dir_begin()
	var name := dir.get_next()
	while name != "":
		if not dir.current_is_dir() and name.ends_with(".jsonl"):
			names.append(name)
		name = dir.get_next()
	dir.list_dir_end()
	if names.is_empty():
		return ""
	names.sort()
	return "user://blackbox/" + str(names[names.size() - 1])
