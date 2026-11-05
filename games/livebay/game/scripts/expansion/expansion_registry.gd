# LiveBay · 扩展包注册表 / preset 解析
# 失败包/缺失依赖/同组冲突都在这里被拒绝；core 不 import 具体包。
class_name LiveBayExpansionRegistry
extends RefCounted

const ManifestScript = preload("res://scripts/expansion/expansion_manifest.gd")
const SetScript = preload("res://scripts/expansion/expansion_set.gd")

const CORE_API := "0.1.0"
const CORE_MAJOR := 0

var manifests: Dictionary = {}
var errors: Array = []


func scan(dir := "res://expansions") -> void:
	manifests.clear()
	errors.clear()
	var root := DirAccess.open(dir)
	if root == null:
		errors.append("扩展目录不存在：%s" % dir)
		return
	root.list_dir_begin()
	var name := root.get_next()
	while name != "":
		if root.current_is_dir() and not name.begins_with("."):
			var path := "%s/%s/pack.json" % [dir, name]
			var loaded := ManifestScript.load_file(path)
			if loaded.ok:
				manifests[loaded.data.id()] = loaded.data
			else:
				errors.append("%s: %s" % [path, loaded.message])
		name = root.get_next()
	root.list_dir_end()


func resolve_preset(preset: Dictionary) -> LiveBayResult:
	if not preset.has("id"):
		return LiveBayResult.failure(&"preset_id", "preset 缺少 id")
	var enabled_ids: Array = []
	for id in preset.get("packs", []):
		enabled_ids.append(str(id))
	var slots: Dictionary = preset.get("slots", {})
	for group in slots.keys():
		enabled_ids.append(str(slots[group]))
	# 去重
	var unique: Array = []
	for id in enabled_ids:
		if id in unique:
			return LiveBayResult.failure(&"preset_duplicate", "preset 重复引用 %s" % id)
		unique.append(id)
	# 未知包
	for id in unique:
		if not manifests.has(id):
			return LiveBayResult.failure(&"preset_unknown", "未知扩展包 %s" % id)
	# core API 版本（当前只支持 >=0.1 <1.0 的简单范围）
	for id in unique:
		if not _core_compatible(str(manifests[id].data.get("core_api", ""))):
			return LiveBayResult.failure(&"preset_core_api", "%s 不兼容 core_api" % id)
	# 状态
	for id in unique:
		if str(manifests[id].data.state) == "retired":
			return LiveBayResult.failure(&"preset_retired", "扩展包已退役 %s" % id)
	# variant group 互斥 + slot 组一致性
	var groups: Dictionary = {}
	for id in unique:
		var m = manifests[id]
		var g := str(m.group())
		if g == "":
			continue
		if not slots.has(g):
			return LiveBayResult.failure(&"preset_group", "变体组 %s 未在 slots 中选择" % g)
		if str(slots[g]) != id:
			return LiveBayResult.failure(&"preset_group", "slots[%s] 与包 %s 不一致" % [g, id])
		if groups.has(g):
			return LiveBayResult.failure(&"preset_group", "变体组 %s 同时启用多个包" % g)
		groups[g] = id
	# 依赖/冲突
	for id in unique:
		var m = manifests[id]
		for req in m.data.get("requires", []):
			if not (str(req) in unique):
				return LiveBayResult.failure(&"preset_requires", "%s 需要 %s" % [id, req])
		for conflict in m.data.get("conflicts", []):
			if str(conflict) in unique:
				return LiveBayResult.failure(&"preset_conflict", "%s 与 %s 冲突" % [id, conflict])
	var packs: Array = []
	for id in unique:
		packs.append(manifests[id])
	return LiveBayResult.success("", SetScript.build(str(preset.id), slots, packs))


func _core_compatible(expr: String) -> bool:
	if expr.strip_edges().is_empty():
		return true
	var parts := expr.split(" ")
	for part in parts:
		if part.begins_with(">="):
			var v := part.substr(2).split(".")
			if CORE_API.split(".")[0].to_int() < v[0].to_int():
				return false
			if CORE_API.split(".")[0].to_int() == v[0].to_int() and CORE_API.split(".")[1].to_int() < v[1].to_int():
				return false
		elif part.begins_with("<"):
			var v := part.substr(1).split(".")
			if CORE_API.split(".")[0].to_int() >= v[0].to_int():
				return false
	return true


func resolve_file(path: String) -> LiveBayResult:
	if not FileAccess.file_exists(path):
		return LiveBayResult.failure(&"preset_missing", "找不到 preset %s" % path)
	var parsed: Variant = JSON.parse_string(FileAccess.get_file_as_string(path))
	if not parsed is Dictionary:
		return LiveBayResult.failure(&"preset_json", "preset JSON 无效")
	return resolve_preset(parsed)
