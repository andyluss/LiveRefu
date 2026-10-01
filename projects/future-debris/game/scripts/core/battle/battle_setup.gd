extends RefCounted
class_name BattleSetup
## 组局：装载数据表 → 组卡组 → 初始化各系统。**把"准备一局"与"打完一局"分开**，
## 这样测试可以只准备、不下场（断言初始化本身），也可以准备多次而不互相污染。

## 生效规则 = era_default + 关卡授予 + 局内解锁（三者累加，见 RuleLoadout）。
## `all_rules` 为测试/模拟开关：为真时忽略获取途径，直接给全部规则。
static func _select_rules(battle) -> Array[RuleData]:
	if battle.all_rules:
		return battle.catalog.rules.duplicate()
	return RuleLoadout.resolve(battle.catalog, battle.level, battle.unlocked_rules)

## 准备一局；返回是否就绪（失败原因写进 battle.events，不静默使用默认值）。
static func prepare(battle, deck_ids: PackedStringArray, base_hp: int, turn_limit: int) -> bool:
	var loaded := CardCatalog.load_all()
	battle.catalog = loaded[0]
	if not bool(loaded[1]):
		battle.events.append_array(battle.catalog.errors)
		return false
	battle.hand = battle.catalog.build_deck(deck_ids) as Array[CardData]
	if battle.hand.is_empty():
		battle.events.append("卡组为空：%s" % ", ".join(deck_ids))
		return false
	battle.board = BoardSystem.init_board()
	battle.resources = ResourceSystem.init_resources(base_hp)
	battle.residue = ResidueSystem.init_residue()
	# 关卡决定"打多少波、每波多难、生效哪些规则"——纪元差异的第二个配置点
	battle.level = battle.catalog.levels.get(battle.level_id)
	var quotas: PackedInt32Array = PackedInt32Array()
	if battle.level != null:
		# 优先该势力的专属曲线（按势力配平难度）；没有则用通用曲线
		quotas = battle.level.quotas_for(battle.faction_id)
	battle.wave = WaveSystem.init_wave(quotas)
	battle.rules = _select_rules(battle)
	battle.turn = 0
	battle.max_turns = turn_limit
	battle.cards_played = 0
	battle.drawn = 0
	battle.events.clear()
	# run_start：例如"开局携带未来残片"这类规则在这里生效
	RuleEngine.fire(battle, "run_start")
	return true
