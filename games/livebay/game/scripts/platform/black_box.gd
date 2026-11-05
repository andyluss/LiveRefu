# LiveBay · 黑匣子
# 记录命令/事件信封，任务结束后落盘；只保留最近 N 局。
class_name LiveBayBlackBox
extends RefCounted

const DIR := "user://blackbox"
const MAX_SESSIONS := 10
const MAX_EVENTS := 2000

var enabled := true
var events: Array = []
var meta: Dictionary = {}
var _active := false


func begin(session_meta: Dictionary = {}) -> void:
	meta = session_meta.duplicate(true)
	events.clear()
	_active = enabled


func record(envelope: Dictionary) -> void:
	if not enabled or not _active:
		return
	if events.size() >= MAX_EVENTS:
		events.pop_front()
	events.append(envelope.duplicate(true))


func finish(result: Dictionary) -> void:
	if not enabled or not _active:
		return
	_active = false
	var dir := DirAccess.open("user://")
	if dir == null:
		return
	if not dir.dir_exists("blackbox"):
		dir.make_dir("blackbox")
	var stamp := Time.get_datetime_string_from_system().replace(":", "-").replace("T", "_")
	var path := "%s/%s.jsonl" % [DIR, stamp]
	var file := FileAccess.open(path, FileAccess.WRITE)
	if file == null:
		push_warning("BlackBox: 无法写入 %s" % path)
		return
	file.store_line(JSON.stringify({"kind": "meta", "meta": meta}))
	for event in events:
		file.store_line(JSON.stringify(event))
	file.store_line(JSON.stringify({"kind": "result", "result": result}))
	file.close()
	_prune()


func _prune() -> void:
	var dir := DirAccess.open(DIR)
	if dir == null:
		return
	var files: Array = []
	dir.list_dir_begin()
	var name := dir.get_next()
	while name != "":
		if not dir.current_is_dir() and name.ends_with(".jsonl"):
			files.append(name)
		name = dir.get_next()
	dir.list_dir_end()
	files.sort()
	while files.size() > MAX_SESSIONS:
		var old: String = files.pop_front()
		dir.remove(old)
