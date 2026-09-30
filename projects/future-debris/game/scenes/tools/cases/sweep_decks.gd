extends RefCounted
class_name SweepDecks
## 扫描用的卡组构造（与断言分开：它是"取数方式"，不是"不变量"）。

## 该势力的卡组：取该阵营的全部卡（不足 8 张时绕回重复），保证各势力都用**自己的**卡。
static func for_faction(catalog: CardCatalog, faction_id: String) -> PackedStringArray:
	var pool := catalog.cards_of_faction(faction_id)
	var out := PackedStringArray()
	if pool.is_empty():
		return CaseBase.DECK.split(",")
	for i in 8:
		out.append(pool[i % pool.size()])
	return out
