# LiveBay · 扩展功能开关
# 当前只表示“本次 ExpansionSet 里哪些包启用”；后续可接玩家设置。
class_name LiveBayFeatureFlags
extends RefCounted

var enabled: Dictionary = {}


static func from_set(set: LiveBayExpansionSet) -> LiveBayFeatureFlags:
	var flags := LiveBayFeatureFlags.new()
	for id in set.pack_ids():
		flags.enabled[id] = true
	return flags


func is_enabled(pack_id: String) -> bool:
	return bool(enabled.get(pack_id, false))
