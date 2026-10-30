extends RefCounted
class_name LevelData
## 一关的静态定义（来自 `levels.json`）。
##
## 它是**纪元差异的第二个配置点**（第一个是规则表）：
## 同一套引擎，关卡决定"打多少波、每波多难、生效哪些规则"，
## 因此策划可以只改数据就做出难度与规则的组合，不必改代码。

var id: String
var name: String
var chapter: int
var board: String
var waves: int
var budget: int
var quotas: PackedInt32Array = PackedInt32Array()
## **按势力的配额**（可选）：`{势力 id: [逐波配额]}`。
##
## 为什么需要它（实测结论）：四势力的实测输出相差 1.6 倍，而单一曲线只能取一个基准——
## 以最弱为基准时最强者过易，以最强为基准时最弱者永远打不过。
## 让每关可以给每个势力一条独立曲线，才是消除这个差距的直接办法；
## 没给对应势力的关卡仍走 `quotas`（向后兼容，不强迫每关都写）。
var quotas_by_faction: Dictionary = {}
var rule_set: PackedStringArray = PackedStringArray()

static func from_row(row: Dictionary) -> LevelData:
	var level := LevelData.new()
	level.id = str(row.get("id", ""))
	level.name = str(row.get("name", ""))
	level.chapter = int(row.get("chapter", 1))
	level.board = str(row.get("board", ""))
	level.waves = int(row.get("waves", 0))
	level.budget = int(row.get("budget", 0))
	level.quotas = PackedInt32Array(row.get("quotas", []))
	level.quotas_by_faction = row.get("quotas_by_faction", {})
	level.rule_set = PackedStringArray(row.get("rule_set", []))
	return level

## 该关是否自洽：配额条数必须等于波数（否则后面几波会静默退回公式，做出"不一样"的难度）。
## 按势力的配额同样是"给了就必须给满"，否则那个势力会静默用到别的曲线。
func is_consistent() -> bool:
	if not quotas.is_empty() and quotas.size() != waves:
		return false
	for faction_id in quotas_by_faction:
		var per_faction: Array = quotas_by_faction[faction_id]
		if per_faction.size() != waves:
			return false
	return true

## 本局实际使用的配额：优先该势力的专属曲线，否则用通用曲线。
func quotas_for(faction_id: String) -> PackedInt32Array:
	if quotas_by_faction.has(faction_id):
		return PackedInt32Array(quotas_by_faction[faction_id])
	return quotas
