extends RefCounted
class_name CardQuery
## 卡池查询：按 id 组卡组、按阵营取卡。**独立于装载**——
## "表读进来了"与"我能问它什么问题"是两件事，混在一起会让装载器随查询需求不断膨胀。

## 按 id 组成卡组；缺失的 id 计入 catalog.errors 并跳过（**不静默补默认卡**）。
static func build_deck(catalog: CardCatalog, ids: PackedStringArray) -> Array:
	var deck: Array[CardData] = []
	for id in ids:
		if not catalog.cards.has(id):
			catalog.errors.append("卡组引用了不存在的卡：%s" % id)
			continue
		deck.append(catalog.cards[id])
	return deck

## 某阵营的全部卡 id（排序稳定，便于确定性测试与生成）。
static func cards_of_faction(catalog: CardCatalog, faction_id: String) -> PackedStringArray:
	var out := PackedStringArray()
	for id in catalog.cards:
		var card: CardData = catalog.cards[id]
		if card.faction == faction_id:
			out.append(id)
	out.sort()
	return out
