extends Node
## headless_sim —— 战斗引擎的**无头验收**（不需要画面，CI/命令行可跑）。
##
## 为什么需要它：卡片塔防最容易出的错不是"画不出来"，而是"算错了还看不出来"
## （能量给多了、钩子没触发、对空判漏、羁绊不可达、挑战卡偷偷改了卡表数值）。
## 这里用固定种子直接驱动 core/ 的纯逻辑，把"必须成立的性质"写成 19 条用例。
##
## 运行（走 game/run.sh，它会把 HOME 指到工作区内，避免 Godot 往 ~/Library 写用户数据）：
##   ./run.sh check
## 实现说明：刻意**不用** `--script` 模式——那种模式下 autoload（GameData/AppState）
## 不会注册成全局标识符，脚本无法编译。改成"最小场景 + Node 脚本"，跑完 quit(退出码)。
##
## 用例分五组在 sim/ 下：sim_suites.gd（数据/闭环/确定性）、sim_suites_b.gd（挑战卡/对空/
## 白名单/能量）、sim_driver.gd（跑一局）、sim_air_test.gd（对空精确用例）、
## sim_trace.gd（战况轨迹）、sim_report.gd（PASS/FAIL 收集与输出）。


func _ready() -> void:
	var report := SimReport.new()
	SimSuites.run_all(report)
	get_tree().quit(report.finish())
