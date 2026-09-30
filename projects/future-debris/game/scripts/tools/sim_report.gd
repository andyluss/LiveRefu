extends RefCounted
class_name SimReport
## 平衡模拟的度量与打印。**只陈述事实与差值，不给"强不强"的判断**（那是人的裁决）。

## 跑一个势力 × 一档策略的矩阵，并打印一行结论。
static func run_matrix(catalog: CardCatalog, faction_id: String, conservative: bool, decks: int, seeds: int) -> void:
	var label := "%s [%s]" % [faction_id, "节制" if conservative else "贪心"]
	var pool := catalog.cards_of_faction(faction_id)
	if pool.is_empty():
		print("  %-32s 卡池为空，跳过" % label)
		return
	var results: Array[Dictionary] = []
	for deck_index in decks:
		var deck := deck_from_pool(pool, deck_index)
		for seed_index in seeds:
			var battle := Battle.new()
			if not battle.setup(deck, 20, 40):
				continue
			battle.seed = seed_index
			battle.player = AutoPlayer.new(conservative)
			results.append(battle.run_to_end())
	print("  %-32s %s" % [label, summarize(results)])

## 汇总统计；空结果集明确返回"无有效对局"而不是 0。
static func summarize(results: Array[Dictionary]) -> String:
	if results.is_empty():
		return "无有效对局"
	var wins := 0
	var leaks := 0
	var residue := 0
	var score := 0.0
	for row in results:
		if int(row["base_hp"]) > 0:
			wins += 1
		leaks += int(row["leaks"])
		residue += int(row["residue_total"])
		score += float(row["score"])
	var count := results.size()
	return "存活 %d/%d | 平均漏怪 %.2f | 平均残渣 %.0f | 平均分 %.3f" % [
		wins, count, float(leaks) / count, float(residue) / count, score / count,
	]

## 从卡池取一套牌：确定性的滑动窗口，保证不同 deck_index 得到不同组合。
static func deck_from_pool(pool: PackedStringArray, deck_index: int) -> PackedStringArray:
	var size := mini(8, pool.size())
	var out := PackedStringArray()
	for offset in size:
		out.append(pool[(deck_index * 3 + offset) % pool.size()])
	return out
