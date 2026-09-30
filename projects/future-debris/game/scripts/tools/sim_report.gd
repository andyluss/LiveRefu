extends RefCounted
class_name SimReport
## 平衡模拟的度量与打印。**只陈述事实与差值，不给"强不强"的判断**（那是人的裁决）。

const DECK_SIZE := 8   # 与基准局的卡组长度一致，保证各阵营被比较的是同一条件

## 跑一个势力 × 一档策略的矩阵，并打印一行结论。
static func run_matrix(catalog: CardCatalog, faction_id: String, conservative: bool, decks: int, seeds: int,
		extra_draws: int = 0, use_rules: bool = true) -> void:
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
			battle.player = AutoPlayer.new(conservative, extra_draws)
			if not use_rules:
				battle.rules = []
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
	var played := 0
	var hp := 0
	for row in results:
		if int(row["base_hp"]) > 0:
			wins += 1
		leaks += int(row["leaks"])
		residue += int(row["residue_total"])
		score += float(row["score"])
		played += int(row["cards_played"])
		hp += int(row["base_hp"])
	var count := results.size()
	# 出牌数是 F1（电力闲置）的**直接度量**：它上不去就说明出牌机会不足，而不是电力不够
	return "存活 %d/%d | 均剩血 %.1f/20 | 漏怪 %.2f | 残渣 %.0f | 出牌 %.1f | 分 %.3f" % [
		wins, count, float(hp) / count, float(leaks) / count, float(residue) / count,
		float(played) / count, score / count,
	]

## 从卡池取一套牌：**确定性的滑动窗口，窗口长度固定 8**。
##
## 为什么窗口长度必须固定为 8（实测教训）：按 `min(8, pool.size())` 取，
## 小卡池的阵营只拿到 5–6 张牌就"满编"了，导致各阵营被比较的**不是同一个条件**，
## 报告出来的差异里混着"卡池大小"这个无关变量。现在小卡池会绕回重复取，
## 于是"每套牌都是 8 张"这一条件对所有阵营一致。
static func deck_from_pool(pool: PackedStringArray, deck_index: int) -> PackedStringArray:
	var out := PackedStringArray()
	if pool.is_empty():
		return out
	for offset in DECK_SIZE:
		out.append(pool[(deck_index * 3 + offset) % pool.size()])
	return out
