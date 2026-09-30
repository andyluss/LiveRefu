extends RefCounted
class_name CardFlow
## 手牌流动：抽牌与查询。**与战斗生命周期分离**，因为它是"牌从哪来"的问题，
## 而战斗只关心"牌怎么用"。

## 补抽一张：从卡池按**稳定哈希偏移**取，保证同卡组同种子得到同一局。
## 为什么不用随机数：S2 的目的是让数值改动可被 diff——随机会让失败无法复现。
static func draw(battle) -> bool:
	if battle.catalog == null or battle.catalog.cards.is_empty():
		return false
	var pool: Array = battle.catalog.cards.keys()
	pool.sort()
	var index: int = StatQuery.stable_hash("%d:%d:%d" % [battle.seed, battle.turn, battle.drawn]) % pool.size()
	battle.drawn += 1
	battle.hand.append(battle.catalog.cards[pool[index]])
	return true

## 手牌里可支付的数量（自动玩家据此决定要不要补抽）。
static func playable_count(battle) -> int:
	var count := 0
	for card in battle.hand:
		if card.cost <= ResourceSystem.power(battle.resources):
			count += 1
	return count

## 一局的终局摘要（含评级）。**由已发生的事实推导**，不引入额外随机。
static func summarize(battle) -> Dictionary:
	var score := RatingSystem.evaluate(
		{"resources": battle.resources, "residue": battle.residue, "turn": battle.turn}, battle.max_turns
	)
	return {
		"turns": battle.turn,
		"base_hp": int(battle.resources["base_hp"]),
		"base_hp_max": int(battle.resources["base_hp_max"]),
		"leaks": int(battle.resources["leaks"]),
		"residue_total": ResidueSystem.total(battle.residue),
		"zone": ResidueSystem.zone(battle.residue),
		"cards_played": battle.cards_played,
		"waves_cleared": WaveSystem.index(battle.wave),
		"wave": WaveSystem.index(battle.wave),
		"max_turns": battle.max_turns,
		"score": score["score"],
		"grade": score["grade"],
		"defense": score["defense"],
		"clean": score["clean"],
		"efficiency": score["efficiency"],
	}
