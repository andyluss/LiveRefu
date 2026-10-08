extends RefCounted
class_name DataCases
## A 组：数据表装载与跨表引用。**玩法用例的前提**——表读不对，后面全是假象。

static func catalog_ok() -> Dictionary:
	var battle := CaseBase.new_battle()
	if battle.catalog == null or not battle.catalog.errors.is_empty():
		return CaseBase.bad("数据表装载有错：%s" % str(battle.catalog.errors if battle.catalog else []))
	if battle.catalog.cards.size() < 12:
		return CaseBase.bad("卡表应至少有手写的 12 张，实际 %d" % battle.catalog.cards.size())
	if battle.catalog.factions.size() != 4:
		return CaseBase.bad("势力表应有 4 条，实际 %d" % battle.catalog.factions.size())
	var missing := battle.catalog.build_deck(PackedStringArray(["RC-ATOMIC-999"]))
	if not missing.is_empty() or battle.catalog.errors.is_empty():
		return CaseBase.bad("引用不存在的卡时应报错并跳过，实际 deck=%d errors=%d" % [
			missing.size(), battle.catalog.errors.size(),
		])
	return CaseBase.ok()
