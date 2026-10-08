extends RefCounted
class_name CardData
## 一张卡的**静态定义**（来自数据表，运行期只读）。
## 为什么单独成类：数据表是唯一真相，模型层不得在运行期改写定义。

var id: String
var name: String
var faction: String
var kind: String
var rarity: String
var cost: int
var power: int      # 电力产出（每回合）
var compute: int    # 算力（S2 仅记录，S3 起参与规则卡）
var residue: int    # 残渣产出（进入降级区）
var might: int      # 战力；表字段名为 power（与"电力"同名，故内部改称 might）
var keywords: PackedStringArray
var text: String

static func from_row(row: Dictionary) -> CardData:
	var card := CardData.new()
	card.id = str(row.get("id", ""))
	card.name = str(row.get("name", ""))
	card.faction = str(row.get("faction", ""))
	card.kind = str(row.get("kind", ""))
	card.rarity = str(row.get("rarity", ""))
	card.cost = int(row.get("cost", 0))
	card.power = int(row.get("power", 0))
	card.compute = int(row.get("compute", 0))
	card.residue = int(row.get("residue", 0))
	card.might = int(row.get("power", 0))
	card.keywords = PackedStringArray(row.get("keywords", []))
	card.text = str(row.get("text", ""))
	return card
