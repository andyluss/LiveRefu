extends Node
## 场景验收（`./run.sh scene`，也是 `./run.sh check` 的第 8 道闸门）。
##
## 本文件只做**编排**：把三组验收（视图 / 动效音效 / 一局闭环）跑一遍、
## 打印它们的断言、并在任一失败时以非零码退出。
## 每组的具体断言在各自的 Verify 类里——**编排与断言分开**，
## 否则这个文件会随断言数量增长而膨胀（实测：加完闭环验收就到了 59 行）。
##
## 这道闸门守的是"S1–S3 那七道闸门守不住的事实"：
## **界面能装载、点击落在对的位置、一局能接上下一步**。

const EXIT_OK := 0
const EXIT_FAIL := 1
const REQUIRED_VIEWS := ["BattleHud", "BattleBoardView", "BattleHandView"]
## 闭环上的每个场景都必须能被实例化（少一个，那条线就断了）
const LOOP_SCENES := ["res://scenes/app/level_select.tscn", "res://scenes/app/battle.tscn",
	"res://scenes/app/settlement.tscn"]

func _ready() -> void:
	var loaded := ThemeIo.load_or_build(false)
	var tokens: TokenSet = loaded[1]
	if loaded[0] == null:
		printerr("主题不可用：%s" % str(tokens.errors))
		_quit(EXIT_FAIL)
		return
	if not _report("视图", ViewVerify.run(tokens)):
		return
	if not _report("动效/音效", FxVerify.run(tokens)):
		return
	if not _report("一局闭环", LoopVerify.run()):
		return
	var broken := LoopVerify.scenes_instantiable(LOOP_SCENES)
	if not _report("闭环场景", {
			"ok": broken.is_empty(),
			"checks": [("OK   闭环三场景（关卡选择 / 战斗 / 结算）都能实例化" if broken.is_empty()
				else "FAIL 无法实例化：%s" % ", ".join(broken))],
			"errors": ["闭环场景无法实例化"]}):
		return
	await _check_battle_screen(tokens)

## 打印一组断言；返回是否全部通过（失败时直接退出）。
func _report(title: String, report: Dictionary) -> bool:
	for line in report["checks"]:
		print("  [%s]" % line)
	if bool(report["ok"]):
		return true
	printerr("%s验收失败：%s" % [title, str(report["errors"])])
	_quit(EXIT_FAIL)
	return false

## 真正实例化一次战斗界面：脚本错误、装配错误都会在这里暴露。
## 具体断言在 [ViewFinder.check_battle_screen]（**工具与编排分开**，否则本文件会随断言增长而膨胀）。
func _check_battle_screen(tokens: TokenSet) -> void:
	var failure := await ViewFinder.check_battle_screen(self, REQUIRED_VIEWS)
	if failure != "":
		printerr(failure)
		_quit(EXIT_FAIL)
		return
	print("  [OK   ] 战斗界面装配出 HUD / 战场 / 手牌三块视图")
	print("  [OK   ] 开局淡入已按 token 时长装配（%.3f 秒）" % Motion.seconds(tokens, "dur-slow"))
	print("场景验收：PASS")
	print("BOOT OK")
	_quit(EXIT_OK)

func _quit(code: int) -> void:
	get_tree().quit(code)
