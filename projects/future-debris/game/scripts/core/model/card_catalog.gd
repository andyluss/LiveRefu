extends RefCounted
class_name CardCatalog
## 数据表的**容器与索引**（唯一的数据入口）。装载过程在 [CatalogLoader]，查询在 [CardQuery]。
## 立场：数据表是唯一真相——运行期只读，任何数值不得在脚本里硬编码。

var cards: Dictionary = {}        # id -> CardData
var factions: Dictionary = {}     # id -> Dictionary
var levels: Dictionary = {}       # id -> LevelData
var rules: Array[RuleData] = []
var mode_names: PackedStringArray = []
var errors: PackedStringArray = []

## 装载全部数据表；返回 [catalog, ok]。失败时 errors 非空。
static func load_all() -> Array:
	var catalog := CardCatalog.new()
	CatalogLoader.fill(catalog)
	return [catalog, catalog.errors.is_empty()]

func build_deck(ids: PackedStringArray) -> Array:
	return CardQuery.build_deck(self, ids)

func cards_of_faction(faction_id: String) -> PackedStringArray:
	return CardQuery.cards_of_faction(self, faction_id)

## 某关的规则卡（关卡为空时返回全部规则，便于整体模拟）。
func rules_for(level_id: String) -> Array[RuleData]:
	var level: LevelData = levels.get(level_id)
	if level == null:
		return rules.duplicate()
	var out: Array[RuleData] = []
	for rule in rules:
		if level.rule_set.has(rule.id):
			out.append(rule)
	return out
