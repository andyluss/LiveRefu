extends RefCounted
class_name LevelConfigCases
## J1b 组：**关卡决定生效的规则集与波次配额**——"纪元差异配置化"的落点。

static func level_selects_rules() -> Dictionary:
	var battle := CaseBase.new_battle()
	if battle.level == null:
		return CaseBase.bad("基准局应绑定关卡 %s" % battle.level_id)
	if battle.rules.size() != battle.level.rule_set.size():
		return CaseBase.bad("生效规则数 %d 应等于关卡 rule_set 的 %d" % [
			battle.rules.size(), battle.level.rule_set.size(),
		])
	for rule in battle.rules:
		if not battle.level.rule_set.has(rule.id):
			return CaseBase.bad("规则 %s 不在关卡的 rule_set 里却生效了" % rule.id)
	# 配额也必须来自关卡
	var quotas: PackedInt32Array = battle.wave["schedule"]
	if quotas.size() != battle.level.waves:
		return CaseBase.bad("波次配额条数 %d 应等于关卡 waves %d" % [quotas.size(), battle.level.waves])
	if WaveSystem.quota(battle.wave) != quotas[0]:
		return CaseBase.bad("首波配额 %d 应等于关卡给出 %d" % [WaveSystem.quota(battle.wave), quotas[0]])
	if WaveSystem.wave_count(battle.wave) != battle.level.waves:
		return CaseBase.bad("波数应等于关卡 waves")
	return CaseBase.ok()
