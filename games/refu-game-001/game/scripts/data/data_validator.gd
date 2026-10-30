extends RefCounted
class_name DataValidator
## DataValidator —— 数据表的引用完整性自检：关卡/波次卡组引用的地图、波次、规则卡、敌人都必须存在。
## 校验失败只记录问题（不抛异常），由 GameData 在启动时统一 push_error。

## 引用完整性自检：关卡/波次卡组引用的地图、波次、规则卡、敌人都必须存在。
static func validate(g: GameData) -> void:
	for level in g.levels:
		for key in ["map", "wave_set", "rule", "event_set"]:
			if not _has_ref(g, key, String(level.get(key, ""))):
				g.load_errors.append("关卡 %s 引用了不存在的 %s：%s"
					% [level.get("id", "?"), key, level.get(key, "")])
	for wave_set in g.wave_sets.values():
		if not g.maps.has(wave_set.get("map", "")):
			g.load_errors.append("波次卡组 %s 引用了不存在的地图 %s"
				% [wave_set.get("id", "?"), wave_set.get("map", "")])
		for wave in wave_set.get("waves", []):
			for comp in wave.get("composition", []):
				if not g.enemies.has(comp.get("enemy", "")):
					g.load_errors.append("波次 %s W%d 引用了不存在的敌人 %s"
						% [wave_set.get("id", "?"), wave.get("index", -1), comp.get("enemy", "")])


static func _has_ref(g: GameData, key: String, value: String) -> bool:
	match key:
		"map": return g.maps.has(value)
		"wave_set": return g.wave_sets.has(value)
		"rule": return g.rules.has(value)
		"event_set": return g.event_sets.has(value)
	return true
