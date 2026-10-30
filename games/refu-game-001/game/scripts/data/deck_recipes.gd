extends RefCounted
class_name DeckRecipes
## DeckRecipes —— 推荐卡组与卡组合法性校验（doc 05：20 张、同名 ≤2、≥2 个不同标签）。

static func default_deck(for_level_id: String) -> Array[String]:
	var level := GameData.get_level(for_level_id)
	var pool := GameData.pool_for_level(level)
	var recipe := {
		"ANV-T01": 2, "ANV-T02": 2, "ANV-T03": 2, "ANV-T04": 2,
		"ANV-M01": 2, "ANV-M02": 2, "ANV-M03": 1,
		"ANV-S01": 1, "ANV-S02": 1,
		"ANV-X01": 2, "ANV-X02": 2, "ANV-X03": 1,
	}
	var out: Array[String] = []
	var available := {}
	for card in pool:
		available[card["id"]] = true
	for cid in recipe.keys():
		if available.has(cid):
			for i in int(recipe[cid]):
				out.append(cid)
	# 不足 20 张时用池内前几张补足（防数据变动导致卡组不合法）
	var ids: Array = available.keys()
	ids.sort()
	var i := 0
	while out.size() < 20 and not ids.is_empty():
		var cid: String = ids[i % ids.size()]
		var count := 0
		for c in out:
			if c == cid:
				count += 1
		if count < 2:
			out.append(cid)
		i += 1
		if i > 200:
			break
	out.resize(mini(out.size(), 20))
	return out
