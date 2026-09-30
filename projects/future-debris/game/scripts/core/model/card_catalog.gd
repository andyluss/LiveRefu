extends RefCounted
class_name CardCatalog
## 数据表装载与索引（**唯一的数据入口**）。
## 立场：数据表是唯一真相——运行期只读，任何数值不得在脚本里硬编码。
## 查询能力（组卡组 / 按阵营取卡）在 [CardQuery]；本文件只负责"读进来"与"守住引用"。

var cards: Dictionary = {}        # id -> CardData
var factions: Dictionary = {}     # id -> Dictionary
var rules: Array[RuleData] = []
var mode_names: PackedStringArray = []
var errors: PackedStringArray = []

## 装载卡表与势力表；返回 [catalog, ok]。失败时 errors 非空。
static func load_all() -> Array:
	var catalog := CardCatalog.new()
	catalog._load_cards()
	catalog._load_others("factions.json", catalog.factions)
	catalog._load_others("modes.json", {})
	catalog._load_rules()
	for id in catalog.cards:
		var card: CardData = catalog.cards[id]
		if not catalog.factions.has(card.faction):
			catalog.errors.append("卡 %s 引用了不存在的阵营 %s" % [id, card.faction])
	return [catalog, catalog.errors.is_empty()]

func build_deck(ids: PackedStringArray) -> Array:
	return CardQuery.build_deck(self, ids)

func cards_of_faction(faction_id: String) -> PackedStringArray:
	return CardQuery.cards_of_faction(self, faction_id)

func _load_rules() -> void:
	for row in TableLoader.entries("rules.json", errors):
		var rule := RuleData.from_row(row)
		if rule.id == "":
			errors.append("rules.json 有一条记录的 id 为空")
			continue
		rules.append(rule)

func _load_cards() -> void:
	for row in TableLoader.entries("cards.json", errors):
		var card := CardData.from_row(row)
		if card.id == "":
			errors.append("cards.json 有一条记录的 id 为空")
			continue
		if cards.has(card.id):
			errors.append("卡表 id 重复：%s" % card.id)
			continue
		cards[card.id] = card

func _load_others(file_name: String, sink: Dictionary) -> void:
	for row in TableLoader.entries(file_name, errors):
		var id := str(row.get("id", ""))
		sink[id] = row
		if file_name == "modes.json":
			mode_names.append(id)
