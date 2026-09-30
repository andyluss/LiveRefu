extends Node
## 场景验收（`./run.sh scene`，也是 `./run.sh check` 的第 8 道闸门）：
## ① 视图不变量（几何唯一 / 点击命中 / 取色来自 token）；② 战斗界面能真的装配出三块视图。
##
## 为什么单独一道闸门：S1–S3 的闸门证明"逻辑对"，而"界面能装载、点了落在对的位置"
## 是**另一类事实**，只能在这里守。

const EXIT_OK := 0
const EXIT_FAIL := 1
const REQUIRED_VIEWS := ["BattleHud", "BattleBoardView", "BattleHandView"]

func _ready() -> void:
	var loaded := ThemeIo.load_or_build(false)
	var tokens: TokenSet = loaded[1]
	if loaded[0] == null:
		printerr("主题不可用：%s" % str(tokens.errors))
		get_tree().quit(EXIT_FAIL)
		return
	var report := ViewVerify.run(tokens)
	for line in report["checks"]:
		print("  [%s]" % line)
	if not bool(report["ok"]):
		printerr("视图验收失败：%s" % str(report["errors"]))
		get_tree().quit(EXIT_FAIL)
		return
	var scene := load("res://scenes/app/battle.tscn") as PackedScene
	if scene == null:
		printerr("加载不到战斗场景")
		get_tree().quit(EXIT_FAIL)
		return
	var screen := scene.instantiate()
	add_child(screen)
	await get_tree().process_frame
	# **不只数子节点**：必须真的装配出三块视图（一个空 Shell 也会"有子节点"，而那正是白屏的形态）
	var found := ViewFinder.names(screen)
	var missing := PackedStringArray()
	for kind in REQUIRED_VIEWS:
		if not found.has(kind):
			missing.append(kind)
	if not missing.is_empty():
		printerr("战斗界面缺少视图：%s" % ", ".join(missing))
		get_tree().quit(EXIT_FAIL)
		return
	print("  [OK   ] 战斗界面装配出 HUD / 战场 / 手牌三块视图")
	print("场景验收：PASS")
	print("BOOT OK")
	get_tree().quit(EXIT_OK)
