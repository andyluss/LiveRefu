extends RefCounted
class_name CatalogLoader
## 把各张表读进 [CardCatalog] 并做**运行期**的引用校验。
##
## 为什么独立于 CardCatalog：[CardCatalog] 是**容器**（持有并索引数据），
## 装载是**过程**。两者生命周期不同——容器会被查询代码反复触碰，
## 而装载只在开局发生一次；混在一起会让容器随装载需求不断膨胀（实测撞到 50 行预算）。

static func fill(catalog: CardCatalog) -> void:
	for row in TableLoader.entries("cards.json", catalog.errors):
		var card := CardData.from_row(row)
		if card.id == "":
			catalog.errors.append("cards.json 有一条记录的 id 为空")
			continue
		if catalog.cards.has(card.id):
			catalog.errors.append("卡表 id 重复：%s" % card.id)
			continue
		catalog.cards[card.id] = card
	for row in TableLoader.entries("factions.json", catalog.errors):
		catalog.factions[str(row.get("id", ""))] = row
	for row in TableLoader.entries("modes.json", catalog.errors):
		catalog.mode_names.append(str(row.get("id", "")))
	_load_rules(catalog)
	LevelLoader.fill(catalog, catalog.errors)
	_check_card_factions(catalog)

static func _load_rules(catalog: CardCatalog) -> void:
	for row in TableLoader.entries("rules.json", catalog.errors):
		var rule := RuleData.from_row(row)
		if rule.id == "":
			catalog.errors.append("rules.json 有一条记录的 id 为空")
			continue
		catalog.rules.append(rule)

## 跨表引用（运行期再守一遍；数据闸门里也有同样的检查）。
static func _check_card_factions(catalog: CardCatalog) -> void:
	for id in catalog.cards:
		var card: CardData = catalog.cards[id]
		if not catalog.factions.has(card.faction):
			catalog.errors.append("卡 %s 引用了不存在的阵营 %s" % [id, card.faction])
