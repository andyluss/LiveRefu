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
	level.rule_set = PackedStringArray(row.get("rule_set", []))
	return level

## 该关是否自洽：配额条数必须等于波数（否则后面几波会静默退回公式，做出"不一样"的难度）。
func is_consistent() -> bool:
	return quotas.is_empty() or quotas.size() == waves
