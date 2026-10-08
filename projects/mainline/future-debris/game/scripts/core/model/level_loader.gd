extends RefCounted
class_name LevelLoader
## 关卡表的装载与自洽校验。

static func fill(catalog: CardCatalog, errors: PackedStringArray) -> void:
	for row in TableLoader.entries("levels.json", errors):
		var level := LevelData.from_row(row)
		if level.id == "":
			errors.append("levels.json 有一条记录的 id 为空")
			continue
		if not level.is_consistent():
			errors.append("关卡 %s 的 quotas 有 %d 条，但 waves 是 %d（长度必须一致）" % [
				level.id, level.quotas.size(), level.waves,
			])
			continue
		for rule_id in level.rule_set:
			if not has_rule(catalog, rule_id):
				errors.append("关卡 %s 引用了不存在的规则卡 %s" % [level.id, rule_id])
		catalog.levels[level.id] = level

static func has_rule(catalog: CardCatalog, rule_id: String) -> bool:
	for rule in catalog.rules:
		if rule.id == rule_id:
			return true
	return false
