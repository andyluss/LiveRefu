# LiveBay · 扩展启动入口
# 启动时只解析 baseline；实验 preset 由工具/测试显式加载。
class_name LiveBayExpansionBoot
extends RefCounted

const RegistryScript = preload("res://scripts/expansion/expansion_registry.gd")
const SetScript = preload("res://scripts/expansion/expansion_set.gd")


static func baseline() -> LiveBayExpansionSet:
	return SetScript.empty()


static func load_preset(path: String) -> LiveBayResult:
	var registry := RegistryScript.new()
	registry.scan()
	var result := registry.resolve_file(path)
	if not result.ok:
		return result
	return LiveBayResult.success("", result.data)
