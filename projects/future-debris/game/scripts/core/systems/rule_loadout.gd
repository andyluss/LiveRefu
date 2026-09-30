extends RefCounted
class_name RuleLoadout
## **规则卡的获取与生效范围**（S3 最后一块设计拼图，默认方案）。
##
## 三种来源，**累加生效、永不删除**：
##   1. `era_default`：本纪元默认启用（与关卡无关）；
##   2. `level_grant`：由关卡表的 `rule_set` 授予；
##   3. `unlock`：局内解锁（例如打赢某关后获得），存在 `battle.unlocked_rules` 里。
##
## 为什么"累加、不删除"：规则卡是**玩家对纪元的理解在增长**，
## 如果每关重置，玩家就只是在打一串互不相关的谜题，而不是在经营一条线。
## 代价是要控制总数（否则后期规则会互相放大），因此解锁规则必须逐条评审——见 docs/10。

## 计算本局生效的规则集。`level` 为空时只给 era_default（便于整体模拟）。
static func resolve(catalog: CardCatalog, level: LevelData, unlocked: PackedStringArray) -> Array[RuleData]:
	var out: Array[RuleData] = []
	for rule in catalog.rules:
		if is_active(rule, level, unlocked):
			out.append(rule)
	return out

## 单条规则是否生效。
static func is_active(rule: RuleData, level: LevelData, unlocked: PackedStringArray) -> bool:
	match rule.acquisition:
		"era_default":
			return true
		"level_grant":
			return level != null and level.rule_set.has(rule.id)
		"unlock":
			return unlocked.has(rule.id)
		_:
			# 未知来源**不生效**：与 RuleConditions 同一立场——不静默兜底（裁决 D20）
			return false

## 按来源计数，用于 UI 与报告（"我现在为什么会有这条规则"）。
static func describe_sources(catalog: CardCatalog, level: LevelData, unlocked: PackedStringArray) -> Dictionary:
	var counts := {"era_default": 0, "level_grant": 0, "unlock": 0}
	for rule in catalog.rules:
		if is_active(rule, level, unlocked) and counts.has(rule.acquisition):
			counts[rule.acquisition] += 1
	return counts
