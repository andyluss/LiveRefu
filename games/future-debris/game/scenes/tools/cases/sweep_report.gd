extends RefCounted
class_name SweepReport
## 扫描报告的一行（纯格式化，与"扫描不变量"分开）。
##
## **必须标出胜利条件**：四势力玩法不同（守成 vs 清剿），
## 不标会被读成"同一把尺子下的强弱"——那正是我们花了几轮才修掉的误读。

## 报告行。**必须标出胜利条件**：四势力玩法不同，
## 不标会被读成"同一把尺子下的强弱"（那正是我们花了几轮才修掉的误读）。
static func line(level_id: String, cleared: bool, battle, summary: Dictionary) -> String:
	var tag := "守成" if WinCondition.is_survive(battle.win_condition) else "清剿"
	return "%s %s 剩血%d 回合%d %s ［%s］" % [
		level_id, "通关" if cleared else "打爆", int(summary["base_hp"]),
		int(summary["turns"]), str(summary["grade"]), tag,
	]

