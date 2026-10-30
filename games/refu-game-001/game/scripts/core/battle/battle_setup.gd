extends RefCounted
class_name BattleSetup
## BattleSetup —— 把"关卡四件套 + 挑战卡 + 卡组"装配成一局的初始状态。
## （doc 06 第一节：关卡 = 地图卡 + 波次卡组 + 事件卡组 + 规则卡）

static func configure(bt: BattleState, level_id: String, selected_challenges: Array,
		deck_card_ids: Array, seed_v: int) -> void:
	bt.level = GameData.get_level(level_id)
	bt.map_data = GameData.get_map(bt.level.get("map", ""))
	bt.rule = GameData.get_rule(bt.level.get("rule", "RUL-BASE"))
	bt.wave_set = GameData.get_wave_set(bt.level.get("wave_set", ""))
	bt.challenge_ids = []
	for c in selected_challenges:
		bt.challenge_ids.append(String(c))
	bt.seed_value = seed_v
	bt.rng.seed = seed_v

	var bal := GameData.balance
	bt.board_cell = float(bal.get("board", {}).get("cell", 90.0))
	bt.range_unit = float(bal.get("board", {}).get("range_unit", 90.0))
	bt.px_per_speed = float(bal.get("movement", {}).get("px_per_speed_unit", 20.75))
	bt.geom = bal

	bt.intern.waves = bt.wave_set.get("waves", [])
	BattleWorld.build_paths(bt)
	BattleWorld.build_terrain_fields(bt)
	BattleChallenges.apply(bt)

	bt.deck = Deck.new()
	bt.deck.setup(deck_card_ids, seed_v,
		int(bt.rule.get("hand_size", 5)), int(bt.rule.get("draw_options", 3)))

	bt.base_hp_max = float(bt.rule.get("base_hp", 20))
	bt.base_hp = bt.base_hp_max
	bt.energy = float(bt.rule.get("start_energy", 10))
	bt.stats = {
		"kills": 0, "leaks": 0, "energy_gained": float(bt.energy), "energy_spent": 0.0,
		"energy_returned": 0.0, "hook_triggers": 0, "bonds_triggered": 0,
		"cards_played": 0, "damage_dealt": 0.0, "towers_built": 0,
		"wave_reached": 0, "duration": 0.0, "overkill": 0.0,
	}
