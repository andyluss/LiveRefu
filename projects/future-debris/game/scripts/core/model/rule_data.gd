extends RefCounted
class_name RuleData
## 一条**规则卡**的静态定义（来自 `rules.json`）。它是**纪元差异的载体**：
## 同一套引擎，换这张表就换玩法——因此字段必须少而硬。
##
## 字段含义：`trigger` 何时检查；`condition`+`condition_value` 什么条件下生效；`effect`+`amount` 生效后做什么。

var id: String
var name: String
var trigger: String       # run_start / turn_start / before_placement / before_combat / wave_cleared
var condition: String     # always / residue_total_at_least / residue_total_at_most / slot_residue_at_least
var condition_value: int
var effect: String        # gain_power / reduce_residue / reduce_cost / add_damage / sub_damage / clean_on_turn
var amount: int
var text: String

static func from_row(row: Dictionary) -> RuleData:
	var rule := RuleData.new()
	rule.id = str(row.get("id", ""))
	rule.name = str(row.get("name", ""))
	rule.trigger = str(row.get("trigger", ""))
	rule.condition = str(row.get("condition", "always"))
	rule.condition_value = int(row.get("condition_value", 0))
	rule.effect = str(row.get("effect", ""))
	rule.amount = int(row.get("amount", 0))
	rule.text = str(row.get("text", ""))
	return rule
